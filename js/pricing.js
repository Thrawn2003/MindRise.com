/* Pricing: a billing switch whose figures roll, and a questions list that opens smoothly. */
(() => {
  const M = window.Mindrise;
  const { $, $$ } = M;

  const toggle = $('#billing');
  const labels = $$('.bill-label');
  const setBilling = (yearly) => {
    toggle.setAttribute('aria-checked', String(yearly));
    labels.forEach((l) => l.classList.toggle('on', (l.dataset.mode === 'yearly') === yearly));
    $$('[data-monthly]').forEach((el) => {
      el.classList.remove('roll');
      void el.offsetWidth;
      el.textContent = yearly ? el.dataset.yearly : el.dataset.monthly;
      el.classList.add('roll');
    });
    $$('.billed-live').forEach((el) => (el.textContent = yearly ? 'billed yearly' : 'billed monthly'));
  };
  toggle.addEventListener('click', () => {
    const yearly = toggle.getAttribute('aria-checked') !== 'true';
    setBilling(yearly);
    M.sfx.tick();
  });
  setBilling(false);

  $$('.faq-item').forEach((item) => {
    const q = $('.faq-q', item);
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', String(open));
      M.sfx.flip();
    });
  });
})();
