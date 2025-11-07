// scripts/anim.js
(function(){
  const instances = new WeakMap();

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function initAll() {
    document.querySelectorAll('.ea-animal').forEach(node => {
      if (!instances.has(node)) init(node);
    });
  }

  function init(node) {
    if (!node) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const config = { pupilSelector: '.ea-pupil', maxOffset: 6, blinkInterval: 3500 };
    const pupils = Array.from(node.querySelectorAll(config.pupilSelector));
    if (!pupils.length) return;

    const state = { pupils, lastMouse: { x: window.innerWidth/2, y: window.innerHeight/2 }, rafId: null, blinkTimer: null };

    function update() {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const mx = state.lastMouse.x;
      const my = state.lastMouse.y;
      const dx = mx - cx;
      const dy = my - cy;
      const ang = Math.atan2(dy, dx);
      const dist = Math.min(config.maxOffset, Math.hypot(dx, dy) / 10);
      const ox = Math.cos(ang) * dist;
      const oy = Math.sin(ang) * dist;
      state.pupils.forEach(p => {
        p.style.transform = `translate(${ox}px, ${oy}px)`;
        p.style.transition = 'transform 0.06s linear';
      });
    }

    function onMouse(e) {
      state.lastMouse.x = e.clientX;
      state.lastMouse.y = e.clientY;
      if (!state.rafId) {
        state.rafId = requestAnimationFrame(() => { update(); state.rafId = null; });
      }
    }

    function startBlink() {
      stopBlink();
      state.blinkTimer = setInterval(() => {
        node.classList.add('ea-blink');
        setTimeout(() => node.classList.remove('ea-blink'), 200);
      }, config.blinkInterval + Math.random()*2000);
    }
    function stopBlink() { if (state.blinkTimer) { clearInterval(state.blinkTimer); state.blinkTimer = null; } }

    window.addEventListener('mousemove', onMouse);
    startBlink();

    // typing reaction: find inputs (prefer within same form)
    const inputs = node.closest('form') ? node.closest('form').querySelectorAll('input, textarea') : document.querySelectorAll('input, textarea');
    let typingTimer = null;
    function onTypingStart() {
      node.classList.add('ea-typing');
      pupils.forEach(p => p.style.transform = `translateY(${config.maxOffset/2}px)`);
    }
    function onTypingStop() {
      node.classList.remove('ea-typing');
      pupils.forEach(p => p.style.transform = '');
    }
    inputs.forEach(inp => {
      inp.addEventListener('input', () => {
        onTypingStart();
        clearTimeout(typingTimer);
        typingTimer = setTimeout(onTypingStop, 800);
      });
      inp.addEventListener('focus', onTypingStart);
      inp.addEventListener('blur', onTypingStop);
    });

    instances.set(node, { node, onMouse, inputs, state, startBlink, stopBlink });
  }

  function destroy(node) {
    const inst = instances.get(node);
    if (!inst) return;
    window.removeEventListener('mousemove', inst.onMouse);
    if (inst.state.rafId) cancelAnimationFrame(inst.state.rafId);
    if (inst.state.blinkTimer) clearInterval(inst.state.blinkTimer);
    if (inst.inputs && inst.inputs.length) {
      inst.inputs.forEach(inp => {
        inp.removeEventListener('input', () => {});
        inp.removeEventListener('focus', () => {});
        inp.removeEventListener('blur', () => {});
      });
    }
    instances.delete(node);
  }

  window.EAAnim = { initAll, init, destroy };
})();