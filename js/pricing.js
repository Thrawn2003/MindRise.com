/* Pricing: the questions list opens smoothly. */
(() => {
  const M = window.Mindrise;
  const { $, $$ } = M;
  $$('.faq-item').forEach((item) => {
    const q = $('.faq-q', item);
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', String(open));
      M.sfx.flip();
    });
  });
})();
