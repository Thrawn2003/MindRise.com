/* Products: three small working demonstrations. Recall (spaced review), Plot (graphing), Cadence (focus). */
(() => {
  const M = window.Mindrise;
  const { $, $$, clamp, css } = M;
  const root = document.documentElement;
  const views = {};
  const canvasPos = (canvas, e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
  };
  new MutationObserver(() => views.grapher && views.grapher()).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ===================== Recall ===================== */
  const CARDS = [
    ['Retrieval practice', 'Pulling an answer out of memory strengthens it more than reading it again.'],
    ['Spacing', 'Reviewing across days rather than hours helps knowledge last.'],
    ['Interleaving', 'Mixing related topics in one session trains you to choose the right method.'],
    ['Desirable difficulty', 'Effort that feels slower now often means better memory later.'],
    ['Elaboration', 'Explain why something is true, and connect it to what you already know.'],
    ['Dual coding', 'Pair words with a diagram so there are two routes back to the idea.'],
  ];
  const stage = $('#recallStage');
  const rcard = $('#rcard');
  const rFront = $('#rFront');
  const rBack = $('#rBack');
  const rBar = $('#rBar');
  const rCount = $('#rCount');
  const rate = $$('#recallRate button');
  const rDone = $('#recallDone');
  let order = [];
  let idx = 0;
  const tally = { again: 0, good: 0, easy: 0 };

  function showCard() {
    rcard.classList.remove('flipped', 'leaving');
    rate.forEach((b) => (b.disabled = true));
    rFront.textContent = order[idx][0];
    rBack.textContent = order[idx][1];
    rCount.textContent = `Card ${idx + 1} of ${order.length}`;
    rBar.style.transform = `scaleX(${idx / order.length})`;
  }
  function startRecall() {
    order = [...CARDS].sort(() => Math.random() - 0.5);
    idx = 0;
    tally.again = tally.good = tally.easy = 0;
    rDone.hidden = true;
    stage.hidden = false;
    showCard();
  }
  function flip() {
    if (rcard.classList.contains('leaving')) return;
    rcard.classList.toggle('flipped');
    rate.forEach((b) => (b.disabled = !rcard.classList.contains('flipped')));
    M.sfx.flip();
  }
  function grade(kind) {
    if (!rcard.classList.contains('flipped')) return;
    tally[kind]++;
    M.sfx.note(kind === 'again' ? 0 : kind === 'good' ? 3 : 5);
    rcard.classList.add('leaving');
    setTimeout(() => {
      idx++;
      if (idx >= order.length) {
        rBar.style.transform = 'scaleX(1)';
        stage.hidden = true;
        rDone.hidden = false;
        $('#recallSummary').textContent = `${order.length} cards reviewed. ${tally.again} will come back this session, ${tally.good} tomorrow, ${tally.easy} in four days.`;
        M.sfx.done();
      } else {
        showCard();
      }
    }, 380);
  }
  rcard.addEventListener('click', flip);
  rate.forEach((b) => b.addEventListener('click', () => grade(b.dataset.grade)));
  $('#recallRestart').addEventListener('click', startRecall);
  $('#recallBox').addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { if (e.target.closest('button') && e.target !== rcard) return; e.preventDefault(); flip(); }
    else if (e.key === '1') grade('again');
    else if (e.key === '2') grade('good');
    else if (e.key === '3') grade('easy');
  });
  startRecall();

  /* ===================== Plot ===================== */
  /* ===================== Safe expression parser (no eval) ===================== */
  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
    floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  };
  const CONSTS = { pi: Math.PI, e: Math.E };

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) {
        i++;
      } else if (/[0-9.]/.test(c)) {
        const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
        if (!m) throw new Error('Bad number');
        tokens.push({ t: 'num', v: parseFloat(m[1]) });
        i += m[1].length;
      } else if (/[a-z]/i.test(c)) {
        const m = /^[a-z]+/i.exec(src.slice(i));
        tokens.push({ t: 'name', v: m[0].toLowerCase() });
        i += m[0].length;
      } else if ('+-*/^'.includes(c)) {
        tokens.push({ t: 'op', v: c });
        i++;
      } else if (c === '(' || c === ')') {
        tokens.push({ t: c === '(' ? 'lp' : 'rp' });
        i++;
      } else {
        throw new Error(`Unexpected "${c}"`);
      }
    }
    // Implicit multiplication: 2x, 3sin(x), (x+1)(x-1), x(x+1)
    const out = [];
    tokens.forEach((tok) => {
      const prev = out[out.length - 1];
      if (prev) {
        const isFnCall = prev.t === 'name' && Object.hasOwn(FUNCS, prev.v) && tok.t === 'lp';
        const prevEnds = prev.t === 'num' || prev.t === 'rp' || (prev.t === 'name' && !isFnCall);
        const nextStarts = tok.t === 'num' || tok.t === 'lp' || tok.t === 'name';
        if (prevEnds && nextStarts) out.push({ t: 'op', v: '*' });
      }
      out.push(tok);
    });
    return out;
  }

  function compile(src) {
    if (src.length > 120) throw new Error('Expression too long');
    const toks = tokenize(src);
    let p = 0;
    let usesX = false;
    const isOp = (v) => toks[p] && toks[p].t === 'op' && toks[p].v === v;

    function expr() {
      let left = term();
      while (isOp('+') || isOp('-')) {
        const op = toks[p++].v;
        const l = left;
        const r = term();
        left = op === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
      }
      return left;
    }
    function term() {
      let left = unary();
      while (isOp('*') || isOp('/')) {
        const op = toks[p++].v;
        const l = left;
        const r = unary();
        left = op === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      }
      return left;
    }
    function unary() {
      if (isOp('-')) {
        p++;
        const f = unary();
        return (x) => -f(x);
      }
      if (isOp('+')) {
        p++;
        return unary();
      }
      return power();
    }
    function power() {
      const base = atom();
      if (isOp('^')) {
        p++;
        const exp = unary();
        return (x) => Math.pow(base(x), exp(x));
      }
      return base;
    }
    function atom() {
      const t = toks[p++];
      if (!t) throw new Error('Unexpected end');
      if (t.t === 'num') {
        const v = t.v;
        return () => v;
      }
      if (t.t === 'lp') {
        const f = expr();
        if (!toks[p] || toks[p].t !== 'rp') throw new Error('Missing )');
        p++;
        return f;
      }
      if (t.t === 'name') {
        if (t.v === 'x') {
          usesX = true;
          return (x) => x;
        }
        if (Object.hasOwn(CONSTS, t.v)) {
          const v = CONSTS[t.v];
          return () => v;
        }
        if (Object.hasOwn(FUNCS, t.v)) {
          if (!toks[p] || toks[p].t !== 'lp') throw new Error(`${t.v} needs parentheses`);
          p++;
          const arg = expr();
          if (!toks[p] || toks[p].t !== 'rp') throw new Error('Missing )');
          p++;
          const fn = FUNCS[t.v];
          return (x) => fn(arg(x));
        }
        throw new Error(`Unknown name "${t.v}"`);
      }
      throw new Error('Unexpected symbol');
    }

    const fn = expr();
    if (p < toks.length) throw new Error('Unexpected symbol');
    return { fn, usesX };
  }
  M.compileExpr = compile;

  /* ===================== Grapher ===================== */
  const gc = $('#graphCanvas');
  const g = gc.getContext('2d');
  const view = { cx: 0, cy: 0, s: 50 };
  const fnInputs = ['#fn1', '#fn2', '#fn3'].map((sel) => $(sel));
  const fnColors = ['--accent', '--brass', '--soft'];
  const fnError = $('#fnError');
  let compiled = [null, null, null];
  let hoverX = null;
  let drag = null;

  const fmtNum = (v) => {
    const n = Number(v.toPrecision(6));
    return Object.is(n, -0) ? '0' : String(n);
  };

  function drawGraph() {
    const W = gc.width;
    const H = gc.height;
    const s = view.s;
    g.clearRect(0, 0, W, H);
    g.font = '12px Inter, sans-serif';
    const sx = (x) => W / 2 + (x - view.cx) * s;
    const sy = (y) => H / 2 - (y - view.cy) * s;

    const raw = 80 / s;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / pow;
    const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
    const kx0 = Math.ceil((view.cx - W / 2 / s) / step);
    const kx1 = Math.floor((view.cx + W / 2 / s) / step);
    const ky0 = Math.ceil((view.cy - H / 2 / s) / step);
    const ky1 = Math.floor((view.cy + H / 2 / s) / step);

    g.lineWidth = 1;
    g.fillStyle = css('--mute');
    g.textAlign = 'center';
    for (let k = kx0; k <= kx1; k++) {
      const x = k * step;
      g.strokeStyle = 'rgba(140, 140, 180, 0.16)';
      g.beginPath();
      g.moveTo(sx(x), 0);
      g.lineTo(sx(x), H);
      g.stroke();
      if (k !== 0) g.fillText(fmtNum(x), sx(x), clamp(sy(0) + 15, 14, H - 5));
    }
    g.textAlign = 'right';
    for (let k = ky0; k <= ky1; k++) {
      const y = k * step;
      g.strokeStyle = 'rgba(140, 140, 180, 0.16)';
      g.beginPath();
      g.moveTo(0, sy(y));
      g.lineTo(W, sy(y));
      g.stroke();
      if (k !== 0) g.fillText(fmtNum(y), clamp(sx(0) - 6, 34, W - 4), sy(y) + 4);
    }
    g.strokeStyle = 'rgba(140, 140, 180, 0.6)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(0, sy(0));
    g.lineTo(W, sy(0));
    g.moveTo(sx(0), 0);
    g.lineTo(sx(0), H);
    g.stroke();

    const colors = fnColors.map(css);
    compiled.forEach((fn, i) => {
      if (!fn) return;
      g.strokeStyle = colors[i];
      g.lineWidth = 2.6;
      g.lineJoin = 'round';
      g.beginPath();
      let pen = false;
      let lastY = 0;
      for (let px = 0; px <= W; px++) {
        const y = fn(view.cx + (px - W / 2) / s);
        if (!Number.isFinite(y)) {
          pen = false;
          continue;
        }
        const py = H / 2 - (y - view.cy) * s;
        if (py < -3000 || py > H + 3000) {
          pen = false;
          continue;
        }
        if (pen && Math.abs(py - lastY) > H * 1.5) pen = false; // asymptote jump
        if (pen) g.lineTo(px, py);
        else g.moveTo(px, py);
        pen = true;
        lastY = py;
      }
      g.stroke();
    });

    if (hoverX !== null) {
      const x = view.cx + (hoverX - W / 2) / s;
      g.strokeStyle = 'rgba(140, 140, 180, 0.5)';
      g.lineWidth = 1;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(hoverX, 0);
      g.lineTo(hoverX, H);
      g.stroke();
      g.setLineDash([]);
      const lines = [`x = ${fmtNum(x)}`];
      compiled.forEach((fn, i) => {
        if (!fn) return;
        const y = fn(x);
        if (!Number.isFinite(y)) return;
        lines.push(`f${i + 1} = ${fmtNum(y)}`);
        g.fillStyle = colors[i];
        g.beginPath();
        g.arc(hoverX, sy(y), 5, 0, Math.PI * 2);
        g.fill();
      });
      g.globalAlpha = 0.88;
      g.fillStyle = css('--bg');
      g.fillRect(8, 8, 118, 10 + lines.length * 18);
      g.globalAlpha = 1;
      g.fillStyle = css('--ink');
      g.textAlign = 'left';
      lines.forEach((line, i) => g.fillText(line, 16, 26 + i * 18));
    }
  }
  views.grapher = drawGraph;

  function parseInputs() {
    const errors = [];
    compiled = fnInputs.map((input, i) => {
      input.classList.remove('bad');
      const src = input.value.trim();
      if (!src) return null;
      try {
        return compile(src).fn;
      } catch (err) {
        input.classList.add('bad');
        errors.push(`f${i + 1}: ${err.message}`);
        return null;
      }
    });
    fnError.textContent = errors.join(' · ');
    drawGraph();
  }

  fnInputs.forEach((input) =>
    input.addEventListener('input', parseInputs)
  );
  $$('#graphPresets .chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      chip.dataset.f.split('|').forEach((value, i) => (fnInputs[i].value = value));
      parseInputs();
      M.sfx.tick();
    })
  );
  $('#graphReset').addEventListener('click', () => {
    Object.assign(view, { cx: 0, cy: 0, s: 50 });
    drawGraph();
  });

  gc.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
    if (gc.setPointerCapture) gc.setPointerCapture(e.pointerId);
    gc.classList.add('grabbing');
  });
  gc.addEventListener('pointermove', (e) => {
    hoverX = canvasPos(gc, e).x;
    if (drag) {
      const k = gc.width / gc.getBoundingClientRect().width;
      view.cx = drag.cx - ((e.clientX - drag.x) * k) / view.s;
      view.cy = drag.cy + ((e.clientY - drag.y) * k) / view.s;
    }
    drawGraph();
  });
  const endDrag = () => {
    drag = null;
    gc.classList.remove('grabbing');
  };
  gc.addEventListener('pointerup', endDrag);
  gc.addEventListener('pointercancel', endDrag);
  gc.addEventListener('pointerleave', () => {
    endDrag();
    hoverX = null;
    drawGraph();
  });
  gc.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = canvasPos(gc, e);
      const wx = view.cx + (p.x - gc.width / 2) / view.s;
      const wy = view.cy - (p.y - gc.height / 2) / view.s;
      view.s = clamp(view.s * Math.exp(-e.deltaY * 0.0015), 4, 3000);
      view.cx = wx - (p.x - gc.width / 2) / view.s;
      view.cy = wy + (p.y - gc.height / 2) / view.s;
      drawGraph();
    },
    { passive: false }
  );
  parseInputs();


  /* ===================== Cadence ===================== */
  const tBar = $('#cBar');
  const tTime = $('#cTime');
  const tStart = $('#cStart');
  const tNote = $('#cNote');
  const cs = { total: 1500, remaining: 1500, running: false, endAt: 0, timer: 0 };
  const baseTitle = document.title;
  function renderCadence() {
    tTime.textContent = M.fmtTime(cs.remaining);
    tBar.style.transform = `scaleX(${cs.total ? 1 - cs.remaining / cs.total : 0})`;
    tStart.textContent = cs.running ? 'Pause' : cs.remaining < cs.total && cs.remaining > 0 ? 'Resume' : 'Begin';
    document.title = cs.running ? `${M.fmtTime(cs.remaining)} · ${baseTitle}` : baseTitle;
  }
  function stopCadence() { cs.running = false; clearInterval(cs.timer); renderCadence(); }
  function tickCadence() {
    cs.remaining = Math.max(0, Math.ceil((cs.endAt - Date.now()) / 1000));
    if (cs.remaining === 0) { stopCadence(); tNote.textContent = 'Session complete. Rest your eyes for a minute.'; M.sfx.done(); }
    else renderCadence();
  }
  tStart.addEventListener('click', () => {
    if (cs.running) return stopCadence();
    if (cs.remaining === 0) cs.remaining = cs.total;
    tNote.textContent = '';
    cs.endAt = Date.now() + cs.remaining * 1000;
    cs.running = true;
    cs.timer = setInterval(tickCadence, 250);
    renderCadence();
  });
  $('#cReset').addEventListener('click', () => { stopCadence(); cs.remaining = cs.total; tNote.textContent = ''; renderCadence(); });
  const cChips = $$('#cPresets .chip');
  cChips.forEach((chip) => chip.addEventListener('click', () => {
    cChips.forEach((c) => c.classList.toggle('active', c === chip));
    stopCadence();
    cs.total = cs.remaining = Number(chip.dataset.sec);
    tNote.textContent = '';
    renderCadence();
  }));
  renderCadence();

  const todos = $$('#today input');
  const todoCount = $('#todayCount');
  const syncTodos = () => {
    const done = todos.filter((t) => t.checked).length;
    todoCount.textContent = `${done} of ${todos.length} done`;
  };
  todos.forEach((t) => t.addEventListener('change', () => { syncTodos(); t.checked ? M.sfx.note(4) : M.sfx.tick(); }));
  syncTodos();
})();
