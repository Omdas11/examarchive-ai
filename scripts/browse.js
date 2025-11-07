// browse.js - page behavior: fetch JSON, render table, program modal, preview/download
document.addEventListener('DOMContentLoaded', () => {

  // Helpers
  function filenameFromPath(path){
    if(!path) return '';
    return path.split('/').pop();
  }
  function yearFromText(text){
    if(!text) return '';
    const m = text.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : '';
  }
  function codeFromTitle(title, fallbackFilename){
    if(!title && !fallbackFilename) return '';
    let t = (title || fallbackFilename || '').toString();
    if(t.indexOf('—') !== -1) t = t.split('—')[0].trim();
    if(t.indexOf(' - ') !== -1) t = t.split(' - ')[0].trim();
    const codeMatch = t.match(/[A-Z]{2,}[A-Z0-9\-]*\d{2,}[A-Z0-9]*/);
    if(codeMatch) return codeMatch[0].replace(/-+$/,'');
    const fname = (fallbackFilename || '').replace(/\.[^.]+$/, '');
    if(fname) return fname.split(/[\s_]+/)[0];
    return '';
  }

  // DOM refs
  const papersBody = document.getElementById('papersBody');
  const totalCountEl = document.getElementById('totalCount');
  const filterTextEl = document.getElementById('filterText');
  const openFilterBtn = document.getElementById('openFilter');
  const modal = document.getElementById('programModal');

  let papers = [];
  let currentFilter = 'All';

  // Render table rows
  function renderTable(list){
    papersBody.innerHTML = '';
    list.forEach((p, idx) => {
      const path = p.path || p.file || p.filename || p.src || '';
      const fname = filenameFromPath(path);
      const year = p.year || yearFromText(p.title || fname) || '';
      const code = codeFromTitle(p.title || p.display || '', fname);
      const title = p.title ? (p.title.indexOf('—')!==-1 ? p.title.split('—').slice(1).join('—').trim() : p.title) : (p.name || '');
      const available = (p.available === true) ? true : (p.available === false ? false : Boolean(p.availableText));
      const availText = (p.available === true) ? 'Available' : (p.available === false ? 'Not available' : (p.availableText || 'Not available'));
      const availClass = p.available === true ? 'available' : 'na';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="width:36px">${idx+1}</td>
        <td class="filename" title="${fname}">${fname}</td>
        <td class="code" title="${code}">${code}</td>
        <td>${year || '-'}</td>
        <td class="meta" title="${title}">${title || '-'}</td>
        <td><span class="chip ${availClass}">${availText}</span></td>
        <td style="text-align:right">
          <div class="btns" style="justify-content:flex-end;">
            <button class="btn preview" data-src="${path}">Preview</button>
            <button class="btn download" data-src="${path}">Download</button>
          </div>
        </td>
      `;
      papersBody.appendChild(tr);
    });
    totalCountEl.textContent = list.length;
  }

  // Filter logic
  function applyFilter(program){
    currentFilter = program;
    filterTextEl.textContent = program;
    const filtered = papers.filter(p => {
      if(!program || program === 'All') return true;
      function t(x){ return (x || '').toString().toLowerCase().includes(program.toLowerCase()); }
      if(t(p.program) || t(p.path) || t(p.file) || t(p.filename) || (Array.isArray(p.tags) && t(p.tags.join(' ')))) return true;
      if(t(p.title) || t(p.name)) return true;
      return false;
    });
    renderTable(filtered);
  }

  // Modal behavior
  const tiles = document.querySelectorAll('.tile');
  openFilterBtn.addEventListener('click', () => {
    // mark current
    tiles.forEach(t => t.classList.toggle('active', t.dataset.program === currentFilter));
    modal.style.display = 'flex';
  });
  tiles.forEach(t => t.addEventListener('click', () => {
    tiles.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
  }));
  // close buttons in modal (they have class .close)
  modal.addEventListener('click', (e) => {
    if(e.target === modal) modal.style.display = 'none';
    if(e.target.classList.contains('close')) modal.style.display = 'none';
  });
  const applyBtn = document.getElementById('applyModal');
  applyBtn.addEventListener('click', () => {
    const active = document.querySelector('.tile.active');
    const val = active ? active.dataset.program : 'All';
    modal.style.display = 'none';
    applyFilter(val);
  });

  // Preview / download delegation
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if(!btn) return;
    const src = btn.dataset.src || '#';
    if(btn.classList.contains('download')){
      const a = document.createElement('a');
      a.href = src;
      a.download = filenameFromPath(src) || '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if(btn.classList.contains('preview')){
      window.open(src, '_blank');
    }
  });

  // Try multiple paths to fetch papers.json (works for gh-pages also)
  async function tryLoadJson(candidateUrls){
    for(const url of candidateUrls){
      try{
        const r = await fetch(url, {cache: 'no-cache'});
        if(!r.ok) continue;
        const json = await r.json();
        if(Array.isArray(json)) return json;
        if(json && Array.isArray(json.papers)) return json.papers;
      } catch(err){
        // continue to next
      }
    }
    return null;
  }

  async function loadPapers(){
    const candidates = [
      './papers/papers.json',
      'papers/papers.json',
      './papers.json',
      'papers.json'
    ];

    try {
      const repoSegment = location.pathname.split('/').filter(Boolean)[0];
      if(location.hostname && location.hostname.endsWith('github.io') && repoSegment){
        candidates.push(`/${repoSegment}/papers/papers.json`);
        candidates.push(`/${repoSegment}/papers.json`);
      }
    } catch(e){ /* ignore */ }

    const res = await tryLoadJson(candidates);
    if(res && res.length){
      papers = res;
    } else {
      // fallback sample - keeps table from being empty so you can verify layout
      papers = [
        { path: './papers/CBCS/Science/HCC/Physics/2021-PHSHCC102T.pdf', title: 'PHSHCC102T — Mechanics (2021)', available:false, program:'CBCS' },
        { path: './papers/CBCS/Science/HCC/Physics/2022-PHSHCC102T.pdf', title: 'PHSHCC102T — Mechanics (2022)', available:false, program:'CBCS' },
        { path: './papers/NEP/FYUG/Physics/2023-XYZ2001.pdf', title: 'XYZ2001 — Intro to Physics (2023)', available:true, program:'FYUG' },
        { path: './papers/CBCS/Science/HCC/Physics/2022-PHSHCC201T.pdf', title: 'PHSHCC201T — Electricity and Magnetism (2022)', available:true, program:'CBCS' }
      ];
      console.warn('Could not fetch papers/papers.json; using fallback sample data.');
    }
    applyFilter(currentFilter);
  }

  // Initial load
  loadPapers();

}); // DOMContentLoaded
