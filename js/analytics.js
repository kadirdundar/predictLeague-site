// Google Analytics 4 behind a consent banner. GA is only loaded after the visitor accepts;
// until then (or after a refusal) nothing is sent and no cookies are set.
// Shared by the Blazor app (index.html) and the generated static SEO pages.
(function () {
  var GA_ID = 'G-CB0PYH6DX3';
  var STORAGE_KEY = 'pl-consent';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var loaded = false;
  function loadGa() {
    if (loaded) return;
    loaded = true;
    gtag('js', new Date());
    gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  // Removes _ga / _ga_* cookies left over from an earlier "Accept" (set on the registrable domain)
  function clearGaCookies() {
    var host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      ['', ';domain=' + host, ';domain=.' + host].forEach(function (d) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/' + d;
      });
    });
  }

  function readChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function saveChoice(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { }
  }

  // Named conversion events (see seo/brief.md). Dropped silently without consent.
  window.plTrack = function (name, params) {
    if (!loaded) return;
    gtag('event', name, params || {});
  };

  function isTurkish() {
    var lang = new URLSearchParams(location.search).get('lang');
    if (lang) return lang === 'tr';
    if ((document.documentElement.lang || '').indexOf('tr') === 0) return true;
    return (navigator.language || '').toLowerCase().indexOf('tr') === 0;
  }

  function showBanner() {
    var tr = isTurkish();
    var text = tr
      ? 'Siteyi geliştirmek için Google Analytics ile anonim kullanım istatistikleri toplamak istiyoruz. Onay vermezseniz hiçbir çerez kullanılmaz.'
      : 'We would like to use Google Analytics to collect anonymous usage statistics that help us improve the site. If you decline, no cookies are used.';

    var bar = document.createElement('div');
    bar.id = 'pl-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-live', 'polite');
    bar.setAttribute('aria-label', tr ? 'Çerez onayı' : 'Cookie consent');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483000;' +
      'max-width:560px;margin:0 auto;background:#0F172A;color:#F8FAFC;border-radius:14px;padding:14px 16px;' +
      'box-shadow:0 10px 30px rgba(15,23,42,.35);font:500 13px/1.45 "Plus Jakarta Sans",system-ui,sans-serif;' +
      'display:flex;flex-wrap:wrap;gap:10px;align-items:center;';

    var p = document.createElement('p');
    p.textContent = text + ' ';
    p.style.cssText = 'margin:0;flex:1 1 260px;';
    var more = document.createElement('a');
    more.href = '/privacy/';
    more.textContent = tr ? 'Gizlilik politikası' : 'Privacy policy';
    more.style.cssText = 'color:#93C5FD;text-decoration:underline;';
    p.appendChild(more);

    function button(label, primary, value) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'border:0;border-radius:10px;padding:9px 14px;font:700 13px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;' +
        (primary ? 'background:#3B82F6;color:#fff;' : 'background:transparent;color:#CBD5E1;box-shadow:inset 0 0 0 1px #334155;');
      b.addEventListener('click', function () {
        saveChoice(value);
        bar.remove();
        if (value === 'granted') loadGa();
        else clearGaCookies();
      });
      return b;
    }

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;margin-left:auto;';
    actions.appendChild(button(tr ? 'Reddet' : 'Decline', false, 'denied'));
    actions.appendChild(button(tr ? 'Kabul et' : 'Accept', true, 'granted'));

    bar.appendChild(p);
    bar.appendChild(actions);
    document.body.appendChild(bar);
  }

  // Used by the privacy page's "change my choice" button
  window.plConsentReset = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
    if (loaded) {
      // GA is already running in this page; reload so a refusal takes effect immediately
      location.reload();
      return;
    }
    var existing = document.getElementById('pl-consent');
    if (!existing) showBanner();
  };

  var choice = readChoice();
  if (choice === 'granted') {
    loadGa();
  } else if (choice !== 'denied') {
    if (document.body) showBanner();
    else document.addEventListener('DOMContentLoaded', showBanner);
  }
})();
