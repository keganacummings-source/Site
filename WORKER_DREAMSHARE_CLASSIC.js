/**
 * DO NOT DEPLOY THIS FILE.
 * It rewrites the DreamShare bin as a flat post list and will drop
 * mods (and any fields it does not copy). Use WORKER_DREAMSHARE.js.
 *
 * Kept only as a reference for the old extendsclass bin id.
 */
const BIN = 'https://extendsclass.com/api/json-storage/bin/abffdbc';

async function readFeed() {
  try {
    const r = await fetch(BIN + '?t=' + Date.now(), { headers: { Accept: 'application/json' } });
    if (!r.ok) return { posts: [], updated: 0 };
    const j = await r.json();
    if (!j || !Array.isArray(j.posts)) return { posts: [], updated: 0 };
    return { posts: j.posts, updated: j.updated || Date.now() };
  } catch (_) {
    return { posts: [], updated: 0 };
  }
}

async function writeFeed(data) {
  const r = await fetch(BIN, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data)
  });
  return r.ok;
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400'
    }
  });
}

addEventListener('fetch', function (event) {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const method = (request.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  if (method === 'GET' || method === 'HEAD') {
    const feed = await readFeed();
    const posts = (feed.posts || []).map(function (p) {
      return {
        id: p.id || ('p' + (p.at || 0)),
        user: String(p.user || 'anon').slice(0, 24),
        text: String(p.text || '').slice(0, 280),
        at: p.at || 0,
        hasAudio: !!p.hasAudio,
        audioId: p.audioId || null
      };
    }).sort(function (a, b) { return (a.at || 0) - (b.at || 0); }).slice(-200);
    if (method === 'HEAD') {
      return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }
    return json({ ok: true, posts: posts });
  }

  if (method === 'POST' || method === 'PUT') {
    var body = {};
    try { body = await request.json(); } catch (_) {
      try { var t = await request.text(); body = t ? JSON.parse(t) : {}; } catch (_) { body = {}; }
    }
    var user = String(body.user || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
    var text = String(body.text || '').slice(0, 280);
    var id = String(body.id || ('p' + Date.now())).replace(/[^A-Za-z0-9_]/g, '').slice(0, 40);
    if (!user || user.length < 3) return json({ ok: false, error: 'bad user' }, 400);
    if (!text && !body.hasAudio) return json({ ok: false, error: 'empty' }, 400);
    var feed = await readFeed();
    var safePost = { id: id, user: user, text: text, at: body.at || Date.now(), hasAudio: !!body.hasAudio, audioId: body.audioId || null };
    feed.posts = (feed.posts || []).filter(function (p) { return p && p.id !== id; });
    feed.posts.push(safePost);
    if (feed.posts.length > 200) feed.posts = feed.posts.slice(-200);
    feed.updated = Date.now();
    if (!(await writeFeed(feed))) return json({ ok: false, error: 'store failed' }, 502);
    return json({ ok: true, id: id });
  }

  return json({ ok: false, error: 'unsupported method', got: method }, 405);
}
