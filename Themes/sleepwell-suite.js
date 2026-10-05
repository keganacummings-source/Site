/* Shared machine-suite helpers. Does not replace a machine's engine. */
(function () {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  function ensureVar(name, fallback) {
    const cur = (cs.getPropertyValue(name) || '').trim();
    if (!cur) root.style.setProperty(name, fallback);
  }
  ensureVar('--text-dim', cs.getPropertyValue('--dim').trim() || '#a0a0a0');
  ensureVar('--accent-dim', cs.getPropertyValue('--accent').trim() || '#a01818');
  ensureVar('--accent-bright', cs.getPropertyValue('--accent2').trim() || '#ff3333');
  ensureVar('--panel-2', cs.getPropertyValue('--bg').trim() || '#0d0d0d');
  if (!cs.getPropertyValue('--dim').trim()) root.style.setProperty('--dim', cs.getPropertyValue('--text-dim').trim() || '#a0a0a0');

  if (typeof window.dreamTapeName !== 'function') {
    window.dreamTapeName = function () {
      const A = ['CROW','TICK','MOTH','BAT','WOLF','RAT','OWL','FOX','EEL','HAWK'];
      const F = ['BURGER','SOUP','STEW','PIE','HASH','CAKE','BUN','GRAVY','JAM','LOAF'];
      return A[(Math.random() * A.length) | 0] + F[(Math.random() * F.length) | 0];
    };
  }
  function wrapDownload() {
    const orig = typeof window.dreamForceDownload === 'function'
      ? window.dreamForceDownload
      : function (blob, filename) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 2500);
        };
    window.dreamForceDownload = function (blob, filename) {
      if (window.__SW_SKIP_DOWNLOAD) return;
      return orig(blob, filename);
    };
  }
  // Always install a reliable session save — overrides weak/broken copies
  window.dreamSaveBlob = async function (blob, filename) {
    try {
      if (!(window.parent && window.parent !== window)) {
        console.warn('dreamSaveBlob: not in iframe — cannot reach Master SESSION');
        return false;
      }
      if (!blob || !blob.size) return false;
      const buffer = await blob.arrayBuffer();
      // Uint8Array clones more reliably across iframe boundaries than bare ArrayBuffer in some browsers
      const bytes = new Uint8Array(buffer);
      const machine = (document.title || '').split(/[—\-·|]/)[0].trim() || 'MACHINE';
      const fname = filename || (machine + '_' + Date.now() + '.wav');
      return await new Promise((resolve) => {
        const t = setTimeout(() => {
          window.removeEventListener('message', onMsg);
          resolve(false);
        }, 8000);
        function onMsg(e) {
          if (!e.data || e.data.type !== 'DREAM_SAVE_RESULT') return;
          // Accept result even if filename differs slightly (encoding / rename)
          window.removeEventListener('message', onMsg);
          clearTimeout(t);
          resolve(!!e.data.ok);
        }
        window.addEventListener('message', onMsg);
        try {
          const tight = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          window.parent.postMessage({
            type: 'DREAM_SAVE',
            filename: fname,
            buffer: tight,
            bytes: new Uint8Array(tight),
            machine: machine,
            mime: (blob.type || 'audio/wav')
          }, '*');
        } catch (err) {
          clearTimeout(t);
          window.removeEventListener('message', onMsg);
          resolve(false);
        }
      });
    } catch (err) {
      console.warn('dreamSaveBlob', err);
      return false;
    }
  };
  if (typeof window.dreamRequestSamples !== 'function') {
    window.dreamRequestSamples = async function (folderHint) {
      if (!(window.parent && window.parent !== window)) return [];
      return await new Promise((resolve) => {
        const t = setTimeout(() => resolve([]), 1800);
        function onMsg(e) {
          if (!e.data) return;
          if (e.data.type !== 'DREAM_SAMPLES' && e.data.type !== 'DREAM_ABC_SAMPLES') return;
          window.removeEventListener('message', onMsg);
          clearTimeout(t);
          resolve(e.data.items || []);
        }
        window.addEventListener('message', onMsg);
        try { window.parent.postMessage({ type: 'DREAM_NEED_SAMPLES', folder: folderHint || '' }, '*'); } catch (_) {}
      });
    };
  }

  function bootChrome() {
    wrapDownload();
    document.querySelectorAll('button:not([type])').forEach((b) => { b.type = 'button'; });

    const controls = document.querySelector('.controls');
    if (controls && !document.getElementById('learnBtn')) {
      const learn = document.createElement('button');
      learn.type = 'button';
      learn.id = 'learnBtn';
      learn.className = 'learn-btn';
      learn.textContent = 'LEARN';
      controls.insertBefore(learn, controls.firstChild);
      learn.addEventListener('click', function () {
        window.LEARN_ON = !window.LEARN_ON;
        learn.classList.toggle('on', window.LEARN_ON);
        if (window.LEARN_ON) setHint('LEARN is on. Point at a button to see what it does.');
        else setHint('');
      });
    }
    if (controls && !document.getElementById('saveSamplesBtn') && !document.getElementById('saveBtn')) {
      const save = document.createElement('button');
      save.type = 'button';
      save.id = 'saveSamplesBtn';
      save.textContent = 'Save to Samples';
      save.title = 'Park this tape in SESSION / this machine (no download).';
      controls.appendChild(save);
      save.addEventListener('click', async function () {
        const exporters = [window.exportWAV, window.exportWav, window.exportStem, window.exportPattern]
          .filter(fn => typeof fn === 'function');
        if (!exporters.length) { setHint('Nothing to save yet.'); return; }
        window.__SW_SKIP_DOWNLOAD = true;
        window._DREAM_SAVE_ONLY = true;
        try {
          await exporters[0]();
          setHint('Saved to SESSION samples.');
        } catch (err) {
          setHint('Save failed');
          console.warn(err);
        }
        window.__SW_SKIP_DOWNLOAD = false;
        window._DREAM_SAVE_ONLY = false;
      });
    }

    const drop = document.getElementById('drop');
    if (drop && !document.getElementById('swLib')) {
      const box = document.createElement('div');
      box.id = 'swLib';
      box.style.cssText = 'border:1px solid var(--border);border-radius:6px;margin:0 0 10px;max-height:140px;overflow:auto;background:var(--panel-2,#0d0d0d);';
      const title = document.createElement('div');
      title.style.cssText = 'font-size:0.62rem;letter-spacing:0.08em;padding:6px 8px;color:var(--text-dim,#888);';
      title.textContent = 'LIBRARY · click hear · double-click load';
      box.appendChild(title);
      const list = document.createElement('div');
      list.id = 'swLibList';
      box.appendChild(list);
      drop.parentNode.insertBefore(box, drop);
      fillLib(list);
    }
  }

  function setHint(msg) {
    const s = document.getElementById('status');
    if (s && msg) s.textContent = msg;
  }

  async function previewUrl(url) {
    try {
      const ctx = window.audioCtx || (window.ensureCtx && ensureCtx());
      if (!ctx) return;
      const res = await fetch(url);
      if (!res.ok) return;
      const buf = await ctx.decodeAudioData((await res.arrayBuffer()).slice(0));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch (_) {}
  }

  async function loadUrl(url, name) {
    if (typeof loadFile !== 'function') return;
    try {
      const res = await fetch(url);
      if (!res.ok) { setHint('Could not fetch ' + name); return; }
      const blob = await res.blob();
      const file = new File([blob], name || 'tape.wav', { type: blob.type || 'audio/wav' });
      await loadFile(file);
    } catch (err) {
      setHint('Load failed');
    }
  }

  async function fillLib(list) {
    let items = [];
    try { items = await dreamRequestSamples(''); } catch (_) {}
    if (!items.length) {
      list.innerHTML = '<div style="padding:6px 8px;font-size:0.62rem;color:var(--text-dim,#888)">No catalog in this tab — drop a file.</div>';
      return;
    }
    items.slice(0, 80).forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = (it.fileName || it.id || 'tape');
      b.title = 'Click to hear · double-click to load';
      b.style.cssText = 'display:block;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid var(--border);padding:5px 8px;font-size:0.68rem;color:var(--text);cursor:pointer;';
      b.addEventListener('click', () => { if (it.url) previewUrl(it.url); });
      b.addEventListener('dblclick', (e) => { e.preventDefault(); if (it.url) loadUrl(it.url, it.fileName || it.id); });
      list.appendChild(b);
    });
  }


  (function dreamResponsiveUI() {
    try {
      if (!/DREAMFI/i.test(document.title || '')) {
        if (!document.getElementById('sw-fonts')) {
          var lk = document.createElement('link');
          lk.id = 'sw-fonts';
          lk.rel = 'stylesheet';
          lk.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap';
          (document.head || document.documentElement).appendChild(lk);
        }
      }
      var css = document.createElement('style');
      css.setAttribute('data-sw-responsive', '1');
      css.textContent = [
        'html, body { max-width: none; overflow-x: hidden; }',
        'body { font-family: var(--font, "Share Tech Mono", ui-monospace, monospace); }',
        'h1 { letter-spacing: 0.08em; }',
        '.app, .panel, .wrap, main, #app { max-width: none !important; width: 100%; }',
        '.top, .controls { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }',
        'button, select, input[type=number] { min-height: 34px; }',
        '@media (max-width: 820px) {',
        '  h1 { font-size: clamp(1.3rem, 5vw, 2rem) !important; letter-spacing: 0.08em !important; }',
        '  .top, .controls, .row, .toolbar { flex-wrap: wrap !important; gap: 4px !important; }',
        '  .knob-row, .sliders, .grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)) !important; }',
        '}',
        '@media (max-width: 560px) {',
        '  h1 { font-size: 1.25rem !important; }',
        '  .sub, .hint, .status { font-size: 0.62rem !important; }',
        '}'
      ].join('\n');
      (document.head || document.documentElement).appendChild(css);
    } catch (_) {}
  })();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootChrome);
  else bootChrome();

  /* Peak-normalize an AudioBuffer in-place (or copy channels) to target peak. */
  function dreamNormalizeBuffer(ab, targetPeak) {
    if (!ab || typeof ab.getChannelData !== 'function') return ab;
    const target = (typeof targetPeak === 'number' && targetPeak > 0) ? targetPeak : 0.85;
    let peak = 0;
    const chs = ab.numberOfChannels | 0;
    const n = ab.length | 0;
    for (let c = 0; c < chs; c++) {
      const d = ab.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const a = d[i] < 0 ? -d[i] : d[i];
        if (a > peak) peak = a;
      }
    }
    if (!(peak > 1e-8)) return ab;
    const g = target / peak;
    // Avoid tiny boosts that only add noise; always bring hot material down,
    // and bring quiet material up so plugins sit at a similar loudness.
    for (let c = 0; c < chs; c++) {
      const d = ab.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] *= g;
    }
    return ab;
  }
  window.dreamNormalizeBuffer = dreamNormalizeBuffer;

  /** Soft live ceiling — call with an AudioContext destination chain end. */
  function dreamLiveCeiling(ctx, dest) {
    const out = dest || (ctx && ctx.destination);
    if (!ctx || !out) return out;
    try {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 18;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      const g = ctx.createGain();
      g.gain.value = 0.78;
      comp.connect(g);
      g.connect(out);
      return comp;
    } catch (_) {
      return out;
    }
  }
  window.dreamLiveCeiling = dreamLiveCeiling;

  /** Shared computer-key map: Z–M = seven naturals, comma / period = octave. */
  window.DREAM_KEY_CODES = ['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM'];
  window.DREAM_KEY_OFFS = [0,2,4,5,7,9,11];

  window.addEventListener('keydown', function (e) {
    if (!e.altKey || (e.key !== 'h' && e.key !== 'H')) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    if (!(window.parent && window.parent !== window)) return;
    e.preventDefault();
    try { window.parent.postMessage({ type: 'SW_GO_HOME' }, '*'); } catch (_) {}
  });

})();
