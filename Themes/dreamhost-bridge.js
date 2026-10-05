/**
 * DreamHost bridge — shared by every HTML machine.
 *
 * 1. Homescreen bar (browser only): single top button → back to plugin selector.
 *    Hidden inside the VST (native Homescreen / ROOM button handles return).
 * 2. DreamHost.noteOn / noteOff: the DREAMDAW VST injects MIDI via
 *    evaluateJavascript("DreamHost.noteOn(n,v)") so every machine must expose this.
 *    Forwards to page-level noteOn / noteOff when present.
 * 3. Optional audio push hook for future host playback (no-op if unused).
 */
(function () {
  if (window.__DREAMHOST_BRIDGE__) return;
  window.__DREAMHOST_BRIDGE__ = true;

  // Machines read their theme from sessionStorage; the homescreen also keeps a copy in localStorage.
  try {
    if (!sessionStorage.getItem("SLEEPWELL_THEME") && localStorage.getItem("dreamdaw.themepack"))
      sessionStorage.setItem("SLEEPWELL_THEME", localStorage.getItem("dreamdaw.themepack"));
  } catch (e) {}

  var inVst = !!(window.__JUCE__ && window.__JUCE__.backend);

  // ----- Homescreen bar (site / browser only) -----
  function injectHomescreen() {
    if (inVst) return;
    if (document.getElementById("dream-homescreen-bar")) return;
    var bar = document.createElement("div");
    bar.id = "dream-homescreen-bar";
    bar.setAttribute("role", "banner");
    bar.style.cssText = [
      "position:sticky",
      "top:0",
      "z-index:99999",
      "display:flex",
      "align-items:center",
      "gap:10px",
      "padding:8px 12px",
      "background:var(--panel-2,#0e0608)",
      "border-bottom:1px solid var(--accent-dim,#7a2844)",
      "font-family:'Share Tech Mono',ui-monospace,monospace"
    ].join(";");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Homescreen";
    btn.style.cssText = [
      "font-family:inherit",
      "font-size:0.78rem",
      "font-weight:700",
      "letter-spacing:0.06em",
      "padding:8px 14px",
      "border:none",
      "border-radius:6px",
      "cursor:pointer",
      "background:var(--accent,#c04068)",
      "color:var(--bg,#fff)"
    ].join(";");
    btn.onmouseenter = function () { btn.style.background = "var(--accent-bright,#e07090)"; };
    btn.onmouseleave = function () { btn.style.background = "var(--accent,#c04068)"; };
    btn.onclick = function () {
      // Machines live one folder below index.html; fall back to history if that is wrong.
      try {
        window.location.href = new URL("../index.html", window.location.href).href;
      } catch (e) {
        window.location.href = "../index.html";
      }
    };
    var label = document.createElement("span");
    label.textContent = document.title || "machine";
    label.style.cssText = "color:var(--text-dim,#9a7884);font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    bar.appendChild(btn);
    bar.appendChild(label);
    var root = document.body;
    if (root.firstChild) root.insertBefore(bar, root.firstChild);
    else root.appendChild(bar);
  }

  // ----- MIDI bridge for DREAMDAW VST -----
  var busy = {};
  function callPage(name, a, b) {
    if (busy[name]) return undefined;
    busy[name] = true;
    try { return callPage2(name, a, b); } finally { busy[name] = false; }
  }
  function callPage2(name, a, b) {
    try {
      if (typeof window[name] === "function") return window[name](a, b);
    } catch (e) {}
    try {
      if (window.synth && typeof window.synth[name] === "function") return window.synth[name](a, b);
    } catch (e) {}
    try {
      if (window.app && typeof window.app[name] === "function") return window.app[name](a, b);
    } catch (e) {}
    return undefined;
  }

  var PIANO = "awsedftgyhuj";
  function keyFallback(n, down) {
    var i = n - 60;
    if (i < 0 || i >= PIANO.length) return;
    try {
      window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key: PIANO[i], bubbles: true }));
    } catch (e) {}
  }

  window.DreamHost = window.DreamHost || {};
  if (typeof window.DreamHost.noteOn !== "function") {
    window.DreamHost.noteOn = function (note, vel) {
      var n = note | 0;
      var v = (typeof vel === "number") ? vel : 1;
      if (v > 1) v = v / 127;
      if (callPage("noteOn", n, v) !== undefined) return;
      if (callPage("note_on", n, v) !== undefined) return;
      // Fallback: play via the standard A-S-D-F piano keys (C4..B4)
      keyFallback(n, true);
      // Also dispatch a CustomEvent machines can listen for
      try {
        window.dispatchEvent(new CustomEvent("dream-note-on", { detail: { note: n, velocity: v } }));
      } catch (e) {}
    };
  }
  if (typeof window.DreamHost.noteOff !== "function") {
    window.DreamHost.noteOff = function (note) {
      var n = note | 0;
      if (callPage("noteOff", n) !== undefined) return;
      if (callPage("note_off", n) !== undefined) return;
      keyFallback(n, false);
      try {
        window.dispatchEvent(new CustomEvent("dream-note-off", { detail: { note: n } }));
      } catch (e) {}
    };
  }

  // Optional: page → host audio (no-op unless host wires it)
  if (typeof window.DreamHost.pushAudio !== "function") {
    window.DreamHost.pushAudio = function (/* interleavedFloat32, frames */) {};
  }

  // Also expose bare globals if the page never defined them (so accidental
  // evaluateJavascript("noteOn(...)") still does something useful).
  if (typeof window.noteOn !== "function") {
    window.noteOn = function (n, v) { return window.DreamHost.noteOn(n, v); };
  }
  if (typeof window.noteOff !== "function") {
    window.noteOff = function (n) { return window.DreamHost.noteOff(n); };
  }

  function boot() {
    injectHomescreen();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
