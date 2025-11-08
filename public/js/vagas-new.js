// vagas.js - Enhanced with modern features
let page = 1, pageSize = 10, totalJobs = 0;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// Show skeleton loading
function showSkeletonLoading() {
  const container = document.getElementById('jobs');
  if (!container) return;
  
  const skeletons = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>
  `).join('');
  
  container.innerHTML = skeletons;
}

// Auto-update on filter change
function setupAutoFilters() {
  const filterInputs = ['q', 'location', 'model'];
  filterInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        page = 1;
        loadJobs();
      });
      
      if (id === 'q') {
        let timeout;
        element.addEventListener('input', () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            page = 1;
            loadJobs();
          }, 500); // Debounce 500ms
        });
      }
    }
  });
}

// Check if job was posted in last 7 days
function isNewJob(createdAt) {
  if (!createdAt) return false;
  const jobDate = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now - jobDate) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

// Get work model badge
function getWorkModelBadge(model) {
  const badges = {
    'remoto': '<span class="badge badge-remoto">🏠 Remoto</span>',
    'presencial': '<span class="badge badge-presencial">🏢 Presencial</span>',
    'hibrido': '<span class="badge badge-hibrido">⚙️ Híbrido</span>'
  };
  return badges[model?.toLowerCase()] || '';
}

// Toggle favorite
function toggleFavorite(jobId, event) {
  event.preventDefault();
  event.stopPropagation();
  
  const index = favorites.indexOf(jobId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(jobId);
  }
  
  localStorage.setItem('favorites', JSON.stringify(favorites));
  
  const btn = event.currentTarget;
  btn.classList.toggle('favorited');
  btn.querySelector('i').className = favorites.includes(jobId) ? 'fas fa-heart' : 'far fa-heart';
}

// Share job
function shareJob(jobId, jobTitle, event) {
  event.preventDefault();
  event.stopPropagation();
  
  const url = `${window.location.origin}/vaga/${jobId}`;
  const text = `Confira esta vaga: ${jobTitle}`;
  
  if (navigator.share) {
    navigator.share({
      title: jobTitle,
      text: text,
      url: url
    }).catch(console.error);
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(`${text} - ${url}`).then(() => {
      alert('Link copiado para a área de transferência!');
    });
  }
}

// Load jobs
async function loadJobs() {
  showSkeletonLoading();
  
  const q = encodeURIComponent(document.getElementById('q').value || '');
  const loc = encodeURIComponent(document.getElementById('location').value || '');
  const model = encodeURIComponent(document.getElementById('model').value || '');
  
  try {
    const res = await fetch(`/api/jobs?search=${q}&location=${loc}&model=${model}&page=${page}&limit=${pageSize}`);
    const data = await res.json();
    const container = document.getElementById('jobs');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!res.ok) {
      showEmptyState('Erro ao carregar vagas', 'Tente novamente em alguns instantes.', 'fa-exclamation-triangle');
      return;
    }
    
    const jobs = data.items || [];
    totalJobs = data.total || 0;
    
    // Update results count
    updateResultsCount(totalJobs);
    
    if (jobs.length === 0) {
      showEmptyState(
        'Nenhuma vaga encontrada',
        'Tente ajustar seus filtros ou cadastre-se para receber novas oportunidades por email.',
        'fa-search'
      );
      return;
    }
    
    jobs.forEach(job => {
      const el = document.createElement('div');
      el.className = 'job-card';
      
      const workModel = job.workModel || job.model || '';
      const companyName = job.company?.name || job.company_name || 'Empresa não informada';
      const location = job.location || 'Local não informado';
      const description = job.description || 'Descrição não disponível';
      const isFavorited = favorites.includes(job._id);
      const isNew = isNewJob(job.createdAt);
      
      el.innerHTML = `
        <div class="job-badges">
          ${isNew ? '<span class="badge badge-new">✨ Novo!</span>' : ''}
          ${getWorkModelBadge(workModel)}
        </div>
        <h3>${job.title || 'Título não informado'}</h3>
        <div class="job-company">
          <i class="fas fa-building"></i>
          ${companyName}
        </div>
        <div class="job-location">
          <i class="fas fa-map-marker-alt"></i>
          ${location}
        </div>
        <p>${description.slice(0, 180)}${description.length > 180 ? '...' : ''}</p>
        <div class="job-actions">
          <a href="/vaga/${job._id}" class="btn-details">
            Ver Detalhes <i class="fas fa-arrow-right"></i>
          </a>
          <button class="btn-favorite ${isFavorited ? 'favorited' : ''}" 
                  onclick="toggleFavorite('${job._id}', event)"
                  title="Favoritar vaga">
            <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <button class="btn-share" 
                  onclick="shareJob('${job._id}', '${job.title?.replace(/'/g, "\\'")}', event)"
                  title="Compartilhar vaga">
            <i class="fas fa-share-alt"></i>
          </button>
        </div>
      `;
      
      container.appendChild(el);
    });
    
    renderPagination(totalJobs);
    
    // Load suggested jobs if there are results
    if (jobs.length > 0 && jobs.length < 6) {
      loadSuggestedJobs();
    }
    
  } catch (err) {
    console.error('Erro ao carregar vagas:', err);
    showEmptyState(
      'Erro de conexão',
      'Verifique sua internet e tente novamente.',
      'fa-wifi'
    );
  }
}

// Show empty state
function showEmptyState(title, message, icon) {
  const container = document.getElementById('jobs');
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <i class="fas ${icon}"></i>
      <h3>${title}</h3>
      <p>${message}</p>
      <a href="/register" class="btn btn-primary btn-lg">
        <i class="fas fa-user-plus"></i> Cadastrar-se para Receber Vagas
      </a>
    </div>
  `;
}

// Update results count
function updateResultsCount(total) {
  const countElement = document.getElementById('resultsCount');
  if (countElement) {
    countElement.textContent = total > 0 
      ? `${total} vaga${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}`
      : 'Nenhuma vaga encontrada';
  }
}

// Load suggested jobs
async function loadSuggestedJobs() {
  try {
    const res = await fetch('/api/jobs?limit=3&random=true');
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const container = document.getElementById('suggestedJobsGrid');
      const section = document.getElementById('suggestedJobs');
      
      if (container && section) {
        container.innerHTML = data.items.map(job => `
          <div class="job-card">
            <h3>${job.title}</h3>
            <div class="job-company">
              <i class="fas fa-building"></i>
              ${job.company?.name || 'Empresa não informada'}
            </div>
            <div class="job-location">
              <i class="fas fa-map-marker-alt"></i>
              ${job.location || 'Local não informado'}
            </div>
            <div class="job-actions">
              <a href="/vaga/${job._id}" class="btn-details">
                Ver Detalhes <i class="fas fa-arrow-right"></i>
              </a>
            </div>
          </div>
        `).join('');
        
        section.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Erro ao carregar vagas sugeridas:', err);
  }
}

// Render pagination
function renderPagination(total) {
  const pages = Math.ceil(total / pageSize);
  const p = document.getElementById('pagination');
  if (!p) return;
  
  p.innerHTML = '';
  
  if (pages <= 1) return;
  
  // Previous button
  if (page > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = () => { page--; loadJobs(); scrollToTop(); };
    p.appendChild(prevBtn);
  }
  
  // Page numbers (show max 5)
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  
  for (let i = start; i <= end; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.onclick = () => { page = i; loadJobs(); scrollToTop(); };
    if (i === page) btn.disabled = true;
    p.appendChild(btn);
  }
  
  // Next button
  if (page < pages) {
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => { page++; loadJobs(); scrollToTop(); };
    p.appendChild(nextBtn);
  }
}

// Scroll to top smoothly
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('searchBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      page = 1;
      loadJobs();
    });
  }
  
  // Setup auto-filters
  setupAutoFilters();
  
  // Allow search with Enter key
  const searchInput = document.getElementById('q');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        page = 1;
        loadJobs();
      }
    });
  }
  
  // Load initial jobs
  loadJobs();
});
