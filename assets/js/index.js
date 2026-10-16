  // demo form: sends the lead to the StudentInk CRM, same API calls as the jeplcrm.octopod.co.in
  // registration form (StudentInk_CRM_Frontend → views/Forms/Default/components/MainSection.vue)
  (function () {
    const form = document.getElementById('demoForm');
    const success = document.getElementById('demoSuccess');
    const formError = document.getElementById('formError');
    if (!form) return;

    const API = form.dataset.api;
    const CRM_DOMAIN = form.dataset.domain;
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn.textContent;
    const { name: nameInput, phone: phoneInput, state: stateSelect, city: citySelect, specialization: productSelect } = form.elements;
    const GENERIC_ERROR = 'Sorry, we could not send your request. Please try again in a moment.';
    const LOAD_ERROR = 'Could not load the form. Please refresh the page or mail us at sales@studentink.co.in.';

    let states = [];
    let programId = '';
    let courseId = '';

    function showError(message) {
      formError.textContent = message;
      formError.classList.add('show');
    }

    async function getJson(path) {
      const res = await fetch(API + '/' + path, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(path + ' responded ' + res.status);
      const json = await res.json();
      return json.response || [];
    }

    // replaces everything after the placeholder option
    function fillSelect(select, items, valueKey, labelKey) {
      select.length = 1;
      items.forEach((item) => select.add(new Option(item[labelKey], item[valueKey])));
      select.selectedIndex = 0;
    }

    // the Laravel API returns { errors: { field: ['msg'] } } or { message: '...' }
    function firstError(json) {
      const errors = json && json.errors;
      if (errors && typeof errors === 'object') {
        const first = Object.values(errors)[0];
        return Array.isArray(first) ? first[0] : first;
      }
      return errors || (json && json.message) || '';
    }

    // the CRM files every lead under the "Jaynik Eduserve Private Limited" program and its "After 12th" course;
    // the products (CRM, Fees Management, …) are that course's specializations
    async function loadOptions() {
      try {
        const [stateList, academies] = await Promise.all([
          getJson('states'),
          getJson('academy-domain-wise?domain=' + encodeURIComponent(CRM_DOMAIN)),
        ]);
        states = stateList;
        fillSelect(stateSelect, states, 'state_id', 'state_name');

        const academy = academies.find((a) => (a.academy_name || '').toLowerCase() === 'jaynik eduserve private limited');
        if (!academy) throw new Error('JEPL program missing for ' + CRM_DOMAIN);
        programId = academy.academy_id;

        const courses = await getJson('education-limits/' + programId);
        const course = courses.find((c) => (c.education_limits_name || '').toLowerCase() === 'after 12th');
        if (!course) throw new Error('"After 12th" course missing for program ' + programId);
        courseId = course.edu_limit_id;

        fillSelect(productSelect, await getJson('programs/' + programId + '/' + courseId), 'program_id', 'program_name');
      } catch (err) {
        console.error('Demo form options failed to load:', err);
        showError(LOAD_ERROR);
      }
    }
    loadOptions();

    stateSelect.addEventListener('change', async function () {
      const stateId = stateSelect.value;
      fillSelect(citySelect, [], 'city_name', 'city_name');
      citySelect.disabled = true;
      try {
        const cities = await getJson('states/' + stateId + '/cities');
        if (stateSelect.value !== stateId) return; // the user picked another state meanwhile
        fillSelect(citySelect, cities, 'city_name', 'city_name');
        citySelect.disabled = false;
      } catch (err) {
        console.error('Cities failed to load:', err);
        showError(LOAD_ERROR);
      }
    });

    // same input rules as the CRM form: letters only in the name, digits only in the mobile number
    nameInput.addEventListener('input', function () {
      nameInput.value = nameInput.value.replace(/[^a-zA-Z\s]/g, '');
    });
    phoneInput.addEventListener('input', function () {
      phoneInput.value = phoneInput.value.replace(/\D/g, '');
    });

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

      if (!/^\d{10}$/.test(phoneInput.value)) {
        showError('Mobile number must be 10 digits.');
        return;
      }
      // a disabled select skips the browser's required check, so the city is checked here
      if (!citySelect.value) {
        showError('Please select your city.');
        return;
      }
      if (!programId || !courseId) {
        showError(LOAD_ERROR);
        return;
      }

      const captchaResponse = window.grecaptcha ? window.grecaptcha.getResponse() : '';
      if (!captchaResponse) {
        showError("Please confirm you're not a robot.");
        return;
      }
      formError.classList.remove('show');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      const state = states.find((s) => String(s.state_id) === stateSelect.value);
      const product = productSelect.options[productSelect.selectedIndex].text;

      try {
        const res = await fetch(API + '/academy-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: nameInput.value.trim(),
            email: form.elements.email.value.trim(),
            phone: phoneInput.value,
            state: state ? state.state_name : '',
            stateId: '',
            city: citySelect.value,
            program: programId,
            course: courseId,
            specialization: Number(productSelect.value),
            domain: CRM_DOMAIN,
            slug: null,
            agree: true,
            recaptcha_token: captchaResponse,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success !== false) {
          form.style.display = 'none';
          success.classList.add('show');
          // analytics.js sends this as "Studentink New - Demo Form Submitted"
          if (window.trackEvent) trackEvent('Demo Form Submitted', { product: product });
          return;
        }
        showError(firstError(json) || GENERIC_ERROR);
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

  // Solutions menu: with a mouse it opens on hover and "Solutions" goes to the section;
  // in the ☰ menu and on touch screens a tap on "Solutions" opens and closes the list instead
  document.querySelectorAll('.drop-toggle').forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      if (!matchMedia('(max-width: 1180px), (hover: none)').matches) return;
      e.preventDefault();
      toggle.setAttribute('aria-expanded', toggle.parentElement.classList.toggle('open'));
    });
  });
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.has-drop.open').forEach((drop) => {
      if (drop.contains(e.target)) return;
      drop.classList.remove('open');
      drop.querySelector('.drop-toggle').setAttribute('aria-expanded', 'false');
    });
  });
