/* Agreement gate: shows the promises and asks visitors to agree to the Privacy & Terms before they see the site.
   The record is a version and a date kept in this browser only. Changing the version in build.py asks everyone again. */
(() => {
  const KEY = 'mindrise:agreed';
  const root = document.documentElement;
  const gate = document.getElementById('gate');
  if (!gate) return;
  const VERSION = (document.querySelector('meta[name="terms-version"]') || {}).content || '';
  const read = () => {
    for (const n of ['localStorage', 'sessionStorage']) {
      try { const a = JSON.parse(window[n].getItem(KEY) || 'null'); if (a && a.v === VERSION) return a; } catch (e) { /* storage blocked */ }
    }
    return null;
  };
  const write = () => {
    const rec = { v: VERSION, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); return rec; } catch (e) { /* fall through */ }
    try { sessionStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* nothing to do */ }
    return rec;
  };
  const clear = () => { for (const n of ['localStorage', 'sessionStorage']) { try { window[n].removeItem(KEY); } catch (e) { /* ignore */ } } };
  const $ = (id) => document.getElementById(id);
  const isTerms = /\/terms(\.html)?\/?$/.test(location.pathname);

  /* ---------- the gate itself ---------- */
  const main = $('gateMain'), no = $('gateNo');
  const show = (which) => { main.hidden = which !== 'main'; no.hidden = which !== 'no'; (which === 'main' ? $('gateTitle') : $('gateNoTitle')).focus({ preventScroll: true }); };
  const enter = () => {
    write();
    root.dataset.agreed = '1';
    root.classList.add('just-agreed');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setTimeout(() => root.classList.remove('just-agreed'), 1200);
  };
  $('gateAgree').addEventListener('click', enter);
  $('gateDecline').addEventListener('click', () => show('no'));
  $('gateBack').addEventListener('click', () => show('main'));
  if (!root.dataset.agreed) $('gateTitle').focus({ preventScroll: true });

  /* ---------- the agreement section at the end of terms.html ---------- */
  if (isTerms && $('termsAgree')) {
    const open = $('agreeOpen'), done = $('agreeDone');
    const refresh = () => {
      const a = read();
      open.hidden = !!a; done.hidden = !a;
      if (a) { const d = new Date(a.at); $('agreedOn').textContent = isNaN(d) ? a.at : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); $('agreedOn').setAttribute('datetime', a.at); }
    };
    $('termsAgree').addEventListener('click', () => { write(); root.dataset.agreed = '1'; refresh(); location.href = 'index.html'; });
    $('termsDecline').addEventListener('click', () => { $('declineNote').hidden = false; $('declineNote').scrollIntoView({ block: 'nearest' }); });
    $('termsWithdraw').addEventListener('click', () => { clear(); delete root.dataset.agreed; refresh(); window.scrollTo(0, 0); });
    refresh();
  }
  addEventListener('storage', (e) => { if (e.key === KEY && !isTerms) { if (read()) root.dataset.agreed = '1'; else { delete root.dataset.agreed; show('main'); } } });
})();
