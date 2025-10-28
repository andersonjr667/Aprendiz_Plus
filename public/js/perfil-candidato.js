// perfil-candidato.js — moved from inline script
async function loadProfile(){
  const res = await fetch('/api/users/me');
  const data = await res.json();
  if(!res.ok){ const p = document.getElementById('profile'); if(p) p.innerHTML='Erro ao carregar perfil'; return; }
  const p = document.getElementById('profile');
  if(p) p.innerHTML = `<p><strong>${data.name}</strong></p><p>${data.email}</p><p>${data.type||''}</p>`;
}

async function loadRecommendations(){
  const res = await fetch('/api/jobs/recommendations');
  const data = await res.json();
  const c = document.getElementById('recommendations');
  if(!res.ok || !data) { if(c) c.innerHTML='<p>Nenhuma recomendação</p>'; return; }
  if(c) c.innerHTML='';
  data.slice(0,5).forEach(j=>{
    const d=document.createElement('div');
    d.innerHTML = `<a href='/pages/vaga-detalhes.html?id=${j.id}'>${j.title}</a><div class='job-meta'>${j.company_name||''}</div>`;
    c.appendChild(d);
  });
}

async function loadApplications(){
  const res = await fetch('/api/users/me/applications');
  const data = await res.json();
  const c = document.getElementById('applications');
  if(!res.ok||!data) { if(c) c.innerHTML='Nenhuma candidatura'; return; }
  if(c) c.innerHTML='';
  data.forEach(a=>{ const d=document.createElement('div'); d.innerHTML = `<div style='margin-bottom:8px;'><a href='/pages/vaga-detalhes.html?id=${a.job_id}'>${a.job_title||'Vaga'}</a> • ${a.status}</div>`; c.appendChild(d);});
}

window.addEventListener('DOMContentLoaded', function(){ loadProfile(); loadRecommendations(); loadApplications(); });
