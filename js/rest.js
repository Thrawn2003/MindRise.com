/* Rest: four quiet things to do between sessions (breathing, bubbles, a mandala, a pairs game).
   None of them keep score or run a clock. */
(() => {
  const M = window.Mindrise;
  const { $, $$, clamp, css, rand } = M;
  const root = $('#rest');
  if (!root) return;
  const TAU = Math.PI * 2;
  const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  /* ---------- tabs ---------- */
  const tabs = $$('[data-rtab]', root);
  const panels = $$('[data-rpanel]', root);
  const leave = {};
  function select(name) {
    tabs.forEach((t) => { const on = t.dataset.rtab === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    panels.forEach((p) => { const on = p.dataset.rpanel === name; p.hidden = !on; });
    Object.entries(leave).forEach(([k, fn]) => k !== name && fn());
    if (name === 'mandala') drawMandala();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { select(t.dataset.rtab); M.sfx.tick(); });
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(n.dataset.rtab); n.focus();
    });
  });

  /* ---------- breathing ---------- */
  const PATTERNS = {
    box: [['Breathe in', 4, 1], ['Hold', 4, 1], ['Breathe out', 4, 0.55], ['Hold', 4, 0.55]],
    slow: [['Breathe in', 4, 1], ['Hold', 7, 1], ['Breathe out', 8, 0.55]],
    easy: [['Breathe in', 5, 1], ['Breathe out', 5, 0.55]],
  };
  const ring = $('#rbRing', root), label = $('#rbLabel', root), count = $('#rbCount', root), start = $('#rbStart', root), chips = $$('#rbPatterns .chip', root);
  let pattern = 'box', br = null;
  const setRing = (scale, secs) => { ring.style.transition = `transform ${secs}s ease-in-out`; ring.style.transform = `scale(${scale})`; };
  function stopBreathing() {
    if (!br) return;
    clearInterval(br.timer); br = null;
    start.textContent = 'Begin'; label.textContent = 'Ready'; count.textContent = '0';
    setRing(0.55, 0.8);
  }
  function phase() {
    const [name, sec, scale] = PATTERNS[pattern][br.i];
    br.at = Date.now(); label.textContent = name;
    setRing(scale, name === 'Hold' ? 0.1 : sec);
    if (name !== 'Hold') M.sfx.note(name === 'Breathe in' ? 2 : 0);
  }
  start.addEventListener('click', () => {
    if (br) return stopBreathing();
    br = { i: 0, breaths: 0, at: 0, timer: 0 };
    count.textContent = '0'; start.textContent = 'Stop'; phase();
    br.timer = setInterval(() => {
      const [name, sec] = PATTERNS[pattern][br.i];
      if ((Date.now() - br.at) / 1000 < sec) return;
      br.i = (br.i + 1) % PATTERNS[pattern].length;
      if (br.i === 0) count.textContent = String(++br.breaths);
      phase();
    }, 100);
  });
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => x.classList.toggle('active', x === c));
    pattern = c.dataset.p; stopBreathing();
  }));
  leave.breathe = stopBreathing;

  /* ---------- bubbles ---------- */
  const sheet = $('#rbSheet', root), bubNote = $('#rbBubNote', root);
  const TOTAL = 32;
  let popped = 0;
  function buildBubbles() {
    popped = 0; bubNote.textContent = '';
    sheet.replaceChildren(...Array.from({ length: TOTAL }, () => {
      const b = document.createElement('button');
      b.className = 'rbub'; b.type = 'button'; b.setAttribute('aria-label', 'Bubble');
      return b;
    }));
  }
  function pop(b) {
    if (b.classList.contains('popped')) return;
    b.classList.add('popped'); M.sfx.tick();
    if (++popped === TOTAL) { bubNote.textContent = 'All popped. Let your shoulders drop.'; M.sfx.done(); setTimeout(refill, 2200); }
  }
  function refill() {
    popped = 0; bubNote.textContent = '';
    $$('.rbub', sheet).forEach((b, i) => { b.classList.remove('popped', 'inflate'); void b.offsetWidth; b.style.animationDelay = `${i * 14}ms`; b.classList.add('inflate'); });
  }
  const popAt = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); if (el && el.classList.contains('rbub')) pop(el); };
  sheet.addEventListener('pointerdown', popAt);
  sheet.addEventListener('pointermove', (e) => { if (e.buttons === 1) popAt(e); });
  $('#rbRefill', root).addEventListener('click', refill);
  buildBubbles();

  /* ---------- mandala ---------- */
  const cv = $('#mdCanvas', root), cx = cv.getContext('2d');
  let strokes = [], cur = null, sym = 8, colorIdx = 0;
  const TONES = ['--accent', '--brass', '--ink', '--soft'];
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) * cv.width) / r.width, y: ((e.clientY - r.top) * cv.height) / r.height }; };
  function seg(s, i) {
    const a = s.pts[i - 1], b = s.pts[i]; if (!a || !b) return;
    const mx = cv.width / 2, my = cv.height / 2;
    cx.lineCap = 'round'; cx.lineWidth = 2; cx.strokeStyle = s.color;
    for (let k = 0; k < s.sym; k++) for (const flip of [1, -1]) {
      cx.save(); cx.translate(mx, my); cx.rotate((k * TAU) / s.sym); cx.scale(flip, 1); cx.translate(-mx, -my);
      cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); cx.restore();
    }
  }
  function drawMandala() {
    cx.clearRect(0, 0, cv.width, cv.height);
    strokes.forEach((s) => { for (let i = 1; i < s.pts.length; i++) seg(s, i); });
  }
  cv.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    cur = { pts: [p, { x: p.x + 0.01, y: p.y }], color: css(TONES[colorIdx++ % TONES.length]), sym };
    strokes.push(cur); seg(cur, 1);
    if (cv.setPointerCapture) cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => { if (!cur) return; cur.pts.push(pos(e)); seg(cur, cur.pts.length - 1); });
  ['pointerup', 'pointercancel'].forEach((t) => cv.addEventListener(t, () => (cur = null)));
  $$('#mdSym .chip', root).forEach((c) => c.addEventListener('click', () => {
    $$('#mdSym .chip', root).forEach((x) => x.classList.toggle('active', x === c));
    sym = Number(c.dataset.n);
  }));
  $('#mdUndo', root).addEventListener('click', () => { strokes.pop(); drawMandala(); });
  $('#mdClear', root).addEventListener('click', () => { strokes = []; drawMandala(); });
  M.bus.addEventListener('settings', () => { strokes.forEach((s, i) => (s.color = css(TONES[i % TONES.length]))); drawMandala(); });

  /* ---------- pairs ---------- */
  const GLYPHS = [['α', 'alpha'], ['β', 'beta'], ['γ', 'gamma'], ['δ', 'delta'], ['θ', 'theta'], ['λ', 'lambda'], ['π', 'pi'], ['σ', 'sigma']];
  const grid = $('#prGrid', root), prNote = $('#prNote', root);
  let first = null, lock = false, moves = 0, found = 0;
  function buildPairs() {
    first = null; lock = false; moves = 0; found = 0; prNote.textContent = 'Turn two cards at a time.';
    grid.replaceChildren(...shuffle([...GLYPHS, ...GLYPHS]).map(([g, name]) => {
      const b = document.createElement('button');
      b.className = 'pair'; b.type = 'button'; b.dataset.glyph = g; b.dataset.name = name;
      b.setAttribute('aria-label', 'Face-down card');
      b.addEventListener('click', () => turn(b));
      return b;
    }));
  }
  function show(b, on) {
    b.classList.toggle('up', on); b.textContent = on ? b.dataset.glyph : '';
    b.setAttribute('aria-label', on ? `Card: ${b.dataset.name}` : 'Face-down card');
  }
  function turn(b) {
    if (lock || b.classList.contains('up') || b.classList.contains('done')) return;
    show(b, true); M.sfx.flip();
    if (!first) { first = b; return; }
    moves++;
    if (first.dataset.glyph === b.dataset.glyph) {
      first.classList.add('done'); b.classList.add('done'); first = null; M.sfx.note(3);
      if (++found === GLYPHS.length) { prNote.textContent = `All eight pairs found in ${moves} moves. Nicely done.`; M.sfx.done(); }
      else prNote.textContent = `${found} of 8 pairs found.`;
    } else {
      lock = true; const a = first; first = null;
      setTimeout(() => { show(a, false); show(b, false); lock = false; }, 800);
    }
  }
  $('#prShuffle', root).addEventListener('click', buildPairs);
  buildPairs();

  select('breathe');
})();
