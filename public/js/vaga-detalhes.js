// vaga-detalhes.js
function getQuery(){return new URLSearchParams(window.location.search);} 
const id = getQuery().get('id');

async function loadVaga(){
  if(!id) return;
  const res = await fetch(`/api/jobs/${id}`);
  const data = await res.json();
  const el = document.getElementById('job');
  if(!el) return;
  if(!res.ok){ el.innerHTML = `<div class='card'><h2>Erro</h2><p>${data.error||'Não foi possível carregar'}</p></div>`; return; }
  el.innerHTML = `<div class='card'><h1>${data.title}</h1><div class='job-meta'>${data.company_name||''} • ${data.location||''}</div><h3>Descrição</h3><p>${data.description||''}</p><h3>Requisitos</h3><p>${data.requirements||''}</p><h3>Benefícios</h3><p>${data.benefits||''}</p><div style='margin-top:16px;'><button id='applyBtn' class='btn btn-primary'>Candidatar-se</button></div></div>`;
  const btn = document.getElementById('applyBtn'); if(btn) btn.addEventListener('click', applyVaga);
}

async function applyVaga(){
  try{
    const res = await fetch(`/api/jobs/${id}/apply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
    const data = await res.json();
    if(res.ok){ alert(data.message||'Candidatura enviada com sucesso'); } else { alert(data.error||'Erro ao candidatar-se'); }
  }catch(err){ alert('Erro ao candidatar: '+err.message); }
}

if(id) window.addEventListener('DOMContentLoaded', loadVaga);
