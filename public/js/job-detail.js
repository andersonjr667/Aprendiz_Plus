// job-detail.js
async function loadJobDetail(){
  const id = location.pathname.split('/').pop();
  const res = await fetch('/api/jobs/' + id);
  const job = await res.json();
  const titleEl = document.getElementById('title');
  const descEl = document.getElementById('desc');
  if(titleEl) titleEl.textContent = job.title || 'Vaga';
  if(descEl) descEl.textContent = job.description || '';
}

window.addEventListener('DOMContentLoaded', loadJobDetail);
