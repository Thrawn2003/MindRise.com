/* Ambient layer: window light with drifting dust, a reading lamp, scroll-driven drawing, reading light,
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
     The background: window light, with dust that drifts and stirs
     ========================================================= */
  const canvas = $('#field');
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  let motes = [];
  let calm = 0; // 0 = normal, 1 = settled (while a focus session is running)
  let clock = 0, lastNow = 0;
  let cvx = 0, cvy = 0, lastPx = OFF, lastPy = OFF;
  const beams = [{ x: 0.8, w: 300, a: -0.38, k: 1 }, { x: 0.44, w: 190, a: -0.33, k: 0.6 }];
  const screenY = (m) => (((m.y - scrollY * 0.14 * m.z) % h) + h) % h;

  function seedMotes() {
    const n = w < 700 ? 28 : Math.round(clamp((w * h) / 26000, 36, 72));
    motes = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), z: rand(0.35, 1), r: rand(0.7, 1.9), vx: 0, vy: 0, ph: rand(0, TAU) }));
  }

  function paintDust() {
    const night = root.dataset.theme === 'night';
    const lean = ptr.x === OFF ? 0 : (ptr.x / w - 0.5) * 0.05;
    beams.forEach((b, i) => {
      const breathe = 0.75 + 0.25 * Math.sin(clock * 0.22 + i * 2);
      const alpha = (night ? 0.055 : 0.5) * b.k * breathe * (1 - calm * 0.5);
      const col = night ? '214,168,92' : '255,243,214';
      ctx.save();
      ctx.translate(w * b.x, -h * 0.2);
      ctx.rotate(b.a + lean);
      const g = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
      g.addColorStop(0, `rgba(${col},0)`);
      g.addColorStop(0.5, `rgba(${col},${alpha.toFixed(3)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-b.w / 2, 0, b.w, h * 1.9);
      ctx.restore();
    });
    const col = night ? '236,214,168' : '110,84,48';
    motes.forEach((m) => {
      const py = screenY(m);
      let inBeam = 0;
      beams.forEach((b) => {
        const ang = b.a + lean;
        const dx = m.x - w * b.x, dy = py + h * 0.2;
        const dist = dx * Math.cos(ang) + dy * Math.sin(ang);
        inBeam += Math.exp(-(dist * dist) / (2 * (b.w * 0.32) ** 2)) * b.k;
      });
      const tw = 0.7 + 0.3 * Math.sin(clock * 0.8 + m.ph);
      const a = (0.1 + m.z * 0.16 + inBeam * (night ? 0.4 : 0.22)) * tw * (1 - calm * 0.35);
      ctx.fillStyle = `rgba(${col},${Math.min(a, 0.7).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(m.x, py, m.r * (0.8 + m.z * 0.5), 0, TAU);
      ctx.fill();
    });
  }

  function stepDust(dt) {
    const speed = 1 - calm * 0.65;
    if (ptr.x !== OFF && lastPx !== OFF) {
      cvx = lerp(cvx, ptr.x - lastPx, 0.3);
      cvy = lerp(cvy, ptr.y - lastPy, 0.3);
    } else {
      cvx *= 0.8;
      cvy *= 0.8;
    }
    lastPx = ptr.x;
    lastPy = ptr.y;
    const moving = Math.hypot(cvx, cvy) > 1.5;
    motes.forEach((m) => {
      const a = noise(m.x * 0.0011, m.y * 0.0011, clock * 0.05) * TAU * 2;
      const dx0 = Math.cos(a) * 7 * m.z * speed, dy0 = Math.sin(a) * 7 * m.z * speed - 2.5 * m.z * speed;
      if (moving) {
        const d = Math.hypot(m.x - ptr.x, screenY(m) - ptr.y);
        if (d < 200) {
          const f = (1 - d / 200) ** 2 * 0.05 * (0.4 + m.z); // dust is carried by moving air, not pushed by a still cursor
          m.vx += cvx * f;
          m.vy += cvy * f;
        }
      }
      m.vx *= 0.965;
      m.vy *= 0.965;
      m.x += dx0 * dt + m.vx;
      m.y += dy0 * dt + m.vy;
      if (m.x < -10) m.x = w + 10; else if (m.x > w + 10) m.x = -10;
      if (m.y < -10) m.y += h; else if (m.y > h + 10) m.y -= h;
    });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sc = activeKey && M.scenes[activeKey];
    if (sc && sc.init) sc.init();
    paint();
  }
  addEventListener('resize', resize);

  // scenes are swappable: dust lives here, the others register themselves from backgrounds.js
  M.scenes = M.scenes || {};
  M.scenes.dust = { init: seedMotes, step: stepDust, paint: paintDust };
  let activeKey = null;
  function ensureScene() {
    const key = M.surface().scene || null;
    if (key === activeKey) return;
    activeKey = key;
    ctx.clearRect(0, 0, w, h);
    canvas.style.display = key ? '' : 'none';
    const sc = key && M.scenes[key];
    if (sc && sc.init) sc.init();
  }
  function paint() {
    ctx.clearRect(0, 0, w, h);
    const sc = activeKey && M.scenes[activeKey];
    if (sc) sc.paint();
  }
  M.bus.addEventListener('settings', () => { setLamp(); ensureScene(); paint(); });

  // a click on blank paper lets out a breath of air
  addEventListener('pointerdown', (e) => {
    if (activeKey !== 'dust' || !motionOn() || e.target.closest('a, button, input, textarea, select, label, summary, canvas, .card, .specimen, mark, .term')) return;
    motes.forEach((m) => {
      const dx = m.x - e.clientX, dy = screenY(m) - e.clientY, d = Math.hypot(dx, dy);
      if (d < 260) {
        const f = (1 - d / 260) ** 2 * 7;
        m.vx += (dx / (d || 1)) * f;
        m.vy += (dy / (d || 1)) * f;
      }
    });
  });

  // the lamp is warmer in the evening
  function setLamp() {
    const night = M.settings.theme === 'night';
    const hr = new Date().getHours();
    let c;
    if (night) c = 'rgba(255,205,130,0.07)';
    else if (hr >= 17 && hr < 21) c = 'rgba(255,208,140,0.30)';
    else if (hr >= 21 || hr < 6) c = 'rgba(255,196,120,0.24)';
    else c = 'rgba(255,238,196,0.26)';
    root.style.setProperty('--lamp', c);
  }
  setLamp();
  const hrNow = new Date().getHours();
  const greet = $('#greet');
  if (greet) greet.textContent = hrNow >= 5 && hrNow < 12 ? 'Good morning' : hrNow < 17 && hrNow >= 12 ? 'Good afternoon' : hrNow >= 17 && hrNow < 22 ? 'Good evening' : 'A quiet hour';

  ensureScene();
  resize();
  (function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || !motionOn() || !activeKey) return;
    const dt = Math.min((now - lastNow) / 1000 || 0, 0.05);
    lastNow = now;
    clock += dt;
    calm = lerp(calm, root.dataset.focus === 'on' ? 1 : 0, 0.02);
    if (ptr.tx === OFF) { ptr.x = OFF; ptr.y = OFF; }
    else {
      ptr.x = ptr.x === OFF ? ptr.tx : lerp(ptr.x, ptr.tx, 0.18);
      ptr.y = ptr.y === OFF ? ptr.ty : lerp(ptr.y, ptr.ty, 0.18);
    }
    const sc = M.scenes[activeKey];
    if (sc && sc.step) sc.step(dt);
    paint();
  })(0);

  // shared tools for the other scenes
  M.bg = {
    ctx, ptr, OFF, TAU, noise, lerp, clamp, rand,
    get w() { return w; }, get h() { return h; }, get clock() { return clock; }, get calm() { return calm; },
    refresh() { activeKey = null; ensureScene(); paint(); },
  };

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
    const frac = max > 0 ? clamp(y / max, 0, 1) : 0;
    bar.style.transform = `scaleX(${frac})`;
    root.style.setProperty('--p', frac.toFixed(4));
    updateReads();
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
  $('#themeBtn').addEventListener('click', () => M.toggleTheme());

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
  $$('[data-rise], .fade, .section-head').forEach((el) => io.observe(el));
  M.bus.addEventListener('settings', () => !motionOn() && $$('[data-rise], .fade, .section-head').forEach((el) => el.classList.add('in')));

  /* =========================================================
     Reading light: words darken as you reach them
     ========================================================= */
  const reads = $$('[data-read]').map((el) => {
    const words = [];
    const holder = document.createElement('span');
    const walk = (node, parent) => node.childNodes.forEach((ch) => {
      if (ch.nodeType === 3) {
        ch.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { parent.appendChild(document.createTextNode(' ')); return; }
          const sp = document.createElement('span');
          sp.className = 'rd';
          sp.textContent = tok;
          parent.appendChild(sp);
          words.push(sp);
        });
      } else if (ch.nodeType === 1) {
        const copy = ch.cloneNode(false);
        parent.appendChild(copy);
        walk(ch, copy);
      }
    });
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    walk(el, holder);
    holder.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    el.appendChild(holder);
    return { el, words };
  });
  function updateReads() {
    reads.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = motionOn() ? clamp((innerHeight * 0.86 - r.top) / (innerHeight * 0.5), 0, 1) : 1;
      const n = Math.round(p * words.length);
      words.forEach((sp, i) => sp.classList.toggle('lit', i < n));
    });
  }

  /* a soft sheen that follows the cursor over framed things */
  $$('.sheen').forEach((el) => el.addEventListener('pointermove', (e) => {
    if (!motionOn() || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--py', `${((e.clientY - r.top) / r.height) * 100}%`);
  }));

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
  $$('.btn, .link-arrow, .filter, .next-link').forEach((el) => {
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
    themeLabel.textContent = M.effectiveTheme() === 'night' ? 'Reading: night' : 'Reading: paper';
  };
  soundBtn.addEventListener('click', () => { M.set({ sound: !M.settings.sound }); M.sfx.note(3); });
  motionBtn.addEventListener('click', () => M.set({ motion: !M.settings.motion }));
  themeLabel.addEventListener('click', () => M.toggleTheme());
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
