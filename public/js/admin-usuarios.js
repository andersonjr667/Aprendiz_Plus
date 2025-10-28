// admin-usuarios.js
async function loadUsers(){
  const type = (document.getElementById('filterType') && document.getElementById('filterType').value) || '';
  const res = await fetch('/api/users' + (type ? ('?type=' + encodeURIComponent(type)) : ''));
  const data = await res.json();
  const t = document.getElementById('usersTable');
  if(!t) return;
  if(!res.ok){ t.innerHTML='<tr><td>Erro ao carregar</td></tr>'; return; }
  t.innerHTML='<tr><th>Nome</th><th>Email</th><th>Tipo</th><th>Ações</th></tr>';
  data.forEach(u=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${u.name}</td><td>${u.email}</td><td>${u.type}</td><td><button data-id='${u.id}' class='btn action-toggle'>${u.active? 'Desativar':'Ativar'}</button></td>`; t.appendChild(tr);} );
  document.querySelectorAll('.action-toggle').forEach(b=>b.addEventListener('click',async e=>{ const id=e.target.dataset.id; const res=await fetch('/api/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({active: e.target.textContent==='Ativar'})}); const d=await res.json(); if(res.ok) loadUsers(); else alert(d.error||'Erro'); }));
}

window.addEventListener('DOMContentLoaded', function(){ const btn = document.getElementById('loadBtn'); if(btn) btn.addEventListener('click', loadUsers); loadUsers(); });
