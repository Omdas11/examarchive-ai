// scripts/browse.js (production, mobile-first)
(function(){
  const OWNER = 'Omdas11';
  const REPO = 'examarchive-ai';
  const BRANCH = 'main';
  const DATA_URL = 'papers/papers.json';
  const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const content = document.getElementById('contentArea');
  const searchInput = document.getElementById('searchInput');
  const yearSelect = document.getElementById('yearSelect');
  const typeSelect = document.getElementById('typeSelect');
  const toggleViewBtn = document.getElementById('toggleView');

  let papers = [];
  let view = sessionStorage.getItem('ea_view') || 'grid';
  let availCache = {};
  const MAX_CONCURRENT_CHECKS = 6;
  const TIMEOUT_MS = 6000;

  function debounce(fn, wait=250){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; }

  // load cache
  for(const k in sessionStorage){ if(k.startsWith('ea_avail:')) availCache[k.replace('ea_avail:','')] = sessionStorage.getItem(k) === '1'; }

  function pLimit(max){
    const q=[]; let a=0;
    const next = ()=>{ if(a>=max||q.length===0) return; a++; const {fn,resolve,reject}=q.shift(); fn().then(resolve).catch(reject).finally(()=>{ a--; next(); }); };
    return (fn)=> new Promise((resolve,reject)=>{ q.push({fn,resolve,reject}); next(); });
  }
  const limit = pLimit(MAX_CONCURRENT_CHECKS);

  function fetchWithTimeout(url, opts={}, timeout=TIMEOUT_MS){
    return new Promise((resolve,reject)=>{
      const ac = new AbortController();
      const id = setTimeout(()=> ac.abort(), timeout);
      fetch(url, Object.assign({}, opts, { signal: ac.signal })).then(r=>{ clearTimeout(id); resolve(r); }).catch(err=>{ clearTimeout(id); reject(err); });
    });
  }

  async function tryUrl(url){
    try{
      let r = await fetchWithTimeout(url, { method:'HEAD' }).catch(()=>null);
      if(r && r.ok) return true;
      r = await fetchWithTimeout(url, { method:'GET' }).catch(()=>null);
      if(r && r.ok) return true;
      return false;
    }catch(e){ return false; }
  }

  async function checkAvailable(filePath){
    if(!filePath) return false;
    if(availCache.hasOwnProperty(filePath)) return availCache[filePath];
    // honor precomputed available flag in JSON
    try{
      const found = papers.find(p => p.file && p.file === filePath);
      if(found && found.available === true){ availCache[filePath] = true; sessionStorage.setItem('ea_avail:'+filePath,'1'); return true; }
      if(found && found.available === false){ availCache[filePath] = false; sessionStorage.setItem('ea_avail:'+filePath,'0'); return false; }
    }catch(e){}
    const candidates = [];
    if(/^(https?:)?\/\//.test(filePath)){
      candidates.push(filePath);
      if(filePath.includes('github.com') && filePath.includes('/blob/')) candidates.push(filePath.replace('github.com','raw.githubusercontent.com').replace('/blob/','/'));
    } else {
      candidates.push(filePath);
      candidates.push(RAW_BASE + filePath.replace(/^\//,''));
    }
    for(const c of candidates){
      const ok = await limit(()=> tryUrl(c));
      if(ok){ availCache[filePath] = true; try{ sessionStorage.setItem('ea_avail:'+filePath,'1'); }catch(e){}; return true; }
    }
    availCache[filePath] = false; try{ sessionStorage.setItem('ea_avail:'+filePath,'0'); }catch(e){}; return false;
  }

  async function init(){
    try{
      const r = await fetch(DATA_URL);
      papers = await r.json();
      if(!Array.isArray(papers)) papers = [];
      populateFilters();
      render();
      lazyCheckVisible();
    }catch(e){
      content.innerHTML = `<div style="padding:14px;background:#fff;border-radius:8px;color:#900">Failed to load papers.json</div>`;
      console.error(e);
    }
  }

  function populateFilters(){
    const years = Array.from(new Set(papers.map(p => p.year))).sort((a,b)=>b-a);
    yearSelect.innerHTML = `<option value="">All years</option>` + years.map(y=>`<option value="${y}">${y}</option>`).join('');
    const types = Array.from(new Set(papers.map(p => p.type || 'Unknown')));
    typeSelect.innerHTML = `<option value="">All types</option>` + types.map(t=>`<option value="${t}">${t}</option>`).join('');
  }

  function getFiltered(){
    const q = (searchInput.value || '').trim().toLowerCase();
    const year = yearSelect.value;
    const t = typeSelect.value;
    return papers.filter(p=>{
      if(year && String(p.year) !== year) return false;
      if(t && (p.type || '') !== t) return false;
      if(!q) return true;
      const combined = `${p.id} ${p.title} ${p.university} ${p.subject || ''} ${p.year}`.toLowerCase();
      return combined.includes(q);
    });
  }

  async function render(){
    content.innerHTML = '';
    const list = getFiltered();
    if(list.length === 0){ content.innerHTML = `<div style="padding:14px;background:#fff;border-radius:8px">No results</div>`; return; }
    if(view === 'grid'){
      toggleViewBtn.textContent = 'Table view'; toggleViewBtn.setAttribute('aria-pressed','false');
      const grid = document.createElement('div'); grid.className='grid';
      for(const p of list){
        const card = document.createElement('div'); card.className='card';
        const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${p.id || ''} · ${p.type || ''} · ${p.year || ''} · ${p.university || ''}`;
        const title = document.createElement('div'); title.className='title'; title.textContent = `${p.title || p.id || 'Untitled'} ${p.year? `(${p.year})` : ''}`;
        const badgeWrap = document.createElement('div'); badgeWrap.style.marginTop='8px';
        const actions = document.createElement('div'); actions.className='actions';
        const previewBtn = document.createElement('button'); previewBtn.className='btn'; previewBtn.textContent='Preview';
        const dlBtn = document.createElement('button'); dlBtn.className='btn'; dlBtn.textContent='Download';

        if(p.available === true){
          const b = document.createElement('span'); b.className='badge-available'; b.textContent='Available';
          badgeWrap.appendChild(b); previewBtn.disabled=false; dlBtn.disabled=false;
        } else if(!p.file){
          const m = document.createElement('span'); m.className='badge-missing'; m.textContent='Not found';
          badgeWrap.appendChild(m); previewBtn.disabled=true; dlBtn.disabled=true;
        } else {
          const checking = document.createElement('span'); checking.className='badge-missing'; checking.textContent='Checking…';
          badgeWrap.appendChild(checking); previewBtn.disabled=true; dlBtn.disabled=true;
          checkAvailable(p.file).then(ok=>{
            badgeWrap.innerHTML='';
            if(ok){ const b = document.createElement('span'); b.className='badge-available'; b.textContent='Available'; badgeWrap.appendChild(b); previewBtn.disabled=false; dlBtn.disabled=false; }
            else { const m = document.createElement('span'); m.className='badge-missing'; m.textContent='Not found'; badgeWrap.appendChild(m); }
          }).catch(()=>{ badgeWrap.innerHTML = `<span class="badge-missing">Not found</span>`; });
        }

        previewBtn.addEventListener('click', ()=> { if(p.file) window.open(p.file,'_blank'); });
        dlBtn.addEventListener('click', ()=> { if(p.file) location.href = p.file; });

        actions.appendChild(previewBtn); actions.appendChild(dlBtn);
        card.appendChild(meta); card.appendChild(title); card.appendChild(badgeWrap); card.appendChild(actions);
        grid.appendChild(card);
      }
      content.appendChild(grid);
    } else {
      toggleViewBtn.textContent = 'Grid view'; toggleViewBtn.setAttribute('aria-pressed','true');
      const wrap = document.createElement('div'); wrap.className='table-wrap';
      const table = document.createElement('table'); table.className='table';
      const thead = document.createElement('thead'); thead.innerHTML = `<tr><th>Code</th><th>Title</th><th>Year</th><th>University</th><th>Type</th><th>Availability</th><th>Actions</th></tr>`;
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for(const p of list){
        const tr = document.createElement('tr');
        const codeTd = document.createElement('td'); codeTd.textContent = p.id || '';
        const titleTd = document.createElement('td'); titleTd.textContent = p.title || '';
        const yearTd = document.createElement('td'); yearTd.textContent = p.year || '';
        const uniTd = document.createElement('td'); uniTd.textContent = p.university || '';
        const typeTd = document.createElement('td'); typeTd.textContent = p.type || '';
        const availTd = document.createElement('td');
        if(p.available === true){ const b = document.createElement('span'); b.className='badge-available'; b.textContent='Available'; availTd.appendChild(b); }
        else if(!p.file){ const m = document.createElement('span'); m.className='badge-missing'; m.textContent='Not found'; availTd.appendChild(m); }
        else { const checking = document.createElement('span'); checking.className='badge-missing'; checking.textContent='Checking…'; availTd.appendChild(checking); checkAvailable(p.file).then(ok=>{ availTd.innerHTML=''; if(ok){ const b = document.createElement('span'); b.className='badge-available'; b.textContent='Available'; availTd.appendChild(b); } else { const m = document.createElement('span'); m.className='badge-missing'; m.textContent='Not found'; availTd.appendChild(m); } }).catch(()=>{ availTd.innerHTML = `<span class="badge-missing">Not found</span>`; }); }
        const actionsTd = document.createElement('td'); const previewBtn = document.createElement('button'); previewBtn.className='btn'; previewBtn.textContent='Preview'; const dlBtn = document.createElement('button'); dlBtn.className='btn'; dlBtn.textContent='Download';
        if(!p.file && p.available !== true){ previewBtn.disabled=true; dlBtn.disabled=true; }
        previewBtn.onclick = ()=> p.file && window.open(p.file,'_blank');
        dlBtn.onclick = ()=> p.file && (location.href = p.file);
        actionsTd.appendChild(previewBtn); actionsTd.appendChild(dlBtn);
        tr.appendChild(codeTd); tr.appendChild(titleTd); tr.appendChild(yearTd); tr.appendChild(uniTd); tr.appendChild(typeTd); tr.appendChild(availTd); tr.appendChild(actionsTd);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody); wrap.appendChild(table); content.appendChild(wrap);
    }
  }

  function lazyCheckVisible(){ const toCheck = papers.slice(0, 24).map(p => p.file).filter(Boolean); toCheck.forEach(url => checkAvailable(url).catch(()=>{})); }

  toggleViewBtn.addEventListener('click', ()=>{ view = (view === 'grid') ? 'table' : 'grid'; sessionStorage.setItem('ea_view', view); render(); window.scrollTo({top:0, behavior:'smooth'}); });
  searchInput.addEventListener('input', debounce(()=> render(), 250)); yearSelect.addEventListener('change', ()=> render()); typeSelect.addEventListener('change', ()=> render());

  init();
})();