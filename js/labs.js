/* Labs: each button turns the page's own background into that experiment. */
(() => {
  const M = window.Mindrise;
  const { $$ } = M;
  const buttons = $$('.lab-btn');
  const sync = () => buttons.forEach((b) => {
    const on = M.settings.surface === b.dataset.surface;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('on', on);
    b.querySelector('span').textContent = on ? 'In use as your background' : 'Use as my background';
  });
  buttons.forEach((b) => b.addEventListener('click', () => {
    M.set({ surface: M.settings.surface === b.dataset.surface ? 'window' : b.dataset.surface });
    M.sfx.note(3);
  }));
  M.bus.addEventListener('settings', sync);
  sync();
})();
