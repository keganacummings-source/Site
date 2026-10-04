/**
 * DREAMSHARE Wifi Bridge — Cloudflare Worker (durable threads)
 *
 * WHY THREADS WERE VANISHING
 * --------------------------
 * The previous worker stored the lounge ONLY in the Cache API.
 * Cloudflare cache is per data-center and is evicted (often overnight).
 * That is why the feed came back empty even though nothing was deleted.
 *
 * This build writes the feed to the existing JSON bin (the one that still
 * has every old post) and, if you bind KV, to KV as well. Cache is never
 * the source of truth.
 *
 * SETUP
 * 1. dash.cloudflare.com → Workers & Pages → your DreamShare worker
 * 2. Edit code → DELETE all → paste THIS entire file → Deploy
 * 3. To keep WAVs (up to 75 MB) bind ONE of these. R2 is the one to use.
 *      R2:     Workers → R2 → Create bucket "dreamshare-tapes"
 *              Settings → Bindings → R2 bucket → Variable name: DREAMSHARE_R2
 *      or KV:  Workers → KV → Create namespace "DREAMSHARE"
 *              Settings → Bindings → KV namespace → Variable name: DREAMSHARE_KV
 *      Without a binding, only small tapes (about 6 MB) can be stored,
 *      and they go to the public JSON bin in pieces.
 * 4. Open the worker URL. JSON must say "storage": "durable-v4"
 *    and "audioMaxBytes": 78643200.
 *    "audioVault": true means the 75 MB tape vault is bound.
 *
 * Super-admins (hardcoded): Trippah, Goonr
 * Mods live in the durable feed (not the cache).
 */

const BIN = 'https://extendsclass.com/api/json-storage/bin/abffdbc';
const BIN_API = 'https://extendsclass.com/api/json-storage/bin';
const FEED_BIN_ID = 'abffdbc';
const USERS_BIN = 'https://extendsclass.com/api/json-storage/bin/ffedede';
const STORAGE = 'durable-v4';
const SUPER_ADMINS = ['Trippah', 'Goonr'];
const META_ID = '_dreamshare_meta';
const MAX_BIN = 88000;
const AUDIO_KEEP_MS = 100 * 24 * 60 * 60 * 1000;
const CHUNK_B64 = 68000;
const MAX_AUDIO_BYTES = 75 * 1024 * 1024;
const MAX_PART_BYTES = 4 * 1024 * 1024;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, X-SW-Token, X-SW-Upload, X-SW-Index, X-SW-Parts',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store'
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS)
  });
}

function normUser(u) {
  return String(u || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
}

function isSuper(user) {
  const u = String(user || '');
  return SUPER_ADMINS.some(function (a) { return a.toLowerCase() === u.toLowerCase(); });
}

function isMod(feed, user) {
  if (isSuper(user)) return true;
  const u = String(user || '').toLowerCase();
  return (feed.mods || []).some(function (m) { return String(m).toLowerCase() === u; });
}

function randHex(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

async function pbkdf2(password, saltHex) {
  const salt = new Uint8Array((String(saltHex || '').match(/.{1,2}/g) || []).map(function (b) { return parseInt(b, 16); }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

async function readAccounts(env) {
  try {
    if (env && env.DREAMSHARE_KV) {
      const j = await env.DREAMSHARE_KV.get('accounts-v1', 'json');
      if (j && j.users) return j;
    }
  } catch (_) {}
  const r = await fetch(USERS_BIN + '?t=' + Date.now(), {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
  });
  if (!r.ok) throw new Error('accounts ' + r.status);
  let j = await r.json();
  if (typeof j === 'string') j = JSON.parse(j);
  if (!j || typeof j !== 'object') j = {};
  if (!j.users || typeof j.users !== 'object') j.users = {};
  if (!j.sessions || typeof j.sessions !== 'object') j.sessions = {};
  return j;
}

async function writeAccounts(env, data) {
  const payload = JSON.stringify({
    users: data.users || {},
    sessions: data.sessions || {},
    storage: 'accounts-v1',
    updated: Date.now()
  });
  let kvOk = false;
  try {
    if (env && env.DREAMSHARE_KV) {
      await env.DREAMSHARE_KV.put('accounts-v1', payload);
      kvOk = true;
    }
  } catch (_) {}
  const r = await fetch(USERS_BIN, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: payload
  });
  if (!r.ok && !kvOk) throw new Error('accounts save ' + r.status);
}

async function loginAccount(env, body) {
  const user = normUser(body.user);
  const pass = String(body.pass || body.password || '');
  if (!user || user.length < 3) return { ok: false, error: 'Username needs 3+ letters or numbers.', code: 'bad-user' };
  if (!pass) return { ok: false, error: 'Password required.', code: 'bad-pass' };
  const db = await readAccounts(env);
  const key = user.toLowerCase();
  const now = Date.now();
  Object.keys(db.sessions).forEach(function (k) {
    if (!db.sessions[k] || (db.sessions[k].exp || 0) < now) delete db.sessions[k];
  });
  let rec = db.users[key];
  let created = false;
  if (!rec) {
    const salt = randHex(16);
    rec = {
      name: user,
      salt: salt,
      hash: await pbkdf2(pass, salt),
      role: isSuper(user) ? 'super' : 'user',
      at: now
    };
    db.users[key] = rec;
    created = true;
  } else {
    const hash = await pbkdf2(pass, rec.salt);
    if (hash !== rec.hash) return { ok: false, error: 'That username is taken. Wrong password.', code: 'taken' };
    if (isSuper(rec.name)) rec.role = 'super';
  }
  const token = randHex(24);
  db.sessions[token] = { user: rec.name, role: rec.role || 'user', exp: now + SESSION_MS };
  await writeAccounts(env, db);
  return { ok: true, user: rec.name, role: rec.role || 'user', token: token, created: created, accounts: 'unique-v1' };
}

async function sessionFromBody(env, body) {
  const token = String(body.token || '');
  if (!/^[a-f0-9]{32,80}$/.test(token)) return null;
  const db = await readAccounts(env);
  const s = db.sessions && db.sessions[token];
  if (!s || (s.exp || 0) < Date.now()) return null;
  const user = normUser(s.user);
  if (!user) return null;
  return { user: user, role: (s.role === 'super' || isSuper(user)) ? 'super' : 'user' };
}

function cleanChunkIds(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(function (id) {
    return /^[A-Za-z0-9]+$/.test(String(id || '')) && String(id) !== FEED_BIN_ID;
  }).slice(0, 200);
}

function postToThread(p) {
  if (!p || p.id === META_ID) return null;
  const text = String(p.text || '');
  const title = String(p.title || text.split('\n')[0] || '').slice(0, 120) || (p.hasAudio ? 'audio' : 'untitled');
  const comments = Array.isArray(p.comments) ? p.comments : [];
  const chunks = cleanChunkIds(p.audioChunks);
  return {
    id: String(p.id || ('t' + (p.at || Date.now()))),
    user: String(p.user || 'anon').slice(0, 24),
    title: title,
    text: text.slice(0, 1000),
    at: p.at || 0,
    hasAudio: !!(p.hasAudio || p.audioData || p.audioUrl || chunks.length || vaultOf(p).audioParts),
    audioId: p.audioId || null,
    audioUrl: (typeof p.audioUrl === 'string' && p.audioUrl.indexOf('http') === 0) ? p.audioUrl : null,
    audioData: (typeof p.audioData === 'string' && p.audioData.indexOf('data:audio') === 0) ? p.audioData : null,
    audioChunks: chunks,
    audioExpires: p.audioExpires || 0,
    audioMime: p.audioMime || 'audio/wav',
    audioStore: vaultOf(p).audioStore,
    audioUpload: vaultOf(p).audioUpload,
    audioParts: vaultOf(p).audioParts,
    audioBytes: vaultOf(p).audioBytes,
    comments: comments.filter(function (c) { return c && c.id && c.id !== META_ID; }).map(function (c) {
      return { id: c.id, user: String(c.user || '').slice(0, 24), text: String(c.text || '').slice(0, 500), at: c.at || 0, reactions: c.reactions || {} };
    })
  };
}

function threadToPost(t) {
  const chunks = cleanChunkIds(t.audioChunks);
  return {
    id: t.id,
    user: t.user,
    title: t.title || '',
    text: t.text || '',
    at: t.at || 0,
    hasAudio: !!(t.hasAudio || t.audioUrl || t.audioData || chunks.length),
    audioId: t.audioId || null,
    audioUrl: t.audioUrl || null,
    audioChunks: chunks,
    audioExpires: t.audioExpires || 0,
    audioMime: t.audioMime || 'audio/wav',
    audioStore: vaultOf(t).audioStore,
    audioUpload: vaultOf(t).audioUpload,
    audioParts: vaultOf(t).audioParts,
    audioBytes: vaultOf(t).audioBytes,
    comments: t.comments || []
  };
}

function mergeThreads(a, b) {
  const map = new Map();
  function take(t) {
    if (!t || !t.id || t.id === META_ID) return;
    const prev = map.get(t.id);
    if (!prev) {
      map.set(t.id, {
        id: t.id,
        user: t.user || 'anon',
        title: t.title || '',
        text: t.text || '',
        at: t.at || 0,
        hasAudio: !!t.hasAudio,
        audioId: t.audioId || null,
        audioUrl: t.audioUrl || null,
        audioData: t.audioData || null,
        audioChunks: cleanChunkIds(t.audioChunks),
        audioExpires: t.audioExpires || 0,
        audioMime: t.audioMime || 'audio/wav',
        audioStore: vaultOf(t).audioStore,
        audioUpload: vaultOf(t).audioUpload,
        audioParts: vaultOf(t).audioParts,
        audioBytes: vaultOf(t).audioBytes,
        comments: Array.isArray(t.comments) ? t.comments.slice() : []
      });
      return;
    }
    const newer = (t.at || 0) >= (prev.at || 0) ? t : prev;
    const older = newer === t ? prev : t;
    const seen = {};
    const comments = [];
    (older.comments || []).concat(newer.comments || []).forEach(function (c) {
      if (!c || !c.id || seen[c.id]) return;
      seen[c.id] = 1;
      comments.push(c);
    });
    const chunks = cleanChunkIds(newer.audioChunks).length ? cleanChunkIds(newer.audioChunks) : cleanChunkIds(older.audioChunks);
    const vault = pickVault(newer, older);
    map.set(t.id, {
      id: t.id,
      user: newer.user || older.user,
      title: newer.title || older.title || '',
      text: (newer.text != null && newer.text !== '') ? newer.text : (older.text || ''),
      at: Math.max(newer.at || 0, older.at || 0),
      hasAudio: !!(newer.hasAudio || older.hasAudio || newer.audioData || older.audioData || newer.audioUrl || older.audioUrl || chunks.length || vault.audioParts),
      audioId: newer.audioId || older.audioId || null,
      audioUrl: newer.audioUrl || older.audioUrl || null,
      audioData: newer.audioData || older.audioData || null,
      audioChunks: chunks,
      audioExpires: Math.max(newer.audioExpires || 0, older.audioExpires || 0),
      audioMime: newer.audioMime || older.audioMime || 'audio/wav',
      audioStore: vault.audioStore,
      audioUpload: vault.audioUpload,
      audioParts: vault.audioParts,
      audioBytes: vault.audioBytes,
      comments: comments
    });
  }
  (a || []).forEach(take);
  (b || []).forEach(take);
  return Array.from(map.values()).sort(function (x, y) { return (y.at || 0) - (x.at || 0); });
}

function feedFromRaw(raw) {
  if (!raw || typeof raw !== 'object') return { threads: [], mods: [], chat: [], updated: 0 };
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (_) { return { threads: [], mods: [], chat: [], updated: 0 }; }
  }
  const fromThreads = (raw.threads || []).map(postToThread).filter(Boolean);
  const fromPosts = (raw.posts || []).map(postToThread).filter(Boolean);
  let mods = Array.isArray(raw.mods) ? raw.mods.slice() : [];
  (raw.posts || []).forEach(function (p) {
    if (p && p.id === META_ID && Array.isArray(p.mods)) mods = mods.concat(p.mods);
  });
  const seen = {};
  mods = mods.filter(function (m) {
    const k = String(m || '').toLowerCase();
    if (!k || seen[k]) return false;
    seen[k] = 1;
    return true;
  }).slice(0, 80);
  const chat = Array.isArray(raw.chat) ? raw.chat.filter(function (m) {
    return m && m.id && m.user && m.text;
  }).slice(-100) : [];
  const roles = (raw.roles && typeof raw.roles === 'object') ? raw.roles : {};
  return { threads: mergeThreads(fromPosts, fromThreads), mods: mods, chat: chat, roles: roles, updated: raw.updated || 0 };
}

function mergeFeeds(a, b) {
  const A = feedFromRaw(a);
  const B = feedFromRaw(b);
  const seen = {};
  const mods = (A.mods || []).concat(B.mods || []).filter(function (m) {
    const k = String(m || '').toLowerCase();
    if (!k || seen[k]) return false;
    seen[k] = 1;
    return true;
  });
  // Prefer the longer / newer chat ring
  let chat = (A.chat && A.chat.length >= (B.chat || []).length) ? A.chat : (B.chat || A.chat || []);
  if ((B.updated || 0) > (A.updated || 0) && (B.chat || []).length) chat = B.chat;
  chat = (chat || []).slice(-100);
  const roles = Object.assign({}, A.roles || {}, B.roles || {});
  return {
    threads: mergeThreads(A.threads, B.threads),
    mods: mods,
    chat: chat,
    roles: roles,
    updated: Math.max(A.updated || 0, B.updated || 0)
  };
}

async function readBin() {
  const r = await fetch(BIN + '?t=' + Date.now(), {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
  });
  if (!r.ok) throw new Error('bin read ' + r.status);
  const text = await r.text();
  let j = JSON.parse(text);
  if (typeof j === 'string') j = JSON.parse(j);
  if (!j || typeof j !== 'object') throw new Error('bin empty');
  return j;
}

async function readKv(env) {
  try {
    if (env && env.DREAMSHARE_KV) return await env.DREAMSHARE_KV.get('feed-v4', 'json');
  } catch (_) {}
  return null;
}

async function readFeed(env) {
  const bin = await readBin();
  const kv = await readKv(env);
  return mergeFeeds(bin, kv);
}

function binPayload(feed) {
  const threads = (feed.threads || []).filter(function (t) { return t && t.id && t.id !== META_ID; });
  const posts = threads.map(threadToPost);
  posts.push({
    id: META_ID,
    user: 'system',
    title: '',
    text: '',
    at: 0,
    hasAudio: false,
    audioId: null,
    mods: feed.mods || [],
    hidden: true
  });
  const slim = {
    posts: posts,
    threads: threads.map(function (t) {
      return {
        id: t.id, user: t.user, title: t.title || '', text: t.text || '', at: t.at || 0,
        hasAudio: !!(t.hasAudio || t.audioUrl || (t.audioChunks && t.audioChunks.length) || vaultOf(t).audioParts),
        audioId: t.audioId || null,
        audioUrl: t.audioUrl || null,
        audioChunks: cleanChunkIds(t.audioChunks),
        audioExpires: t.audioExpires || 0,
        audioMime: t.audioMime || 'audio/wav',
        audioStore: vaultOf(t).audioStore,
        audioUpload: vaultOf(t).audioUpload,
        audioParts: vaultOf(t).audioParts,
        audioBytes: vaultOf(t).audioBytes,
        comments: (t.comments || []).slice(-40)
      };
    }),
    mods: feed.mods || [],
    roles: feed.roles || {},
    chat: Array.isArray(feed.chat) ? feed.chat.slice(-100) : [],
    updated: Date.now(),
    storage: STORAGE
  };
  let body = JSON.stringify(slim);
  while (body.length > MAX_BIN && slim.threads.length > 1) {
    const drop = slim.threads[slim.threads.length - 1];
    slim.threads.pop();
    slim.posts = slim.posts.filter(function (p) { return p.id !== drop.id; });
    body = JSON.stringify(slim);
  }
  return body;
}

async function writeBin(feed) {
  const before = await readBin();
  const beforeCount = ((before && before.posts) || []).filter(function (p) { return p && p.id !== META_ID; }).length;
  const nextCount = (feed.threads || []).filter(function (t) { return t && t.id !== META_ID; }).length;
  if (beforeCount > 0 && nextCount === 0) throw new Error('refusing to wipe threads');
  const body = binPayload(feed);
  const r = await fetch(BIN, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body
  });
  if (!r.ok) throw new Error('bin write ' + r.status);
  return true;
}

async function writeKv(env, feed) {
  if (!env || !env.DREAMSHARE_KV) return false;
  const copy = {
    threads: (feed.threads || []).map(function (t) {
      const audio = (typeof t.audioData === 'string' && t.audioData.indexOf('data:audio') === 0)
        ? t.audioData.slice(0, 1500000) : null;
      return {
        id: t.id, user: t.user, title: t.title || '', text: t.text || '', at: t.at || 0,
        hasAudio: !!(t.hasAudio || audio || t.audioUrl || vaultOf(t).audioParts), audioId: t.audioId || null,
        audioUrl: t.audioUrl || null, audioData: audio,
        audioStore: vaultOf(t).audioStore,
        audioUpload: vaultOf(t).audioUpload,
        audioParts: vaultOf(t).audioParts,
        audioBytes: vaultOf(t).audioBytes,
        comments: t.comments || []
      };
    }),
    mods: feed.mods || [],
    roles: feed.roles || {},
    chat: Array.isArray(feed.chat) ? feed.chat.slice(-100) : [],
    updated: Date.now(),
    storage: STORAGE
  };
  let body = JSON.stringify(copy);
  while (body.length > 20000000 && copy.threads.length) {
    for (let i = copy.threads.length - 1; i >= 0; i--) {
      if (copy.threads[i].audioData) { copy.threads[i].audioData = null; break; }
    }
    body = JSON.stringify(copy);
    if (!copy.threads.some(function (t) { return t.audioData; })) break;
  }
  await env.DREAMSHARE_KV.put('feed-v4', body);
  return true;
}


const ONLINE_TTL = 55000;
async function readOnline(env) {
  const now = Date.now();
  let map = {};
  try {
    if (env && env.DREAMSHARE_KV) {
      const raw = await env.DREAMSHARE_KV.get('presence-v1');
      if (raw) map = JSON.parse(raw);
    }
  } catch (_) {}
  return Object.keys(map || {}).filter(function (k) { return now - (map[k] || 0) < ONLINE_TTL; });
}
async function touchOnline(env, user) {
  const now = Date.now();
  let map = {};
  try {
    if (env && env.DREAMSHARE_KV) {
      const raw = await env.DREAMSHARE_KV.get('presence-v1');
      if (raw) map = JSON.parse(raw);
    }
  } catch (_) { map = {}; }
  map[user] = now;
  Object.keys(map).forEach(function (k) { if (now - map[k] > ONLINE_TTL) delete map[k]; });
  try {
    if (env && env.DREAMSHARE_KV) await env.DREAMSHARE_KV.put('presence-v1', JSON.stringify(map));
  } catch (_) {}
  return Object.keys(map);
}

async function writeFeed(env, feed) {
  await writeBin(feed);
  try { await writeKv(env, feed); } catch (_) {}
  return true;
}

async function deleteChunk(id) {
  if (!id || !/^[A-Za-z0-9]+$/.test(String(id)) || String(id) === FEED_BIN_ID) return;
  try { await fetch(BIN_API + '/' + id, { method: 'DELETE' }); } catch (_) {}
}

async function storeAudioChunks(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:audio') !== 0) return null;
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const meta = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, '');
  if (!b64 || b64.length > 12000000) return null;
  const mime = (meta.match(/^data:([^;]+)/) || [])[1] || 'audio/wav';
  const n = Math.ceil(b64.length / CHUNK_B64);
  if (n > 200) return null;
  const ids = [];
  try {
    for (let i = 0; i < n; i++) {
      const r = await fetch(BIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ i: i, n: n, b: b64.slice(i * CHUNK_B64, (i + 1) * CHUNK_B64) })
      });
      if (!r.ok) throw new Error('audio store ' + r.status);
      const j = await r.json();
      if (!j || !j.id) throw new Error('audio store missing id');
      ids.push(j.id);
    }
  } catch (err) {
    for (let i = 0; i < ids.length; i++) await deleteChunk(ids[i]);
    throw err;
  }
  return { chunks: ids, mime: mime, expires: Date.now() + AUDIO_KEEP_MS };
}

async function readChunkB64(ids) {
  let b64 = '';
  for (let i = 0; i < ids.length; i++) {
    const r = await fetch(BIN_API + '/' + ids[i] + '?t=' + Date.now(), {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
    });
    if (!r.ok) throw new Error('audio read ' + r.status);
    let j = await r.json();
    if (typeof j === 'string') j = JSON.parse(j);
    b64 += (j && j.b) || '';
  }
  return b64;
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function purgeExpired(env, feed) {
  const now = Date.now();
  let changed = false;
  const doomed = [];
  (feed.threads || []).forEach(function (t) {
    if (!t || !t.audioExpires || now <= t.audioExpires) return;
    const has = (t.audioChunks && t.audioChunks.length) || t.audioData || t.audioUrl || t.hasAudio;
    if (!has) return;
    if (t.audioChunks) doomed.push.apply(doomed, t.audioChunks);
    const vaultGone = vaultOf(t);
    t.audioChunks = [];
    t.audioData = null;
    t.audioUrl = null;
    t.audioStore = '';
    t.audioUpload = '';
    t.audioParts = 0;
    t.audioBytes = 0;
    t.hasAudio = false;
    changed = true;
    t._vaultGone = vaultGone;
  });
  for (let i = 0; i < doomed.length && i < 30; i++) await deleteChunk(doomed[i]);
  for (let i = 0; i < (feed.threads || []).length; i++) {
    const t = feed.threads[i];
    if (t && t._vaultGone) {
      await deleteVault(env, t._vaultGone);
      delete t._vaultGone;
    }
  }
  return changed;
}

async function loadFeed(env) {
  const feed = await readFeed(env);
  if (await purgeExpired(env, feed)) {
    try { await writeBin(feed); } catch (_) {}
  }
  return feed;
}

function publicThread(t, origin) {
  const chunks = cleanChunkIds(t.audioChunks);
  const vault = vaultOf(t);
  const alive = !t.audioExpires || Date.now() <= t.audioExpires;
  const playUrl = (alive && chunks.length && origin) ? (origin + '/?wav=' + encodeURIComponent(t.id)) : (t.audioUrl || null);
  const has = !!(alive && (t.hasAudio || chunks.length || playUrl || vault.audioParts));
  return {
    id: t.id,
    user: t.user,
    title: t.title || '',
    text: t.text || '',
    at: t.at || 0,
    hasAudio: has,
    audioId: t.audioId || null,
    audioUrl: alive ? (playUrl || (vault.audioParts ? (origin + '/?wav=' + encodeURIComponent(t.id)) : null)) : null,
    audioChunks: alive ? chunks : [],
    audioExpires: t.audioExpires || 0,
    audioMime: t.audioMime || 'audio/wav',
    audioStore: alive ? vault.audioStore : '',
    audioParts: alive ? vault.audioParts : 0,
    audioBytes: alive ? vault.audioBytes : 0,
    audioKeepDays: 100,
    comments: (t.comments || []).map(function (c) {
      return { id: c.id, user: c.user, text: c.text, at: c.at || 0, reactions: c.reactions || {} };
    }),
    reactions: t.reactions || {}
  };
}

function vaultOf(t) {
  t = t || {};
  const store = (t.audioStore === 'r2' || t.audioStore === 'kv') ? t.audioStore : '';
  const upload = String(t.audioUpload || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
  const parts = Math.max(0, Math.min(20, parseInt(t.audioParts, 10) || 0));
  const bytes = Math.max(0, Math.min(MAX_AUDIO_BYTES, parseInt(t.audioBytes, 10) || 0));
  if (!store || !upload || !parts) return { audioStore: '', audioUpload: '', audioParts: 0, audioBytes: 0 };
  return { audioStore: store, audioUpload: upload, audioParts: parts, audioBytes: bytes };
}

function pickVault(newer, older) {
  const a = vaultOf(newer);
  if (a.audioStore) return a;
  return vaultOf(older);
}

function audioSink(env) {
  if (env && env.DREAMSHARE_R2) return 'r2';
  if (env && env.DREAMSHARE_KV) return 'kv';
  return 'bin';
}

async function deleteVault(env, t) {
  const v = vaultOf(t);
  if (!v.audioStore) return;
  for (let i = 0; i < v.audioParts; i++) {
    const key = v.audioStore === 'r2' ? ('wav/' + v.audioUpload + '/' + i) : ('wav:' + v.audioUpload + ':' + i);
    try {
      if (v.audioStore === 'r2' && env && env.DREAMSHARE_R2) await env.DREAMSHARE_R2.delete(key);
      if (v.audioStore === 'kv' && env && env.DREAMSHARE_KV) await env.DREAMSHARE_KV.delete(key);
    } catch (_) {}
  }
}

async function handleAudioPart(request, env) {
  const token = String(request.headers.get('x-sw-token') || '');
  const upload = String(request.headers.get('x-sw-upload') || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
  const index = parseInt(request.headers.get('x-sw-index') || '', 10);
  const parts = parseInt(request.headers.get('x-sw-parts') || '', 10);
  const len = parseInt(request.headers.get('content-length') || '0', 10);
  if (!/^[A-Za-z0-9][A-Za-z0-9_\-]{3,47}$/.test(upload)) return json({ ok: false, error: 'bad upload' }, 400);
  if (!Number.isFinite(index) || index < 0 || index > 19) return json({ ok: false, error: 'bad part' }, 400);
  if (!Number.isFinite(parts) || parts < 1 || parts > 20 || index >= parts) return json({ ok: false, error: 'bad part count' }, 400);
  if (!len || len > MAX_PART_BYTES) return json({ ok: false, error: 'Each piece must be 4 MB or smaller' }, 413);
  let sess = null;
  try { sess = await sessionFromBody(env, { token: token }); }
  catch (err) { return json({ ok: false, error: 'account check failed' }, 502); }
  if (!sess) return json({ ok: false, error: 'Log in on the homepage.', code: 'auth' }, 401);
  const sink = audioSink(env);
  if (sink === 'bin') {
    return json({
      ok: false,
      error: 'Bind DREAMSHARE_R2 (recommended) or DREAMSHARE_KV on this worker. The public JSON bin cannot hold a 75 MB tape.',
      code: 'no-sink'
    }, 400);
  }
  const key = sink === 'r2' ? ('wav/' + upload + '/' + index) : ('wav:' + upload + ':' + index);
  try {
    if (sink === 'r2') {
      await env.DREAMSHARE_R2.put(key, request.body, { httpMetadata: { contentType: 'audio/wav' } });
    } else {
      await env.DREAMSHARE_KV.put(key, request.body);
    }
  } catch (err) {
    return json({ ok: false, error: 'tape store failed: ' + String(err && err.message || err) }, 502);
  }
  return json({ ok: true, sink: sink, upload: upload, index: index, parts: parts, audioMaxBytes: MAX_AUDIO_BYTES });
}

export default {
  async fetch(request, env) {
    const method = (request.method || 'GET').toUpperCase();
    const url = new URL(request.url);

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if ((method === 'POST' || method === 'PUT') && url.searchParams.get('op') === 'audio_part') {
      return handleAudioPart(request, env);
    }

    if (method === 'GET' || method === 'HEAD') {
      const wavId = String(url.searchParams.get('wav') || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
      if (wavId) {
        try {
          const feed = await loadFeed(env);
          const thread = (feed.threads || []).find(function (t) { return t && t.id === wavId; });
          if (!thread || (thread.audioExpires && Date.now() > thread.audioExpires)) {
            return json({ ok: false, error: 'wav expired or missing' }, 404);
          }
          const vault = vaultOf(thread);
          if (vault.audioStore) {
            const part = parseInt(url.searchParams.get('part') || '0', 10);
            if (!Number.isFinite(part) || part < 0 || part >= vault.audioParts) {
              return json({ ok: false, error: 'wav piece missing' }, 404);
            }
            const key = vault.audioStore === 'r2'
              ? ('wav/' + vault.audioUpload + '/' + part)
              : ('wav:' + vault.audioUpload + ':' + part);
            const mime = thread.audioMime || 'audio/wav';
            const headers = {
              'Content-Type': mime,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*'
            };
            if (vault.audioStore === 'r2') {
              if (!env || !env.DREAMSHARE_R2) return json({ ok: false, error: 'R2 not bound' }, 502);
              const obj = await env.DREAMSHARE_R2.get(key);
              if (!obj) return json({ ok: false, error: 'wav piece missing' }, 404);
              return new Response(obj.body, { status: 200, headers: headers });
            }
            if (!env || !env.DREAMSHARE_KV) return json({ ok: false, error: 'KV not bound' }, 502);
            const stream = await env.DREAMSHARE_KV.get(key, 'stream');
            if (!stream) return json({ ok: false, error: 'wav piece missing' }, 404);
            return new Response(stream, { status: 200, headers: headers });
          }
          const chunks = cleanChunkIds(thread.audioChunks);
          if (!chunks.length) return json({ ok: false, error: 'wav expired or missing' }, 404);
          const b64 = await readChunkB64(chunks);
          const bytes = b64ToBytes(b64);
          return new Response(bytes, {
            status: 200,
            headers: {
              'Content-Type': thread.audioMime || 'audio/wav',
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (err) {
          return json({ ok: false, error: 'wav read failed' }, 502);
        }
      }
      try {
        const feed = await loadFeed(env);
        const origin = url.origin;
        const threads = (feed.threads || []).map(function (t) { return publicThread(t, origin); });
        if (method === 'HEAD') {
          return new Response(null, { status: 200, headers: CORS });
        }
        const chat = Array.isArray(feed.chat) ? feed.chat.slice(-100) : [];
        const online = await readOnline(env);
        return json({
          ok: true,
          storage: STORAGE,
          audioKeepDays: 100,
          audioMaxBytes: MAX_AUDIO_BYTES,
          audioVault: audioSink(env) !== 'bin',
          audioSink: audioSink(env),
          threads: threads,
          chat: chat,
          chatMax: 100,
          mods: feed.mods || [],
          roles: feed.roles || {},
          online: online,
          supers: SUPER_ADMINS,
          updated: feed.updated || Date.now(),
          kv: !!(env && env.DREAMSHARE_KV)
        });
      } catch (err) {
        return json({ ok: false, error: 'store read failed', detail: String(err && err.message || err) }, 502);
      }
    }

    if (method === 'POST' || method === 'PUT') {
      let body = {};
      try { body = await request.json(); }
      catch (_) {
        try { const t = await request.text(); body = t ? JSON.parse(t) : {}; }
        catch (_) { body = {}; }
      }

      const action = String(body.action || body.type || 'create_thread').toLowerCase();
      if (action === 'login' || action === 'register') {
        try { return json(await loginAccount(env, body)); }
        catch (err) { return json({ ok: false, error: String(err && err.message || err) }, 502); }
      }
      let sess = null;
      try { sess = await sessionFromBody(env, body); }
      catch (err) { return json({ ok: false, error: 'account check failed' }, 502); }
      if (!sess) return json({ ok: false, error: 'Log in on the homepage.', code: 'auth' }, 401);
      const user = sess.user;

      let feed;
      try { feed = await loadFeed(env); }
      catch (err) { return json({ ok: false, error: 'store read failed' }, 502); }
      if (!Array.isArray(feed.threads)) feed.threads = [];
      if (!Array.isArray(feed.mods)) feed.mods = [];

      try {
        if (action === 'create_thread' || action === 'post' || action === 'thread') {
          const title = String(body.title || body.text || '').slice(0, 120).trim();
          const text = String(body.text || '').slice(0, 1000).trim();
          const vault = vaultOf({
            audioStore: body.audioStore,
            audioUpload: body.audioUpload,
            audioParts: body.audioParts,
            audioBytes: body.audioBytes
          });
          if (vault.audioBytes > MAX_AUDIO_BYTES) return json({ ok: false, error: 'WAV over 75 MB' }, 413);
          if ((body.audioStore === 'r2' || body.audioStore === 'kv') && !vault.audioStore) {
            return json({ ok: false, error: 'tape incomplete' }, 400);
          }
          if (vault.audioStore === 'r2' && audioSink(env) !== 'r2') return json({ ok: false, error: 'R2 not bound' }, 400);
          if (vault.audioStore === 'kv' && audioSink(env) === 'bin') return json({ ok: false, error: 'KV not bound' }, 400);
          if (!title && !text && !body.audioData && !body.hasAudio && !vault.audioParts) return json({ ok: false, error: 'empty' }, 400);
          const id = String(body.id || ('t' + Date.now() + Math.floor(Math.random() * 999))).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          let audioData = null;
          if (typeof body.audioData === 'string' && body.audioData.indexOf('data:audio') === 0) {
            audioData = body.audioData.slice(0, 2500000);
          }
          let audioChunks = cleanChunkIds(body.audioChunks);
          let audioExpires = Number(body.audioExpires) || 0;
          let audioMime = String(body.audioMime || 'audio/wav').slice(0, 40);
          if (audioData && !audioChunks.length) {
            const stored = await storeAudioChunks(audioData);
            if (!stored) return json({ ok: false, error: 'wav too big' }, 400);
            audioChunks = stored.chunks;
            audioExpires = stored.expires;
            audioMime = stored.mime;
          }
          if (audioChunks.length && !audioExpires) audioExpires = Date.now() + AUDIO_KEEP_MS;
          let audioUrl = (typeof body.audioUrl === 'string' && body.audioUrl.indexOf('http') === 0) ? body.audioUrl : null;
          const thread = {
            id: id,
            user: user,
            title: title || text.slice(0, 80) || 'audio',
            text: text || title,
            at: body.at || Date.now(),
            comments: [],
            hasAudio: !!(body.hasAudio || audioChunks.length || audioUrl || vault.audioParts),
            audioId: body.audioId || (audioChunks.length || vault.audioParts ? ('a' + id) : null),
            audioUrl: audioUrl,
            audioChunks: audioChunks,
            audioExpires: audioExpires || (vault.audioParts ? (Date.now() + AUDIO_KEEP_MS) : 0),
            audioMime: audioMime,
            audioStore: vault.audioStore,
            audioUpload: vault.audioUpload,
            audioParts: vault.audioParts,
            audioBytes: vault.audioBytes
          };
          feed.threads = mergeThreads(feed.threads.filter(function (t) { return t && t.id !== id; }), [thread]);
          feed.updated = Date.now();
          await writeFeed(env, feed);
          const origin = new URL(request.url).origin;
          return json({ ok: true, storage: STORAGE, id: id, audioKeepDays: 100, thread: publicThread(thread, origin) });
        }

        if (action === 'comment' || action === 'reply') {
          const threadId = String(body.threadId || body.id || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          const text = String(body.text || '').slice(0, 500).trim();
          if (!threadId || !text) return json({ ok: false, error: 'empty' }, 400);
          const thread = feed.threads.find(function (t) { return t && t.id === threadId; });
          if (!thread) return json({ ok: false, error: 'thread not found' }, 404);
          if (!Array.isArray(thread.comments)) thread.comments = [];
          const cid = String(body.commentId || ('c' + Date.now() + Math.floor(Math.random() * 999))).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          const comment = { id: cid, user: user, text: text, at: body.at || Date.now() };
          thread.comments.push(comment);
          if (thread.comments.length > 80) thread.comments = thread.comments.slice(-80);
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, id: cid, comment: comment, threadId: threadId });
        }

        if (action === 'delete_thread') {
          const threadId = String(body.threadId || body.id || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          const thread = feed.threads.find(function (t) { return t && t.id === threadId; });
          if (!thread) return json({ ok: false, error: 'thread not found' }, 404);
          const owner = String(thread.user || '').toLowerCase() === user.toLowerCase();
          if (!owner && !isMod(feed, user)) return json({ ok: false, error: 'not allowed' }, 403);
          const gone = cleanChunkIds(thread.audioChunks);
          const vaultGone = vaultOf(thread);
          feed.threads = feed.threads.filter(function (t) { return t && t.id !== threadId; });
          feed.updated = Date.now();
          await writeFeed(env, feed);
          for (let i = 0; i < gone.length; i++) await deleteChunk(gone[i]);
          await deleteVault(env, vaultGone);
          return json({ ok: true, storage: STORAGE, deleted: threadId });
        }

        if (action === 'delete_comment') {
          const threadId = String(body.threadId || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          const commentId = String(body.commentId || body.id || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          const thread = feed.threads.find(function (t) { return t && t.id === threadId; });
          if (!thread) return json({ ok: false, error: 'thread not found' }, 404);
          const comment = (thread.comments || []).find(function (c) { return c && c.id === commentId; });
          if (!comment) return json({ ok: false, error: 'comment not found' }, 404);
          const owner = String(comment.user || '').toLowerCase() === user.toLowerCase();
          if (!owner && !isMod(feed, user)) return json({ ok: false, error: 'not allowed' }, 403);
          thread.comments = (thread.comments || []).filter(function (c) { return c && c.id !== commentId; });
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, deleted: commentId });
        }

        if (action === 'promote_mod' || action === 'mod') {
          if (!isSuper(user) || sess.role !== 'super') return json({ ok: false, error: 'only the real Trippah / Goonr login can promote mods' }, 403);
          const target = normUser(body.target || body.who);
          if (!target || target.length < 3) return json({ ok: false, error: 'bad target' }, 400);
          if (isSuper(target)) return json({ ok: false, error: 'supers are already above mods' }, 400);
          if (!feed.mods.some(function (m) { return String(m).toLowerCase() === target.toLowerCase(); })) feed.mods.push(target);
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, mods: feed.mods, promoted: target });
        }

        if (action === 'demote_mod' || action === 'unmod') {
          if (!isSuper(user) || sess.role !== 'super') return json({ ok: false, error: 'only the real Trippah / Goonr login can demote mods' }, 403);
          const target = normUser(body.target || body.who);
          if (!target) return json({ ok: false, error: 'bad target' }, 400);
          feed.mods = feed.mods.filter(function (m) { return String(m).toLowerCase() !== target.toLowerCase(); });
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, mods: feed.mods, demoted: target });
        }

        // ---- Live chat (last 100 messages, ring buffer) ----
        if (action === 'chat_list' || action === 'chat_get') {
          const chat = Array.isArray(feed.chat) ? feed.chat.slice(-100) : [];
          return json({ ok: true, storage: STORAGE, chat: chat, chatMax: 100, mods: feed.mods || [], supers: SUPER_ADMINS });
        }

        if (action === 'chat_send' || action === 'chat') {
          const text = String(body.text || body.message || '').slice(0, 400).trim();
          if (!text) return json({ ok: false, error: 'empty message' }, 400);
          if (!Array.isArray(feed.chat)) feed.chat = [];
          const msg = {
            id: String(body.id || ('m' + Date.now() + Math.floor(Math.random() * 999))).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48),
            user: user,
            text: text,
            at: body.at || Date.now()
          };
          feed.chat.push(msg);
          // Keep only the last 100 messages — older ones are dropped
          if (feed.chat.length > 100) feed.chat = feed.chat.slice(-100);
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, message: msg, chat: feed.chat.slice(-100), chatMax: 100 });
        }


        if (action === 'react') {
          const kind = String(body.kind || 'comment');
          const emoji = String(body.emoji || '').replace(/[^a-z0-9]/g, '').slice(0, 12);
          const allowed = { up:1, heart:1, fire:1, laugh:1, skull:1, moon:1, eyes:1, '100':1 };
          if (!allowed[emoji]) return json({ ok: false, error: 'bad emoji' }, 400);
          const id = String(body.id || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          if (!id) return json({ ok: false, error: 'missing id' }, 400);
          function toggle(bag) {
            bag.reactions = bag.reactions || {};
            const list = Array.isArray(bag.reactions[emoji]) ? bag.reactions[emoji].slice() : [];
            const me = user.toLowerCase();
            const idx = list.findIndex(function (u) { return String(u).toLowerCase() === me; });
            if (idx >= 0) list.splice(idx, 1);
            else list.push(user);
            bag.reactions[emoji] = list.slice(0, 80);
            return bag.reactions;
          }
          if (kind === 'chat') {
            if (!Array.isArray(feed.chat)) feed.chat = [];
            const msg = feed.chat.find(function (m) { return m && m.id === id; });
            if (!msg) return json({ ok: false, error: 'message not found' }, 404);
            toggle(msg);
            feed.updated = Date.now();
            await writeFeed(env, feed);
            return json({ ok: true, storage: STORAGE, reactions: msg.reactions, chat: feed.chat.slice(-100) });
          }
          const threadId = String(body.threadId || (kind === 'thread' ? id : '')).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          const thread = feed.threads.find(function (t) { return t && t.id === threadId; });
          if (!thread) return json({ ok: false, error: 'thread not found' }, 404);
          if (kind === 'thread') {
            toggle(thread);
          } else {
            const comment = (thread.comments || []).find(function (c) { return c && c.id === id; });
            if (!comment) return json({ ok: false, error: 'comment not found' }, 404);
            toggle(comment);
          }
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, threadId: thread.id });
        }

        if (action === 'chat_delete' || action === 'chat_mod_delete') {
          const msgId = String(body.messageId || body.id || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 48);
          if (!msgId) return json({ ok: false, error: 'missing id' }, 400);
          if (!Array.isArray(feed.chat)) feed.chat = [];
          const msg = feed.chat.find(function (m) { return m && m.id === msgId; });
          if (!msg) return json({ ok: false, error: 'message not found' }, 404);
          const owner = String(msg.user || '').toLowerCase() === user.toLowerCase();
          const canMod = isSuper(user) || isMod(feed, user) || sess.role === 'super';
          if (!owner && !canMod) return json({ ok: false, error: 'not allowed' }, 403);
          feed.chat = feed.chat.filter(function (m) { return m && m.id !== msgId; });
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, deleted: msgId, chat: feed.chat.slice(-100) });
        }

        if (action === 'chat_clear') {
          const canMod = isSuper(user) || isMod(feed, user) || sess.role === 'super';
          if (!canMod) return json({ ok: false, error: 'mods only' }, 403);
          feed.chat = [];
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, chat: [], cleared: true });
        }

        if (action === 'presence' || action === 'heartbeat') {
          const online = await touchOnline(env, user);
          return json({ ok: true, storage: STORAGE, online: online, user: user });
        }

        if (action === 'set_role' || action === 'clear_role') {
          const canMod = isSuper(user) || isMod(feed, user) || sess.role === 'super';
          if (!canMod) return json({ ok: false, error: 'mods only' }, 403);
          const target = String(body.target || body.name || '').trim();
          const roleName = String(body.role || 'kyoto').toLowerCase();
          if (!target) return json({ ok: false, error: 'missing target' }, 400);
          if (roleName !== 'kyoto') return json({ ok: false, error: 'unknown role' }, 400);
          if (!feed.roles || typeof feed.roles !== 'object') feed.roles = {};
          const key = Object.keys(feed.roles).find(function (k) { return k.toLowerCase() === target.toLowerCase(); }) || target;
          let list = Array.isArray(feed.roles[key]) ? feed.roles[key].slice() : [];
          if (action === 'set_role') {
            if (list.indexOf('kyoto') < 0) list.push('kyoto');
            feed.roles[target] = list;
            if (key !== target) delete feed.roles[key];
          } else {
            list = list.filter(function (r) { return r !== 'kyoto'; });
            if (list.length) feed.roles[key] = list;
            else delete feed.roles[key];
          }
          feed.updated = Date.now();
          await writeFeed(env, feed);
          return json({ ok: true, storage: STORAGE, roles: feed.roles, target: target, role: roleName });
        }

        return json({ ok: false, error: 'unknown action', action: action }, 400);
      } catch (err) {
        return json({ ok: false, error: String(err && err.message || err) }, 502);
      }
    }

    return json({ ok: false, error: 'unsupported method', got: method }, 405);
  }
};
