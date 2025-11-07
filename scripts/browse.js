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
    if(t.indexOf('—') !== -1) t = t.split('—')[0].trim();
    if(t.indexOf(' - ') !== -1) t = t.split(' - ')[0].trim();
    const codeMatch = t.match(/[A-Z]{2,}[A-Z0-9\-]*\d{2,}[A-Z0-9]*/);
    if(codeMatch) return codeMatch[0].replace(/-+$/,'');
    const fname = (fallbackFilename || '').replace(/\.[^.]+$/, '');
    if(fname) return fname.split(/[\s_]+/)[0];
    return '';
  }

  // Robust availability interpretation: returns {available:Boolean, text:String}
  function interpretAvailability(item){
    // Allow multiple input shapes: item.available (bool or string/number), item.availableText, item.status, item.note
    const raw = (item.available !== undefined) ? item.available : (item.availableText !== undefined ? item.availableText : (item.status !== undefined ? item.status : ''));
    const textCandidate = (item.availableText && typeof item.availableText === 'string') ? item.availableText
                          : (typeof raw === 'string' ? raw : '');

    // normalize string -> boolean detection
    const norm = (val) => {
      if(val === true || val === 1) return true;
      if(val === false || val === 0 || val === null || val === undefined) return false;
      const s = String(val).trim().toLowerCase();
      if(!s) return null;
      if(['true','available','yes','y','1'].includes(s)) return true;
      if(['false','not available','not available','no','n','0'].includes(s)) return false;
      return null; // unknown
    };

    const bool = norm(raw);
    if(bool === true) return { available: true, text: (textCandidate || 'Available') };
    if(bool === false) return { available: false, text: (textCandidate || 'Not available') };

    // fallback: if there's explicit availableText mentioning available
    if(typeof textCandidate === 'string'){
      const tc = textCandidate.trim().toLowerCase();
      if(tc.includes('available') || tc.includes('yes') || tc.includes('uploaded') || tc.includes('present')) {
        return { available: true, text: item.availableText || 'Available' };
      }
      if(tc.includes('not') || tc.includes('no') || tc.includes('missing') || tc.includes('absent')) {
        return { available: false, text: item.availableText || 'Not available' };
      }
    }

    // last resort: if the item has a non-empty url/path (and it's not placeholder), treat as available
    const p = (item.path || item.file || item.url || item.src || '');
    if(p && !p.match(/^(#|javascript:void|undefined|null)$/i)) {
      // if path seems like real file with .pdf or starts with papers/
      if(p.toLowerCase().endsWith('.pdf') || p.toLowerCase().includes('/papers/') || p.startsWith('./') || p.startsWith('/')) {
        return { available: true, text: item.availableText || 'Available' };
      }
    }

    // unknown -> treat as not available
    return { available: false, text: item.availableText || 'Not available' };
  }

  // Program detection (robust): returns array of program tags found (lowercase)
  function detectPrograms(item){
    const out = new Set();
    const checkStr = (s) => {
      if(!s) return;
      const t = s.toString().toLowerCase();
      if(t.includes('cbcs')) out.add('cbcs');
      if(t.includes('fyug')) out.add('fyug');
      if(t.includes('nep')) out.add('fyug'); // treat NEP as FYUG-equivalent
      if(t.includes('ug') && t.includes('fy')) out.add('fyug');
      if(t.includes('honours') || t.includes('hcc') || t.includes('hons')) out.add('cbcs');
      if(t.includes('cbc')) out.add('cbcs'); // loose match
    };

    // check multiple places
    checkStr(item.program);
    checkStr(item.path);
    checkStr(item.file);
    checkStr(item.filename);
    checkStr(item.title);
    checkStr(item.name);
    checkStr(item.category);
    if(Array.isArray(item.tags)) item.tags.forEach(t => checkStr(t));

    // also check path segments (/FYUG/ or /NEP/)
    const path = (item.path || item.file || item.url || '').toString();
    if(path){
      const lower = path.toLowerCase();
      if(lower.includes('/fyug/') || lower.includes('/nep/')) out.add('fyug');
      if(lower.includes('/cbcs/')) out.add('cbcs');
    }

    return Array.from(out); // e.g. ['cbcs'] or ['fyug'] or []
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
    totalCountEl.textContent = list.length;
  }

  /* ---------- Filtering ---------- */
  function applyFilter(program){
    currentFilter = (program || 'All');
    filterTextEl.textContent = currentFilter;
    const progKey = (currentFilter || 'All').toString().toLowerCase();

    const filtered = papers.filter(p => {
      if(progKey === 'all' || !progKey) return true;
      // detect program tags for this item
      const progs = detectPrograms(p); // returns ['cbcs'] or ['fyug'] or []
      if(progs.length && progs.some(x => x === progKey.toLowerCase())) return true;

      // fallback checks on obvious fields
      const test = (s) => (s || '').toString().toLowerCase().includes(progKey);
      if(test(p.program) || test(p.path) || test(p.file) || test(p.filename) || test(p.title) || test(p.name)) return true;
      if(Array.isArray(p.tags) && test(p.tags.join(' '))) return true;

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

  /* ---------- JSON loading (candidates for GH pages) ---------- */
  async function tryLoadJson(candidates){
    for(const url of candidates){
      try{
        const r = await fetch(url, {cache:'no-cache'});
        if(!r.ok) continue;
        const json = await r.json();
        if(Array.isArray(json)) return json;
        if(json && Array.isArray(json.papers)) return json.papers;
      } catch(e){
        // try next
      }
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
      papers = res.map(it => {
        // normalize some common naming differences
        const copy = Object.assign({}, it);
        // ensure `program` is present if detectPrograms can find one
        const progs = detectPrograms(copy);
        if(!copy.program && progs.length) copy.program = progs[0];
        return copy;
      });
    } else {
      // fallback sample so the table isn't empty during development
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

}); // DOMContentLoaded