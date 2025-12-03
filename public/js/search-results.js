// search-results.js
async function searchJobs(){
  const q = new URLSearchParams(location.search).get('q') || '';
  const res = await fetch('/api/jobs/search?q=' + encodeURIComponent(q));
  const jobs = await res.json().catch(()=>null);
  const el = document.getElementById('results');
  if(!el) return;
  el.innerHTML = '';
  if (!Array.isArray(jobs)) {
    console.warn('searchJobs: expected array, got', jobs);
    el.innerHTML = '<p class="no-results">Nenhum resultado encontrado.</p>';
    return;
  }
  jobs.forEach(j => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `<h3>${j.title}</h3><p>${j.description?j.description.substring(0,120):''}</p>`;
    el.appendChild(d);
  });
}

window.addEventListener('DOMContentLoaded', searchJobs);
