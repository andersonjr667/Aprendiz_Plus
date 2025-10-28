// empresas.js
async function loadEmpresas(){
  const res = await fetch('/api/companies');
  const data = await res.json();
  const c = document.getElementById('list');
  if(!c) return;
  if(!res.ok){ c.innerHTML='Erro'; return; }
  c.innerHTML='';
  data.forEach(emp=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML=`<h4>${emp.name}</h4><p>${emp.website||''}</p><p><a href='/pages/perfil-empresa.html?id=${emp.id}'>Ver</a></p>`; c.appendChild(d); });
}

window.addEventListener('DOMContentLoaded', loadEmpresas);
