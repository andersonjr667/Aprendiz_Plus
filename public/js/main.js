// main frontend logic: fetch jobs and render
async function fetchJobs() {
  const res = await fetch('/api/jobs');
  const jobs = await res.json();
  const list = document.getElementById('jobs');
  if (!list) return;
  list.innerHTML = '';
  jobs.forEach(j => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<h3>${j.title}</h3><p>${j.description ? j.description.substring(0,120) : ''}</p><a class="btn btn-primary" href="/job/${j._id}">Ver</a>`;
    list.appendChild(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchJobs().catch(console.error);
});
