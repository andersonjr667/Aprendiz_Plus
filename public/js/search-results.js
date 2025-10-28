// search-results.js
async function searchJobs(){
  const q = new URLSearchParams(location.search).get('q') || '';
  const res = await fetch('/api/jobs/search?q=' + encodeURIComponent(q));
  const jobs = await res.json();
  const el = document.getElementById('results');
  if(!el) return;
  el.innerHTML = '';
  jobs.forEach(j=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML=`<h3>${j.title}</h3><p>${j.description?j.description.substring(0,120):''}</p>`; el.appendChild(d); });
}

window.addEventListener('DOMContentLoaded', searchJobs);
