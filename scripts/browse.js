// scripts/browse.js (mobile-first, search, sort, segmented filter, preview modal)
document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- Helpers ---------------- */
  function filenameFromPath(path){ if(!path) return ''; return path.split('/').pop(); }
  function yearFromText(text){ if(!text) return ''; const m = text.match(/\b(19|20)\d{2}\b/); return m ? m[0] : ''; }
  function codeFromTitle(title, fallbackFilename){
    let t = (title || fallbackFilename || '').toString();
    if(t.indexOf('—') !== -1) t = t.split('—')[0].trim();
    if(t.indexOf(' - ') !== -1) t = t.split(' - ')[0].trim();
    const codeMatch = t.match(/[A-Z]{2,}[A-Z0-9\-]*\d{2,}[A-Z0-9]*/);
    if(codeMatch) return codeMatch[0].replace(/-+$/,'');
    const fname = (fallbackFilename || '').replace(/\.[^.]+$/, '');
    if(fname) return fname.split(/[\s_]+/)[0];
    return '';
  }

  function interpretAvailability(item){
    const raw = (item.available !== undefined) ? item.available : (item.availableText !== undefined ? item.availableText : (item.status !== undefined ? item.status : ''));
    const textCandidate = (item.availableText && typeof item.availableText === 'string') ? item.availableText
                          : (typeof raw === 'string' ? raw : '');
    const norm = (val) => {
      if(val === true || val === 1) return true;
      if(val === false || val === 0 || val === null || val === undefined) return false;
      const s = String(val).trim().toLowerCase();
      if(!s) return null;
      if(['true','available','yes','y','1','uploaded','present'].includes(s)) return true;
      if(['false','not available','no','n','0','missing','absent'].includes(s)) return false;
      return null;
    };
    const bool = norm(raw);
    if(bool === true) return { available:true, text: (textCandidate || 'Available') };
    if(bool === false) return { available:false, text: (textCandidate || 'Not available') };
    if(typeof textCandidate === 'string'){
      const tc = textCandidate.trim().toLowerCase();
      if(tc.includes('available') || tc.includes('yes') || tc.includes('uploaded') || tc.includes('present')) return { available:true, text: item.availableText || 'Available' };
      if(tc.includes('not') || tc.includes('no') || tc.includes('missing') || tc.includes('absent')) return { available:false, text: item.availableText || 'Not available' };
    }
    const p = (item.path || item.file || item.url || item.src || '');
    if(p && !p.match(/^(#|javascript:void|undefined|null)$/i)) {
      if(p.toLowerCase().endsWith('.pdf') || p.toLowerCase().includes('/papers/') || p.startsWith('./') || p.startsWith('/')) {
        return { available:true, text: item.availableText || 'Available' };
      }
    }
    return { available:false, text: item.availableText || 'Not available' };
  }

  function detectPrograms(item){
    const out = new Set();
    const checkStr = (s) => {
      if(!s) return;
      const t = s.toString().toLowerCase();
      if(t.includes('cbcs')) out.add('cbcs');
      if(t.includes('cbc')) out.add('cbcs');
      if(t.includes('fyug')) out.add('fyug');
      if(t.includes('nep')) out.add('fyug');
      if(t.includes('honours') || t.includes('hcc') || t.includes('hons')) out.add('cbcs');
      if(t.includes('ug') && t.includes('fy')) out.add('fyug');
    };
    checkStr(item.program);
    checkStr(item.path);
    checkStr(item.file);
    checkStr(item.filename);
    checkStr(item.title);
    checkStr(item.name);
    checkStr(item.category);
    if(Array.isArray(item.tags)) item.tags.forEach(t => checkStr(t));
    const path = (item.path || item.file || item.url || '').toString().toLowerCase();
    if(path.includes('/fyug/') || path.includes('/nep/')) out.add('fyug');
    if(path.includes('/cbcs/')) out.add('cbcs');
    return Array.from(out);
  }

  /* ---------------- DOM Refs ---------------- */
  const papersBody = document.getElementById('papersBody');
  const totalCountEl = document.getElementById('totalCount');
  const filterTextEl = document.getElementById('filterText');
  const segBtns = Array.from(document.querySelectorAll('.seg-btn'));
  const searchBox = document.getElementById('searchBox');
  const sortSelect = document.getElementById('sortSelect');
  const pdfModal = document.getElementById('pdfModal');
  const pdfFrame = document.getElementById('pdfFrame');
  const closePdf = document.getElementById('closePdf');

  let papers = [];
  let currentFilter = 'All';
  let currentSort = localStorage.getItem('exam:sort') || 'name';
  let currentSearch = '';

  /* ---------------- Render ---------------- */
  function renderTable(list){
    // apply sort
    const sorted = [...list].sort((a,b) => {
      if(currentSort === 'name'){
        const an = (a.title||a.path||'').toString().toLowerCase();
        const bn = (b.title||b.path||'').toString().toLowerCase();
        return an.localeCompare(bn);
      } else if(currentSort === 'year'){
        const ay = parseInt(a.year || (yearFromText(a.title||a.path) || 0));
        const by = parseInt(b.year || (yearFromText(b.title||b.path) || 0));
        return (by || 0) - (ay || 0); // descending
      } else if(currentSort === 'avail'){
        // available first
        const aa = interpretAvailability(a).available ? 0 : 1;
        const ba = interpretAvailability(b).available ? 0 : 1;
        return aa - ba;
      }
      return 0;
    });

    papersBody.innerHTML = '';
    sorted.forEach((p, idx) => {
      const path = p.path || p.file || p.filename || p.src || p.url || '';
      const fname = filenameFromPath(path);
      const year = p.year || yearFromText(p.title || fname) || '';
      const code = codeFromTitle(p.title || p.display || '', fname);
      const rawTitle = p.title || p.name || '';
      const title = rawTitle.indexOf('—')!==-1 ? rawTitle.split('—').slice(1).join('—').trim() : rawTitle;
      const availabilityObj = interpretAvailability(p);
      const availText = availabilityObj.text;
      const availClass = availabilityObj.available ? 'available' : 'na';

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
    totalCountEl.textContent = sorted.length;
  }

  /* ---------------- Filter, Search & Sort ---------------- */
  function applyFilter(program){
    currentFilter = (program || 'All');
    filterTextEl.textContent = currentFilter;
    localStorage.setItem('exam:program', currentFilter);
    doFilterSearchSort();
  }

  function doFilterSearchSort(){
    const progKey = (currentFilter || 'All').toString().toLowerCase();
    const q = (currentSearch || '').toString().trim().toLowerCase();

    const filtered = papers.filter(p => {
      // program filter
      if(progKey !== 'all'){
        const progs = detectPrograms(p);
        if(progs.length && progs.some(x => x === progKey)) {
          // ok
        } else {
          // fallback text checks
          const t = (p.program||p.path||p.file||p.filename||p.title||p.name||'').toString().toLowerCase();
          if(!t.includes(progKey)) return false;
        }
      }
      // search filter
      if(q){
        const hay = ((p.title||'') + ' ' + (p.path||p.file||p.filename||'') + ' ' + (p.tags||[]).join(' ')).toString().toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });

    renderTable(filtered);
  }

  // search input
  if(searchBox){
    searchBox.addEventListener('input', (e) => {
      currentSearch = e.target.value || '';
      localStorage.setItem('exam:search', currentSearch);
      doFilterSearchSort();
    });
    // restore if stored
    const savedSearch = localStorage.getItem('exam:search') || '';
    if(savedSearch){ searchBox.value = savedSearch; currentSearch = savedSearch; }
  }

  // sort select
  if(sortSelect){
    // set current
    sortSelect.value = currentSort;
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      localStorage.setItem('exam:sort', currentSort);
      doFilterSearchSort();
    });
  }

  /* ---------------- segmented control behavior ---------------- */
  // restore last program from localStorage
  const savedProg = localStorage.getItem('exam:program') || 'All';
  segBtns.forEach(btn => {
    if(btn.dataset.program === savedProg) {
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
    } else {
      btn.classList.remove('active'); btn.setAttribute('aria-pressed','false');
    }
    btn.addEventListener('click', () => {
      segBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      applyFilter(btn.dataset.program || 'All');
    });
  });
  // ensure UI shows initial
  filterTextEl.textContent = savedProg;

  /* ---------------- Preview / Download delegation ---------------- */
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if(!btn) return;
    const src = btn.dataset.src || '';
    if(btn.classList.contains('download')){
      if(!src){ alert('File not available for download.'); return; }
      const a = document.createElement('a'); a.href = src; a.download = filenameFromPath(src) || ''; document.body.appendChild(a); a.click(); a.remove();
    } else if(btn.classList.contains('preview')){
      if(!src){ alert('Preview not available.'); return; }
      // show pdf modal
      if(pdfFrame) pdfFrame.src = src;
      if(pdfModal){ pdfModal.style.display = 'flex'; pdfModal.setAttribute('aria-hidden','false'); }
    }
  });

  if(closePdf){
    closePdf.addEventListener('click', () => {
      if(pdfFrame) pdfFrame.src = '';
      if(pdfModal){ pdfModal.style.display = 'none'; pdfModal.setAttribute('aria-hidden','true'); }
    });
  }
  // close modal on backdrop click
  if(pdfModal){
    pdfModal.addEventListener('click', (e) => {
      if(e.target === pdfModal){ if(pdfFrame) pdfFrame.src = ''; pdfModal.style.display = 'none'; pdfModal.setAttribute('aria-hidden','true'); }
    });
  }

  /* ---------------- JSON loading (try multiple candidates) ---------------- */
  async function tryLoadJson(candidates){
    for(const url of candidates){
      try{
        const r = await fetch(url, {cache:'no-cache'});
        if(!r.ok) continue;
        const json = await r.json();
        if(Array.isArray(json)) return json;
        if(json && Array.isArray(json.papers)) return json.papers;
      } catch(e){ /* ignore and try next */ }
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
      // normalize entries slightly
      papers = res.map(it => {
        const copy = Object.assign({}, it);
        // fill program if detectPrograms finds one
        const progs = detectPrograms(copy);
        if(!copy.program && progs.length) copy.program = progs[0];
        return copy;
      });
    } else {
      // fallback sample (so page isn't empty)
      papers = [
        { path:'./papers/CBCS/2019-PHSHCC101T.pdf', title:'PHSHCC101T — Mathematical Physics - I (2019)', available:false, program:'CBCS' },
        { path:'./papers/FYUG/2024-PHSHCC301T.pdf', title:'PHSHCC301T — Modern Physics (2024)', available:true, program:'FYUG' }
      ];
      console.warn('Could not find papers.json; using fallback sample data.');
    }

    // apply initial filter/sort
    currentSort = localStorage.getItem('exam:sort') || currentSort;
    if(sortSelect) sortSelect.value = currentSort;
    // run filter/search/sort pipeline
    doFilterSearchSort();
  }

  /* ---------------- initialize ---------------- */
  loadPapers();

}); // DOMContentLoaded