// vagas.js
let page = 1, pageSize = 10;
async function loadJobs(){
  const q = encodeURIComponent(document.getElementById('q').value || '');
  const loc = encodeURIComponent(document.getElementById('location').value || '');
  const model = encodeURIComponent(document.getElementById('model').value || '');
  const res = await fetch(`/api/jobs?search=${q}&location=${loc}&model=${model}&page=${page}&limit=${pageSize}`);
  const data = await res.json();
  const container = document.getElementById('jobs'); if(!container) return; container.innerHTML='';
  if(!res.ok){ container.innerHTML = '<p>Erro ao carregar vagas.</p>'; return; }
  if(!data || !data.items || data.items.length===0){ container.innerHTML='<p>Nenhuma vaga encontrada.</p>'; return; }
  data.items.forEach(job=>{
    const el = document.createElement('div'); el.className='job-card';
    el.innerHTML = `<h3>${job.title}</h3><div class='job-meta'>${job.company_name||''} • ${job.location||''}</div><p>${(job.summary||job.description||'').slice(0,180)}...</p><p><a href='/pages/vaga-detalhes.html?id=${job.id}'>Ver detalhes</a></p>`;
    container.appendChild(el);
  });
  renderPagination(data.total || 0);
}
function renderPagination(total){ const pages = Math.ceil(total/pageSize); const p = document.getElementById('pagination'); if(!p) return; p.innerHTML=''; for(let i=1;i<=pages;i++){ const btn=document.createElement('button'); btn.className='btn'; btn.textContent=i; btn.onclick=()=>{page=i; loadJobs()}; if(i===page) btn.disabled=true; p.appendChild(btn);} }

window.addEventListener('DOMContentLoaded', function(){ const btn = document.getElementById('searchBtn'); if(btn) btn.addEventListener('click',()=>{page=1;loadJobs()}); loadJobs(); });
