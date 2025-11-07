// scripts/auth.js
// Minimal Supabase magic-link example. Replace SUPABASE_URL and SUPABASE_ANON_KEY.
(function(){
  // If you use Supabase, set these with your project values
  const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"; // replace
  const SUPABASE_ANON_KEY = "PUBLIC_ANON_KEY"; // replace

  // If values not set, disable submit gracefully
  const disabled = !SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR-PROJECT");
  if (disabled) {
    console.warn("Supabase keys not set in scripts/auth.js — magic-link disabled.");
  }

  // Minimal Supabase client init (only if keys are provided)
  let supabase = null;
  if (!disabled && window.supabase === undefined) {
    // load supabase SDK dynamically if not present
    const s = document.createElement('script');
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js";
    s.onload = () => {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    };
    document.head.appendChild(s);
  } else if (!disabled) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      if (!email) return alert('Please enter your email.');

      if (disabled) {
        alert('Auth not configured. Set Supabase keys in scripts/auth.js first.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        alert('Magic link sent! Check your email to sign in.');
      } catch (err) {
        console.error(err);
        alert('Error sending magic link: ' + (err.message || err));
      }
    });
  });
})();