// vaga-detalhes.js
function getQuery(){return new URLSearchParams(window.location.search);} 

// Pegar ID da URL (tanto de query string quanto de parâmetro de rota)
function getJobId() {
  // Primeiro tenta pegar da query string (?id=...)
  const queryId = getQuery().get('id');
  if (queryId) return queryId;
  
  // Se não encontrar, pega da URL /vaga/{id}
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] === 'vaga' && pathParts[2]) {
    return pathParts[2];
  }
  
  return null;
}

const id = getJobId();

async function loadVaga(){
  console.log('Loading vaga with ID:', id);
  if(!id) {
    console.error('No job ID found');
    const el = document.getElementById('job');
    if(el) el.innerHTML = `<div class='card'><h2>Erro</h2><p>ID da vaga não encontrado na URL</p></div>`;
    return;
  }
  
  try {
    const res = await fetch(`/api/jobs/${id}`);
    console.log('API response status:', res.status);
    const data = await res.json();
    console.log('API response data:', data);
    
    const el = document.getElementById('job');
    if(!el) {
      console.error('Job container element not found');
      return;
    }
    
    if(!res.ok){ 
      el.innerHTML = `<div class='card'><h2>Erro</h2><p>${data.error||'Não foi possível carregar a vaga'}</p></div>`; 
      return; 
    }
    
    // Usar os campos corretos do modelo Job
    const companyName = data.company?.name || 'Empresa não informada';
    const requirements = Array.isArray(data.requirements) ? data.requirements.join(', ') : data.requirements || 'Não informado';
    const benefits = Array.isArray(data.benefits) ? data.benefits.join(', ') : data.benefits || 'Não informado';
    
    el.innerHTML = `
      <div class='card'>
        <h1>${data.title}</h1>
        <div class='job-meta'>${companyName} • ${data.location || 'Local não informado'} • ${data.workModel || ''}</div>
        <h3>Descrição</h3>
        <p>${data.description || 'Descrição não disponível'}</p>
        <h3>Requisitos</h3>
        <p>${requirements}</p>
        <h3>Benefícios</h3>
        <p>${benefits}</p>
        ${data.salary ? `<h3>Salário</h3><p>${data.salary}</p>` : ''}
        <div style='margin-top:16px;'>
          <button id='applyBtn' class='btn btn-primary'>Candidatar-se</button>
        </div>
      </div>
    `;
    
    const btn = document.getElementById('applyBtn'); 
    if(btn) btn.addEventListener('click', applyVaga);
  } catch (error) {
    console.error('Error loading vaga:', error);
    const el = document.getElementById('job');
    if(el) el.innerHTML = `<div class='card'><h2>Erro</h2><p>Erro de conexão: ${error.message}</p></div>`;
  }
}

async function applyVaga(){
  try{
    const res = await fetch(`/api/jobs/${id}/apply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
    const data = await res.json();
    if(res.ok){ alert(data.message||'Candidatura enviada com sucesso'); } else { alert(data.error||'Erro ao candidatar-se'); }
  }catch(err){ alert('Erro ao candidatar: '+err.message); }
}

// Função para o botão voltar
function setupBackButton() {
  const btnVoltar = document.getElementById('btnVoltar');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', function() {
      // Verifica se há histórico para voltar
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Se não há histórico, vai para a página de vagas
        window.location.href = '/vagas';
      }
    });
  }
}

if(id) {
  window.addEventListener('DOMContentLoaded', function() {
    loadVaga();
    setupBackButton();
  });
} else {
  window.addEventListener('DOMContentLoaded', function() {
    setupBackButton();
    const el = document.getElementById('job');
    if(el) el.innerHTML = `<div class='card'><h2>Erro</h2><p>ID da vaga não encontrado na URL</p></div>`;
  });
}
