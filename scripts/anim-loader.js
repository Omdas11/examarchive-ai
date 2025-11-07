// scripts/anim-loader.js
(function(){
  const KEY = "ea_animations"; // "on" / "off" / null
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shouldLoad() {
    const pref = localStorage.getItem(KEY);
    if (pref === "off") return false;
    if (pref === "on") return !prefersReduced; // still respect reduced motion if desired
    return !prefersReduced; // default: load unless user prefers reduced motion
  }

  if (shouldLoad()) {
    const s = document.createElement('script');
    s.src = "scripts/anim.js";
    s.defer = true;
    s.onload = () => {
      if (window.EAAnim && typeof window.EAAnim.initAll === "function") {
        window.EAAnim.initAll();
      }
    };
    document.body.appendChild(s);
  } else {
    document.documentElement.classList.add('ea-anim-disabled');
  }

  // Expose simple toggles for settings page or console
  window.EAAnimationToggle = {
    enable: () => { localStorage.setItem(KEY, "on"); location.reload(); },
    disable: () => { localStorage.setItem(KEY, "off"); location.reload(); },
    clear: () => { localStorage.removeItem(KEY); location.reload(); }
  };
})();