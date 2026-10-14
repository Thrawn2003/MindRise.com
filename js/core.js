/* Mindrise core: helpers, persisted settings (theme, motion, sound) and a very quiet sound layer. */
(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('mindrise:' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('mindrise:' + key, JSON.stringify(value));
      } catch {
        /* storage blocked: the setting just won't persist */
      }
    },
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pad = (n) => String(n).padStart(2, '0');
  const fmtTime = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ---------- Backgrounds (the "surface" the whole site sits on) ---------- */
  // alive: responds to you, drawn on the canvas.  still: nothing moves.
  // neutral surfaces follow the paper/night reading mode; tinted ones carry their own palette.
  const SURFACES = [
    { id: 'window', label: 'Window light', group: 'alive', scene: 'dust', neutral: true },
    { id: 'water', label: 'Still water', group: 'alive', scene: 'ripples', neutral: true },
    { id: 'contour', label: 'Contours', group: 'alive', scene: 'contour', neutral: true },
    { id: 'wash', label: 'Colour wash', group: 'alive', scene: 'wash', neutral: true },
    { id: 'paper', label: 'Plain paper', group: 'still', neutral: true },
    { id: 'linen', label: 'Linen', group: 'still', neutral: true, texture: 'linen' },
    { id: 'grid', label: 'Graph paper', group: 'still', neutral: true, texture: 'grid' },
    { id: 'sage', label: 'Sage', group: 'still', dark: false, vars: { '--bg': '#dde6da', '--paper': '#e9f0e6', '--ink': '#1c2a20', '--soft': '#44574a', '--mute': '#56675a', '--rule': 'rgba(28,42,32,0.18)', '--accent': '#8a3a2b', '--brass': '#7d7336' } },
    { id: 'rose', label: 'Rosewater', group: 'still', dark: false, vars: { '--bg': '#f0dedb', '--paper': '#f8ebe8', '--ink': '#2b1c1d', '--soft': '#5e4546', '--mute': '#735e5f', '--rule': 'rgba(43,28,29,0.18)', '--accent': '#7a2336', '--brass': '#a2703a' } },
    { id: 'fog', label: 'Fog', group: 'still', dark: false, vars: { '--bg': '#e3e6ea', '--paper': '#eef0f3', '--ink': '#1b2027', '--soft': '#485260', '--mute': '#5a636f', '--rule': 'rgba(27,32,39,0.17)', '--accent': '#2d5a88', '--brass': '#8a7a4a' } },
    { id: 'butter', label: 'Butter', group: 'still', dark: false, vars: { '--bg': '#f3e8c8', '--paper': '#f9f1da', '--ink': '#2a2316', '--soft': '#5c5036', '--mute': '#6f654a', '--rule': 'rgba(42,35,22,0.18)', '--accent': '#8c3b22', '--brass': '#9a7424' } },
    { id: 'dusk', label: 'Dusk', group: 'still', dark: true, vars: { '--bg': '#1c2332', '--paper': '#232b3d', '--ink': '#e8eaf1', '--soft': '#b6bdce', '--mute': '#818ba2', '--rule': 'rgba(232,234,241,0.18)', '--accent': '#e3ab8c', '--brass': '#d8b46a' } },
    { id: 'walnut', label: 'Walnut', group: 'still', dark: true, vars: { '--bg': '#241b15', '--paper': '#2d221a', '--ink': '#f0e4d4', '--soft': '#c6b49e', '--mute': '#968471', '--rule': 'rgba(240,228,212,0.18)', '--accent': '#e49c6d', '--brass': '#d3a85a' } },
    { id: 'graphite', label: 'Graphite', group: 'still', dark: true, vars: { '--bg': '#16181b', '--paper': '#1e2125', '--ink': '#e9eaec', '--soft': '#b4b8bf', '--mute': '#81868f', '--rule': 'rgba(233,234,236,0.17)', '--accent': '#dc8c76', '--brass': '#c9a862' } },
  ];
  const VAR_KEYS = ['--bg', '--paper', '--ink', '--soft', '--mute', '--rule', '--accent', '--brass'];
  const surfaceById = (id) => SURFACES.find((x) => x.id === id) || SURFACES[0];

  /* ---------- Settings ---------- */
  const root = document.documentElement;
  const saved = store.get('settings', {});
  const settings = {
    theme: saved.theme === 'night' || saved.theme === 'paper' ? saved.theme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'paper'),
    motion: saved.motion !== undefined ? saved.motion : !prefersReduced,
    sound: saved.sound === true, // always off until someone asks for it
    surface: surfaceById(saved.surface).id,
  };
  const bus = new EventTarget();
  const surface = () => surfaceById(settings.surface);
  const effectiveTheme = () => {
    const sf = surface();
    return sf.neutral ? settings.theme : sf.dark ? 'night' : 'paper';
  };
  function apply() {
    const sf = surface();
    root.dataset.theme = effectiveTheme();
    root.dataset.surface = sf.id;
    root.dataset.flat = sf.scene ? 'off' : 'on';
    root.dataset.lamp = sf.id === 'window' ? 'on' : 'off';
    root.dataset.texture = sf.texture || 'none';
    root.dataset.motion = settings.motion ? 'on' : 'off';
    VAR_KEYS.forEach((k) => root.style.removeProperty(k));
    if (!sf.neutral) Object.entries(sf.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    store.set('settings', settings);
    bus.dispatchEvent(new CustomEvent('settings', { detail: settings }));
  }
  const set = (patch) => {
    Object.assign(settings, patch);
    apply();
  };
  // the header/footer light switch: on a tinted surface it returns to window light in the opposite mode
  const toggleTheme = () => {
    const sf = surface();
    if (sf.neutral) set({ theme: settings.theme === 'night' ? 'paper' : 'night' });
    else set({ surface: 'window', theme: sf.dark ? 'paper' : 'night' });
  };
  apply();

  /* ---------- Sound: an opt-in, barely audible paper-and-pencil layer ---------- */
  let ctx = null;
  let master = null;
  function audio() {
    if (!settings.sound) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function note(freq, { vol = 0.05, dur = 0.9, delay = 0, type = 'sine' } = {}) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  const SCALE = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
  const sfx = {
    tick: () => note(1480, { vol: 0.012, dur: 0.07, type: 'triangle' }),
    note: (i = 0) => note(SCALE[clamp(Math.round(i), 0, SCALE.length - 1)], { vol: 0.04, dur: 1.3 }),
    flip: () => note(880, { vol: 0.02, dur: 0.18, type: 'triangle' }),
    done: () => [0, 2, 4].forEach((n, i) => note(SCALE[n + 1], { vol: 0.035, dur: 1.8, delay: i * 0.12 })),
  };

  window.Mindrise = {
    $, $$, store, clamp, lerp, rand, pad, fmtTime, css, rgba, prefersReduced, finePointer,
    settings, set, bus, sfx, SURFACES, surface, surfaceById, effectiveTheme, toggleTheme,
    get motion() { return settings.motion; },
  };
})();
