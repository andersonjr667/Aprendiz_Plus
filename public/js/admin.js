// admin.js — loads admin summary
async function loadAdminSummary(){
  const res = await fetch('/api/admin/summary');
  const data = await res.json();
  const c = document.getElementById('summary');
  if(!c) return;
  if(!res.ok){ c.innerHTML='Erro'; return; }
  c.innerHTML = `<div class='card'><h3>Usuários</h3><p>${data.users_count||0}</p></div><div class='card'><h3>Vagas</h3><p>${data.jobs_count||0}</p></div><div class='card'><h3>Empresas</h3><p>${data.companies_count||0}</p></div>`;
}

window.addEventListener('DOMContentLoaded', loadAdminSummary);
