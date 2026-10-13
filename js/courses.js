/* Courses: a catalogue you can filter, with entries that open to a syllabus and draw their emblem. */
(() => {
  const M = window.Mindrise;
  const { $, $$ } = M;

  const rows = $$('.entry');
  const filters = $$('.filter');
  const count = $('#entryCount');

  rows.forEach((row) => {
    const head = $('.entry-head', row);
    const body = $('.syllabus', row);
    // prepare the emblem so it can draw itself
    $$('.emblem [data-draw]', row).forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 200;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    head.addEventListener('click', () => {
      const open = row.classList.toggle('open');
      head.setAttribute('aria-expanded', String(open));
      body.setAttribute('aria-hidden', String(!open));
      M.sfx.flip();
    });
  });

  filters.forEach((f) =>
    f.addEventListener('click', () => {
      filters.forEach((x) => x.setAttribute('aria-pressed', String(x === f)));
      let shown = 0;
      rows.forEach((row, i) => {
        const match = f.dataset.filter === 'all' || row.dataset.cat === f.dataset.filter;
        if (match) {
          shown++;
          row.hidden = false;
          row.style.animation = 'none';
          void row.offsetWidth;
          row.style.animation = `entryIn 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) ${shown * 50}ms backwards`;
        } else {
          row.hidden = true;
        }
      });
      count.textContent = `${shown} ${shown === 1 ? 'course' : 'courses'}`;
    })
  );
})();
