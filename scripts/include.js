/* scripts/include.js
   Client-side include loader for header.html and footer.html +
   header/menu hooks for ExamArchive.
   Place this file at /scripts/include.js and include with:
   <script defer src="/scripts/include.js"></script>
*/

(async function() {
  // Candidate paths builder (tries multiple sensible locations)
  function candidatePaths(filename) {
    const paths = [];
    paths.push('/' + filename); // absolute root
    try {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0) paths.push('/' + parts[0] + '/' + filename);
    } catch (e) {}
    paths.push('./' + filename);
    paths.push(filename);
    return paths;
  }

  async function fetchFirst(paths = []) {
    for (const p of paths) {
      try {
        const res = await fetch(p, {cache: 'no-cache'});
        if (res && res.ok) return await res.text();
      } catch (e) { /* try next */ }
    }
    throw new Error('All fetch attempts failed: ' + paths.join(', '));
  }

  async function injectInclude(placeholderId, filename) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return false;
    try {
      const html = await fetchFirst(candidatePaths(filename));
      placeholder.innerHTML = html;
      return true;
    } catch (e) {
      console.warn('Include failed for', filename, e);
      return false;
    }
  }

  /* ---------- Header hooks (menu toggle, mobile search ensure, upload normalization) ---------- */

  function onElement(selector, timeout = 4000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const obs = new MutationObserver((mutations, observer) => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        const found = document.querySelector(selector);
        if (found) resolve(found); else reject(new Error('Timeout waiting for ' + selector));
      }, timeout);
    });
  }

  function ensureMobileSearch(menu) {
    if (!menu) return;
    if (!menu.querySelector('#universal-search')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'mobile-search mobile-only';
      wrapper.innerHTML = `<form id="universal-search-form" action="/browse.html" method="get" role="search">
        <input id="universal-search" name="q" type="search" placeholder="Search papers, codes, subjects..." aria-label="Search papers">
      </form>`;
      menu.insertBefore(wrapper, menu.firstChild);
    }
  }

  function wireHeaderMenu() {
    const toggle = document.getElementById('menu-toggle');
    const menu  = document.getElementById('site-menu');
    const searchInput = document.getElementById('universal-search');

    if (!toggle || !menu) return;
    if (toggle._ea_menu_bound) return;

    function openMenu() {
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      if (searchInput && window.innerWidth < 900) {
        setTimeout(() => searchInput.focus(), 60);
      }
    }
    function closeMenu() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) openMenu(); else closeMenu();
    });
    toggle._ea_menu_bound = true;

    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target) && !menu.hidden) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !menu.hidden) closeMenu();
    });
  }

  function normalizeUploadLook() {
    const uploadAnchor = document.getElementById('upload-btn');
    if (uploadAnchor) {
      uploadAnchor.classList.add('btn', 'upload-btn');
      return;
    }
    const candidates = Array.from(document.querySelectorAll('a,button,label,input'));
    for (const c of candidates) {
      const text = (c.textContent || c.value || '').trim().toLowerCase();
      if (text === 'upload') c.classList.add('btn', 'upload-btn');
    }
  }

  /* Inject header & footer then wire hooks */
  document.addEventListener('DOMContentLoaded', async () => {
    // inject header/footer into placeholders if present
    await injectInclude('header-placeholder', 'header.html');
    await injectInclude('footer-placeholder', 'footer.html');

    try {
      await onElement('header.site-header, #site-menu', 4000);
      const menu = document.getElementById('site-menu');
      ensureMobileSearch(menu);
      wireHeaderMenu();
      normalizeUploadLook();
    } catch (e) {
      setTimeout(() => {
        const menu = document.getElementById('site-menu');
        ensureMobileSearch(menu);
        wireHeaderMenu();
        normalizeUploadLook();
      }, 800);
    }
  });
})();