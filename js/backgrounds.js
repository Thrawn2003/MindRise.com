/* Backgrounds: three more quiet scenes (still water, contours, colour wash) and the picker in the footer.
   Still surfaces (paper, linen, graph paper and the solid colours) are handled by core.js and css/site.css. */
(() => {
  const M = window.Mindrise;
  if (!M || !M.bg || !M.SURFACES || !M.scenes || !document.querySelector('#setSurface')) return; // mismatched cached files: stay out of the way
  const { $, clamp, css } = M;
  const B = M.bg;
  const { ctx, ptr, OFF, TAU, noise, lerp, rand } = B;

  // read palette colours once per surface/theme instead of every frame
  let colorKey = '';
  let colors = {};
  const palette = () => {
    const key = `${document.documentElement.dataset.surface}/${document.documentElement.dataset.theme}`;
    if (key !== colorKey) {
      colorKey = key;
      colors = { ink: css('--ink'), accent: css('--accent'), brass: css('--brass'), soft: css('--soft') };
    }
    return colors;
  };
  const night = () => document.documentElement.dataset.theme === 'night';
  const rgba = M.rgba;

  /* ---------- Still water: faint rings where the cursor passes ---------- */
  let rings = [];
  let lastX = OFF, lastY = OFF, lastAt = -9, idle = 0;
  M.scenes.ripples = {
    init() {
      // start with a few rings already spreading, so a still frame is never empty
      rings = Array.from({ length: 7 }, () => { const max = rand(90, 170); return { x: rand(0, B.w), y: rand(0, B.h), r: rand(8, max * 0.7), max, sp: 0.4, a: 0.2 }; });
      idle = 1;
    },
    step(dt) {
      if (ptr.x !== OFF && Math.hypot(ptr.x - lastX, ptr.y - lastY) > 70 && B.clock - lastAt > 0.25) {
        rings.push({ x: ptr.x, y: ptr.y, r: 2, max: rand(70, 110), sp: 0.55, a: 0.34 });
        lastX = ptr.x; lastY = ptr.y; lastAt = B.clock;
      }
      idle -= dt;
      if (idle <= 0) {
        rings.push({ x: rand(0, B.w), y: rand(0, B.h), r: 2, max: rand(90, 160), sp: 0.4, a: 0.2 });
        idle = rand(3, 6);
      }
      rings.forEach((r) => { r.r += r.sp * 60 * dt; });
      rings = rings.filter((r) => r.r < r.max).slice(-40);
    },
    paint() {
      ctx.lineWidth = 1.1;
      const c = palette().ink;
      rings.forEach((r) => {
        const k = Math.pow(1 - r.r / r.max, 1.5) * r.a;
        ctx.strokeStyle = rgba(c, k);
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = rgba(c, k * 0.5);
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.72, 0, TAU); ctx.stroke();
      });
    },
  };
  addEventListener('pointerdown', (e) => {
    if (M.surface().scene !== 'ripples' || !M.motion) return;
    if (e.target.closest('a, button, input, textarea, select, label, summary, canvas, .card, .specimen, mark, .term')) return;
    rings.push({ x: e.clientX, y: e.clientY, r: 2, max: 220, sp: 1.2, a: 0.4 });
    rings.push({ x: e.clientX, y: e.clientY, r: 2, max: 150, sp: 0.9, a: 0.3 });
  });

  /* ---------- Contours: a quiet topographic map that rises under the cursor ---------- */
  let field = null, cols = 0, rows = 0, cell = 30;
  M.scenes.contour = {
    init() {
      cell = B.w < 700 ? 38 : 30;
      cols = Math.ceil(B.w / cell) + 1;
      rows = Math.ceil(B.h / cell) + 1;
      field = new Float32Array(cols * rows);
    },
    step() {
      const sc = scrollY * 0.0003;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cell, y = r * cell;
          let v = noise(x * 0.0021, y * 0.0021, B.clock * 0.025 + sc) * 0.75 + noise(x * 0.006, y * 0.006, B.clock * 0.015) * 0.25;
          if (ptr.x !== OFF) {
            const dx = x - ptr.x, dy = y - ptr.y;
            v += 0.38 * Math.exp(-(dx * dx + dy * dy) / (2 * 190 * 190));
          }
          field[r * cols + c] = v;
        }
      }
    },
    paint() {
      if (!field) return;
      if (!M.motion) this.step(); // a still frame still needs its map
      ctx.lineCap = 'round';
      ctx.strokeStyle = palette().ink;
      for (let li = 0; li < 8; li++) {
        const L = 0.3 + li * 0.07;
        const major = li % 3 === 0;
        ctx.globalAlpha = major ? 0.2 : 0.1;
        ctx.lineWidth = major ? 1.1 : 0.75;
        ctx.beginPath();
        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const a = field[r * cols + c], b = field[r * cols + c + 1], cc = field[(r + 1) * cols + c + 1], d = field[(r + 1) * cols + c];
            const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x0 = c * cell, y0 = r * cell;
            const T = [x0 + cell * ((L - a) / (b - a)), y0];
            const R = [x0 + cell, y0 + cell * ((L - b) / (cc - b))];
            const Bm = [x0 + cell * ((L - d) / (cc - d)), y0 + cell];
            const Lf = [x0, y0 + cell * ((L - a) / (d - a))];
            const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
            switch (idx) {
              case 1: case 14: seg(Lf, Bm); break;
              case 2: case 13: seg(Bm, R); break;
              case 3: case 12: seg(Lf, R); break;
              case 4: case 11: seg(T, R); break;
              case 5: seg(T, R); seg(Lf, Bm); break;
              case 6: case 9: seg(T, Bm); break;
              case 7: case 8: seg(Lf, T); break;
              case 10: seg(Lf, T); seg(Bm, R); break;
              default: break;
            }
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };

  /* ---------- Colour wash: large soft pools of colour that drift and lean toward you ---------- */
  const pools = [
    { tone: 'accent', x: 0.2, y: 0.25, r: 0.42, seed: 3, depth: 1 },
    { tone: 'brass', x: 0.78, y: 0.2, r: 0.36, seed: 11, depth: 0.7 },
    { tone: 'soft', x: 0.6, y: 0.75, r: 0.46, seed: 19, depth: 1.2 },
    { tone: 'accent', x: 0.1, y: 0.85, r: 0.3, seed: 27, depth: 0.5 },
    { tone: 'brass', x: 0.9, y: 0.7, r: 0.3, seed: 35, depth: 0.9 },
  ];
  M.scenes.wash = {
    init() {},
    paint() {
      const c = palette();
      const dark = night();
      const mx = ptr.x === OFF ? 0 : ptr.x / B.w - 0.5;
      const my = ptr.y === OFF ? 0 : ptr.y / B.h - 0.5;
      const sc = scrollY * 0.00025;
      pools.forEach((p, i) => {
        const x = B.w * (p.x + 0.09 * (noise(p.seed, B.clock * 0.03, sc) - 0.5) * 2) + mx * 70 * p.depth;
        const y = B.h * (p.y + 0.09 * (noise(p.seed + 50, B.clock * 0.03, sc) - 0.5) * 2) + my * 70 * p.depth;
        const rad = Math.max(B.w, B.h) * p.r;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba(c[p.tone], dark ? 0.17 : 0.2));
        g.addColorStop(1, rgba(c[p.tone], 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, B.w, B.h);
      });
    },
  };

  /* =========================================================
     The picker
     ========================================================= */
  const trigger = $('#setSurface');
  const panel = document.createElement('section');
  panel.id = 'bgPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Choose a background');
  panel.hidden = true;
  document.body.appendChild(panel);

  const NEUTRAL = { paper: { bg: '#f3eee4', ink: '#1f1c18', acc: '#7d2f2f' }, night: { bg: '#15130f', ink: '#ece4d4', acc: '#dc8c76' } };
  const preview = (sf) => {
    const p = sf.neutral ? NEUTRAL[M.settings.theme] : { bg: sf.vars['--bg'], ink: sf.vars['--ink'], acc: sf.vars['--accent'] };
    const art = {
      window: `radial-gradient(circle at 70% 20%, ${p.acc}33, transparent 45%), radial-gradient(2px 2px at 30% 60%, ${p.ink}88, transparent), radial-gradient(1.5px 1.5px at 55% 40%, ${p.ink}77, transparent), radial-gradient(2px 2px at 78% 70%, ${p.ink}66, transparent)`,
      water: `repeating-radial-gradient(circle at 40% 55%, transparent 0 7px, ${p.ink}33 7px 8px)`,
      contour: `repeating-radial-gradient(ellipse at 35% 60%, transparent 0 6px, ${p.ink}2e 6px 7px)`,
      wash: `radial-gradient(circle at 25% 30%, ${p.acc}66, transparent 55%), radial-gradient(circle at 80% 80%, ${p.ink}33, transparent 55%)`,
      linen: `repeating-linear-gradient(0deg, ${p.ink}22 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, ${p.ink}1a 0 1px, transparent 1px 4px)`,
      grid: `linear-gradient(${p.ink}2a 1px, transparent 1px), linear-gradient(90deg, ${p.ink}2a 1px, transparent 1px)`,
    }[sf.id] || 'none';
    const size = sf.id === 'grid' ? 'background-size:10px 10px' : sf.id === 'linen' ? 'background-size:auto' : '';
    return `background-color:${p.bg};background-image:${art};${size}`;
  };

  function build() {
    const sec = (title, note, group) => `
      <div class="bg-group"><h4>${title}<span>${note}</span></h4>
        <div class="bg-grid" role="radiogroup" aria-label="${title}">
          ${M.SURFACES.filter((s) => s.group === group).map((s) => `
            <button class="bg-opt" role="radio" aria-checked="${s.id === M.settings.surface}" data-id="${s.id}">
              <i class="bg-swatch" style="${preview(s)}"></i><span>${s.label}</span>
            </button>`).join('')}
        </div>
      </div>`;
    panel.innerHTML = `
      <header><h3>Background</h3><button class="bg-close" aria-label="Close">×</button></header>
      ${sec('Alive', 'responds to you', 'alive')}
      ${sec('Still', 'nothing moves', 'still')}
      ${M.settings.motion ? '' : '<p class="bg-note">Motion is off, so the alive backgrounds are held still. <button class="bg-motion">Turn motion on</button></p>'}
      <p class="bg-foot">Tip: press <kbd>B</kbd> anywhere to move through them.</p>`;
  }
  function label() {
    trigger.textContent = `Background: ${M.surface().label}`;
    panel.querySelectorAll('.bg-opt').forEach((o) => o.setAttribute('aria-checked', String(o.dataset.id === M.settings.surface)));
  }
  let isOpen = false;
  function open() {
    isOpen = true;
    build();
    panel.hidden = false;
    requestAnimationFrame(() => isOpen && panel.classList.add('on'));
    trigger.setAttribute('aria-expanded', 'true');
    const sel = panel.querySelector('[aria-checked="true"]');
    if (sel) sel.focus({ preventScroll: true });
  }
  function close() {
    isOpen = false;
    panel.classList.remove('on');
    trigger.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!isOpen) panel.hidden = true; }, 350);
  }
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => (isOpen ? close() : open()));
  panel.addEventListener('click', (e) => {
    if (e.target.closest('.bg-close')) return close();
    if (e.target.closest('.bg-motion')) { M.set({ motion: true }); return; }
    const opt = e.target.closest('.bg-opt');
    if (!opt) return;
    M.set({ surface: opt.dataset.id });
    M.sfx.note(3);
  });
  panel.addEventListener('keydown', (e) => {
    const opts = [...panel.querySelectorAll('.bg-opt')];
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'Escape') { close(); trigger.focus(); }
    else if (i >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
    else if (i >= 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !e.target.closest('#bgPanel, #setSurface')) close();
  });

  /* ----- B cycles through the backgrounds, with a quiet caption ----- */
  const caption = document.createElement('div');
  caption.id = 'bgCaption';
  caption.setAttribute('aria-live', 'polite');
  document.body.appendChild(caption);
  let captionTimer = 0;
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'b' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
    const i = M.SURFACES.findIndex((s) => s.id === M.settings.surface);
    const next = M.SURFACES[(i + (e.shiftKey ? M.SURFACES.length - 1 : 1)) % M.SURFACES.length];
    M.set({ surface: next.id });
    caption.textContent = `Background · ${next.label}`;
    caption.classList.add('on');
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => caption.classList.remove('on'), 1700);
  });

  let lastTheme = M.settings.theme;
  let lastMotion = M.settings.motion;
  M.bus.addEventListener('settings', () => {
    if (!panel.hidden && (lastTheme !== M.settings.theme || lastMotion !== M.settings.motion)) { build(); }
    lastTheme = M.settings.theme;
    lastMotion = M.settings.motion;
    label();
  });
  B.refresh(); // pick up the saved surface now that every scene is registered
  label();
})();
