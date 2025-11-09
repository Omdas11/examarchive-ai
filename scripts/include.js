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

// upload-class-fix — run after header is injected
(function () {
  function addUploadClasses() {
    // 1) Prefer explicit id
    const elById = document.getElementById('upload-btn');
    if (elById) elById.classList.add('upload-btn');

    // 2) If there's a label or anchor with text "Upload", mark it
    const candidates = Array.from(document.querySelectorAll('a,button,label'));
    candidates.forEach(c => {
      const txt = (c.textContent || '').trim().toLowerCase();
      if (txt === 'upload' || txt === 'upload paper' || txt === 'upload file') {
        c.classList.add('upload-btn', 'upload-label');
      }
    });

    // 3) If there's a file input near those, hide the native input
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    fileInputs.forEach(fi => {
      fi.classList.add('upload-input', 'hidden-upload');
    });
  }

  // Run on DOMContentLoaded and again after a short delay (accounts for async includes)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addUploadClasses);
  } else addUploadClasses();
  setTimeout(addUploadClasses, 800);
})();