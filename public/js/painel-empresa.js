// Painel Empresa - Gestão de Vagas e Candidaturas
console.log('painel-empresa.js loaded!');

let allJobs = [];
let currentFilter = 'all';
let currentJobId = null;
let currentApplicationId = null;

// Show message function
function showMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  
  if (container && messageText) {
    messageText.textContent = message;
    container.className = `message-container ${type}`;
    container.style.display = 'flex';
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
    }
    
    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Load all jobs
async function loadJobs() {
  try {
    console.log('Loading jobs...');
    const res = await fetch('/api/jobs/my-jobs', { credentials: 'include' });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Jobs loaded:', data);
    
    allJobs = data || [];
    updateStats();
    displayJobs();
    
  } catch (error) {
    console.error('Error loading jobs:', error);
    const container = document.getElementById('jobsList');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <h3>Erro ao carregar vagas</h3>
          <p>Não foi possível carregar suas vagas. Tente novamente.</p>
          <button onclick="loadJobs()" class="btn btn-primary">
            <i class="fas fa-redo"></i> Tentar Novamente
          </button>
        </div>
      `;
    }
  }
}

// Update statistics
function updateStats() {
  const activeJobs = allJobs.filter(job => job.status === 'active').length;
  const inactiveJobs = allJobs.filter(job => job.status === 'inactive').length;
  
  let totalApplications = 0;
  let pendingApplications = 0;
  let acceptedApplications = 0;
  
  allJobs.forEach(job => {
    const count = job.applicants_count || 0;
    totalApplications += count;
    
    // Count by status if available
    if (job.applications) {
      pendingApplications += job.applications.filter(app => app.status === 'pending').length;
      acceptedApplications += job.applications.filter(app => app.status === 'accepted').length;
    }
  });
  
  // Update stat cards
  document.getElementById('statsActiveJobs').textContent = activeJobs;
  document.getElementById('statsTotalApplications').textContent = totalApplications;
  document.getElementById('statsPending').textContent = pendingApplications || '-';
  document.getElementById('statsAccepted').textContent = acceptedApplications || '-';
  
  // Update filter badges
  document.getElementById('badgeAll').textContent = allJobs.length;
  document.getElementById('badgeActive').textContent = activeJobs;
  document.getElementById('badgeInactive').textContent = inactiveJobs;
}

// Display jobs
function displayJobs() {
  const container = document.getElementById('jobsList');
  
  let filteredJobs = allJobs;
  
  if (currentFilter === 'active') {
    filteredJobs = allJobs.filter(job => job.status === 'active');
  } else if (currentFilter === 'inactive') {
    filteredJobs = allJobs.filter(job => job.status === 'inactive');
  }
  
  if (filteredJobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-briefcase"></i>
        <h3>Nenhuma vaga encontrada</h3>
        <p>${currentFilter === 'all' ? 'Você ainda não publicou nenhuma vaga.' : `Não há vagas ${currentFilter === 'active' ? 'ativas' : 'inativas'}.`}</p>
        <a href="/publicar-vaga" class="btn btn-primary">
          <i class="fas fa-plus-circle"></i> Publicar Primeira Vaga
        </a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredJobs.map(job => createJobCard(job)).join('');
}

// Create job card HTML
function createJobCard(job) {
  const statusClass = job.status === 'active' ? 'active' : 'inactive';
  const statusText = job.status === 'active' ? 'Ativa' : 'Inativa';
  const applicantsCount = job.applicants_count || 0;
  
  // Calculate stats if applications data is available
  let pendingCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  
  if (job.applications && Array.isArray(job.applications)) {
    pendingCount = job.applications.filter(app => app.status === 'pending').length;
    acceptedCount = job.applications.filter(app => app.status === 'accepted').length;
    rejectedCount = job.applications.filter(app => app.status === 'rejected').length;
  }
  
  // Check deadline and limits
  let deadlineWarning = '';
  let limitWarning = '';
  
  if (job.applicationDeadline) {
    const deadline = new Date(job.applicationDeadline);
    const now = new Date();
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      deadlineWarning = '<div class="job-warning expired"><i class="fas fa-exclamation-circle"></i> Prazo de candidatura encerrado</div>';
    } else if (daysRemaining <= 3) {
      deadlineWarning = `<div class="job-warning urgent"><i class="fas fa-clock"></i> ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''} para candidaturas</div>`;
    }
  }
  
  if (job.maxApplicants) {
    const remaining = job.maxApplicants - applicantsCount;
    if (remaining <= 0) {
      limitWarning = '<div class="job-warning expired"><i class="fas fa-users"></i> Limite de candidatos atingido</div>';
    } else if (remaining <= 5) {
      limitWarning = `<div class="job-warning urgent"><i class="fas fa-users"></i> Apenas ${remaining} vaga${remaining !== 1 ? 's' : ''} disponível${remaining !== 1 ? 'is' : ''}</div>`;
    }
  }
  
  return `
    <div class="job-item ${statusClass}">
      <div class="job-header">
        <div class="job-title-section">
          <h3 class="job-title">${job.title}</h3>
          <div class="job-meta">
            <span class="job-meta-item">
              <i class="fas fa-map-marker-alt"></i>
              ${job.location || 'Local não informado'}
            </span>
            <span class="job-meta-item">
              <i class="fas fa-calendar"></i>
              Publicada em ${new Date(job.createdAt || job.created_at).toLocaleDateString('pt-BR')}
            </span>
            <span class="job-meta-item">
              <i class="fas fa-users"></i>
              ${applicantsCount} candidatura${applicantsCount !== 1 ? 's' : ''}${job.maxApplicants ? ` / ${job.maxApplicants}` : ''}
            </span>
            ${job.applicationDeadline ? `
              <span class="job-meta-item">
                <i class="fas fa-calendar-times"></i>
                Prazo: ${new Date(job.applicationDeadline).toLocaleDateString('pt-BR')}
              </span>
            ` : ''}
          </div>
        </div>
        <span class="job-status ${statusClass}">
          <i class="fas fa-circle"></i>
          ${statusText}
        </span>
      </div>
      
      ${deadlineWarning}
      ${limitWarning}
      
      ${applicantsCount > 0 ? `
        <div class="job-stats">
          <div class="job-stat pending">
            <i class="fas fa-clock"></i>
            <div>
              <div class="job-stat-value">${pendingCount}</div>
              <div class="job-stat-label">Pendentes</div>
            </div>
          </div>
          <div class="job-stat accepted">
            <i class="fas fa-check-circle"></i>
            <div>
              <div class="job-stat-value">${acceptedCount}</div>
              <div class="job-stat-label">Aceitas</div>
            </div>
          </div>
          <div class="job-stat rejected">
            <i class="fas fa-times-circle"></i>
            <div>
              <div class="job-stat-value">${rejectedCount}</div>
              <div class="job-stat-label">Recusadas</div>
            </div>
          </div>
        </div>
      ` : ''}
      
      <div class="job-actions">
        <button onclick="viewApplications('${job._id || job.id}')" class="btn btn-primary btn-sm">
          <i class="fas fa-users"></i>
          Ver Candidaturas (${applicantsCount})
        </button>
        <a href="/vaga-detalhes?id=${job._id || job.id}" class="btn btn-outline btn-sm" target="_blank">
          <i class="fas fa-eye"></i>
          Ver Vaga
        </a>
        <button onclick="toggleJobStatus('${job._id || job.id}', '${job.status}')" class="btn btn-secondary btn-sm">
          <i class="fas fa-${job.status === 'active' ? 'pause' : 'play'}"></i>
          ${job.status === 'active' ? 'Pausar' : 'Ativar'}
        </button>
        <button onclick="confirmDeleteJob('${job._id || job.id}', '${job.title.replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm">
          <i class="fas fa-trash"></i>
          Excluir
        </button>
      </div>
    </div>
  `;
}

// View applications for a job
async function viewApplications(jobId) {
  currentJobId = jobId;
  
  // Find job details
  const job = allJobs.find(j => (j._id || j.id) === jobId);
  
  // Open modal
  const modal = document.getElementById('applicationsModal');
  const modalTitle = document.getElementById('modalJobTitle');
  const content = document.getElementById('applicationsContent');
  
  if (modalTitle && job) {
    modalTitle.textContent = `Candidaturas - ${job.title}`;
  }
  
  modal.classList.add('active');
  
  // Show loading
  content.innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Carregando candidaturas...</p>
    </div>
  `;
  
  try {
    const res = await fetch(`/api/jobs/${jobId}/applications`, { 
      credentials: 'include' 
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const applications = await res.json();
    console.log('Applications loaded:', applications);
    
    displayApplications(applications);
    
  } catch (error) {
    console.error('Error loading applications:', error);
    content.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Erro ao carregar candidaturas</h3>
        <p>Não foi possível carregar as candidaturas. Tente novamente.</p>
        <button onclick="viewApplications('${jobId}')" class="btn btn-primary">
          <i class="fas fa-redo"></i> Tentar Novamente
        </button>
      </div>
    `;
  }
}

// Display applications
function displayApplications(applications) {
  const content = document.getElementById('applicationsContent');
  
  if (!applications || applications.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>Nenhuma candidatura</h3>
        <p>Esta vaga ainda não recebeu candidaturas.</p>
      </div>
    `;
    return;
  }
  
  content.innerHTML = applications.map(app => createApplicationCard(app)).join('');
}

// Create application card HTML
function createApplicationCard(app) {
  const statusClass = app.status.toLowerCase();
  const statusMap = {
    'pending': 'Pendente',
    'reviewing': 'Em Análise',
    'accepted': 'Aceita',
    'rejected': 'Recusada'
  };
  const statusText = statusMap[app.status.toLowerCase()] || app.status;
  
  const appliedDate = new Date(app.appliedAt || app.applied_at || app.createdAt);
  const formattedDate = appliedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  return `
    <div class="application-item">
      <div class="application-header">
        <div class="candidate-info">
          <h3 class="candidate-name">
            <i class="fas fa-user-circle"></i>
            ${app.user_name || app.candidate_name || 'Candidato'}
          </h3>
          <div class="candidate-meta">
            <span class="candidate-meta-item">
              <i class="fas fa-envelope"></i>
              ${app.user_email || app.candidate_email || 'Email não disponível'}
            </span>
            <span class="candidate-meta-item">
              <i class="fas fa-calendar"></i>
              Candidatura em ${formattedDate}
            </span>
          </div>
        </div>
        <span class="application-status ${statusClass}">
          ${statusText}
        </span>
      </div>
      
      ${app.message ? `
        <div class="application-message">
          <h4><i class="fas fa-comment"></i> Mensagem do candidato:</h4>
          <p>${app.message}</p>
        </div>
      ` : ''}
      
      <div class="application-actions">
        ${app.resume_url || app.resumeUrl ? `
          <button onclick="viewResume('${app.resume_url || app.resumeUrl}')" class="btn btn-primary btn-sm">
            <i class="fas fa-file-pdf"></i>
            Ver Currículo
          </button>
        ` : `
          <button class="btn btn-secondary btn-sm" disabled>
            <i class="fas fa-file-pdf"></i>
            Sem Currículo
          </button>
        `}
        
        ${app.status !== 'accepted' ? `
          <button onclick="confirmUpdateApplicationStatus('${app._id || app.id}', 'accepted')" class="btn btn-success btn-sm">
            <i class="fas fa-check"></i>
            Aceitar
          </button>
        ` : ''}
        
        ${app.status !== 'rejected' ? `
          <button onclick="confirmUpdateApplicationStatus('${app._id || app.id}', 'rejected')" class="btn btn-danger btn-sm">
            <i class="fas fa-times"></i>
            Recusar
          </button>
        ` : ''}
        
        ${app.status !== 'pending' ? `
          <button onclick="confirmUpdateApplicationStatus('${app._id || app.id}', 'pending')" class="btn btn-secondary btn-sm">
            <i class="fas fa-undo"></i>
            Marcar como Pendente
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// View resume
function viewResume(resumeUrl) {
  if (!resumeUrl) {
    showMessage('Currículo não disponível', 'error');
    return;
  }
  
  console.log('Opening resume:', resumeUrl);
  
  // Open resume in new tab
  const newWindow = window.open(resumeUrl, '_blank', 'noopener,noreferrer');
  
  if (!newWindow) {
    showMessage('Por favor, permita pop-ups para visualizar o currículo', 'warning');
    // Fallback: try to download
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = resumeUrl;
      link.download = 'curriculo.pdf';
      link.click();
    }, 500);
  }
}

// Confirm update application status
function confirmUpdateApplicationStatus(applicationId, newStatus) {
  currentApplicationId = applicationId;
  
  const statusMap = {
    'accepted': { title: 'Aceitar Candidatura', message: 'Deseja aceitar esta candidatura?', btn: 'Aceitar', class: 'btn-success' },
    'rejected': { title: 'Recusar Candidatura', message: 'Deseja recusar esta candidatura?', btn: 'Recusar', class: 'btn-danger' },
    'pending': { title: 'Marcar como Pendente', message: 'Deseja marcar esta candidatura como pendente?', btn: 'Confirmar', class: 'btn-secondary' }
  };
  
  const config = statusMap[newStatus];
  
  const modal = document.getElementById('confirmModal');
  const title = document.getElementById('confirmTitle');
  const message = document.getElementById('confirmMessage');
  const confirmBtn = document.getElementById('confirmButton');
  
  title.textContent = config.title;
  message.textContent = config.message;
  confirmBtn.textContent = config.btn;
  confirmBtn.className = `btn ${config.class}`;
  
  // Remove old event listeners by cloning
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  
  // Add new event listener
  document.getElementById('confirmButton').addEventListener('click', () => {
    updateApplicationStatus(applicationId, newStatus);
    closeConfirmModal();
  });
  
  modal.classList.add('active');
}

// Update application status
async function updateApplicationStatus(applicationId, newStatus) {
  try {
    showMessage('Atualizando candidatura...', 'info');
    
    const res = await fetch(`/api/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });
    
    const result = await res.json();
    
    if (res.ok) {
      showMessage('Candidatura atualizada com sucesso!', 'success');
      // Reload applications for current job
      if (currentJobId) {
        await viewApplications(currentJobId);
      }
      // Reload jobs to update counts
      await loadJobs();
    } else {
      showMessage(result.error || 'Erro ao atualizar candidatura', 'error');
    }
  } catch (error) {
    console.error('Error updating application:', error);
    showMessage('Erro de conexão ao atualizar candidatura', 'error');
  }
}

// Toggle job status
async function toggleJobStatus(jobId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  try {
    showMessage('Atualizando status da vaga...', 'info');
    
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });
    
    if (res.ok) {
      showMessage(`Vaga ${newStatus === 'active' ? 'ativada' : 'pausada'} com sucesso!`, 'success');
      await loadJobs();
    } else {
      const error = await res.json();
      showMessage(error.error || 'Erro ao alterar status da vaga', 'error');
    }
  } catch (error) {
    console.error('Error toggling job status:', error);
    showMessage('Erro de conexão', 'error');
  }
}

// Confirm delete job
function confirmDeleteJob(jobId, jobTitle) {
  const modal = document.getElementById('confirmModal');
  const title = document.getElementById('confirmTitle');
  const message = document.getElementById('confirmMessage');
  const confirmBtn = document.getElementById('confirmButton');
  
  title.textContent = 'Excluir Vaga';
  message.textContent = `Tem certeza que deseja excluir a vaga "${jobTitle}"? Esta ação não pode ser desfeita e todas as candidaturas serão perdidas.`;
  confirmBtn.textContent = 'Excluir';
  confirmBtn.className = 'btn btn-danger';
  
  // Remove old event listeners by cloning
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  
  // Add new event listener
  document.getElementById('confirmButton').addEventListener('click', () => {
    deleteJob(jobId);
    closeConfirmModal();
  });
  
  modal.classList.add('active');
}

// Delete job
async function deleteJob(jobId) {
  try {
    showMessage('Excluindo vaga...', 'info');
    
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (res.ok) {
      showMessage('Vaga excluída com sucesso!', 'success');
      await loadJobs();
    } else {
      const error = await res.json();
      showMessage(error.error || 'Erro ao excluir vaga', 'error');
    }
  } catch (error) {
    console.error('Error deleting job:', error);
    showMessage('Erro de conexão ao excluir vaga', 'error');
  }
}

// Close applications modal
function closeApplicationsModal() {
  const modal = document.getElementById('applicationsModal');
  modal.classList.remove('active');
  currentJobId = null;
}

// Close confirm modal
function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  modal.classList.remove('active');
  currentApplicationId = null;
}

// Filter jobs
function filterJobs(filter) {
  currentFilter = filter;
  
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.closest('.filter-tab').classList.add('active');
  
  displayJobs();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('Painel empresa loaded');
  
  // Load jobs
  loadJobs();
  
  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const filter = this.getAttribute('data-filter');
      filterJobs(filter);
    });
  });
  
  // Close modals on background click
  document.getElementById('applicationsModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeApplicationsModal();
    }
  });
  
  document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeConfirmModal();
    }
  });
  
  // Close modals on ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeApplicationsModal();
      closeConfirmModal();
    }
  });
});

// Global functions
window.viewApplications = viewApplications;
window.viewResume = viewResume;
window.confirmUpdateApplicationStatus = confirmUpdateApplicationStatus;
window.toggleJobStatus = toggleJobStatus;
window.confirmDeleteJob = confirmDeleteJob;
window.deleteJob = deleteJob;
window.closeApplicationsModal = closeApplicationsModal;
window.closeConfirmModal = closeConfirmModal;
window.filterJobs = filterJobs;
