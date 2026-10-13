/* Home: Euclid's first proposition as something you can hold. Drag A or B and the triangle stays equilateral. */
(() => {
  const M = window.Mindrise;
  const { $, clamp } = M;
  const svg = $('#geom');
  if (!svg) return;

  const gcA = $('#gcA'), gcB = $('#gcB'), gab = $('#gab'), gtri = $('#gtri');
  const hA = $('#hA'), hB = $('#hB');
  const lA = $('#lA'), lB = $('#lB'), lC = $('#lC');
  const readout = $('#geomReadout');
  const P = { A: { x: 160, y: 130 }, B: { x: 260, y: 130 } };
  const MIN = 44, MAX = 100;

  function update() {
    const { A, B } = P;
    const dx = B.x - A.x, dy = B.y - A.y;
    const d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if (ny < 0) { nx = -nx; ny = -ny; } // keep the third vertex below the base
    const C = { x: (A.x + B.x) / 2 + nx * d * 0.8660254, y: (A.y + B.y) / 2 + ny * d * 0.8660254 };
    gcA.setAttribute('cx', A.x); gcA.setAttribute('cy', A.y); gcA.setAttribute('r', d);
    gcB.setAttribute('cx', B.x); gcB.setAttribute('cy', B.y); gcB.setAttribute('r', d);
    gab.setAttribute('x1', A.x); gab.setAttribute('y1', A.y); gab.setAttribute('x2', B.x); gab.setAttribute('y2', B.y);
    gtri.setAttribute('d', `M${A.x.toFixed(1)} ${A.y.toFixed(1)} L${B.x.toFixed(1)} ${B.y.toFixed(1)} L${C.x.toFixed(1)} ${C.y.toFixed(1)} Z`);
    hA.setAttribute('transform', `translate(${A.x} ${A.y})`);
    hB.setAttribute('transform', `translate(${B.x} ${B.y})`);
    const left = A.x <= B.x;
    lA.setAttribute('x', A.x + (left ? -18 : 12)); lA.setAttribute('y', A.y - 12);
    lB.setAttribute('x', B.x + (left ? 12 : -18)); lB.setAttribute('y', B.y - 12);
    lC.setAttribute('x', C.x - 4); lC.setAttribute('y', C.y + 22);
    const n = Math.round(d);
    readout.textContent = `AB = ${n}   ·   AC = ${n}   ·   BC = ${n}   ·   every angle 60°`;
  }

  // keep each point inside the frame and at a distance the figure can hold
  function place(key, x, y) {
    const other = P[key === 'A' ? 'B' : 'A'];
    let px = clamp(x, 110, 310), py = clamp(y, 110, 170);
    let vx = px - other.x, vy = py - other.y;
    let len = Math.hypot(vx, vy);
    if (len < 0.001) { vx = 1; vy = 0; len = 1; }
    const l = clamp(len, MIN, MAX);
    px = clamp(other.x + (vx / len) * l, 110, 310);
    py = clamp(other.y + (vy / len) * l, 110, 170);
    P[key] = { x: px, y: py };
    update();
  }

  [['A', hA], ['B', hB]].forEach(([key, handle]) => {
    let dragging = false;
    const toSvg = (e) => {
      const r = svg.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * 420) / r.width, y: ((e.clientY - r.top) * 300) / r.height };
    };
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
      handle.classList.add('held');
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const p = toSvg(e);
      place(key, p.x, p.y);
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('held');
      M.sfx.note(key === 'A' ? 2 : 4);
    };
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 12 : 5;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      place(key, P[key].x + d[0], P[key].y + d[1]);
    });
  });
  update();
})();
