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
        <td class="meta"