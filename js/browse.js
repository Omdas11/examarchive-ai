// js/browse.js
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const availabilitySelect = document.getElementById('availabilitySelect');
  const papersList = document.getElementById('papersList');
  const yearChips = document.getElementById('yearChips');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  let _papers = [];
  let filtered = [];
  let page = 0;
  const PAGE_SIZE = 12;

  async function loadPapers(){
    try {
      const res = await fetch('papers/papers.json', {cache: "no-store"});
      _papers = await res.json();
      _papers = _papers.map(p => Object.assign({ title: p.title || p.filename || '', filename: p.filename || '', year: p.year || 0, code: p.code || '', available: !!p.available }, p));
      populateYearChips(_papers);
      applyFilters();
    } catch (err) {
      papersList.innerHTML = '<div class="card">Unable to load papers.json</div>';
      console.error(err);
    }
  }

  function populateYearChips(list){
    const years = Array.from(new Set(list.map(p => p.year).filter(Boolean))).sort((a,b)=>b-a);
    if (years.length === 0) { yearChips.innerHTML = ''; return; }
    yearChips.innerHTML = '<div class="chip" data-year="all">All years</div>' + years.map(y=>`<div class="chip" data-year="${y}">${y}</div>`).join('');
    yearChips.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        yearChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        applyFilters();
      });
    });
    yearChips.querySelector('.chip[data-year="all"]').classList.add('active');
  }

  function applyFilters(){
    const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
    const sort = (sortSelect && sortSelect.value) || 'year-desc';
    const avail = (availabilitySelect && availabilitySelect.value) || 'all';
    const activeChip = yearChips ? yearChips.querySelector('.chip.active') : null;
    const selYear = activeChip ? activeChip.getAttribute('data-year') : 'all';

    filtered = _papers.filter(p => {
      if (avail === 'available' && !p.available) return false;
      if (avail === 'not-available' && p.available) return false;
      if (selYear !== 'all' && String(p.year) !== String(selYear)) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.filename} ${p.code} ${p.year}`.toLowerCase();
      return hay.includes(q);
    });

    if (sort === 'year-desc') filtered.sort((a,b)=> (b.year||0)-(a.year||0));
    if (sort === 'year-asc') filtered.sort((a,b)=> (a.year||0)-(b.year||0));
    if (sort === 'name-asc') filtered.sort((a,b)=> (a.title||a.filename).localeCompare(b.title||b.filename));
    if (sort === 'name-desc') filtered.sort((a,b)=> (b.title||b.filename).localeCompare(a.title||a.filename));

    page = 0;
    renderPage();
  }

  function renderPage(){
    const start = page * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);
    if (page === 0) papersList.innerHTML = '';
    if (slice.length === 0 && page === 0) {
      papersList.innerHTML = '<div class="card">No papers found.</div>';
      loadMoreBtn.style.display = 'none';
      return;
    }
    slice.forEach(p => {
      const availText = p.available ? `<span style="color:#fff;background:var(--accent);padding:4px 8px;border-radius:999px;font-weight:700;font-size:0.78rem;">Available</span>` : `<span style="opacity:.6;">Not uploaded</span>`;
      const card = document.createElement('article');
      card.className = 'card';
      card.style.marginBottom = '8px';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700">${escapeHtml(p.title || p.filename)}</div>
            <div style="font-size:0.86rem;color:var(--muted)">${p.year || '—'} • ${escapeHtml(p.code || '')}</div>
          </div>
          <div>${availText}</div>
        </div>
        <div style="margin-top:8px"><a class="btn" href="papers/${encodeURIComponent(p.filename)}" target="_blank" rel="noopener">Open</a></div>
      `;
      papersList.appendChild(card);
    });

    if ((start + PAGE_SIZE) < filtered.length) {
      loadMoreBtn.style.display = 'inline-block';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

  loadMoreBtn.addEventListener('click', () => {
    page++;
    renderPage();
    window.scrollTo({ top: document.body.scrollHeight - 300, behavior: 'smooth' });
  });

  [searchInput, sortSelect, availabilitySelect].forEach(el => { if(el) el.addEventListener('input', () => applyFilters()); });
  if (searchInput) searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyFilters(); });

  function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  loadPapers();
});
