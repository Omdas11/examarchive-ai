// scripts/include.js
document.addEventListener("DOMContentLoaded", () => {
  const insertHeader = fetch("header.html").then(r => r.text());
  const insertFooter = fetch("footer.html").then(r => r.text());

  // Insert header and footer once fetched
  Promise.all([insertHeader, insertFooter])
    .then(([headerHTML, footerHTML]) => {
      document.body.insertAdjacentHTML("afterbegin", headerHTML);
      document.body.insertAdjacentHTML("beforeend", footerHTML);

      // After insertion, init nav behaviour
      initHeaderBehavior();
    })
    .catch(err => console.error("Include files load failed:", err));

  function initHeaderBehavior() {
    // Hamburger toggle
    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.getElementById("mobile-menu");

    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", () => {
        const expanded = hamburger.getAttribute("aria-expanded") === "true";
        hamburger.setAttribute("aria-expanded", String(!expanded));
        // toggle visibility
        if (mobileMenu.style.display === "block") {
          mobileMenu.style.display = "none";
        } else {
          mobileMenu.style.display = "block";
        }
      });

      // Close mobile menu when a link clicked
      mobileMenu.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", () => {
          mobileMenu.style.display = "none";
          hamburger.setAttribute("aria-expanded", "false");
        });
      });
    }

    // Optional: mark current link active
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll('.nav-links a, #mobile-menu a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === path) {
        a.classList.add('active');
      }
    });
  }
});