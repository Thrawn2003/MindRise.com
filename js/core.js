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
  const P = (bg, paper, ink, soft, mute, accent, brass, rule, extra = {}) => ({
    '--bg': bg, '--paper': paper, '--ink': ink, '--soft': soft, '--mute': mute, '--accent': accent, '--brass': brass, '--rule': rule, ...extra,
  });
  const SURFACES = [
    // ---- alive: each has its own colours as well as its own movement ----
    { id: 'window', label: 'Window light', group: 'alive', scene: 'dust', neutral: true },
    { id: 'water', label: 'Still water', group: 'alive', scene: 'ripples', dark: false, vars: P('#d3e4ec', '#e6f1f6', '#0f2f3c', '#37596a', '#385d6d', '#9b3a2a', '#86692c', 'rgba(15,47,60,0.22)') },
    { id: 'deep', label: 'Deep water', group: 'alive', scene: 'ripples', dark: true, vars: P('#0d2830', '#133541', '#e3f1f4', '#b0cbd2', '#86a9b3', '#f0a98c', '#e0c27a', 'rgba(227,241,244,0.2)') },
    { id: 'contour', label: 'Contours', group: 'alive', scene: 'contour', dark: false, vars: P('#e8dcbd', '#f3ead2', '#3a2b14', '#615236', '#62542e', '#8a3820', '#7f6320', 'rgba(58,43,20,0.22)') },
    { id: 'nightmap', label: 'Night map', group: 'alive', scene: 'contour', dark: true, vars: P('#0f1f18', '#172a20', '#dcebd8', '#a9c2ad', '#80a08a', '#e8a36e', '#d6c070', 'rgba(220,235,216,0.2)') },
    { id: 'wash', label: 'Colour wash', group: 'alive', scene: 'wash', dark: false, vars: P('#f7e8df', '#fcf1ea', '#2d1e1b', '#64473f', '#74574e', '#b0402a', '#b4781f', 'rgba(45,30,27,0.2)', { '--w1': '#f08a6a', '--w2': '#f2c65a', '--w3': '#8da6e6' }) },
    { id: 'aurora', label: 'Aurora', group: 'alive', scene: 'wash', dark: true, vars: P('#0c1222', '#141b30', '#e6ebf7', '#b2bbd5', '#8791b0', '#f2a58a', '#e6c882', 'rgba(230,235,247,0.2)', { '--w1': '#2fd0a4', '--w2': '#7566f0', '--w3': '#f0809f' }) },
    { id: 'pendulum', label: 'Pendulum wave', group: 'alive', scene: 'pendulum', dark: false, vars: P('#e0e2d2', '#eef0e2', '#22261b', '#434a39', '#525b45', '#933c2b', '#876a2c', 'rgba(34,38,27,0.2)') },
    { id: 'murmur', label: 'Murmuration', group: 'alive', scene: 'murmur', dark: false, vars: P('#c2d0e4', '#d8e3f1', '#0f1f30', '#2a3e54', '#374f68', '#7b382d', '#86682a', 'rgba(15,31,48,0.22)') },
    { id: 'life', label: 'Game of Life', group: 'alive', scene: 'life', dark: false, vars: P('#e2efbd', '#eef6d2', '#26340f', '#415221', '#50642c', '#36691b', '#7a6a28', 'rgba(38,52,15,0.2)') },
    { id: 'spiro', label: 'Harmonograph', group: 'alive', scene: 'harmonograph', dark: false, vars: P('#ecd6c2', '#f6e9dc', '#2d1e15', '#543e32', '#674e41', '#8f3721', '#a0702a', 'rgba(45,30,21,0.2)') },
    { id: 'tank', label: 'Ripple tank', group: 'alive', scene: 'tank', dark: true, vars: P('#17132e', '#201b3d', '#e7e4fb', '#bfbbe4', '#9792c4', '#7ee6d6', '#f0c97a', 'rgba(231,228,251,0.2)') },
    { id: 'chalk', label: 'Chalkboard', group: 'alive', scene: 'chalk', dark: true, vars: P('#1a3b36', '#22463f', '#f0efe6', '#c5d3c6', '#9db3a2', '#f2c46d', '#9fd3b0', 'rgba(240,239,230,0.22)') },
    // ---- still: nothing moves ----
    { id: 'paper', label: 'Plain paper', group: 'still', neutral: true },
    { id: 'linen', label: 'Linen', group: 'still', texture: 'linen', dark: false, vars: P('#e6dccb', '#f0e9da', '#251f16', '#54483a', '#605446', '#7d2f2f', '#85652a', 'rgba(37,31,22,0.2)', { '--tex': 'rgba(70,50,25,0.13)' }) },
    { id: 'grid', label: 'Graph paper', group: 'still', texture: 'grid', dark: false, vars: P('#f0f5f8', '#fafcfd', '#14202b', '#43546a', '#4d6076', '#2a5f9c', '#7d6d3e', 'rgba(20,32,43,0.2)', { '--tex': 'rgba(42,95,156,0.2)', '--tex2': 'rgba(42,95,156,0.09)' }) },
    { id: 'sage', label: 'Sage', group: 'still', dark: false, vars: P('#dde6da', '#e9f0e6', '#1c2a20', '#44574a', '#4d5d51', '#8a3a2b', '#7d7336', 'rgba(28,42,32,0.18)') },
    { id: 'rose', label: 'Rosewater', group: 'still', dark: false, vars: P('#f0dedb', '#f8ebe8', '#2b1c1d', '#5e4546', '#675354', '#7a2336', '#a2703a', 'rgba(43,28,29,0.18)') },
    { id: 'fog', label: 'Fog', group: 'still', dark: false, vars: P('#e3e6ea', '#eef0f3', '#1b2027', '#485260', '#525b66', '#2d5a88', '#8a7a4a', 'rgba(27,32,39,0.17)') },
    { id: 'butter', label: 'Butter', group: 'still', dark: false, vars: P('#f3e8c8', '#f9f1da', '#2a2316', '#5c5036', '#655c43', '#8c3b22', '#9a7424', 'rgba(42,35,22,0.18)') },
    { id: 'dusk', label: 'Dusk', group: 'still', dark: true, vars: P('#1c2332', '#232b3d', '#e8eaf1', '#b6bdce', '#8f98ad', '#e3ab8c', '#d8b46a', 'rgba(232,234,241,0.18)') },
    { id: 'walnut', label: 'Walnut', group: 'still', dark: true, vars: P('#241b15', '#2d221a', '#f0e4d4', '#c6b49e', '#a1907d', '#e49c6d', '#d3a85a', 'rgba(240,228,212,0.18)') },
    { id: 'graphite', label: 'Graphite', group: 'still', dark: true, vars: P('#16181b', '#1e2125', '#e9eaec', '#b4b8bf', '#8b9098', '#dc8c76', '#c9a862', 'rgba(233,234,236,0.17)') },
  ];
  const VAR_KEYS = ['--bg', '--paper', '--ink', '--soft', '--mute', '--rule', '--accent', '--brass', '--tex', '--tex2', '--w1', '--w2', '--w3'];
  const DEFAULT_SURFACE = 'deep'; // Deep water
  const surfaceById = (id) => SURFACES.find((x) => x.id === id) || SURFACES[0];

  /* ---------- Settings ---------- */
  const root = document.documentElement;
  const saved = store.get('settings', {});
  const settings = {
    theme: saved.theme === 'night' || saved.theme === 'paper' ? saved.theme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'paper'),
    motion: saved.motion !== undefined ? saved.motion : !prefersReduced,
    sound: saved.sound === true, // always off until someone asks for it
    // settings version 2 introduced Deep water as the default; older saved choices are reset to it once
    surface: saved.v === 2 ? surfaceById(saved.surface).id : DEFAULT_SURFACE,
    v: 2,
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
    settings, set, bus, sfx, DEFAULT_SURFACE, SURFACES, surface, surfaceById, effectiveTheme, toggleTheme,
    get motion() { return settings.motion; },
  };
})();
