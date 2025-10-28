// admin-noticia.js
async function createNews(e){
  e.preventDefault();
  const f = new FormData(e.target);
  const payload = Object.fromEntries(f.entries());
  const res = await fetch('/api/news',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const d = await res.json();
  if(res.ok){ alert('Criado'); loadNewsList(); } else alert(d.error||'Erro');
}

async function loadNewsList(){
  const res = await fetch('/api/news');
  const d = await res.json();
  const c = document.getElementById('list');
  if(!c) return;
  if(!res.ok){ c.innerHTML='Erro'; return; }
  c.innerHTML='';
  d.forEach(n=>{ const div=document.createElement('div'); div.className='card'; div.style.marginBottom='8px'; div.innerHTML=`<h4>${n.title}</h4><p>${(n.content||'').slice(0,200)}</p><p><button data-id='${n.id}' class='btn btn-outline remove'>Remover</button></p>`; c.appendChild(div); });
  document.querySelectorAll('.remove').forEach(b=>b.addEventListener('click',async e=>{ if(!confirm('Remover?')) return; const id=e.target.dataset.id; const res=await fetch('/api/news/'+id,{method:'DELETE'}); if(res.ok) loadNewsList(); else alert('Erro'); }));
}

window.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('newsForm');
  if(form) form.addEventListener('submit', createNews);
  loadNewsList();
});
