// scripts/browse.js
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Helpers ---------- */
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
    let t = (title || fallbackFilename || '').toString();
    // prefer left-of-em-dash or hyphen
    if(t.indexOf('—') !== -1) t = t.split('—')[0].trim();
    if(t.indexOf(' - ') !== -1) t = t.split(' - ')[0].trim();
    const codeMatch = t.match(/[A-Z]{2,}[A-Z0-9\-]*\d{2,}[A-Z0-9]*/);
    if(codeMatch) return codeMatch[0].replace(/-+$/,'');
    const fname = (fallbackFilename || '').replace(/\.[^.]+$/, '');
    if(fname) return fname.split(/[\s_]+/)[0];
    return '';
  }

  /* ---------- DOM Refs ---------- */
  const papersBody = document.getElementById('papersBody');
  const totalCountEl = document.getElementById('totalCount');
  const filterTextEl = document.getElementById('filterText');
  const segBtns = Array.from(document.querySelectorAll('.seg-btn'));

  let papers = [];
  let currentFilter = 'All';

  /* ---------- Render ---------- */
  function renderTable(list){
    papersBody.innerHTML = '';
    list.forEach((p, idx) => {
      const path = p.path || p.file || p.filename || p.src || '';
      const fname = filenameFromPath(path);
      const year = p.year || yearFromText(p.title || fname) || '';
      const code = codeFromTitle(p.title || p.display || '', fname);
      const rawTitle = p.title || p.name || '';
      const title = rawTitle.indexOf('—')!==-1 ? rawTitle.split('—').slice(1).join('—').trim() : rawTitle;
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

  /* ---------- Filtering ---------- */
  function applyFilter(program){
    currentFilter = program || 'All';
    filterTextEl.textContent = currentFilter;
    const filtered = papers.filter(p => {
      if(!currentFilter || currentFilter === 'All') return true;
      function t(x){ return (x || '').toString().toLowerCase().includes(currentFilter.toLowerCase()); }
      if(t(p.program) || t(p.path) || t(p.file) || t(p.filename)) return true;
      if(Array.isArray(p.tags) && t(p.tags.join(' '))) return true;
      if(t(p.title) || t(p.name)) return true;
      return false;
    });
    renderTable(filtered);
  }

  /* ---------- Segmented control behavior ---------- */
  if(segBtns.length){
    segBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        segBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed','true');
        const prog = btn.dataset.program || 'All';
        applyFilter(prog);
      });
    });
  }

  /* ---------- Delegation: preview/download ---------- */
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if(!btn) return;
    const src = btn.dataset.src || '';
    if(btn.classList.contains('download')){
      if(!src) { alert('File not available for download.'); return; }
      const a = document.createElement('a');
      a.href = src;
      a.download = filenameFromPath(src) || '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if(btn.classList.contains('preview')){
      if(!src) { alert('Preview not available.'); return; }
      window.open(src, '_blank');
    }
  });

  /* ---------- JSON loading (multiple candidate paths for GH pages) ---------- */
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
    try {
      const repo = location.pathname.split('/').filter(Boolean)[0];
      if(location.hostname && location.hostname.endsWith('github.io') && repo){
        candidates.push(`/${repo}/papers/papers.json`);
        candidates.push(`/${repo}/papers.json`);
      }
    } catch(e){}
    const res = await tryLoadJson(candidates);
    if(res && res.length) {
      papers = res;
    } else {
      // fallback sample so page isn't empty — replace when real JSON present
      papers = [
        { path:'./papers/CBCS/2019-PHSHCC101T.pdf', title:'PHSHCC101T — Mathematical Physics - I (2019)', available:false, program:'CBCS' },
        { path:'./papers/FYUG/2024-PHSHCC301T.pdf', title:'PHSHCC301T — Modern Physics (2024)', available:true, program:'FYUG' }
      ];
      console.warn('Could not find papers.json; using fallback sample data.');
    }
    applyFilter(currentFilter);
  }

  /* ---------- initialize ---------- */
  loadPapers();

});