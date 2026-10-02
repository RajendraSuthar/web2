/* Google Analytics (GA4) for every page of the new Studentink website.
   The old site (octopod.co.in) reports to the same GA property, so every event sent from here
   is named "Studentink New - …" and carries site_version + the content group "New Website".

   Event names (GA → Reports → Engagement → Events):
     Studentink New - Page Home            a page was opened (name from <html data-ga-page="Home">)
     Studentink New - Log in               a click; the name comes from the element's data-ga
     Studentink New - Footer Privacy Policy   attribute or its visible text ("Footer " in the footer)
   GA allows at most 40 characters per event name, so keep data-ga labels short.
   Add ?ga_debug to any page URL to watch its events live in GA → Admin → DebugView. */
(function () {
  const GA_ID = 'G-XSD2H9QBLB';
  const SITE_VERSION = 'studentink-new-2026';
  const PREFIX = 'Studentink New - ';

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('set', { site_version: SITE_VERSION });
  const config = { content_group: 'New Website', site_version: SITE_VERSION };
  if (/[?&]ga_debug\b/.test(location.search)) config.debug_mode = true;
  gtag('config', GA_ID, config);

  // letters, numbers and spaces only ("&" becomes "and"), trimmed to GA's 40-character limit on a word boundary
  function eventName(label) {
    const clean = label.replace(/&/g, ' and ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const name = PREFIX + (clean || 'Unnamed');
    return name.length <= 40 ? name : name.slice(0, 41).replace(/\s+\S*$/, '');
  }

  // also used by other scripts, e.g. trackEvent('Demo Form Submitted') in index.js
  window.trackEvent = (label, params) => gtag('event', eventName(label), params || {});

  // page name comes from <html data-ga-page="…"> so it stays right whatever the file is called on the server
  const file = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  trackEvent('Page ' + (document.documentElement.dataset.gaPage || file.replace(/-/g, ' ')));

  // where on the page the click happened: header, footer, or the id / first class of its section
  function areaOf(el) {
    if (el.closest('header')) return 'header';
    if (el.closest('footer')) return 'footer';
    const section = el.closest('section');
    return section ? (section.id || section.classList[0] || 'section') : 'page';
  }

  function labelOf(el) {
    const href = el.getAttribute('href') || '';
    let label = el.dataset.ga
      || (el.classList.contains('logo') && 'Logo')
      || (el.classList.contains('menu-btn') && 'Menu')
      || (href.startsWith('mailto:') && el.textContent.includes('@') && 'Email ' + href.slice(7).split('@')[0])
      || el.getAttribute('aria-label') || el.textContent || '';
    if (el.closest('footer')) label = 'Footer ' + label;
    return label;
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    trackEvent(labelOf(el), {
      click_area: areaOf(el),
      click_url: el.getAttribute('href') || '',
      click_type: el.tagName === 'A' ? 'link' : 'button',
    });
  }, true);
})();
