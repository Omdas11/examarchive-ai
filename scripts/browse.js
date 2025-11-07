// scripts/browse.js
document.addEventListener('DOMContentLoaded', () => {
  // HELPERS
  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));
  function filenameFromPath(path){ if(!path) return ''; return path.split('/').pop(); }
  function yearFromText(text){ if(!text) return ''; const m = text.match(/\b(19|20)\d{2}\b/); return m ? m[0] : ''; }
  function codeFromTitle(title, fallbackFilename){
    let t = (title || fallbackFilename || '').toString();
    if(t.indexOf('—') !== -1) t = t.split('—')[0].trim();
    if(t.indexOf(' - ') !== -1) t = t.split(' - ')[0].trim();
    const codeMatch = t.match(/[A-Z]{2,}[A-Z0-9\-]*\d{2,}[A-Z0-9]*/);
    if(codeMatch) return codeMatch[0].replace(/-+$/,'');
    const fname = (fallbackFilename || '').replace(/\.[^.]+$/, '');
    return fname ? fname.split(/[\s_]+/)[0] : '';
  }

  // DOM
  const papersBody = q('#papersBody');
  const totalCountEl = q('#totalCount');
  const filterTextEl = q('#filterText');
  const openFilterBtn = q('#openFilter');
  const modal = q('#programModal');
  const tiles = qa('.tile');

  let papers = [];
  let currentFilter = 'All';
  
  // --- segmented control small toggle (place after DOM refs) ---
const segBtns = Array.from(document.querySelectorAll('.seg-btn'));
if(segBtns.length){
  segBtns.forEach(b => {
    b.addEventListener('click', () => {
      segBtns.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
      b.classList.add('active');
      b.setAttribute('aria-pressed','true');
      const prog = b.dataset.program || 'All';
      // update UI text & apply filter
      const ft = document.getElementById('filterText');
      if(ft) ft.textContent = prog;
      // call applyFilter (your script should have applyFilter defined)
      if(typeof applyFilter === 'function') applyFilter(prog);
    });
  });
}
  // RENDER
  function renderTable(list){
    papersBody.innerHTML = '';
    list.forEach((p, idx) => {
      const path = p.path || p.file || p.filename || p.src || '';
      const fname = filenameFromPath(path);
      const year = p.year || yearFromText(p.title || fname) || '';
      const code = codeFromTitle(p.title || p.display || '', fname);
      const title = p.title ? (p.title.indexOf('—')!==-1 ? p.title.split('—').slice(1).join('—').trim() : p.title) : (p.name || '');
      const avail = p.available === true ? 'Available' : (p.available === false ? 'Not available' : (p.availableText || 'Not available'));
      const availClass = p.available === true ? 'available' : 'na';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="width:36px">${idx+1}</td>
        <td class="filename" title="${fname}">${fname}</td>
        <td class="code" title="${code}">${code}</td>
        <td>${year || '-'}</td>
        <td class="meta" title="${title}">${title || '-'}</td>
        <td><span class="chip ${availClass}">${avail}</span></td>
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

  // FILTER
  function applyFilter(program){
    currentFilter = program;
    filterTextEl.textContent = program;
    const filtered = papers.filter(p => {
      if(!program || program === 'All') return true;
      const test = s => (s || '').toString().toLowerCase().includes(program.toLowerCase());
      if(test(p.program) || test(p.path) || test(p.file) || test(p.filename)) return true;
      if(Array.isArray(p.tags) && test(p.tags.join(' '))) return true;
      if(test(p.title) || test(p.name)) return true;
      return false;
    });
    renderTable(filtered);
  }

  // MODAL behavior
  openFilterBtn && openFilterBtn.addEventListener('click', () => {
    tiles.forEach(t => t.classList.toggle('active', t.dataset.program === currentFilter));
    if(modal) modal.style.display = 'flex';
  });
  tiles.forEach(t => t.addEventListener('click', () => { tiles.forEach(x => x.classList.remove('active')); t.classList.add('active'); }));
  // close when click outside or close buttons
  if(modal){
    modal.addEventListener('click', (ev) => {
      if(ev.target === modal || ev.target.classList.contains('close')) modal.style.display = 'none';
    });
  }
  const applyBtn = q('#applyModal');
  applyBtn && applyBtn.addEventListener('click', () => {
    const active = document.querySelector('.tile.active');
    const val = active ? active.dataset.program : 'All';
    modal && (modal.style.display = 'none');
    applyFilter(val);
  });

  // Preview / Download delegation
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
      // ensure preview opens only if src non-empty
      if(!src || src === '#') { alert('Preview not available for this item.'); return; }
      window.open(src, '_blank');
    }
  });

  // JSON loading with multiple candidate paths (works for gh-pages)
  async function tryLoadJson(candidates){
    for(const url of candidates){
      try{
        const r = await fetch(url, {cache:'no-cache'});
        if(!r.ok) continue;
        const json = await r.json();
        if(Array.isArray(json)) return json;
        if(json && Array.isArray(json.papers)) return json.papers;
      } catch(e){ /* try next */ }
    }
    return null;
  }

  async function loadPapers(){
    const candidates = ['./papers/papers.json','papers/papers.json','./papers.json','papers.json'];
    try{
      const repo = location.pathname.split('/').filter(Boolean)[0];
      if(location.hostname && location.hostname.endsWith('github.io') && repo){
        candidates.push(`/${repo}/papers/papers.json`);
        candidates.push(`/${repo}/papers.json`);
      }
    }catch(e){}
    const res = await tryLoadJson(candidates);
    if(res && res.length) papers = res;
    else {
      // fallback sample so you see layout — replace when your real JSON is available
      papers = [
        { path:'./papers/CBCS/Physics/2019-PHSHCC101T.pdf', title:'PHSHCC101T — Mathematical Physics - I (2019)', available:false, program:'CBCS' },
        { path:'./papers/CBCS/Physics/2020-PHSHCC101T.pdf', title:'PHSHCC101T — Mathematical Physics - I (2020)', available:false, program:'CBCS' }
      ];
      console.warn('papers.json not found; using sample fallback.');
    }
    applyFilter(currentFilter);
  }

  // initialize
  loadPapers();
});