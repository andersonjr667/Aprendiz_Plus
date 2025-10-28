// perfil-empresa.js
async function loadCompany(){
  const res = await fetch('/api/companies/me');
  const data = await res.json();
  const el = document.getElementById('company');
  if(!el) return;
  if(!res.ok){ el.innerHTML='Erro'; return; }
  el.innerHTML = `<strong>${data.name}</strong><p>${data.website||''}</p><p>${data.email||''}</p>`;
}

async function loadActive(){
  const res = await fetch('/api/companies/me/jobs');
  const data = await res.json();
  const c = document.getElementById('activeJobs');
  if(!c) return;
  if(!res.ok||!data){ c.innerHTML='Nenhuma vaga'; return; }
  c.innerHTML='';
  data.forEach(j=>{ const d=document.createElement('div'); d.className='job-card'; d.innerHTML=`<h4>${j.title}</h4><div class='job-meta'>${j.location||''}</div><p><a href='/pages/vaga-detalhes.html?id=${j.id}'>Ver</a></p>`; c.appendChild(d);});
}

window.addEventListener('DOMContentLoaded', function(){ loadCompany(); loadActive(); });
