// vagas.js - Enhanced with AI-powered recommendations
let page = 1, pageSize = 10, totalJobs = 0;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let aiRecommendations = [];
let currentJobs = []; // Store currently loaded jobs

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
  
  console.log('❤️ Toggle favorite for job:', jobId);
  
  const index = favorites.indexOf(jobId);
  const isFavorited = index === -1;
  
  if (index > -1) {
    favorites.splice(index, 1);
    console.log('💔 Removed from favorites');
  } else {
    favorites.push(jobId);
    console.log('💖 Added to favorites');
  }
  
  localStorage.setItem('favorites', JSON.stringify(favorites));
  
  const btn = event.currentTarget;
  btn.classList.toggle('favorited');
  btn.querySelector('i').className = favorites.includes(jobId) ? 'fas fa-heart' : 'far fa-heart';
  
  // Track with AI (find job data from current page or recommendations)
  if (window.jobAI) {
    console.log('🤖 Tracking with AI...');
    const job = findJobById(jobId);
    if (job) {
      console.log('📊 Job data found, tracking favorite:', job.title);
      window.jobAI.trackJobFavorite(job, isFavorited);
      // Reload AI recommendations if profile strength changed significantly
      setTimeout(() => {
        console.log('🔄 Reloading AI recommendations...');
        loadAIRecommendations();
      }, 500);
    } else {
      console.warn('⚠️ Job data not found for AI tracking');
    }
  } else {
    console.warn('⚠️ AI system not initialized');
  }
}

// Helper to find job by ID
function findJobById(jobId) {
  console.log('🔍 Finding job by ID:', jobId);
  
  // Look in AI recommendations first
  const aiJob = aiRecommendations.find(j => (j._id || j.id) === jobId);
  if (aiJob) {
    console.log('✅ Found in AI recommendations');
    return aiJob;
  }
  
  // Look in currently loaded jobs
  const currentJob = currentJobs.find(j => (j._id || j.id) === jobId);
  if (currentJob) {
    console.log('✅ Found in current jobs');
    return currentJob;
  }
  
  console.warn('⚠️ Job not found in arrays, creating minimal object');
  
  // Fallback: create minimal job object
  return {
    _id: jobId,
    id: jobId,
    title: 'Vaga',
    category: 'geral'
  };
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

// Delete job (admin only)
async function deleteJob(jobId, jobTitle, event) {
  event.preventDefault();
  event.stopPropagation();
  
  // Confirm deletion
  const confirmed = window.UI && window.UI.danger 
    ? await window.UI.danger({
        title: 'Excluir Vaga',
        message: `Tem certeza que deseja excluir a vaga "${jobTitle}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar'
      })
    : confirm(`Tem certeza que deseja excluir a vaga "${jobTitle}"? Esta ação não pode ser desfeita.`);
  
  if (!confirmed) return;
  
  try {
    const token = window.Auth.getToken();
    
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      // Removido: headers
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.ok) {
      // Show success message
      if (window.UI && window.UI.toast) {
        window.UI.toast('Vaga excluída com sucesso!', 'success', 3000);
      } else {
        alert('Vaga excluída com sucesso!');
      }
      
      // Reload jobs
      loadJobs();
    } else {
      const error = await res.json();
      throw new Error(error.message || 'Erro ao excluir vaga');
    }
  } catch (err) {
    console.error('Erro ao excluir vaga:', err);
    if (window.UI && window.UI.toast) {
      window.UI.toast('Erro ao excluir vaga: ' + err.message, 'error', 5000);
    } else {
      alert('Erro ao excluir vaga: ' + err.message);
    }
  }
}

// Load jobs
async function loadJobs() {
  showSkeletonLoading();
  
  const q = encodeURIComponent(document.getElementById('q').value || '');
  const loc = encodeURIComponent(document.getElementById('location').value || '');
  const model = encodeURIComponent(document.getElementById('model').value || '');
  
  // Track search with AI
  if (window.jobAI) {
    window.jobAI.trackSearch(
      document.getElementById('q').value,
      document.getElementById('location').value,
      document.getElementById('model').value
    );
  }
  
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
    
    // Store jobs globally for AI tracking
    currentJobs = jobs;
    
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
      
      // Check if user is admin to show delete button
      checkUserIsAdmin().then(isAdmin => {
        const deleteButton = isAdmin ? `
          <button class="btn-delete" 
                  onclick="deleteJob('${job._id}', '${job.title?.replace(/'/g, "\\'")}', event)"
                  title="Excluir vaga (Admin)">
            <i class="fas fa-trash-alt"></i>
          </button>
        ` : '';
        
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
            ${deleteButton}
          </div>
        `;
        
        // Track view when user clicks on job
        el.addEventListener('click', (e) => {
          if (!e.target.closest('.btn-favorite') && !e.target.closest('.btn-share') && !e.target.closest('.btn-delete')) {
            if (window.jobAI) {
              window.jobAI.trackJobView(job);
            }
          }
        });
        
        container.appendChild(el);
      });
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

// Load AI Recommendations - DISABLED (using new backend system)
async function loadAIRecommendations() {
  console.log('⚠️ Old AI system disabled - using new backend recommendations');
  // This function is now handled by vagas-recommendations.js
  return;
}
function trackAIClick(jobId) {
  if (window.jobAI) {
    const job = aiRecommendations.find(j => j._id === jobId);
    if (job) {
      window.jobAI.trackJobView(job, 0);
    }
  }
}

// Show AI info modal
function showAIInfo() {
  const summary = window.jobAI ? window.jobAI.getProfileSummary() : null;
  
  let profileInfo = '';
  if (summary) {
    profileInfo = `
      <div style="margin-top: 20px; padding: 16px; background: rgba(102, 126, 234, 0.1); border-radius: 8px;">
        <h4 style="margin-top: 0; color: #667eea;">Seu Perfil Atual:</h4>
        <p><strong>Palavras-chave preferidas:</strong> ${summary.keywords.join(', ') || 'Nenhuma ainda'}</p>
        <p><strong>Localizações de interesse:</strong> ${summary.locations.join(', ') || 'Nenhuma ainda'}</p>
        <p><strong>Modalidades preferidas:</strong> ${summary.workModels.join(', ') || 'Nenhuma ainda'}</p>
        <p><strong>Interações totais:</strong> ${summary.totalInteractions}</p>
        <p><strong>Força do perfil:</strong> ${summary.profileStrength}%</p>
      </div>
    `;
  }
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 600px; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #667eea;">
          <i class="fas fa-brain"></i> Como funciona a IA?
        </h2>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
      </div>
      
      <p style="color: #444; line-height: 1.7;">
        Nossa <strong>Inteligência Artificial</strong> aprende continuamente com suas interações na plataforma para oferecer recomendações personalizadas de vagas.
      </p>
      
      <h3 style="color: #667eea; margin-top: 24px;">O que a IA analisa:</h3>
      <ul style="color: #444; line-height: 1.8;">
        <li><strong>Vagas favoritadas:</strong> Identifica seus interesses principais</li>
        <li><strong>Buscas realizadas:</strong> Aprende palavras-chave relevantes</li>
        <li><strong>Filtros utilizados:</strong> Entende suas preferências de localização e modalidade</li>
        <li><strong>Tempo de visualização:</strong> Mede seu engajamento com cada vaga</li>
        <li><strong>Candidaturas:</strong> Reforça padrões de vagas que você se candidata</li>
      </ul>
      
      <h3 style="color: #667eea; margin-top: 24px;">Como melhorar suas recomendações:</h3>
      <ul style="color: #444; line-height: 1.8;">
        <li>Favorite vagas que você gostou (mesmo que não se candidate agora)</li>
        <li>Use os filtros de busca com suas preferências reais</li>
        <li>Explore diferentes tipos de vagas para a IA conhecer seu perfil</li>
        <li>Quanto mais você usar a plataforma, melhores serão as recomendações!</li>
      </ul>
      
      ${profileInfo}
      
      <div style="margin-top: 24px; text-align: center;">
        <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-primary">
          Entendi!
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
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
  
  // Setup AI info button
  const aiInfoBtn = document.getElementById('aiInfoBtn');
  if (aiInfoBtn) {
    aiInfoBtn.addEventListener('click', showAIInfo);
  }
  
  // Load AI recommendations first
  if (window.jobAI) {
    loadAIRecommendations();
  }
  
  // Load initial jobs
  loadJobs();
});

// Check if user is logged in
function checkUserLogin() {
  // 1. Check using Auth.isAuthenticated() from auth.js
  if (window.Auth && typeof window.Auth.isAuthenticated === 'function') {
    const isAuth = window.Auth.isAuthenticated();
    console.log('Auth.isAuthenticated():', isAuth);
    if (isAuth) return true;
  }
  
  // 2. Check localStorage for token (aprendizplus_token)
  const token = localStorage.getItem('aprendizplus_token');
  if (token && token.length > 0) {
    console.log('Token found:', token.substring(0, 20) + '...');
    return true;
  }
  
  // 3. Check for user data
  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user && user.id) {
        console.log('User data found:', user.email || user.name);
        return true;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  
  // 4. Check session storage
  const sessionUser = sessionStorage.getItem('user');
  if (sessionUser) {
    try {
      const user = JSON.parse(sessionUser);
      if (user && user.id) {
        console.log('Session user found');
        return true;
      }
    } catch (e) {
      // Invalid JSON
    }
  }
  
  console.log('User not logged in');
  return false;
}

// Check if current user is admin
async function checkUserIsAdmin() {
  try {
    const user = await window.Auth.getCurrentUser();
    return user && (user.type === 'admin' || user.type === 'owner');
  } catch (e) {
    console.error('Error checking admin status:', e);
    return false;
  }
}
