// vagas.js - Enhanced with AI-powered recommendations
let page = 1, pageSize = 10, totalJobs = 0;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let aiRecommendations = [];
let currentJobs = []; // Store currently loaded jobs

// Simple HTML escape to prevent injection in templates
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Lightweight API request helper that prefers a global `apiFetch` (adds auth/credentials)
async function apiReq(path, options = {}) {
  if (window.apiFetch && typeof window.apiFetch === 'function') {
    // apiFetch prepends the API base (`/api`) itself. If caller already passed a path
    // that starts with `/api/`, strip the leading `/api` to avoid `/api/api/...`.
    let pathForApi = path;
    if (typeof path === 'string' && path.startsWith('/api/')) {
      pathForApi = path.slice(4); // remove leading '/api'
    }
    const data = await window.apiFetch(pathForApi, options);
    return {
      ok: true,
      status: 200,
      json: async () => data,
      text: async () => (typeof data === 'string' ? data : JSON.stringify(data))
    };
  }

  const opts = Object.assign({}, options);
  opts.credentials = opts.credentials || 'include';
  opts.headers = Object.assign({}, opts.headers || {});

  if (!opts.headers.Authorization && window.Auth && typeof window.Auth.getToken === 'function') {
    const t = window.Auth.getToken();
    if (t) opts.headers.Authorization = 'Bearer ' + t;
  }

  return fetch(path, opts);
}

// Populate location select with values from existing jobs (lightweight)
async function populateLocations() {
  try {
    const res = await apiReq('/api/jobs?limit=200');
    if (!res.ok) return;
    const data = await res.json();
    const jobs = data.items || data || [];
    const set = new Set();
    jobs.forEach(j => {
      if (j.location) set.add(j.location);
      if (j.company && j.company.companyProfile && j.company.companyProfile.city) set.add(j.company.companyProfile.city);
    });

    const select = document.getElementById('location');
    if (!select) return;

    // keep the default option
    const current = select.value || '';
    // remove existing options except first
    while (select.options.length > 1) select.remove(1);

    Array.from(set).sort().forEach(loc => {
      if (!loc) return;
      const opt = document.createElement('option');
      opt.value = loc;
      opt.textContent = loc;
      select.appendChild(opt);
    });

    // restore value if present
    if (current) select.value = current;
  } catch (err) {
    console.warn('populateLocations error', err);
  }
}

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
  const btn = event.currentTarget;

  // If FavoriteSystem is available (features.js) and user likely authenticated, use server
  const useServer = window.FavoriteSystem && (localStorage.getItem('token') || (window.Auth && window.Auth.isAuthenticated && window.Auth.isAuthenticated()));

  if (useServer) {
    // Optimistic UI: toggle visually, then call server
    const currentlyFavorited = favorites.includes(jobId);
    // update local state immediately
    if (currentlyFavorited) {
      favorites = favorites.filter(id => id !== jobId);
    } else {
      favorites.push(jobId);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    if (btn) {
      btn.classList.toggle('favorited', !currentlyFavorited);
      const icon = btn.querySelector('i');
      if (icon) icon.className = !currentlyFavorited ? 'fas fa-heart' : 'far fa-heart';
    }

    // Call server toggle
    window.FavoriteSystem.toggle(jobId, 'job').then(result => {
      if (result && typeof result.favorited !== 'undefined') {
        // sync local favorites array with server decision
        if (result.favorited) {
          if (!favorites.includes(jobId)) favorites.push(jobId);
        } else {
          favorites = favorites.filter(id => id !== jobId);
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
        if (btn) {
          btn.classList.toggle('favorited', result.favorited);
          const icon = btn.querySelector('i');
          if (icon) icon.className = result.favorited ? 'fas fa-heart' : 'far fa-heart';
        }
        // Track with AI if available
        if (window.jobAI) {
          const job = findJobById(jobId);
          if (job) {
            try { window.jobAI.trackJobFavorite(job, result.favorited); } catch (e) { console.warn('AI track error', e); }
            setTimeout(() => loadAIRecommendations(), 500);
          }
        }
      }
    }).catch(err => {
      console.error('Erro ao atualizar favorito no servidor:', err);
      // revert optimistic UI on error
      const nowFavorited = favorites.includes(jobId);
      if (nowFavorited) {
        favorites = favorites.filter(id => id !== jobId);
      } else {
        favorites.push(jobId);
      }
      localStorage.setItem('favorites', JSON.stringify(favorites));
      if (btn) {
        btn.classList.toggle('favorited', favorites.includes(jobId));
        const icon = btn.querySelector('i');
        if (icon) icon.className = favorites.includes(jobId) ? 'fas fa-heart' : 'far fa-heart';
      }
      if (window.UI && window.UI.toast) window.UI.toast('Erro ao atualizar favorito', 'error');
    });

    // AI tracking will happen after server confirms in the promise resolution
    return;
  }

  // Fallback: localStorage-only toggle
  const index = favorites.indexOf(jobId);
  const isFavorited = index === -1;
  if (index > -1) {
    favorites.splice(index, 1);
    console.log('💔 Removed from favorites (local)');
  } else {
    favorites.push(jobId);
    console.log('💖 Added to favorites (local)');
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  if (btn) {
    btn.classList.toggle('favorited', favorites.includes(jobId));
    const icon = btn.querySelector('i');
    if (icon) icon.className = favorites.includes(jobId) ? 'fas fa-heart' : 'far fa-heart';
  }

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
      headers: {
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
    const res = await apiReq(`/api/jobs?search=${q}&location=${loc}&model=${model}&page=${page}&limit=${pageSize}`);
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

    // Filter out inactive jobs on the client as a safety net
    const activeStatuses = ['aberta', 'active'];
    const visibleJobs = jobs.filter(j => {
      const s = (j.status || '').toString().toLowerCase();
      return activeStatuses.includes(s);
    });

    // Store visible jobs globally for AI tracking
    currentJobs = visibleJobs;
    
    // Update results count
    updateResultsCount(totalJobs);
    
    if (visibleJobs.length === 0) {
      showEmptyState(
        'Nenhuma vaga encontrada',
        'Tente ajustar seus filtros ou cadastre-se para receber novas oportunidades por email.',
        'fa-search'
      );
      return;
    }
    
    visibleJobs.forEach(job => {
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
    if (visibleJobs.length > 0 && visibleJobs.length < 6) {
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
    const res = await apiReq('/api/jobs?limit=3&random=true');
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
  try {
    const container = document.getElementById('recommendationsList');
    const loading = document.getElementById('recommendationsLoading');

    if (loading) loading.textContent = 'Carregando recomendações...';

    // Get current user if available
    let user = null;
    try {
      if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
        user = await window.Auth.getCurrentUser();
      } else if (localStorage.getItem('user')) {
        user = JSON.parse(localStorage.getItem('user'));
      }
    } catch (e) {
      console.warn('Não foi possível obter usuário corrente para recomendações', e);
    }

    // Fetch a reasonable sample of jobs to score (server-side already filters active)
    const res = await apiReq('/api/jobs?limit=80');
    if (!res || !res.ok) {
      if (loading) loading.textContent = 'Não foi possível carregar recomendações.';
      return;
    }

    const data = await res.json();
    const jobs = data.items || [];

    // Improved heuristic scoring function
    function normalize(v, min, max) {
      if (typeof v !== 'number' || isNaN(v)) return 0;
      if (v <= min) return 0;
      if (v >= max) return 1;
      return (v - min) / (max - min);
    }

    function tokenize(text) {
      if (!text) return [];
      return text.toString().toLowerCase().split(/[^a-z0-9áàâãéèêíïóôõöúçñ]+/i).filter(Boolean);
    }

    function countOverlap(aTokens, bTokens) {
      const setB = new Set(bTokens);
      let c = 0;
      aTokens.forEach(t => { if (setB.has(t)) c++; });
      return c;
    }

    function scoreJob(job, user, contextKeywords = []) {
      // components: recency(0-20), location(0-20), skillMatch(0-30), titleMatch(0-15), model(0-8), salary(0-3), favorite(0-10)
      let recency = 0, location = 0, skillMatch = 0, titleMatch = 0, model = 0, salary = 0, fav = 0;

      // Recency (days)
      if (job.createdAt) {
        const days = (Date.now() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24);
        // map: <=1d -> 1 ; <=7d -> 0.7 ; <=30d -> 0.3 ; >60d -> 0
        if (days <= 1) recency = 1;
        else if (days <= 7) recency = 0.7;
        else if (days <= 30) recency = 0.3;
        else recency = 0;
      }

      // Location preference (exact city or company city)
      try {
        const userLoc = (user && (user.location || user.city || user.address)) ? user.location || user.city || user.address : null;
        if (userLoc && job.location) {
          if (job.location.toString().toLowerCase().includes(userLoc.toString().toLowerCase())) location = 1;
        }
        if (!location && userLoc && job.company && job.company.companyProfile && job.company.companyProfile.city) {
          if (job.company.companyProfile.city.toString().toLowerCase().includes(userLoc.toString().toLowerCase())) location = 0.8;
        }
      } catch (e) { /* ignore */ }

      // Work model
      try {
        const jobModel = (job.workModel || job.model || '').toString().toLowerCase();
        const preferredModel = (user && (user.preferredWorkModel || user.workModel || user.model)) ? (user.preferredWorkModel || user.workModel || user.model) : null;
        if (preferredModel && jobModel && jobModel === preferredModel.toString().toLowerCase()) model = 1;
      } catch (e) {}

      // Skills matching: compare user.skills to job title+description
      const text = ((job.title || '') + ' ' + (job.description || '')).toLowerCase();
      const textTokens = tokenize(text);
      if (user && Array.isArray(user.skills) && user.skills.length > 0) {
        const userSkills = user.skills.map(s => s.toString().toLowerCase());
        const overlap = countOverlap(userSkills, textTokens);
        skillMatch = normalize(overlap, 0, Math.min(8, userSkills.length)); // cap
      }

      // Title & context keywords (search query, desiredRole, recent searches)
      const titleTokens = tokenize(job.title || '');
      let contextTokens = [];
      if (user && user.desiredRole) contextTokens = contextTokens.concat(tokenize(user.desiredRole));
      // current search input
      try { const qv = document.getElementById('q')?.value; if (qv) contextTokens = contextTokens.concat(tokenize(qv)); } catch(e){}
      // include passed context keywords
      contextTokens = contextTokens.concat(contextKeywords.map(k => tokenize(k)).flat());
      const titleOverlap = countOverlap(contextTokens, titleTokens);
      titleMatch = normalize(titleOverlap, 0, 3);

      // Salary small boost
      if (job.salary) salary = 1;

      // Favorites boost
      if (favorites && favorites.includes(job._id || job.id)) fav = 1;

      // Combine with weights
      const weights = {
        recency: 0.18,
        location: 0.18,
        skillMatch: 0.30,
        titleMatch: 0.12,
        model: 0.08,
        salary: 0.04,
        fav: 0.10
      };

      const score = (recency * weights.recency) +
                    (location * weights.location) +
                    (skillMatch * weights.skillMatch) +
                    (titleMatch * weights.titleMatch) +
                    (model * weights.model) +
                    (salary * weights.salary) +
                    (fav * weights.fav);

      // Multiply to make scores more readable (0-100)
      return Math.round(score * 100);
    }

    // Build scored list
    const scored = jobs.map(j => ({ job: j, score: scoreJob(j, user) }));
    scored.sort((a, b) => b.score - a.score);

    // Keep top 8 with positive score
    const top = scored.filter(s => s.score > -50).slice(0, 8).map(s => s.job);
    aiRecommendations = top;

    // Render recommendations horizontally
    if (!container) return;
    if (!top || top.length === 0) {
      container.innerHTML = '<div style="color:#666">Nenhuma recomendação no momento.</div>';
      return;
    }

    container.innerHTML = top.map(job => {
      const jid = job._id || job.id || '';
      const title = job.title || 'Vaga';
      const company = job.company?.name || 'Empresa não informada';
      const loc = job.location || '';
      return `
        <div class="rec-card" style="min-width:260px;flex:0 0 auto;border:1px solid #ececec;border-radius:10px;padding:12px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
          <div style="font-size:14px;color:#444;font-weight:600;margin-bottom:6px">${escapeHtml(title)}</div>
          <div style="font-size:13px;color:#666;margin-bottom:8px">${escapeHtml(company)} · ${escapeHtml(loc)}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <a class="btn btn-sm btn-outline" href="/vaga/${jid}">Ver vaga</a>
            <button class="btn btn-sm" onclick="toggleFavorite('${jid}', event)" title="Favoritar">
              <i class="${favorites.includes(jid) ? 'fas' : 'far'} fa-heart"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // remove loading indicator if present
    if (loading) loading.remove();
  } catch (err) {
    console.error('Erro ao carregar recomendações IA:', err);
    const container = document.getElementById('recommendationsList');
    if (container) container.innerHTML = '<div style="color:#666">Erro ao carregar recomendações.</div>';
  }
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
  
  // Load AI recommendations (heuristic) first
  loadAIRecommendations();
  
  // Populate locations and load initial jobs
  populateLocations().finally(() => loadJobs());
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
