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
          // analytics.js sends this as "Studentink New - Demo Form Submitted"
          if (window.trackEvent) trackEvent('Demo Form Submitted', { institution_type: form.elements.type.value });
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

  // reCAPTCHA draws a fixed 304x78 box; shrink it to fit narrow phones
  (function () {
    const wrap = document.querySelector('.captcha-wrap');
    const widget = wrap && wrap.querySelector('.g-recaptcha');
    if (!widget) return;

    function fit() {
      const scale = Math.min(1, wrap.clientWidth / 304);
      widget.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
      wrap.style.height = scale < 1 ? Math.ceil(78 * scale) + 'px' : '';
    }
    fit();
    window.addEventListener('resize', fit);
  })();

  // highlight the menu link of the section being read: the last one whose top has passed 40% of the screen
  (function () {
    const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!sections.length) return;

    function update() {
      const line = window.innerHeight * 0.4;
      let current = sections[0];
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= line) current = section;
      });
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  document.querySelector('.menu-btn')?.addEventListener('click', () => {
    const l = document.querySelector('.nav-links');
    const open = l.style.display === 'flex';
    l.style.cssText = open ? '' : 'display:flex;position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:flex-start;background:#141b30;padding:22px 26px;gap:18px;border-bottom:1px solid rgba(59,130,246,.2);z-index:99;';
  });
