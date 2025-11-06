// Enhanced profile management for companies
let currentUser = null;
let isEditMode = false;

// Show message function for profile
function showProfileMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  
  if (container && messageText) {
    messageText.textContent = message;
    container.className = `message-container ${type}`;
    container.style.display = 'block';
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
    }
  }
}

// Format phone number
function formatPhone(value) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

// Format CNPJ
function formatCNPJ(value) {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Load company profile
async function loadProfile() {
  try {
    const res = await fetch('/api/users/me', { credentials: 'include' });
    const data = await res.json();
    
    if (!res.ok) {
      showProfileMessage('Erro ao carregar perfil', 'error');
      return;
    }

    currentUser = data;
    displayProfile(data);
    updateProfileCompletion(data);
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showProfileMessage('Erro de conexão ao carregar perfil', 'error');
  }
}

// Display profile data
function displayProfile(user) {
  // Update header
  document.getElementById('profileName').textContent = user.name || 'Nome não informado';
  document.getElementById('profileTitle').textContent = 'Empresa';
  
  // Update avatar
  const avatarEl = document.getElementById('profileAvatar');
  if (user.profilePhotoUrl || user.avatarUrl) {
    // Show actual photo
    avatarEl.innerHTML = `<img src="${user.profilePhotoUrl || user.avatarUrl}" alt="Logo da empresa" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  } else if (user.name) {
    // Show initials
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }

  // Update display fields
  document.getElementById('displayName').textContent = user.name || '-';
  document.getElementById('displayEmail').textContent = user.email || '-';
  document.getElementById('displayCnpj').textContent = user.cnpj ? formatCNPJ(user.cnpj) : '-';
  document.getElementById('displayPhone').textContent = user.phone || '-';
  document.getElementById('displayWebsite').textContent = user.website || '-';
  document.getElementById('displayDescription').textContent = user.description || 'Nenhuma descrição adicionada';

  // Fill edit form
  document.getElementById('editName').value = user.name || '';
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editCnpj').value = user.cnpj || '';
  document.getElementById('editPhone').value = user.phone || '';
  document.getElementById('editWebsite').value = user.website || '';
  document.getElementById('editDescription').value = user.description || '';
}

// Toggle edit mode
function toggleEditMode() {
  const viewMode = document.getElementById('viewMode');
  const editMode = document.getElementById('editMode');
  const editButton = document.getElementById('editToggle');
  const editText = document.getElementById('editText');

  isEditMode = !isEditMode;

  if (isEditMode) {
    viewMode.style.display = 'none';
    editMode.style.display = 'block';
    editText.textContent = 'Cancelar';
    editButton.className = 'btn btn-outline-secondary edit-toggle';
  } else {
    viewMode.style.display = 'block';
    editMode.style.display = 'none';
    editText.textContent = 'Editar';
    editButton.className = 'btn btn-outline edit-toggle';
    // Reset form to current data
    if (currentUser) {
      displayProfile(currentUser);
    }
  }
}

// Save profile changes
async function saveProfile(event) {
  event.preventDefault();
  
  // Use FormData to handle file upload
  const formData = new FormData();
  
  formData.append('name', document.getElementById('editName').value.trim());
  formData.append('cnpj', document.getElementById('editCnpj').value.replace(/\D/g, ''));
  formData.append('phone', document.getElementById('editPhone').value.replace(/\D/g, ''));
  formData.append('website', document.getElementById('editWebsite').value.trim());
  formData.append('description', document.getElementById('editDescription').value.trim());

  // Handle profile photo/logo
  const photoInput = document.getElementById('editPhoto');
  if (photoInput && photoInput.files[0]) {
    formData.append('profilePhoto', photoInput.files[0]);
  }

  // Validation
  const name = formData.get('name');
  if (!name) {
    showProfileMessage('Nome é obrigatório', 'error');
    return;
  }

  try {
    showProfileMessage('Salvando alterações...', 'info');
    
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });

    const result = await res.json();

    if (res.ok) {
      currentUser = result;
      displayProfile(currentUser);
      updateProfileCompletion(currentUser);
      toggleEditMode();
      showProfileMessage('Perfil atualizado com sucesso!', 'success');
    } else {
      showProfileMessage(result.error || 'Erro ao salvar perfil', 'error');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    showProfileMessage('Erro de conexão ao salvar perfil', 'error');
  }
}

// Load published jobs
async function loadJobs() {
  try {
    const res = await fetch('/api/jobs/my-jobs', { credentials: 'include' });
    const data = await res.json();
    
    const container = document.getElementById('jobs');
    
    if (!res.ok || !data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center p-xl">
          <div style="font-size: 3rem; margin-bottom: var(--spacing-md); color: var(--brand-blue);"><i class="fas fa-briefcase"></i></div>
          <h4>Nenhuma vaga publicada</h4>
          <p class="text-gray-500">Publique sua primeira vaga para encontrar candidatos</p>
          <a href="/publicar-vaga" class="btn btn-primary">Publicar Vaga</a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    document.getElementById('statsJobs').textContent = data.length;

    data.forEach(job => {
      const jobEl = document.createElement('div');
      jobEl.className = 'job-item';
      
      const statusClass = job.status === 'active' ? 'text-success' : 'text-gray-500';
      
      jobEl.innerHTML = `
        <h4><a href="/vaga-detalhes?id=${job.id}">${job.title}</a></h4>
        <div class="job-meta">
          <span class="${statusClass}">${job.status === 'active' ? 'Ativa' : 'Inativa'}</span>
          <span>Criada em ${new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="job-actions">
          <a href="/vaga-detalhes?id=${job.id}" class="btn btn-sm btn-outline">Ver Detalhes</a>
          <button onclick="toggleJobStatus('${job.id}', '${job.status}')" class="btn btn-sm btn-outline-secondary">
            ${job.status === 'active' ? 'Pausar' : 'Ativar'}
          </button>
        </div>
      `;
      
      container.appendChild(jobEl);
    });

  } catch (error) {
    console.error('Error loading jobs:', error);
    document.getElementById('jobs').innerHTML = '<p class="text-error">Erro ao carregar vagas</p>';
  }
}

// Load recent applications
async function loadRecentApplications() {
  try {
    const res = await fetch('/api/applications/company', { credentials: 'include' });
    const data = await res.json();
    
    const container = document.getElementById('recentApplications');
    
    if (!res.ok || !data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center p-lg">
          <div style="font-size: 2rem; margin-bottom: var(--spacing-sm); color: var(--brand-teal);"><i class="fas fa-users"></i></div>
          <p class="text-gray-500">Nenhuma candidatura ainda</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    document.getElementById('statsApplications').textContent = data.length;
    
    data.slice(0, 5).forEach(app => {
      const appEl = document.createElement('div');
      appEl.className = 'application-item';
      
      const statusClass = `status-${app.status.toLowerCase()}`;
      
      appEl.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h5>${app.user_name || 'Candidato'}</h5>
            <p class="text-sm text-gray-500">${app.job_title}</p>
            <p class="text-sm text-gray-500">
              ${new Date(app.applied_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <span class="application-status ${statusClass}">${app.status}</span>
        </div>
      `;
      
      container.appendChild(appEl);
    });

  } catch (error) {
    console.error('Error loading applications:', error);
    document.getElementById('recentApplications').innerHTML = '<p class="text-error">Erro ao carregar candidaturas</p>';
  }
}

// Toggle job status
async function toggleJobStatus(jobId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  try {
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showProfileMessage(`Vaga ${newStatus === 'active' ? 'ativada' : 'pausada'} com sucesso!`, 'success');
      loadJobs(); // Reload jobs list
    } else {
      const error = await res.json();
      showProfileMessage(error.error || 'Erro ao alterar status da vaga', 'error');
    }
  } catch (error) {
    console.error('Error toggling job status:', error);
    showProfileMessage('Erro de conexão', 'error');
  }
}

// Calculate and update profile completion
function updateProfileCompletion(user) {
  const fields = ['name', 'email', 'cnpj', 'phone', 'website', 'description'];
  const completedFields = fields.filter(field => {
    return user[field] && user[field].toString().trim().length > 0;
  });
  
  const completion = Math.round((completedFields.length / fields.length) * 100);
  document.getElementById('statsCompletion').textContent = `${completion}%`;
}

// Download profile as PDF (placeholder)
function downloadProfile() {
  showProfileMessage('Funcionalidade em desenvolvimento', 'info');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Load data
  loadProfile();
  loadJobs();
  loadRecentApplications();

  // Edit toggle
  document.getElementById('editToggle').addEventListener('click', toggleEditMode);
  
  // Cancel edit
  document.getElementById('cancelEdit').addEventListener('click', toggleEditMode);
  
  // Form submission
  document.getElementById('profileForm').addEventListener('submit', saveProfile);
  
  // Format inputs
  document.getElementById('editCnpj').addEventListener('input', function(e) {
    e.target.value = formatCNPJ(e.target.value);
  });
  
  document.getElementById('editPhone').addEventListener('input', function(e) {
    e.target.value = formatPhone(e.target.value);
  });
});

// Global functions for window
window.toggleEditMode = toggleEditMode;
window.downloadProfile = downloadProfile;
window.toggleJobStatus = toggleJobStatus;
