// candidatos.js — moved from inline script
async function loadCandidatos(){
  const skill = (document.getElementById('skill') && document.getElementById('skill').value) || '';
  const res = await fetch('/api/users?type=candidato' + (skill ? ('&skill=' + encodeURIComponent(skill)) : ''));
  const data = await res.json();
  const c = document.getElementById('list');
  if(!res.ok){ if(c) c.innerHTML='Erro'; return; }
  if(c) c.innerHTML='';
  data.forEach(u=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML=`<h4>${u.name}</h4><p>${u.location||''}</p><p><a href='/pages/perfil-candidato.html?id=${u.id}'>Ver perfil</a></p>`; c.appendChild(d);});
}

document.addEventListener('DOMContentLoaded', function(){ const btn = document.getElementById('btn'); if(btn) btn.addEventListener('click', loadCandidatos); loadCandidatos(); });
