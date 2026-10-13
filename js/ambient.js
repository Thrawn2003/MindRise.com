/* Ambient layer: a living background per page, a reading lamp, an ink trail, scroll-driven drawing,
   glossary notes, hover figures and other small things that make the pages feel handled. */
(() => {
  const M = window.Mindrise;
  const { $, $$, clamp, lerp, rand, css, rgba } = M;
  const root = document.documentElement;
  const TAU = Math.PI * 2;
  const motionOn = () => M.settings.motion;
  const fine = M.finePointer;

  /* =========================================================
     Noise (smooth 3D value noise, seeded so every load matches)
     ========================================================= */
  const perm = new Uint8Array(512);
  (function seed() {
    let s = 20240611;
    const next = () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const hash = (x, y, z) => perm[perm[perm[x & 255] + (y & 255)] + (z & 255)] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  function noise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const a = lerp(lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy);
    const b = lerp(lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy);
    return lerp(a, b, fz);
  }
  const lerpAngle = (a, b, k) => {
    const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    return a + d * k;
  };

  /* =========================================================
     Pointer + scroll state shared by every effect
     ========================================================= */
  const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  const OFF = -9999;
  addEventListener('pointermove', (e) => {
    ptr.tx = e.clientX;
    ptr.ty = e.clientY;
    root.style.setProperty('--mx', `${e.clientX}px`);
    root.style.setProperty('--my', `${e.clientY}px`);
  }, { passive: true });
  const dropPointer = () => { ptr.tx = OFF; ptr.ty = OFF; };
  root.addEventListener('mouseleave', dropPointer);
  addEventListener('pointerup', (e) => e.pointerType === 'touch' && setTimeout(dropPointer, 700));

  /* =========================================================
     The living background
     ========================================================= */
  const canvas = $('#field');
  const ctx = canvas.getContext('2d');
  const scene = document.body.dataset.scene || 'halftone';
  let w = 0, h = 0, C = {};
  let pulses = [];

  const readColors = () => { C = { ink: css('--ink'), accent: css('--accent'), brass: css('--brass') }; };

  const scenes = {
    /* iron-filing flow field: strokes drift with noise and curl around the cursor */
    flow: {
      fps: 60,
      init() { this.cell = w < 700 ? 34 : 38; this.cols = Math.ceil(w / this.cell) + 1; this.rows = Math.ceil(h / this.cell) + 1; },
      draw(t) {
        ctx.lineCap = 'round';
        ctx.lineWidth = 1;
        ctx.strokeStyle = C.ink;
        const sc = scrollY * 0.0006;
        pulses = pulses.filter((p) => p.r < 1100);
        pulses.forEach((p) => { p.r += 7; p.amp *= 0.985; });
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const x = c * this.cell + (r & 1 ? this.cell / 2 : 0);
            const y = r * this.cell;
            let a = noise(x * 0.0014, y * 0.0014, t * 0.04 + sc) * TAU * 2;
            let k = 0;
            const dx = x - ptr.x, dy = y - ptr.y, d2 = dx * dx + dy * dy;
            if (d2 < 90000) {
              k = 1 - Math.sqrt(d2) / 300;
              k *= k;
              a = lerpAngle(a, Math.atan2(dy, dx) + Math.PI / 2, k * 0.9);
            }
            for (let i = 0; i < pulses.length; i++) {
              const p = pulses[i];
              const dd = Math.hypot(x - p.x, y - p.y) - p.r;
              if (dd > -80 && dd < 80) a += Math.sin((dd / 80) * Math.PI) * p.amp;
            }
            const len = 7 + k * 8;
            const cs = Math.cos(a) * len, sn = Math.sin(a) * len;
            ctx.globalAlpha = 0.13 + k * 0.5;
            ctx.beginPath();
            ctx.moveTo(x - cs, y - sn);
            ctx.lineTo(x + cs, y + sn);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      },
    },

    /* topographic contours that bend around an invisible hill under the cursor */
    contour: {
      fps: 40,
      init() {
        this.cell = w < 700 ? 34 : 26;
        this.cols = Math.ceil(w / this.cell) + 1;
        this.rows = Math.ceil(h / this.cell) + 1;
        this.f = new Float32Array(this.cols * this.rows);
      },
      draw(t) {
        const { cols, rows, cell, f } = this;
        const sc = scrollY * 0.00035;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = c * cell, y = r * cell;
            let v = noise(x * 0.0021, y * 0.0021, t * 0.035 + sc) * 0.75 + noise(x * 0.006, y * 0.006, t * 0.02) * 0.25;
            const dx = x - ptr.x, dy = y - ptr.y;
            v += 0.5 * Math.exp(-(dx * dx + dy * dy) / (2 * 170 * 170));
            f[r * cols + c] = v;
          }
        }
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.ink;
        for (let li = 0; li < 9; li++) {
          const L = 0.28 + li * 0.07;
          const major = li % 3 === 0;
          ctx.globalAlpha = major ? 0.34 : 0.17;
          ctx.lineWidth = major ? 1.2 : 0.8;
          ctx.beginPath();
          for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
              const a = f[r * cols + c], b = f[r * cols + c + 1], cc = f[(r + 1) * cols + c + 1], d = f[(r + 1) * cols + c];
              const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
              if (idx === 0 || idx === 15) continue;
              const x0 = c * cell, y0 = r * cell;
              const T = [x0 + cell * ((L - a) / (b - a)), y0];
              const R = [x0 + cell, y0 + cell * ((L - b) / (cc - b))];
              const B = [x0 + cell * ((L - d) / (cc - d)), y0 + cell];
              const Lf = [x0, y0 + cell * ((L - a) / (d - a))];
              const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
              switch (idx) {
                case 1: case 14: seg(Lf, B); break;
                case 2: case 13: seg(B, R); break;
                case 3: case 12: seg(Lf, R); break;
                case 4: case 11: seg(T, R); break;
                case 5: seg(T, R); seg(Lf, B); break;
                case 6: case 9: seg(T, B); break;
                case 7: case 8: seg(Lf, T); break;
                case 10: seg(Lf, T); seg(B, R); break;
                default: break;
              }
            }
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    },

    /* graph-paper dots that part gently for the cursor and spring back */
    dots: {
      fps: 60,
      init() {
        this.gap = w < 700 ? 26 : 30;
        this.cols = Math.ceil(w / this.gap) + 1;
        this.rows = Math.ceil(h / this.gap) + 1;
        const n = this.cols * this.rows;
        this.ox = new Float32Array(n); this.oy = new Float32Array(n);
        this.vx = new Float32Array(n); this.vy = new Float32Array(n);
      },
      draw() {
        const { gap, cols, rows, ox, oy, vx, vy } = this;
        ctx.fillStyle = C.ink;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.8;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const hx = c * gap, hy = r * gap;
            const px = hx + ox[i], py = hy + oy[i];
            const dx = px - ptr.x, dy = py - ptr.y;
            const d = Math.hypot(dx, dy);
            let near = 0;
            if (d < 170) {
              near = 1 - d / 170;
              const f = near * near * 2.2;
              vx[i] += (dx / (d || 1)) * f;
              vy[i] += (dy / (d || 1)) * f;
            }
            vx[i] = (vx[i] - ox[i] * 0.07) * 0.84;
            vy[i] = (vy[i] - oy[i] * 0.07) * 0.84;
            ox[i] += vx[i];
            oy[i] += vy[i];
            ctx.globalAlpha = 0.2 + near * 0.5;
            if (c % 4 === 0 && r % 4 === 0) {
              ctx.beginPath();
              ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py);
              ctx.moveTo(px, py - 4); ctx.lineTo(px, py + 4);
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.arc(px, py, 1.1 + near * 1.8, 0, TAU);
              ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1;
      },
    },

    /* a ruled sheet that dips where it is touched and drifts slower than the page */
    ruled: {
      fps: 60,
      init() { this.gap = 36; },
      draw(t) {
        const gap = this.gap;
        const shift = (scrollY * 0.25) % gap;
        ctx.lineWidth = 1;
        ctx.strokeStyle = C.ink;
        ctx.globalAlpha = 0.15;
        for (let y = -shift; y < h + gap; y += gap) {
          ctx.beginPath();
          for (let x = 0; x <= w + 12; x += 12) {
            const dx = x - ptr.x, dy = y - ptr.y;
            const dip = 16 * Math.exp(-(dx * dx + dy * dy) / (2 * 120 * 120));
            const wave = Math.sin(x * 0.004 + t * 0.5 + y * 0.01) * 1.3;
            if (x === 0) ctx.moveTo(x, y + dip + wave);
            else ctx.lineTo(x, y + dip + wave);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = C.accent;
        ctx.beginPath();
        ctx.moveTo(w * 0.085, 0);
        ctx.lineTo(w * 0.085, h);
        ctx.stroke();
        ctx.globalAlpha = 1;
      },
    },

    /* a printer's halftone: dot size follows a slow field and the cursor */
    halftone: {
      fps: 45,
      init() { this.gap = w < 700 ? 18 : 22; },
      draw(t) {
        const gap = this.gap;
        const sc = scrollY * 0.0004;
        ctx.fillStyle = C.ink;
        for (let r = 0, y = 0; y < h + gap; r++, y += gap) {
          for (let x = (r & 1) * (gap / 2); x < w + gap; x += gap) {
            let v = noise(x * 0.003, y * 0.003, t * 0.04 + sc);
            const dx = x - ptr.x, dy = y - ptr.y;
            v += 0.7 * Math.exp(-(dx * dx + dy * dy) / (2 * 150 * 150));
            const rad = gap * 0.5 * Math.pow(clamp((v - 0.3) * 1.5, 0, 1), 1.2);
            if (rad < 0.5) continue;
            ctx.globalAlpha = 0.16;
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, TAU);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      },
    },
  };

  const S = scenes[scene] || scenes.halftone;
  let clock = 0;
  let lastNow = 0;
  let lastDraw = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.init();
    paint();
  }
  function paint() {
    ctx.clearRect(0, 0, w, h);
    S.draw(clock);
  }
  readColors();
  addEventListener('resize', resize);
  M.bus.addEventListener('settings', () => { readColors(); paint(); });
  resize();

  // clicking blank paper sends a ripple through the flow field
  addEventListener('pointerdown', (e) => {
    if (scene !== 'flow' || !motionOn()) return;
    if (e.target.closest('a, button, input, textarea, select, label, summary, canvas, .card')) return;
    pulses.push({ x: e.clientX, y: e.clientY, r: 0, amp: 1.4 });
    if (pulses.length > 4) pulses.shift();
  });

  (function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || !motionOn()) return;
    if (now - lastDraw < 1000 / S.fps - 2) return;
    lastDraw = now;
    clock += Math.min((now - lastNow) / 1000 || 0, 0.1);
    lastNow = now;
    if (ptr.tx === OFF) { ptr.x = OFF; ptr.y = OFF; }
    else {
      ptr.x = ptr.x === OFF ? ptr.tx : lerp(ptr.x, ptr.tx, 0.18);
      ptr.y = ptr.y === OFF ? ptr.ty : lerp(ptr.y, ptr.ty, 0.18);
    }
    paint();
  })(0);

  /* =========================================================
     Ink trail: a hairline that follows the cursor and fades
     ========================================================= */
  const trail = $('#trail');
  if (trail && fine) {
    const tc = trail.getContext('2d');
    let pts = [];
    let running = false;
    const sizeTrail = () => { trail.width = innerWidth; trail.height = innerHeight; };
    sizeTrail();
    addEventListener('resize', sizeTrail);
    const step = () => {
      const now = performance.now();
      pts = pts.filter((p) => now - p.t < 650);
      tc.clearRect(0, 0, trail.width, trail.height);
      if (pts.length > 1) {
        tc.lineCap = 'round';
        for (let i = 1; i < pts.length; i++) {
          const age = (now - pts[i].t) / 650;
          tc.strokeStyle = rgba(C.ink, (1 - age) * 0.38);
          tc.lineWidth = 0.6 + (1 - age) * 1.1;
          tc.beginPath();
          tc.moveTo(pts[i - 1].x, pts[i - 1].y);
          tc.lineTo(pts[i].x, pts[i].y);
          tc.stroke();
        }
        requestAnimationFrame(step);
      } else {
        running = false;
      }
    };
    addEventListener('pointermove', (e) => {
      if (!motionOn() || e.pointerType === 'touch') return;
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: true });
  }

  /* =========================================================
     Header: quiet on the way down, back on the way up
     ========================================================= */
  const header = $('#header');
  const bar = $('#progress');
  let lastY = scrollY;
  let ticking = false;
  const parallax = $$('[data-parallax]');
  function onScroll() {
    ticking = false;
    const y = scrollY;
    header.classList.toggle('scrolled', y > 8);
    if (y > lastY + 6 && y > 240) header.classList.add('hide');
    else if (y < lastY - 6) header.classList.remove('hide');
    lastY = y;
    const max = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    if (motionOn()) {
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        const off = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${(-off).toFixed(1)}px, 0)`;
      });
    }
    drawPlates();
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* nav: current page + a sliding ink underline */
  const page = location.pathname.split('/').pop() || 'index.html';
  const nav = $('#siteNav');
  const ink = $('.nav-ink', nav);
  const links = $$('a', nav);
  const current = links.find((a) => a.getAttribute('href') === page);
  if (current) current.setAttribute('aria-current', 'page');
  const moveInk = (el) => {
    if (!el) { ink.style.opacity = '0'; return; }
    const nr = nav.getBoundingClientRect(), r = el.getBoundingClientRect();
    ink.style.width = `${r.width}px`;
    ink.style.transform = `translateX(${r.left - nr.left}px)`;
    ink.style.opacity = '1';
  };
  links.forEach((a) => {
    a.addEventListener('mouseenter', () => { moveInk(a); M.sfx.tick(); });
    a.addEventListener('focus', () => moveInk(a));
  });
  nav.addEventListener('mouseleave', () => moveInk(current));
  addEventListener('resize', () => moveInk(current));
  setTimeout(() => moveInk(current), 60);

  $('#menuBtn').addEventListener('click', (e) => {
    const open = header.classList.toggle('nav-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  $('#themeBtn').addEventListener('click', () => M.set({ theme: M.settings.theme === 'night' ? 'paper' : 'night' }));

  /* =========================================================
     Reveal: headings rise word by word, paragraphs fade up
     ========================================================= */
  function riseSplit(el) {
    const label = el.textContent.trim().replace(/\s+/g, ' ');
    let i = 0;
    const holder = document.createElement('span');
    holder.setAttribute('aria-hidden', 'true');
    const walk = (node, parent) => {
      node.childNodes.forEach((ch) => {
        if (ch.nodeType === 3) {
          ch.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { parent.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span');
            o.className = 'rw';
            const inner = document.createElement('span');
            inner.className = 'ri';
            inner.style.transitionDelay = `${i++ * 55}ms`;
            inner.textContent = tok;
            o.appendChild(inner);
            parent.appendChild(o);
          });
        } else if (ch.nodeType === 1) {
          const copy = ch.cloneNode(false);
          parent.appendChild(copy);
          walk(ch, copy);
        }
      });
    };
    el.setAttribute('aria-label', label);
    walk(el, holder);
    el.textContent = '';
    el.appendChild(holder);
  }
  $$('[data-rise]').forEach(riseSplit);
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    io.unobserve(en.target);
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-rise], .fade').forEach((el) => io.observe(el));
  M.bus.addEventListener('settings', () => !motionOn() && $$('[data-rise], .fade').forEach((el) => el.classList.add('in')));

  /* =========================================================
     Plates: line figures that draw themselves as you scroll
     ========================================================= */
  const plates = $$('.plate');
  plates.forEach((plate) => {
    plate.paths = $$('[data-draw]', plate);
    plate.paths.forEach((p) => {
      p.len = p.getTotalLength ? p.getTotalLength() : 600;
      p.style.strokeDasharray = p.len;
      p.style.strokeDashoffset = p.len;
    });
  });
  function drawPlates() {
    plates.forEach((plate) => {
      const r = plate.getBoundingClientRect();
      const p = motionOn() ? clamp((innerHeight * 0.88 - r.top) / (innerHeight * 0.5), 0, 1) : 1;
      const n = plate.paths.length;
      plate.paths.forEach((path, i) => {
        const local = clamp(p * (n + 1) - i, 0, 1);
        path.style.strokeDashoffset = String(path.len * (1 - local));
      });
      plate.classList.toggle('complete', p > 0.96);
    });
  }

  /* =========================================================
     Glossary: terms open a small marginal note
     ========================================================= */
  const gloss = document.createElement('div');
  gloss.className = 'gloss';
  gloss.setAttribute('role', 'tooltip');
  gloss.id = 'gloss';
  document.body.appendChild(gloss);
  let glossFor = null;
  function showGloss(term) {
    glossFor = term;
    gloss.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = term.textContent;
    const p = document.createElement('span');
    p.textContent = term.dataset.def;
    gloss.append(b, p);
    gloss.classList.add('on');
    const r = term.getBoundingClientRect();
    const gw = gloss.offsetWidth;
    gloss.style.left = `${clamp(r.left + r.width / 2 - gw / 2, 12, innerWidth - gw - 12)}px`;
    const above = r.top > gloss.offsetHeight + 24;
    gloss.style.top = `${above ? r.top - gloss.offsetHeight - 10 : r.bottom + 10}px`;
    term.setAttribute('aria-describedby', 'gloss');
  }
  const hideGloss = () => { gloss.classList.remove('on'); if (glossFor) glossFor.removeAttribute('aria-describedby'); glossFor = null; };
  $$('.term').forEach((t) => {
    t.tabIndex = 0;
    t.addEventListener('mouseenter', () => showGloss(t));
    t.addEventListener('mouseleave', hideGloss);
    t.addEventListener('focus', () => showGloss(t));
    t.addEventListener('blur', hideGloss);
    t.addEventListener('click', () => (glossFor === t ? hideGloss() : showGloss(t)));
  });
  addEventListener('scroll', hideGloss, { passive: true });
  addEventListener('keydown', (e) => e.key === 'Escape' && hideGloss());

  /* =========================================================
     Index rows: a small figure follows the cursor
     ========================================================= */
  const floatFig = $('#floatFig');
  if (floatFig && fine) {
    let fx = 0, fy = 0, tx = 0, ty = 0, vx = 0, active = false;
    $$('[data-float]').forEach((row) => {
      row.addEventListener('mouseenter', () => {
        $$('[data-fig]', floatFig).forEach((f) => f.classList.toggle('on', f.dataset.fig === row.dataset.float));
        floatFig.classList.add('on');
        active = true;
      });
      row.addEventListener('mouseleave', () => { floatFig.classList.remove('on'); active = false; });
    });
    addEventListener('pointermove', (e) => { tx = e.clientX + 36; ty = e.clientY - 90; }, { passive: true });
    (function follow() {
      const nx = lerp(fx, tx, 0.12);
      vx = lerp(vx, nx - fx, 0.2);
      fx = nx;
      fy = lerp(fy, ty, 0.12);
      if (active || floatFig.classList.contains('on')) {
        floatFig.style.transform = `translate(${fx}px, ${fy}px) rotate(${clamp(vx * 0.6, -9, 9)}deg)`;
      }
      requestAnimationFrame(follow);
    })();
  }

  /* =========================================================
     Small tactile things: sheen on cards, ink-fill on buttons
     ========================================================= */
  $$('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (!motionOn() || e.pointerType === 'touch') return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--px', `${x * 100}%`);
      card.style.setProperty('--py', `${y * 100}%`);
      card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 2.4).toFixed(2)}deg) rotateY(${((x - 0.5) * 2.4).toFixed(2)}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
  $$('.btn, .link-arrow, .filter').forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--bx', `${e.clientX - r.left}px`);
      el.style.setProperty('--by', `${e.clientY - r.top}px`);
    });
    el.addEventListener('pointerdown', () => M.sfx.tick());
  });
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      if (!motionOn()) return;
      const r = el.getBoundingClientRect();
      el.style.translate = `${(e.clientX - (r.left + r.width / 2)) * 0.18}px ${(e.clientY - (r.top + r.height / 2)) * 0.25}px`;
    });
    el.addEventListener('pointerleave', () => (el.style.translate = ''));
  });

  /* =========================================================
     Big letters (hero headline, footer wordmark) that swell near the cursor
     ========================================================= */
  function swellWord(el, { lo, hi, radius, lift }) {
    const text = el.dataset.text || el.textContent.trim();
    el.textContent = '';
    el.setAttribute('aria-label', text);
    const letters = [];
    text.split(' ').forEach((word, wi, arr) => {
      const wEl = document.createElement('span');
      wEl.className = 'sw-word';
      wEl.setAttribute('aria-hidden', 'true');
      [...word].forEach((chr) => {
        const s = document.createElement('span');
        s.className = 'sw-ch';
        s.textContent = chr;
        wEl.appendChild(s);
        letters.push(s);
      });
      el.appendChild(wEl);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    let visible = true;
    new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(el);
    let clock2 = 0;
    (function tick() {
      requestAnimationFrame(tick);
      if (!visible || !motionOn()) return;
      clock2 += 0.016;
      letters.forEach((s, i) => {
        let k;
        if (fine && ptr.x !== OFF) {
          const r = s.getBoundingClientRect();
          const d = Math.hypot(ptr.x - (r.left + r.width / 2), ptr.y - (r.top + r.height / 2));
          k = clamp(1 - d / radius, 0, 1);
          k = k * k * (3 - 2 * k);
        } else {
          k = (0.5 + 0.5 * Math.sin(clock2 * 0.9 - i * 0.4)) * 0.35;
        }
        s.style.fontVariationSettings = `"wght" ${Math.round(lerp(lo, hi, k))}`;
        s.style.transform = lift ? `translateY(${(-lift * k).toFixed(2)}px)` : '';
      });
    })();
  }
  const headline = $('#headline');
  if (headline) swellWord(headline, { lo: 260, hi: 520, radius: 230, lift: 5 });
  const bigmark = $('#bigmark');
  if (bigmark) swellWord(bigmark, { lo: 200, hi: 600, radius: 260, lift: 10 });

  /* =========================================================
     Chapter navigation (long reads)
     ========================================================= */
  const chapterLinks = $$('#chapters a');
  if (chapterLinks.length) {
    const byId = new Map(chapterLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      chapterLinks.forEach((a) => a.classList.remove('on'));
      const a = byId.get(en.target.id);
      if (a) a.classList.add('on');
    }), { rootMargin: '-35% 0px -60% 0px' });
    $$('[data-chapter]').forEach((s) => spy.observe(s));
  }

  /* =========================================================
     Footer settings, page transitions, entrance
     ========================================================= */
  const soundBtn = $('#setSound');
  const motionBtn = $('#setMotion');
  const themeLabel = $('#setTheme');
  const syncControls = () => {
    soundBtn.textContent = M.settings.sound ? 'Sound: on' : 'Sound: off';
    soundBtn.setAttribute('aria-pressed', String(M.settings.sound));
    motionBtn.textContent = M.settings.motion ? 'Motion: on' : 'Motion: still';
    motionBtn.setAttribute('aria-pressed', String(M.settings.motion));
    themeLabel.textContent = M.settings.theme === 'night' ? 'Reading: night' : 'Reading: paper';
  };
  soundBtn.addEventListener('click', () => { M.set({ sound: !M.settings.sound }); M.sfx.note(3); });
  motionBtn.addEventListener('click', () => M.set({ motion: !M.settings.motion }));
  themeLabel.addEventListener('click', () => M.set({ theme: M.settings.theme === 'night' ? 'paper' : 'night' }));
  M.bus.addEventListener('settings', syncControls);
  syncControls();

  // browsers with cross-document view transitions animate by themselves; others get a short fade
  const nativeTransitions = 'onpagereveal' in window;
  if (!nativeTransitions) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(() => (location.href = a.href), 260);
    });
  }
  addEventListener('pageshow', () => document.body.classList.remove('leaving'));
  requestAnimationFrame(() => document.body.classList.add('ready'));

  $('#year').textContent = new Date().getFullYear();
  onScroll();
})();
