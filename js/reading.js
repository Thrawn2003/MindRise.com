/* Reading: select any passage on the page to mark it, like a pencil in a library book.
   Marks are kept on this device and come back next time. */
(() => {
  const M = window.Mindrise;
  const { $, $$ } = M;
  const paras = $$('.chapter p');
  if (!paras.length) return;

  const KEY = 'marks:' + (location.pathname.split('/').pop() || 'index.html');
  let marks = M.store.get(KEY, []); // { id, p, s, e }: paragraph index, start and end offsets
  const save = () => M.store.set(KEY, marks);
  const count = $('#markCount');
  const clear = $('#clearMarks');

  function unwrap(p) {
    $$('mark.hl', p).forEach((m) => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }
  function wrap(p, s, e, id) {
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const parts = [];
    let pos = 0;
    let node;
    while ((node = walker.nextNode())) {
      const len = node.nodeValue.length;
      const a = Math.max(s, pos), b = Math.min(e, pos + len);
      if (a < b) parts.push([node, a - pos, b - pos]);
      pos += len;
      if (pos >= e) break;
    }
    parts.forEach(([n, a, b]) => {
      const mid = n.splitText(a);
      mid.splitText(b - a);
      const mk = document.createElement('mark');
      mk.className = 'hl';
      mk.dataset.id = id;
      mk.title = 'Click to remove this mark';
      mid.parentNode.insertBefore(mk, mid);
      mk.appendChild(mid);
    });
  }
  function render(idx) {
    unwrap(paras[idx]);
    marks.filter((m) => m.p === idx).forEach((m) => wrap(paras[idx], m.s, m.e, m.id));
  }
  function status() {
    count.textContent = marks.length ? `${marks.length} ${marks.length === 1 ? 'mark' : 'marks'} on this page.` : 'Select any passage to mark it.';
    clear.hidden = !marks.length;
  }

  /* the little “Mark” button that appears beside a selection */
  const btn = document.createElement('button');
  btn.className = 'mark-btn';
  btn.textContent = 'Mark';
  btn.type = 'button';
  document.body.appendChild(btn);
  let pending = null;

  function selection() {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    const host = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentElement : r.commonAncestorContainer;
    const p = host && host.closest ? host.closest('.chapter p') : null;
    if (!p || r.toString().trim().length < 3) return null;
    const pre = document.createRange();
    pre.selectNodeContents(p);
    pre.setEnd(r.startContainer, r.startOffset);
    const s = pre.toString().length;
    return { idx: paras.indexOf(p), s, e: s + r.toString().length, rect: r.getBoundingClientRect() };
  }

  document.addEventListener('selectionchange', () => {
    pending = selection();
    if (!pending) { btn.classList.remove('on'); return; }
    btn.style.left = `${Math.min(Math.max(pending.rect.left + pending.rect.width / 2, 40), innerWidth - 40)}px`;
    btn.style.top = `${pending.rect.top}px`;
    btn.classList.add('on');
  });

  function addMark() {
    if (!pending) return;
    let { idx, s, e } = pending;
    // fold any marks this one touches into a single mark
    marks = marks.filter((m) => {
      if (m.p === idx && m.s <= e && m.e >= s) { s = Math.min(s, m.s); e = Math.max(e, m.e); return false; }
      return true;
    });
    marks.push({ id: Date.now().toString(36), p: idx, s, e });
    save();
    render(idx);
    getSelection().removeAllRanges();
    btn.classList.remove('on');
    pending = null;
    status();
    M.sfx.flip();
  }
  btn.addEventListener('pointerdown', (e) => e.preventDefault()); // keep the selection alive
  btn.addEventListener('click', addMark);
  addEventListener('keydown', (e) => {
    if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && pending && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      addMark();
    }
  });

  document.addEventListener('click', (e) => {
    const mk = e.target.closest('mark.hl');
    if (!mk || getSelection().toString()) return;
    const id = mk.dataset.id;
    const m = marks.find((x) => x.id === id);
    if (!m) return;
    marks = marks.filter((x) => x.id !== id);
    save();
    render(m.p);
    status();
    M.sfx.tick();
  });
  clear.addEventListener('click', () => {
    const touched = new Set(marks.map((m) => m.p));
    marks = [];
    save();
    touched.forEach(render);
    status();
  });

  paras.forEach((_, i) => render(i));
  status();
})();
