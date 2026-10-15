/* Sites: filter the list of free websites. */
(() => {
  const M = window.Mindrise;
  const { $, $$ } = M;
  const rows = $$('#siteList .index-row');
  const filters = $$('.filter');
  const count = $('#entryCount');
  filters.forEach((f) => f.addEventListener('click', () => {
    filters.forEach((x) => x.setAttribute('aria-pressed', String(x === f)));
    let shown = 0;
    rows.forEach((row) => {
      const match = f.dataset.filter === 'all' || row.dataset.cat === f.dataset.filter;
      row.hidden = !match;
      if (match) {
        shown++;
        row.style.animation = 'none';
        void row.offsetWidth;
        row.style.animation = `entryIn 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) ${shown * 50}ms backwards`;
      }
    });
    count.textContent = `${shown} ${shown === 1 ? 'site' : 'sites'}`;
    M.sfx.tick();
  }));
})();
