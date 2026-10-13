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

  /* ---------- Settings ---------- */
  const root = document.documentElement;
  const saved = store.get('settings', {});
  const settings = {
    theme: saved.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'paper'),
    motion: saved.motion !== undefined ? saved.motion : !prefersReduced,
    sound: saved.sound === true, // always off until someone asks for it
  };
  const bus = new EventTarget();
  function apply() {
    root.dataset.theme = settings.theme;
    root.dataset.motion = settings.motion ? 'on' : 'off';
    store.set('settings', settings);
    bus.dispatchEvent(new CustomEvent('settings', { detail: settings }));
  }
  const set = (patch) => {
    Object.assign(settings, patch);
    apply();
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
    settings, set, bus, sfx,
    get motion() { return settings.motion; },
  };
})();
