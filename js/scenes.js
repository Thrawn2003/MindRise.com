/* Four more living backgrounds, each one a small piece of science or maths you can play with:
   murmuration, Game of Life, harmonograph and ripple-tank interference. */
(() => {
  const M = window.Mindrise;
  if (!M || !M.bg || !M.scenes) return;
  const B = M.bg;
  const { ctx, ptr, OFF, TAU, lerp, clamp, rand } = B;
  const rgba = M.rgba;
  const interactive = 'a, button, input, textarea, select, label, summary, canvas, .card, .specimen, mark, .term, #bgPanel, #bgPill';

  let colorKey = '';
  let C = {};
  const pal = () => {
    const key = `${document.documentElement.dataset.surface}/${document.documentElement.dataset.theme}`;
    if (key !== colorKey) {
      colorKey = key;
      C = { ink: M.css('--ink'), accent: M.css('--accent'), brass: M.css('--brass'), soft: M.css('--soft') };
    }
    return C;
  };

  /* ---------- Murmuration (boids) ----------
     Three rules (don't crowd, match your neighbours, drift toward them) make a flock that moves as one. */
  let birds = [];
  M.scenes.murmur = {
    init() {
      const n = B.w < 700 ? 36 : 78;
      birds = Array.from({ length: n }, () => ({ x: rand(0, B.w), y: rand(0, B.h), vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5) }));
    },
    step(dt) {
      const k = clamp(dt * 60, 0.3, 2.5);
      const tx = ptr.x !== OFF ? ptr.x : B.w * (0.5 + 0.3 * Math.sin(B.clock * 0.13));
      const ty = ptr.y !== OFF ? ptr.y : B.h * (0.5 + 0.25 * Math.cos(B.clock * 0.17));
      for (const a of birds) {
        let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
        for (const b of birds) {
          if (a === b) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 > 9000) continue;
          n++; ax += b.vx; ay += b.vy; cx += b.x; cy += b.y;
          if (d2 < 600) { sx -= dx; sy -= dy; }
        }
        if (n) { a.vx += ((ax / n - a.vx) * 0.05 + (cx / n - a.x) * 0.0016 + sx * 0.012) * k; a.vy += ((ay / n - a.vy) * 0.05 + (cy / n - a.y) * 0.0016 + sy * 0.012) * k; }
        a.vx += (tx - a.x) * 0.00018 * k;
        a.vy += (ty - a.y) * 0.00018 * k;
        const m = 70;
        if (a.x < m) a.vx += 0.06 * k; else if (a.x > B.w - m) a.vx -= 0.06 * k;
        if (a.y < m) a.vy += 0.06 * k; else if (a.y > B.h - m) a.vy -= 0.06 * k;
        const sp = Math.hypot(a.vx, a.vy) || 1;
        const lim = clamp(sp, 1.1, 2.4) / sp;
        a.vx *= lim; a.vy *= lim;
        a.x += a.vx * k; a.y += a.vy * k;
      }
    },
    paint() {
      const c = pal();
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(c.ink, 0.6);
      ctx.beginPath();
      for (const a of birds) { ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - a.vx * 5, a.y - a.vy * 5); }
      ctx.stroke();
      ctx.fillStyle = rgba(c.accent, 0.9);
      for (const a of birds) { ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, TAU); ctx.fill(); }
    },
  };

  /* ---------- Game of Life ----------
     A live cell with two or three neighbours survives; a dead cell with exactly three comes alive. */
  let cell = 14, cols = 0, rows = 0, cur = null, nxt = null, age = null, acc = 0;
  const seed = (p) => { for (let i = 0; i < cur.length; i++) if (Math.random() < p) { cur[i] = 1; age[i] = 0; } };
  const put = (cx, cy, pts) => pts.forEach(([dx, dy]) => { const x = (cx + dx + cols) % cols, y = (cy + dy + rows) % rows; cur[y * cols + x] = 1; age[y * cols + x] = 0; });
  const GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
  const RPENT = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
  M.scenes.life = {
    init() {
      cell = B.w < 700 ? 16 : 14;
      cols = Math.ceil(B.w / cell); rows = Math.ceil(B.h / cell);
      cur = new Uint8Array(cols * rows); nxt = new Uint8Array(cols * rows); age = new Uint8Array(cols * rows);
      seed(0.12); acc = 0;
    },
    step(dt) {
      if (ptr.x !== OFF) {
        const cx = Math.floor(ptr.x / cell), cy = Math.floor(ptr.y / cell);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x >= 0 && y >= 0 && x < cols && y < rows && Math.random() < 0.5) { cur[y * cols + x] = 1; age[y * cols + x] = 0; }
        }
      }
      acc += dt;
      if (acc < 0.13) return;
      acc = 0;
      let alive = 0;
      for (let y = 0; y < rows; y++) {
        const ym = ((y - 1 + rows) % rows) * cols, y0 = y * cols, yp = ((y + 1) % rows) * cols;
        for (let x = 0; x < cols; x++) {
          const xm = (x - 1 + cols) % cols, xp = (x + 1) % cols;
          const n = cur[ym + xm] + cur[ym + x] + cur[ym + xp] + cur[y0 + xm] + cur[y0 + xp] + cur[yp + xm] + cur[yp + x] + cur[yp + xp];
          const live = cur[y0 + x] ? n === 2 || n === 3 : n === 3;
          nxt[y0 + x] = live ? 1 : 0;
          age[y0 + x] = live && cur[y0 + x] ? Math.min(age[y0 + x] + 1, 12) : 0;
          if (live) alive++;
        }
      }
      [cur, nxt] = [nxt, cur];
      if (alive < cols * rows * 0.018) seed(0.14); // a quiet board gets a fresh sprinkle
    },
    paint() {
      if (!cur) return;
      const c = pal();
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (!cur[i]) continue;
        ctx.fillStyle = rgba(age[i] > 3 ? c.ink : c.accent, 0.1 + Math.min(age[i], 8) * 0.022);
        ctx.fillRect(x * cell + 2.5, y * cell + 2.5, cell - 5, cell - 5);
      }
    },
  };
  addEventListener('pointerdown', (e) => {
    if (M.surface().scene !== 'life' || !M.motion || e.target.closest(interactive) || !cur) return;
    put(Math.floor(e.clientX / cell), Math.floor(e.clientY / cell), Math.random() < 0.5 ? GLIDER : RPENT);
  });

  /* ---------- Harmonograph ----------
     Two or more damped oscillations at slightly different frequencies draw loops and rosettes. */
  M.scenes.harmonograph = {
    init() {},
    paint() {
      const c = pal();
      const t = B.clock;
      const mx = ptr.x === OFF ? 0 : ptr.x / B.w - 0.5;
      const my = ptr.y === OFF ? 0 : ptr.y / B.h - 0.5;
      const R = Math.min(B.w, B.h) * 0.42;
      const cx = B.w * 0.5, cy = B.h * 0.5;
      const a = 3 + 0.06 * Math.sin(t * 0.07) + mx * 0.22;
      const b = 2 + 0.05 * Math.cos(t * 0.05) + my * 0.22;
      const ph = t * 0.12;
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let i = 0; i <= 1800; i++) {
          const u = i * 0.024;
          const d = Math.exp(-u * 0.032) * (pass ? 0.88 : 1);
          const x = cx + R * d * (0.62 * Math.sin(a * u + ph + pass) + 0.38 * Math.sin((a + 0.04) * u * 1.0));
          const y = cy + R * d * (0.62 * Math.sin(b * u + 1.4) + 0.38 * Math.sin((b + 0.03) * u * 1.5 + ph * 0.5));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineWidth = pass ? 1 : 1.3;
        ctx.strokeStyle = rgba(pass ? c.accent : c.ink, pass ? 0.55 : 0.5);
        ctx.stroke();
      }
    },
  };

  /* ---------- Ripple tank ----------
     Waves from three sources overlap. Crest on crest reinforces, crest on trough cancels. */
  let tcell = 16;
  M.scenes.tank = {
    init() { tcell = B.w < 700 ? 26 : 20; },
    paint() {
      const c = pal();
      const t = B.clock;
      const src = [
        [B.w * 0.3, B.h * 0.42 + Math.sin(t * 0.2) * 40],
        [B.w * 0.7, B.h * 0.58 + Math.cos(t * 0.17) * 40],
        ptr.x !== OFF ? [ptr.x, ptr.y] : [B.w * 0.5 + Math.cos(t * 0.11) * B.w * 0.2, B.h * 0.5 + Math.sin(t * 0.13) * B.h * 0.2],
      ];
      const k = 0.09, om = 2.2;
      for (let y = tcell / 2; y < B.h; y += tcell) {
        for (let x = tcell / 2; x < B.w; x += tcell) {
          let v = 0;
          for (let s = 0; s < 3; s++) {
            const r = Math.hypot(x - src[s][0], y - src[s][1]);
            v += Math.sin(k * r - om * t) / (1 + r * 0.004);
          }
          v /= 2.2;
          if (v > 0.16) { ctx.fillStyle = rgba(c.accent, Math.min(0.7, v * 0.65)); ctx.beginPath(); ctx.arc(x, y, tcell * 0.46 * Math.min(1, v + 0.15), 0, TAU); ctx.fill(); }
          else if (v < -0.2) { ctx.fillStyle = rgba(c.ink, Math.min(0.35, -v * 0.4)); ctx.beginPath(); ctx.arc(x, y, tcell * 0.3 * Math.min(1, -v + 0.1), 0, TAU); ctx.fill(); }
        }
      }
    },
  };
})();
