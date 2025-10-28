// noticias.js
async function loadNoticias(){
  const res = await fetch('/api/news');
  const data = await res.json();
  const c = document.getElementById('news');
  if(!c) return;
  if(!res.ok||!data){ c.innerHTML='<p>Erro ao carregar notícias</p>'; return; }
  c.innerHTML='';
  data.forEach(n=>{ const d=document.createElement('div'); d.className='news-card'; d.innerHTML=`<h3>${n.title}</h3><p>${(n.summary||n.content||'').slice(0,180)}...</p><p><a href='/pages/news-detail.html?id=${n.id}'>Ler mais</a></p>`; c.appendChild(d); });
}

window.addEventListener('DOMContentLoaded', loadNoticias);
