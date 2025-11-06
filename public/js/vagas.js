// vagas.js - Melhorado com loading spinner e filtros adicionais (H1 e H7)
let page = 1, pageSize = 10;

function showLoadingSpinner() {
  const container = document.getElementById('jobs');
  if (!container) return;
  container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><span>Carregando vagas...</span></div>';
}

async function loadJobs(){
  showLoadingSpinner();
  const q = encodeURIComponent(document.getElementById('q').value || '');
  const loc = encodeURIComponent(document.getElementById('location').value || '');
  const model = encodeURIComponent(document.getElementById('model').value || '');
  
  try {
    const res = await fetch(`/api/jobs?search=${q}&location=${loc}&model=${model}&page=${page}&limit=${pageSize}`);
    const data = await res.json();
    const container = document.getElementById('jobs');
    if(!container) return;
    container.innerHTML='';
    
    if(!res.ok){
      container.innerHTML = '<p style="color: var(--brand-red);">Erro ao carregar vagas. Tente novamente.</p>';
      return;
    }
    
    if(!data || !data.items || data.items.length===0){
      container.innerHTML='<p style="color: var(--gray-600);">Nenhuma vaga encontrada com esses critérios. Tente ajustar os filtros.</p>';
      return;
    }
    
    data.items.forEach(job=>{
      const el = document.createElement('div');
      el.className='job-card';
      
      // Usar workModel em vez de model e company.name em vez de company_name
      const workModelDisplay = job.workModel ? ` • ${job.workModel}` : '';
      const companyName = job.company?.name || 'Empresa não informada';
      
      el.innerHTML = `
        <h3>${job.title}</h3>
        <div class='job-meta'>${companyName} • ${job.location || 'Local não informado'}${workModelDisplay}</div>
        <p>${(job.description || '').slice(0,180)}...</p>
        <p><a href='/vaga/${job._id}'>Ver detalhes</a></p>
      `;
      container.appendChild(el);
    });
    renderPagination(data.total || 0);
  } catch (err) {
    console.error('Erro ao carregar vagas:', err);
    const container = document.getElementById('jobs');
    if (container) {
      container.innerHTML = '<p style="color: var(--brand-red);">Erro de conexão. Verifique sua internet e tente novamente.</p>';
    }
  }
}

function renderPagination(total){
  const pages = Math.ceil(total/pageSize);
  const p = document.getElementById('pagination');
  if(!p) return;
  p.innerHTML='';
  
  if (pages <= 1) return;
  
  for(let i=1;i<=pages;i++){
    const btn=document.createElement('button');
    btn.className='btn';
    btn.textContent=i;
    btn.onclick=()=>{page=i; loadJobs()};
    if(i===page) btn.disabled=true;
    p.appendChild(btn);
  }
}

window.addEventListener('DOMContentLoaded', function(){
  const btn = document.getElementById('searchBtn');
  if(btn) btn.addEventListener('click',()=>{page=1;loadJobs()});
  
  // Permite buscar ao pressionar Enter
  const searchInput = document.getElementById('q');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        page = 1;
        loadJobs();
      }
    });
  }
  
  loadJobs();
});
