  (function () {
    const form = document.getElementById('demoForm');
    const success = document.getElementById('demoSuccess');
    const formError = document.getElementById('formError');
    if (!form) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn.textContent;
    const GENERIC_ERROR = 'Sorry, we could not send your request. Please try again in a moment.';

    function showError(message) {
      formError.textContent = message;
      formError.classList.add('show');
    }

    // submit stays disabled until the reCAPTCHA box is ticked (called by the widget's data-* callbacks)
    window.onCaptchaSuccess = function () {
      submitBtn.disabled = false;
      formError.classList.remove('show');
    };
    window.onCaptchaReset = function () {
      submitBtn.disabled = true;
    };

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // honeypot: real users never fill this, bots often do
      const honeypot = form.querySelector('.hp-field');
      if (honeypot && honeypot.value) return;

      const captchaResponse = window.grecaptcha ? window.grecaptcha.getResponse() : '';
      if (!captchaResponse) {
        showError("Please confirm you're not a robot.");
        return;
      }
      formError.classList.remove('show');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          form.style.display = 'none';
          success.classList.add('show');
          return;
        }
        showError(json.message || GENERIC_ERROR);
      } catch (err) {
        console.error('Demo form submission failed:', err);
        showError(GENERIC_ERROR);
      } finally {
        // a reCAPTCHA token works only once, so the user has to tick the box again
        if (window.grecaptcha) window.grecaptcha.reset();
        submitBtn.disabled = true;
        submitBtn.textContent = submitLabel;
      }
    });
  })();

  document.querySelector('.menu-btn')?.addEventListener('click', () => {
    const l = document.querySelector('.nav-links');
    const open = l.style.display === 'flex';
    l.style.cssText = open ? '' : 'display:flex;position:absolute;top:76px;left:0;right:0;flex-direction:column;background:#141b30;padding:22px 26px;gap:18px;border-bottom:1px solid rgba(59,130,246,.2);z-index:99;';
  });
