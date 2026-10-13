/* Contact: floating labels, gentle validation, and a message that opens in the visitor's own email app. */
(() => {
  const M = window.Mindrise;
  const { $, $$ } = M;

  const form = $('#contactForm');
  const status = $('#formStatus');
  const TO = form.dataset.to; // set in contact.html; replace with the real address

  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please tell us your name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'That email address doesn’t look right.'),
    message: (v) => (v.trim().length >= 10 ? '' : 'A sentence or two would help us reply well.'),
  };

  function check(field) {
    const rule = rules[field.name];
    if (!rule) return true;
    const msg = rule(field.value);
    const wrap = field.closest('.field');
    wrap.classList.toggle('invalid', !!msg);
    $('.err', wrap).textContent = msg;
    return !msg;
  }

  $$('.field input, .field textarea').forEach((f) => {
    f.addEventListener('blur', () => f.value && check(f));
    f.addEventListener('input', () => f.closest('.field').classList.contains('invalid') && check(f));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = $$('.field input, .field textarea').map(check).every(Boolean);
    if (!ok) {
      status.textContent = 'Please look over the highlighted fields.';
      status.className = 'form-status bad';
      return;
    }
    const data = new FormData(form);
    const subject = encodeURIComponent(`${data.get('topic')}: message from ${String(data.get('name')).trim()}`);
    const body = encodeURIComponent(`${String(data.get('message')).trim()}\n\n— ${String(data.get('name')).trim()} (${String(data.get('email')).trim()})`);
    status.textContent = 'Opening your email app with the message ready to send.';
    status.className = 'form-status ok';
    M.sfx.done();
    location.href = `mailto:${TO}?subject=${subject}&body=${body}`;
  });
})();
