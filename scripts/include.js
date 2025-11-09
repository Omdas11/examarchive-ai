// scripts/include.js
// Robust include loader: tries multiple candidate paths so pages in subfolders still work.
// After injection, initializes hamburger menu and active-link highlighting.

(function() {
  // Candidate paths to try for header/footer (order matters)
  const repoRoot = "/examarchive-ai"; // repo root on GitHub Pages (from your site)
  const candidates = [
    "header.html",
    "./header.html",
    "../header.html",
    `${repoRoot}/header.html`,
    `${repoRoot}/header.html` // repeated intentionally safe
  ];
  const footerCandidates = [
    "footer.html",
    "./footer.html",
    "../footer.html",
    `${repoRoot}/footer.html`,
    `${repoRoot}/footer.html`
  ];

  async function fetchFirstSuccessful(paths) {
    for (const p of paths) {
      try {
        const res = await fetch(p, {cache: "no-store"});
        if (res && res.ok) {
          const text = await res.text();
          return { path: p, text };
        }
      } catch (e) {
        // ignore and continue trying next path
      }
    }
    throw new Error("No candidate path worked: " + paths.join(", "));
  }

  async function init() {
    try {
      const [headerRes, footerRes] = await Promise.all([
        fetchFirstSuccessful(candidates).catch(() => ({ text: null })),
        fetchFirstSuccessful(footerCandidates).catch(() => ({ text: null }))
      ]);

      if (headerRes && headerRes.text) {
        document.body.insertAdjacentHTML("afterbegin", headerRes.text);
      } else {
        console.warn("header.html not found at any candidate path.");
      }

      if (footerRes && footerRes.text) {
        document.body.insertAdjacentHTML("beforeend", footerRes.text);
      } // footer optional

      // Slight delay to ensure elements are in DOM
      requestAnimationFrame(() => initHeaderBehavior());
    } catch (err) {
      console.error("Include loader error:", err);
    }
  }

  function initHeaderBehavior() {
    // Hamburger toggle
    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.getElementById("mobile-menu");

    if (hamburger && mobileMenu) {
      // ensure initial hidden state
      mobileMenu.style.display = "none";
      mobileMenu.setAttribute("aria-hidden", "true");
      hamburger.setAttribute("aria-expanded", "false");

      hamburger.addEventListener("click", () => {
        const isOpen = hamburger.getAttribute("aria-expanded") === "true";
        hamburger.setAttribute("aria-expanded", String(!isOpen));
        mobileMenu.setAttribute("aria-hidden", String(isOpen));
        mobileMenu.style.display = isOpen ? "none" : "block";
      });

      // Close mobile menu when any link clicked
      mobileMenu.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", () => {
          mobileMenu.style.display = "none";
          mobileMenu.setAttribute("aria-hidden", "true");
          hamburger.setAttribute("aria-expanded", "false");
        });
      });

      // Close menu when clicking outside (mobile)
      document.addEventListener("click", (e) => {
        const target = e.target;
        if (!mobileMenu.contains(target) && !hamburger.contains(target)) {
          if (mobileMenu.style.display === "block") {
            mobileMenu.style.display = "none";
            mobileMenu.setAttribute("aria-hidden", "true");
            hamburger.setAttribute("aria-expanded", "false");
          }
        }
      }, true);
    }

    // Active link highlighting (works for index.html / browse.html / about.html)
    const current = location.pathname.split("/").pop() || "index.html";
    const links = document.querySelectorAll('.nav-links a, #mobile-menu a');
    links.forEach(a => {
      // normalize href (strip query/hash)
      const href = (a.getAttribute('href') || "").split(/[?#]/)[0].split("/").pop();
      if (href === current || (href === "" && current === "index.html")) {
        a.classList.add("active");
      }
    });

    // Optional: keyboard accessibility — toggle menu with Enter/Space on hamburger
    if (hamburger) {
      hamburger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          hamburger.click();
        }
      });
    }
  }

  // Run init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ---- UPLOAD FORCE-STYLE (append to scripts/include.js) ----
(function(){
  function forceStyle(el){
    if(!el) return false;
    // apply inline styles (override any CSS)
    el.style.display = 'inline-block';
    el.style.padding = '8px 14px';
    el.style.borderRadius = '12px';
    el.style.border = '1px solid rgba(0,0,0,0.06)';
    el.style.background = '#fff';
    el.style.fontWeight = '700';
    el.style.color = '#111827';
    el.style.textDecoration = 'none';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 2px 6px rgba(15,23,42,0.04)';
    el.classList.add('btn-upload');
    return true;
  }

  function findAndFix(){
    // try common selectors
    const selectors = [
      '#upload-btn',
      '.btn-upload',
      'a[id*="upload"]',
      'button[id*="upload"]',
      '[class*="btn-upload"]',
      'label[for*="upload"]',
      'a:contains("Upload")' // fallback via text check below
    ];

    // 1) direct known selectors
    const candidates = [];
    ['#upload-btn', '.btn-upload', 'a[id*="upload"]', 'button[id*="upload"]', '[class*="btn-upload"]', 'label[for*="upload"]'].forEach(sel=>{
      document.querySelectorAll(sel).forEach(n => candidates.push(n));
    });

    // 2) fallback: find elements whose text contains 'upload'
    if(candidates.length === 0){
      Array.from(document.querySelectorAll('a,button,label,span')).forEach(n=>{
        if((n.textContent||'').trim().toLowerCase().includes('upload')) candidates.push(n);
      });
    }

    // dedupe and apply
    const unique = Array.from(new Set(candidates));
    if(unique.length === 0){
      console.log('Upload fixer: no candidate found (will retry).');
      return false;
    }

    unique.forEach(el => {
      console.log('Upload fixer: styling element ->', el.tagName, el.className || el.id, el.outerHTML.slice(0,200));
      forceStyle(el);
    });
    return true;
  }

  // run after DOM ready and try again a couple times to handle async includes
  function runAttempts(attempts){
    if(findAndFix()) return;
    if(attempts>0) setTimeout(()=>runAttempts(attempts-1), 300);
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ()=> setTimeout(()=>runAttempts(6), 80));
  } else {
    setTimeout(()=>runAttempts(6), 80);
  }
})();