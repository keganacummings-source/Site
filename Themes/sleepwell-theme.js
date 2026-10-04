/* SLEEPWELL theme runtime — every page loads this.
   Theme packs live as HTML files in Themes/*.html with:
     <script type="application/sleepwell-theme">{ "id","name","tag","vars":{ "--bg":"..." } }</script>
   Drop a new .html in Themes/ and it shows up on the next launch. */
(function () {
  const KEY = 'SLEEPWELL_THEME';
  const LIST_KEY = 'SLEEPWELL_THEME_LIST';
  const PACK_TYPE = 'application/sleepwell-theme';

  function themeDir() {
    try {
      const path = String(location.pathname || '');
      if (/Pluggins|Plugins/i.test(path)) return '../Themes/';
    } catch (_) {}
    return 'Themes/';
  }

  const FALLBACK_FILES = [
    'DEFAULT.html',
    'LIGHT.html',
    'ASH.html',
    'SULFUR.html',
    'BLOODMOON.html',
    'VIOLET.html',
    'MOSS.html',
    'AMBER.html',
    'VOID.html',
    'NEON.html',
    'BONE.html',
    'RUST.html',
    'ICE.html',
    'WINE.html',
    'TRIPPAH.html',
    'GOONR.html'
  ];

  const FALLBACK_THEME = {
    id: 'trippah',
    name: 'TRIPPAH',
    tag: 'wine cellar — base theme',
    file: 'TRIPPAH.html',
    vars: {
      '--bg': '#0e0608',
      '--panel': '#1a0c12',
      '--accent': '#c04068',
      '--accent-dim': '#7a2844',
      '--accent-bright': '#e07090',
      '--accent2': '#a02848',
      '--text': '#f4e4ea',
      '--text-dim': '#9a7884',
      '--border': '#341820',
      '--glow': 'rgba(192,64,104,0.26)',
      '--panel-2': '#12080c',
      '--radius': '0px',
      '--font': "'Fredoka', 'Share Tech Mono', ui-sans-serif, sans-serif"
    }
  };

  function parsePack(html, fileName) {
    if (!html) return null;
    const re = /<script[^>]*type=["']application\/sleepwell-theme["'][^>]*>([\s\S]*?)<\/script>/i;
    const m = String(html).match(re);
    if (!m) return null;
    try {
      const raw = JSON.parse(m[1]);
      if (!raw || typeof raw !== 'object') return null;
      const vars = raw.vars || raw.variables || raw.colors || {};
      const id = String(raw.id || (fileName || 'theme').replace(/\.html?$/i, '')).toLowerCase();
      return {
        id: id,
        name: raw.name || raw.title || id,
        tag: raw.tag || raw.blurb || raw.description || '',
        file: fileName || (id + '.html'),
        vars: vars,
        scene: typeof raw.scene === 'string' ? raw.scene : '',
        veil: typeof raw.veil === 'string' ? raw.veil : ''
      };
    } catch (_) {
      return null;
    }
  }

  async function fetchText(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.text();
    } catch (_) {
      return null;
    }
  }

  let _themeCache = null;
  async function discoverThemes() {
    if (_themeCache && _themeCache.length) return _themeCache;
    try {
      const raw = sessionStorage.getItem(LIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 8) { _themeCache = parsed; return parsed; }
      }
    } catch (_) {}
    const base = themeDir();
    const found = [];
    const seen = new Set();

    async function addUrl(url, fileName) {
      const html = await fetchText(url);
      const pack = parsePack(html, fileName);
      if (!pack || seen.has(pack.id)) return;
      seen.add(pack.id);
      pack.url = url;
      found.push(pack);
    }

    const manifest = await fetchText(base + 'themes.json');
    if (manifest) {
      try {
        const list = JSON.parse(manifest);
        const files = Array.isArray(list) ? list : (list.themes || list.files || []);
        const pending = [];
        for (const item of files) {
          if (item && item.vars && item.id) {
            if (!seen.has(item.id)) { seen.add(item.id); found.push(item); }
            continue;
          }
          const file = typeof item === 'string' ? item : (item.file || item.fileName);
          if (!file) continue;
          pending.push(addUrl(base + file, file));
        }
        await Promise.all(pending);
      } catch (_) {}
    }

    if (!found.length) {
      for (const file of FALLBACK_FILES) {
        await addUrl(base + file, file);
      }
    }

    if (!found.length) found.push(Object.assign({ url: base + 'DEFAULT.html' }, FALLBACK_THEME));

    Object.keys(INLINE_THEMES).forEach(function (id) {
      if (seen.has(id)) return;
      seen.add(id);
      found.push(INLINE_THEMES[id]);
    });

    try { sessionStorage.setItem(LIST_KEY, JSON.stringify(found)); } catch (_) {}
    _themeCache = found;
    return found;
  }

  const INLINE_THEMES = {
    trippah: {
      id: 'trippah',
      name: 'TRIPPAH',
      tag: 'wine cellar + insomnia — mushrooms, pills, bouncing type',
      file: 'TRIPPAH.html',
      vars: {
        '--bg': '#0e0608', '--panel': '#1a0c12', '--accent': '#c04068',
        '--accent-dim': '#7a2844', '--accent-bright': '#e07090', '--accent2': '#a02848',
        '--text': '#f4e4ea', '--text-dim': '#9a7884', '--border': '#341820',
        '--glow': 'rgba(192,64,104,0.26)', '--panel-2': '#12080c', '--radius': '6px',
        '--font': "'Fredoka', 'Share Tech Mono', ui-sans-serif, sans-serif"
      }
    },
    goonr: {
      id: 'goonr',
      name: 'GOONR',
      tag: 'matrix glitch — RGB LED borders, flicker type',
      file: 'GOONR.html',
      vars: {
        '--bg': '#020804', '--panel': '#04140c', '--accent': '#39ff14',
        '--accent-dim': '#0d6b12', '--accent-bright': '#b6ff9a', '--accent2': '#00e5ff',
        '--text': '#d8ffd0', '--text-dim': '#5d8a62', '--border': '#145c22',
        '--glow': 'rgba(57,255,20,0.35)', '--panel-2': '#010a04', '--radius': '0px',
        '--font': "'Share Tech Mono', 'VT323', ui-monospace, monospace"
      }
    }
  };

  const THEME_SCENES = {
    trippah: {
      image: 'radial-gradient(ellipse 48% 28% at 6% -6%, rgba(192,64,104,0.34), transparent 62%), radial-gradient(ellipse 36% 24% at 100% 0%, rgba(90,20,48,0.45), transparent 58%), radial-gradient(circle at 22% 92%, rgba(224,112,144,0.1), transparent 36%), repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0 1px, transparent 1px 6px), linear-gradient(180deg, #1a0a10, #0e0608 42%, #070305)',
      veil: 'radial-gradient(ellipse at center, transparent 58%, rgba(40,8,16,0.45) 100%)'
    },
    goonr: {
      image: 'linear-gradient(180deg, rgba(57,255,20,0.07), transparent 16%), repeating-linear-gradient(0deg, rgba(57,255,20,0.05) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, rgba(0,229,255,0.035) 0 1px, transparent 1px 32px), radial-gradient(ellipse at 50% 120%, rgba(0,48,12,0.65), transparent 52%), #020804',
      veil: 'radial-gradient(ellipse at center, transparent 62%, rgba(0,12,4,0.55) 100%)'
    },
    default: {
      image: 'radial-gradient(ellipse 42% 22% at 50% -8%, rgba(230,32,32,0.18), transparent 64%), repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 3px), linear-gradient(180deg, #141414, #070707)',
      veil: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)'
    },
    light: {
      image: 'radial-gradient(ellipse 50% 30% at 50% -10%, rgba(255,248,236,0.9), transparent 60%), repeating-linear-gradient(0deg, rgba(90,60,40,0.05) 0 1px, transparent 1px 28px), linear-gradient(180deg, #f7f1e6, #e7dccb)',
      veil: 'radial-gradient(ellipse at center, transparent 64%, rgba(120,90,60,0.12) 100%)'
    },
    ash: {
      image: 'radial-gradient(ellipse 40% 26% at 18% 0%, rgba(180,190,200,0.16), transparent 60%), radial-gradient(ellipse 30% 40% at 90% 100%, rgba(40,48,58,0.55), transparent 60%), repeating-linear-gradient(115deg, transparent 0 12px, rgba(255,255,255,0.02) 12px 13px), linear-gradient(180deg, #1a1e26, #0c0e14)',
      veil: 'radial-gradient(ellipse at center, transparent 55%, rgba(8,10,14,0.45) 100%)'
    },
    sulfur: {
      image: 'radial-gradient(ellipse 36% 22% at 12% 8%, rgba(200,255,51,0.16), transparent 62%), radial-gradient(ellipse 40% 30% at 100% 100%, rgba(230,32,32,0.12), transparent 55%), repeating-linear-gradient(0deg, rgba(200,255,51,0.04) 0 1px, transparent 1px 5px), linear-gradient(180deg, #12160a, #070804)',
      veil: 'radial-gradient(ellipse at center, transparent 58%, rgba(20,28,4,0.45) 100%)'
    },
    bloodmoon: {
      image: 'radial-gradient(circle at 78% 16%, rgba(255,214,206,0.95) 0 14px, rgba(196,36,48,0.55) 16px 42px, rgba(60,6,12,0.28) 44px 86px, transparent 110px), radial-gradient(ellipse 70% 36% at 50% 110%, rgba(90,0,16,0.45), transparent 62%), linear-gradient(185deg, #050103 0%, #140206 48%, #070203 100%)',
      veil: 'radial-gradient(ellipse at center, transparent 52%, rgba(40,0,8,0.5) 100%)'
    },
    violet: {
      image: 'radial-gradient(ellipse 40% 32% at 15% 10%, rgba(180,108,255,0.22), transparent 60%), radial-gradient(ellipse 32% 28% at 90% 80%, rgba(80,40,180,0.28), transparent 62%), repeating-linear-gradient(0deg, rgba(180,108,255,0.035) 0 1px, transparent 1px 7px), linear-gradient(180deg, #140c22, #0c0814)',
      veil: 'radial-gradient(ellipse at center, transparent 58%, rgba(16,6,32,0.5) 100%)'
    },
    moss: {
      image: 'radial-gradient(ellipse 46% 30% at 0% 20%, rgba(110,207,106,0.18), transparent 60%), radial-gradient(ellipse 36% 28% at 100% 90%, rgba(200,160,64,0.12), transparent 58%), repeating-linear-gradient(28deg, transparent 0 10px, rgba(80,120,60,0.05) 10px 11px), linear-gradient(180deg, #102016, #08100a)',
      veil: 'radial-gradient(ellipse at center, transparent 60%, rgba(4,16,8,0.42) 100%)'
    },
    amber: {
      image: 'radial-gradient(ellipse 50% 28% at 50% 110%, rgba(240,160,32,0.28), transparent 62%), radial-gradient(circle at 80% 12%, rgba(255,196,90,0.14), transparent 40%), repeating-linear-gradient(0deg, rgba(80,40,0,0.08) 0 1px, transparent 1px 4px), linear-gradient(180deg, #1c1206, #120c04)',
      veil: 'radial-gradient(ellipse at center, transparent 56%, rgba(40,20,0,0.4) 100%)'
    },
    void: {
      image: 'radial-gradient(circle at 72% 22%, rgba(220,230,255,0.85) 0 1px, rgba(120,160,220,0.25) 2px 3px, transparent 8px), radial-gradient(circle at 30% 70%, rgba(180,200,255,0.5) 0 1px, transparent 4px), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(20,40,80,0.45), transparent 60%), linear-gradient(180deg, #02040a, #04060c 50%, #010208)',
      veil: 'radial-gradient(ellipse at center, transparent 46%, rgba(0,0,8,0.72) 100%)'
    },
    neon: {
      image: 'linear-gradient(180deg, rgba(255,64,200,0.08), transparent 24%), repeating-linear-gradient(90deg, rgba(32,240,224,0.05) 0 1px, transparent 1px 48px), repeating-linear-gradient(0deg, rgba(255,64,200,0.04) 0 1px, transparent 1px 48px), radial-gradient(ellipse at 50% 120%, rgba(32,240,224,0.12), transparent 50%), #06080e',
      veil: 'radial-gradient(ellipse at center, transparent 58%, rgba(4,0,16,0.55) 100%)'
    },
    bone: {
      image: 'radial-gradient(ellipse 55% 24% at 50% 0%, rgba(255,244,220,0.08), transparent 60%), repeating-linear-gradient(90deg, transparent 0 18px, rgba(232,216,184,0.04) 18px 19px), linear-gradient(180deg, #221e1a, #141210)',
      veil: 'radial-gradient(ellipse at center, transparent 62%, rgba(20,16,12,0.4) 100%)'
    },
    rust: {
      image: 'repeating-linear-gradient(118deg, rgba(208,96,40,0.05) 0 2px, transparent 2px 7px), radial-gradient(ellipse 40% 30% at 8% 90%, rgba(160,64,24,0.28), transparent 60%), radial-gradient(ellipse 30% 24% at 100% 10%, rgba(90,40,20,0.35), transparent 55%), linear-gradient(180deg, #1c0e0a, #120806)',
      veil: 'radial-gradient(ellipse at center, transparent 58%, rgba(24,8,4,0.48) 100%)'
    },
    ice: {
      image: 'linear-gradient(180deg, rgba(200,244,255,0.08), transparent 22%), radial-gradient(ellipse 36% 20% at 10% 0%, rgba(142,224,240,0.18), transparent 62%), radial-gradient(ellipse 40% 28% at 100% 100%, rgba(80,140,180,0.16), transparent 60%), repeating-linear-gradient(0deg, rgba(200,240,255,0.035) 0 1px, transparent 1px 9px), linear-gradient(180deg, #102028, #081014)',
      veil: 'radial-gradient(ellipse at center, transparent 60%, rgba(4,16,24,0.42) 100%)'
    },
    wine: {
      image: 'radial-gradient(ellipse 28% 40% at 14% 78%, rgba(90,20,36,0.55), transparent 70%), radial-gradient(ellipse 18% 22% at 84% 30%, rgba(192,64,104,0.2), transparent 70%), radial-gradient(ellipse 50% 18% at 50% 0%, rgba(160,60,80,0.18), transparent 70%), linear-gradient(180deg, #16080e, #0c0608)',
      veil: 'radial-gradient(ellipse at center, transparent 58%, rgba(24,6,10,0.48) 100%)'
    }
  };

  let swFxId = '';
  let swFxObs = null;
  let swFxTimer = 0;
  let swFxWrap = false;
  let swRainTimer = 0;
  let swGlitchTimer = 0;

  function swFxCss() {
    let css = document.getElementById('sw-fx-css');
    if (!css) {
      css = document.createElement('style');
      css.id = 'sw-fx-css';
      (document.head || document.documentElement).appendChild(css);
    }
    css.textContent = [
      '@keyframes swFall {',
      '  0% { transform: translate3d(0,-8vh,0) rotate(0deg); }',
      '  100% { transform: translate3d(0,108vh,0) rotate(40deg); }',
      '}',
      '.sw-fx { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; overflow: hidden; contain: strict; }',
      '.sw-fall { position: absolute; top: -40px; animation: swFall linear infinite; opacity: 0.42; will-change: transform; }',
      '.sw-shroom { width: 14px; height: 18px; }',
      '.sw-shroom i { display:block; width:14px; height:8px; border-radius: 10px 10px 4px 4px; background: #c04068; }',
      '.sw-shroom b { display:block; width:4px; height:8px; margin: -1px auto 0; background: #f4e4ea; border-radius: 0 0 2px 2px; }',
      '.sw-pill { width: 12px; height: 5px; border-radius: 8px; background: linear-gradient(90deg, #c04068 50%, #f4e4ea 50%); }',
      '.sw-pill.r { background: linear-gradient(90deg, #e07090 50%, #1a0c12 50%); }',
      'html[data-sw-theme] body {',
      '  background-color: var(--bg) !important;',
      '  background-image: var(--sw-scene, none) !important;',
      '  background-repeat: no-repeat !important;',
      '  background-size: cover !important;',
      '  background-attachment: fixed !important;',
      '}',
      'html[data-sw-theme] body.vhs-dream::before {',
      '  opacity: 0.1 !important;',
      '  animation: none !important;',
      '  mix-blend-mode: multiply !important;',
      '}',
      'html[data-sw-theme] body.vhs-dream::after {',
      '  content: "" !important;',
      '  background: var(--sw-veil, none) !important;',
      '  box-shadow: none !important;',
      '  animation: none !important;',
      '  opacity: 1 !important;',
      '  mix-blend-mode: normal !important;',
      '  filter: none !important;',
      '}',
      '@property --sw-h { syntax: "<number>"; inherits: true; initial-value: 120; }',
      '@keyframes swHue { from { --sw-h: 0; } to { --sw-h: 360; } }',
      'html[data-sw-theme="goonr"] { animation: swHue 14s linear infinite; }',
      'html[data-sw-theme="goonr"] :is(.app, .panel, .top) {',
      '  box-shadow: 0 0 5px hsl(var(--sw-h), 90%, 55%), inset 0 0 0 1px hsl(var(--sw-h), 90%, 58%);',
      '}',
      'html[data-sw-theme="goonr"].sw-glitch-hit body { filter: none; }',
      'html[data-sw-theme="goonr"].sw-glitch-hit .app {',
      '  filter: url(#swGoonrGlitch);',
      '}',
      '@keyframes swFlick {',
      '  0%, 94%, 100% { opacity: 1; }',
      '  96% { opacity: 0.72; text-shadow: 1px 0 #f6f, -1px 0 #0ff; }',
      '}',
      'html[data-sw-theme="goonr"] :is(h1, h2) { animation: swFlick 6s steps(1, end) infinite; }',
      '.sw-rain { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; opacity: 0.2; }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .sw-fall, html[data-sw-theme="goonr"], html[data-sw-theme="goonr"] :is(h1, h2) { animation: none !important; }',
      '  .sw-fall { display: none !important; }',
      '}'
    ].join('\n');
  }

  function unwrapGlyphs() {
    swFxWrap = true;
    try {
      document.querySelectorAll('span.sw-run, span.sw-glyph').forEach(function (sp) {
        const t = document.createTextNode(sp.textContent || '');
        if (sp.parentNode) sp.parentNode.replaceChild(t, sp);
      });
    } catch (_) {}
    swFxWrap = false;
  }

  function mountTrippah() {
    const root = document.createElement('div');
    root.id = 'sw-fx-root';
    root.className = 'sw-fx';
    root.setAttribute('aria-hidden', 'true');
    let html = '';
    const count = 7;
    for (let i = 0; i < count; i++) {
      const left = (6 + i * 14) % 96;
      const dur = (18 + (i % 3) * 4).toFixed(1);
      const delay = (-i * 2.4).toFixed(1);
      if (i % 2 === 0) {
        html += '<div class="sw-fall sw-pill' + (i % 4 === 0 ? ' r' : '') + '" style="left:' + left + '%;animation-duration:' + dur + 's;animation-delay:' + delay + 's"></div>';
      } else {
        html += '<div class="sw-fall sw-shroom" style="left:' + left + '%;animation-duration:' + dur + 's;animation-delay:' + delay + 's"><i></i><b></b></div>';
      }
    }
    root.innerHTML = html;
    document.body.appendChild(root);
  }

  function killFx() {
    swFxId = '';
    if (swFxObs) { try { swFxObs.disconnect(); } catch (_) {} swFxObs = null; }
    if (swFxTimer) { clearTimeout(swFxTimer); swFxTimer = 0; }
    if (swRainTimer) { cancelAnimationFrame(swRainTimer); swRainTimer = 0; }
    if (swGlitchTimer) { clearInterval(swGlitchTimer); swGlitchTimer = 0; }
    unwrapGlyphs();
    try { document.documentElement.classList.remove('sw-glitch-hit'); } catch (_) {}
    const old = document.getElementById('sw-fx-root');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function mountGoonr() {
    const root = document.createElement('div');
    root.id = 'sw-fx-root';
    root.className = 'sw-fx';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<svg width="0" height="0" style="position:absolute">' +
      '<filter id="swGoonrGlitch" x="-5%" y="-5%" width="110%" height="110%">' +
      '<feTurbulence id="swGoonrNoise" type="fractalNoise" baseFrequency="0.012 0.55" numOctaves="2" seed="3" result="n"/>' +
      '<feDisplacementMap id="swGoonrDisp" in="SourceGraphic" in2="n" scale="1.2" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></svg>' +
      '<canvas class="sw-rain" id="swRain"></canvas>';
    document.body.appendChild(root);
    const canvas = document.getElementById('swRain');
    const ctx = canvas && canvas.getContext && canvas.getContext('2d');
    const glyphs = '01アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾐﾋﾋ0101';
    let cols = [];
    function size() {
      if (!canvas) return;
      const w = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0, 800);
      const h = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, 600);
      canvas.width = w;
      canvas.height = h;
      const gap = 28;
      canvas._gap = gap;
      const n = Math.max(8, Math.ceil(w / gap));
      cols = [];
      for (let i = 0; i < n; i++) cols.push(Math.random() * h);
    }
    size();
    window.addEventListener('resize', size);
    let lastDraw = 0;
    function tick(now) {
      if (swFxId !== 'goonr' || !ctx || !canvas) return;
      swRainTimer = requestAnimationFrame(tick);
      if (now - lastDraw < 48) return;
      lastDraw = now;
      ctx.fillStyle = 'rgba(0,8,2,0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#39ff14';
      ctx.font = '13px Share Tech Mono, monospace';
      const gap = canvas._gap || 28;
      for (let i = 0; i < cols.length; i++) {
        const ch = glyphs[(Math.random() * glyphs.length) | 0];
        ctx.fillText(ch, i * gap, cols[i]);
        cols[i] += 14;
        if (cols[i] > canvas.height && Math.random() > 0.975) cols[i] = 0;
      }
    }
    swRainTimer = requestAnimationFrame(tick);
    swGlitchTimer = setInterval(function () {
      const disp = document.getElementById('swGoonrDisp');
      const root = document.documentElement;
      if (!disp || !root) return;
      const burst = Math.random() < 0.18;
      disp.setAttribute('scale', burst ? '2.4' : '0');
      root.classList.toggle('sw-glitch-hit', burst);
    }, 1400);
  }

  function mountFx(id) {
    const next = (id === 'trippah' || id === 'goonr') ? id : '';
    if (next === swFxId && document.getElementById('sw-fx-root')) return;
    killFx();
    if (!next || !document.body) return;
    swFxCss();
    swFxId = next;
    if (next === 'trippah') mountTrippah();
    else mountGoonr();
  }

  function paintScene(theme) {
    const id = (theme && theme.id) || '';
    const fb = THEME_SCENES[id] || THEME_SCENES.default;
    const image = (theme && theme.scene) || (fb && fb.image) || 'none';
    const veil = (theme && theme.veil) || (fb && fb.veil) || 'none';
    const root = document.documentElement;
    root.style.setProperty('--sw-scene', image);
    root.style.setProperty('--sw-veil', veil);
  }

  function applyTheme(theme) {
    if (!theme || !theme.vars) return;
    if (theme.id && INLINE_THEMES[theme.id]) {
      const inline = INLINE_THEMES[theme.id];
      theme = Object.assign({}, theme, {
        name: inline.name,
        tag: inline.tag,
        vars: inline.vars,
        scene: theme.scene || inline.scene || '',
        veil: theme.veil || inline.veil || ''
      });
    }
    const root = document.documentElement;
    Object.keys(theme.vars).forEach((k) => {
      const key = k.charAt(0) === '-' ? k : '--' + k;
      root.style.setProperty(key, String(theme.vars[k]));
    });
    root.setAttribute('data-sw-theme', theme.id || '');
    document.documentElement.style.colorScheme = /light/i.test(theme.id || '') ? 'light' : 'dark';
    try { swFxCss(); paintScene(theme); } catch (_) {}
    try { sessionStorage.setItem(KEY, JSON.stringify(theme)); } catch (_) {}
    window.__SW_THEME = theme;
    try { mountFx(theme.id || ''); } catch (_) {}
    try {
      window.dispatchEvent(new CustomEvent('sleepwell-theme', { detail: theme }));
    } catch (_) {}
    broadcast(theme);
  }

  function broadcast(theme) {
    try {
      document.querySelectorAll('iframe').forEach((f) => {
        try { f.contentWindow.postMessage({ type: 'DREAM_THEME', theme: theme }, '*'); } catch (_) {}
      });
    } catch (_) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'DREAM_THEME_APPLIED', theme: theme }, '*');
      }
    } catch (_) {}
  }

  function readSaved() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  async function pickById(id, list) {
    const packs = list || await discoverThemes();
    const want = String(id || '').toLowerCase();
    let hit = packs.find((t) => t.id === want || String(t.file || '').toLowerCase() === want || String(t.name || '').toLowerCase() === want);
    if (!hit && INLINE_THEMES[want]) hit = INLINE_THEMES[want];
    if (hit) applyTheme(hit);
    return hit;
  }

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d) return;
    if (d.type === 'DREAM_THEME' && d.theme) {
      applyTheme(d.theme);
    }
    if (d.type === 'DREAM_THEME_REQUEST') {
      const cur = window.__SW_THEME || readSaved();
      if (cur && e.source) {
        try { e.source.postMessage({ type: 'DREAM_THEME', theme: cur }, '*'); } catch (_) {}
      }
    }
  });


  function fitFrame() {
    var w = window.innerWidth || 800;
    var h = window.innerHeight || 600;
    var shortSide = Math.min(w, h);
    var edge = shortSide < 520 ? 4 : (shortSide > 1100 ? 8 : 6);
    var inset = edge + 6;
    var root = document.documentElement;
    root.style.setProperty('--sw-edge', edge + 'px');
    root.style.setProperty('--sw-inset', inset + 'px');
  }

  function injectFit() {
    fitFrame();
    var css = document.getElementById('sw-fit-css');
    if (css) return;
    css = document.createElement('style');
    css.id = 'sw-fit-css';
    css.textContent = [
      'html, body { max-width: none !important; height: 100%; }',
      '.hidden { display: none !important; }',
      'body {',
      '  width: 100% !important;',
      '  height: 100dvh !important;',
      '  max-height: 100dvh !important;',
      '  margin: 0 !important;',
      '  box-sizing: border-box !important;',
      '  overflow: hidden !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  align-items: stretch !important;',
      '  padding: var(--sw-inset, 12px) !important;',
      '}',
      'body:not(.sw-master) > .app-frame,',
      'body:not(.sw-master) > .app {',
      '  flex: 1 1 auto !important;',
      '  min-height: 0 !important;',
      '  width: 100% !important;',
      '  max-width: none !important;',
      '}',
      '.app-frame {',
      '  width: 100% !important;',
      '  height: auto !important;',
      '  max-width: none !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  min-height: 0 !important;',
      '}',
      '.app {',
      '  width: 100% !important;',
      '  max-width: none !important;',
      '  height: auto !important;',
      '  min-height: 0 !important;',
      '  flex: 1 1 auto !important;',
      '  margin: 0 !important;',
      '  transform: none !important;',
      '  box-sizing: border-box !important;',
      '  overflow: auto !important;',
      '  border: 2px solid color-mix(in srgb, var(--accent, #c04068) 55%, #12080c) !important;',
      '  box-shadow: var(--sw-edge, 6px) var(--sw-edge, 6px) 0 #000, inset 0 0 0 1px var(--accent, #e07090), 0 0 28px var(--glow, rgba(192,64,104,.28)) !important;',
      '  border-radius: 0 !important;',
      '}',
      'body:not(.sw-master) .app:has(.stage) {',
      '  overflow: hidden !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '}',
      '.fx-grid, .browser { max-height: none !important; }',
      '.layout { min-height: calc(100dvh - 180px) !important; }',
      'html:has(#pad) body {',
      '  max-width: none !important;',
      '  width: 100% !important;',
      '  height: 100dvh !important;',
      '  min-height: 0 !important;',
      '  overflow: hidden !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '}',
      'html:has(#pad) .draw-shell { flex: 1 1 auto; min-height: 0; height: auto !important; max-height: none !important; }',
      'html:has(#pad) .draw-stage { min-width: 0; min-height: 0; overflow: hidden; }',
      'html:has(#pad) .canvas-wrap { flex: 0 0 auto; }',
      'html:has(#pad) canvas#pad { display: block; width: 100%; height: 100%; }',
      'body.sw-master {',
      '  height: 100dvh !important;',
      '  overflow: hidden !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  align-items: stretch !important;',
      '}',
      'body.sw-master .app { min-height: 0 !important; }',
      'body.sw-master #viewHome {',
      '  flex: 1 1 auto;',
      '  min-height: 0;',
      '  overflow: auto;',
      '  width: 100% !important;',
      '  max-width: none !important;',
      '}',
      'body.sw-master.builder-open #viewBuilder {',
      '  display: flex !important;',
      '  flex: 1 1 auto;',
      '  flex-direction: column;',
      '  min-height: 0;',
      '  height: 100% !important;',
      '  width: 100% !important;',
      '  max-width: none !important;',
      '}',
      'body.sw-master.builder-open #viewBuilder .app {',
      '  flex: 1 1 auto !important;',
      '  height: 100% !important;',
      '  min-height: 0 !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '  overflow: hidden !important;',
      '}',
      'body.sw-master #viewBuilder .builder-layout {',
      '  flex: 1 1 auto !important;',
      '  min-height: 0 !important;',
      '  height: auto !important;',
      '}',
      'body.sw-master #viewBuilder .sample-browser {',
      '  max-height: none !important;',
      '  height: auto !important;',
      '  align-self: stretch !important;',
      '}',
      'body.sw-master #viewBuilder .builder-main {',
      '  min-height: 0 !important;',
      '  flex: 1 1 auto !important;',
      '  display: flex !important;',
      '  flex-direction: column !important;',
      '}',
      'body.sw-master #viewBuilder .playlist-wrap {',
      '  flex: 1 1 auto !important;',
      '  min-height: 0 !important;',
      '}',
      'body.sw-master #viewBuilder .playlist-scroll {',
      '  max-height: none !important;',
      '  height: 100% !important;',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(css);
  }
  injectFit();
  window.addEventListener('resize', fitFrame);

  function boot() {
    injectFit();
    let saved = readSaved();
    if (saved && INLINE_THEMES[saved.id]) saved = INLINE_THEMES[saved.id];
    if (saved) applyTheme(saved);
    else applyTheme(FALLBACK_THEME);
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage({ type: 'DREAM_THEME_REQUEST' }, '*'); } catch (_) {}
    }
  }

  window.SleepwellTheme = {
    key: KEY,
    fallback: FALLBACK_THEME,
    discover: discoverThemes,
    cached: function () { return _themeCache || []; },
    apply: applyTheme,
    pick: pickById,
    current: function () { return window.__SW_THEME || readSaved() || FALLBACK_THEME; },
    parsePack: parsePack,
    themeDir: themeDir
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
