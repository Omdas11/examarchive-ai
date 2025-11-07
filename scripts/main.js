// js/main.js — header toggle (minimal)
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("ea-nav-toggle");
  const nav = document.getElementById("ea-main-nav");
  if (!btn || !nav) return;

  if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded','false');

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = nav.classList.toggle("open");
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) return;
    if (!nav.contains(e.target) && !btn.contains(e.target)) {
      nav.classList.remove("open");
      btn.setAttribute('aria-expanded','false');
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      btn.setAttribute('aria-expanded','false');
      btn.focus();
    }
  });
});
