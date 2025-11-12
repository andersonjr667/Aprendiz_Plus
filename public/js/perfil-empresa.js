// Enhanced profile management for companies
console.log('perfil-empresa.js loaded!');

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
    console.log('Loading profile...');
    const res = await fetch('/api/users/me', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Profile response status:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Profile load error:', errorData);
      showProfileMessage('Erro ao carregar perfil: ' + (errorData.error || 'Não autorizado'), 'error');
      
      if (res.status === 401) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      return;
    }
    
    const data = await res.json();
    console.log('Profile data loaded:', data);

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
  console.log('Displaying profile for user:', user);
  
  // Update header name
  const profileName = document.getElementById('profileName');
  if (profileName) {
    profileName.textContent = user.name || 'Nome não informado';
  }
  
  // Update header email
  const profileEmail = document.getElementById('profileEmail');
  if (profileEmail) {
    profileEmail.textContent = user.email || '';
  }
  
  // Update avatar in header
  const avatarEl = document.getElementById('profileAvatar');
  console.log('Avatar element found:', !!avatarEl);
  console.log('User data:', { profilePhotoUrl: user.profilePhotoUrl, avatarUrl: user.avatarUrl });
  
  if (avatarEl) {
    if (user.profilePhotoUrl || user.avatarUrl) {
      // Show actual photo
      let photoUrl = user.profilePhotoUrl || user.avatarUrl;
      
      // Add cache busting only for local URLs
      if (photoUrl && photoUrl.startsWith('/uploads')) {
        photoUrl += '?t=' + Date.now();
      }
      
      console.log('Displaying company logo:', photoUrl);
      
      // Clear previous content and add image
      avatarEl.innerHTML = '';
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = 'Logo da empresa';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      
      img.onerror = function() {
        console.error('Failed to load image:', this.src);
        avatarEl.innerHTML = `<i class="fas fa-building" style="font-size: 4rem; color: #2ECC71;"></i>`;
      };
      img.onload = function() {
        console.log('Image loaded successfully:', photoUrl);
      };
      avatarEl.appendChild(img);
    } else {
      // Show icon or initials
      console.log('No profile photo, showing icon/initials');
      if (user.name) {
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.innerHTML = initials;
        avatarEl.style.fontSize = '4rem';
        avatarEl.style.color = 'white';
      } else {
        avatarEl.innerHTML = `<i class="fas fa-building" style="font-size: 4rem; color: white; pointer-events: none;"></i>`;
      }
    }
  }

  // Update display fields
  const displayName = document.getElementById('displayName');
  if (displayName) displayName.textContent = user.name || '-';
  
  const displayEmail = document.getElementById('displayEmail');
  if (displayEmail) displayEmail.textContent = user.email || '-';
  
  const displayCnpj = document.getElementById('displayCnpj');
  if (displayCnpj) displayCnpj.textContent = user.cnpj ? formatCNPJ(user.cnpj) : 'Não informado';
  
  const displayPhone = document.getElementById('displayPhone');
  if (displayPhone) displayPhone.textContent = user.phone || 'Não informado';
  
  const displayWebsite = document.getElementById('displayWebsite');
  if (displayWebsite) {
    if (user.website) {
      displayWebsite.innerHTML = `<a href="${user.website}" target="_blank" rel="noopener">${user.website}</a>`;
    } else {
      displayWebsite.textContent = 'Não informado';
    }
  }
  
  const displayDescription = document.getElementById('displayDescription');
  if (displayDescription) displayDescription.textContent = user.description || 'Nenhuma descrição adicionada. Clique em "Editar" para adicionar informações sobre sua empresa.';

  // Exibir dados adicionais do companyProfile
  const profile = user.companyProfile || {};

  // Nome Fantasia
  const displayTradeName = document.getElementById('displayTradeName');
  if (displayTradeName) {
    displayTradeName.textContent = profile.tradeName || 'Não informado';
  }

  // Razão Social
  const displayLegalName = document.getElementById('displayLegalName');
  if (displayLegalName) {
    displayLegalName.textContent = profile.legalName || 'Não informado';
  }

  // Área de Atuação
  const displayBusinessArea = document.getElementById('displayBusinessArea');
  if (displayBusinessArea) {
    displayBusinessArea.textContent = profile.businessArea || 'Não informado';
  }

  // Número de Funcionários
  const displayNumberOfEmployees = document.getElementById('displayNumberOfEmployees');
  if (displayNumberOfEmployees) {
    displayNumberOfEmployees.textContent = profile.numberOfEmployees ? profile.numberOfEmployees.toString() : 'Não informado';
  }

  // Telefone Comercial
  const displayCommercialPhone = document.getElementById('displayCommercialPhone');
  if (displayCommercialPhone) {
    displayCommercialPhone.textContent = profile.commercialPhone ? formatPhone(profile.commercialPhone) : 'Não informado';
  }

  // E-mail Corporativo
  const displayCorporateEmail = document.getElementById('displayCorporateEmail');
  if (displayCorporateEmail) {
    displayCorporateEmail.textContent = profile.corporateEmail || 'Não informado';
  }

  // CEP
  const displayCep = document.getElementById('displayCep');
  if (displayCep) {
    displayCep.textContent = profile.cep ? formatCEP(profile.cep) : 'Não informado';
  }

  // Endereço completo
  const displayAddress = document.getElementById('displayAddress');
  if (displayAddress) {
    if (profile.street && profile.neighborhood) {
      const addressParts = [
        profile.street,
        profile.number ? `nº ${profile.number}` : 's/n',
        profile.neighborhood
      ].filter(Boolean);
      displayAddress.textContent = addressParts.join(', ');
    } else {
      displayAddress.textContent = 'Não informado';
    }
  }

  // Cidade/Estado
  const displayCityState = document.getElementById('displayCityState');
  if (displayCityState) {
    if (profile.city && profile.state) {
      displayCityState.textContent = `${profile.city} - ${profile.state}`;
    } else {
      displayCityState.textContent = 'Não informado';
    }
  }

  // Fill edit form
  const editName = document.getElementById('editName');
  if (editName) editName.value = user.name || '';
  
  const editEmail = document.getElementById('editEmail');
  if (editEmail) editEmail.value = user.email || '';
  
  const editCnpj = document.getElementById('editCnpj');
  if (editCnpj) editCnpj.value = user.cnpj || '';
  
  const editPhone = document.getElementById('editPhone');
  if (editPhone) editPhone.value = user.phone || '';
  
  const editWebsite = document.getElementById('editWebsite');
  if (editWebsite) editWebsite.value = user.website || '';
  
  const editDescription = document.getElementById('editDescription');
  if (editDescription) editDescription.value = user.description || '';
  
  console.log('Profile displayed successfully');
}

// Função auxiliar para formatar CEP
function formatCEP(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Toggle edit mode
function toggleEditMode() {
  console.log('toggleEditMode called, current isEditMode:', isEditMode);
  
  const viewMode = document.getElementById('viewMode');
  const editMode = document.getElementById('editMode');
  const editButton = document.getElementById('btnEdit');
  const editText = document.getElementById('editText');

  console.log('Elements found:', { viewMode: !!viewMode, editMode: !!editMode, editButton: !!editButton, editText: !!editText });

  isEditMode = !isEditMode;
  console.log('New isEditMode:', isEditMode);

  if (isEditMode) {
    if (viewMode) viewMode.style.display = 'none';
    if (editMode) editMode.style.display = 'block';
    if (editText) editText.textContent = 'Cancelar';
    if (editButton) editButton.classList.add('editing');
    console.log('Entered edit mode');
  } else {
    if (viewMode) viewMode.style.display = 'block';
    if (editMode) editMode.style.display = 'none';
    if (editText) editText.textContent = 'Editar';
    if (editButton) editButton.classList.remove('editing');
    // Reset form to current data
    if (currentUser) {
      displayProfile(currentUser);
    }
    console.log('Exited edit mode');
  }
}

// Save profile changes
async function saveProfile(event) {
  event.preventDefault();
  console.log('=== Save profile called ===');
  
  // Use FormData to handle file upload
  const formData = new FormData();
  
  const name = document.getElementById('editName').value.trim();
  const cnpj = document.getElementById('editCnpj').value.replace(/\D/g, '');
  const phone = document.getElementById('editPhone').value.replace(/\D/g, '');
  const website = document.getElementById('editWebsite').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  
  formData.append('name', name);
  formData.append('cnpj', cnpj);
  formData.append('phone', phone);
  formData.append('website', website);
  formData.append('description', description);

  // Handle profile photo/logo
  const photoInput = document.getElementById('editPhoto');
  if (photoInput && photoInput.files && photoInput.files[0]) {
    console.log('Company logo selected:', photoInput.files[0]);
    formData.append('profilePhoto', photoInput.files[0]);
  }

  // Validation
  if (!name) {
    showProfileMessage('Nome é obrigatório', 'error');
    return;
  }

  console.log('FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
  }

  try {
    showProfileMessage('Salvando alterações...', 'info');
    
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });

    console.log('Save response status:', res.status);
    
    const result = await res.json();
    console.log('Save response data:', result);

    if (res.ok) {
      currentUser = result;
      displayProfile(currentUser);
      updateProfileCompletion(currentUser);
      toggleEditMode();
      showProfileMessage('Perfil atualizado com sucesso!', 'success');
      
      // Reload profile to ensure we have fresh data
      setTimeout(() => {
        loadProfile();
      }, 1000);
    } else {
      console.error('Save failed:', result);
      showProfileMessage(result.error || 'Erro ao salvar perfil', 'error');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    showProfileMessage('Erro de conexão ao salvar perfil', 'error');
  }
}

// Load published jobs
async function loadJobs() {
  const container = document.getElementById('jobsSection');
  
  if (!container) {
    console.error('Container #jobsSection não encontrado');
    return;
  }
  
  try {
    const res = await fetch('/api/jobs/my-jobs', { credentials: 'include' });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state-profile">
          <i class="fas fa-briefcase"></i>
          <h4>Nenhuma vaga publicada</h4>
          <p>Publique sua primeira vaga para encontrar candidatos qualificados</p>
          <a href="/publicar-vaga" class="btn btn-primary">
            <i class="fas fa-plus-circle"></i> Publicar Primeira Vaga
          </a>
        </div>
      `;
      
      // Update stats
      const statsEl = document.getElementById('statsJobs');
      if (statsEl) statsEl.textContent = '0';
      const statsBadge = document.getElementById('statsJobsBadge');
      if (statsBadge) statsBadge.textContent = '0';
      
      return;
    }

    container.innerHTML = '';
    
    // Update stats
    const activeJobs = data.filter(job => job.status === 'active').length;
    const statsEl = document.getElementById('statsJobs');
    if (statsEl) statsEl.textContent = activeJobs;
    const statsBadge = document.getElementById('statsJobsBadge');
    if (statsBadge) statsBadge.textContent = data.length;

    data.forEach(job => {
      const jobEl = document.createElement('div');
      jobEl.className = 'job-item';
      
      const statusClass = job.status === 'active' ? 'active' : 'inactive';
      const statusText = job.status === 'active' ? 'Ativa' : 'Inativa';
      
      jobEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
          <h4 class="job-title">
            <a href="/vaga/${job._id || job.id}" style="color: var(--text-dark); text-decoration: none;">
              ${job.title}
            </a>
          </h4>
          <span class="job-status ${statusClass}">
            <i class="fas fa-circle" style="font-size: 0.5rem;"></i> ${statusText}
          </span>
        </div>
        <div class="job-meta">
          <span class="job-meta-item">
            <i class="fas fa-map-marker-alt"></i>
            ${job.location || 'Local não informado'}
          </span>
          <span class="job-meta-item">
            <i class="fas fa-clock"></i>
            ${new Date(job.createdAt || job.created_at).toLocaleDateString('pt-BR')}
          </span>
          <span class="job-meta-item">
            <i class="fas fa-users"></i>
            ${job.applicants_count || 0} candidaturas
          </span>
        </div>
        <div class="job-actions">
          <a href="/vaga/${job._id || job.id}" class="btn btn-outline">
            <i class="fas fa-eye"></i> Ver Detalhes
          </a>
          <button onclick="toggleJobStatus('${job._id || job.id}', '${job.status}')" class="btn btn-secondary">
            <i class="fas fa-${job.status === 'active' ? 'pause' : 'play'}"></i>
            ${job.status === 'active' ? 'Pausar' : 'Ativar'}
          </button>
        </div>
      `;
      
      container.appendChild(jobEl);
    });

  } catch (error) {
    console.error('Error loading jobs:', error);
    if (container) {
      container.innerHTML = `
        <div class="empty-state-profile">
          <i class="fas fa-exclamation-circle"></i>
          <p>Não foi possível carregar as vagas</p>
          <button onclick="loadJobs()" class="btn btn-secondary" style="margin-top: var(--spacing-md);">
            <i class="fas fa-redo"></i> Tentar novamente
          </button>
        </div>
      `;
    }
  }
}

// Load recent applications
async function loadRecentApplications() {
  const container = document.getElementById('recentApplications');
  
  if (!container) {
    console.error('Container #recentApplications não encontrado');
    return;
  }
  
  try {
    const res = await fetch('/api/applications/company', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Applications response status:', res.status);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Applications data:', data);
    
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center p-lg">
          <div style="font-size: 2rem; margin-bottom: var(--spacing-sm); color: var(--text-light);">
            <i class="fas fa-users"></i>
          </div>
          <p class="text-gray-500" style="font-size: 0.9rem;">Nenhuma candidatura ainda</p>
        </div>
      `;
      
      // Update stats
      const statsEl = document.getElementById('statsApplications');
      if (statsEl) statsEl.textContent = '0';
      const statsBadge = document.getElementById('statsApplicationsBadge');
      if (statsBadge) statsBadge.textContent = '0';
      
      return;
    }

    container.innerHTML = '';
    
    // Update stats
    const statsEl = document.getElementById('statsApplications');
    if (statsEl) statsEl.textContent = data.length;
    const statsBadge = document.getElementById('statsApplicationsBadge');
    if (statsBadge) statsBadge.textContent = data.length;
    
    // Show only last 5 applications
    data.slice(0, 5).forEach(app => {
      const appEl = document.createElement('div');
      appEl.className = 'application-item';
      
      const statusMap = {
        'pending': 'Pendente',
        'reviewing': 'Em análise',
        'accepted': 'Aceita',
        'rejected': 'Rejeitada'
      };
      
      const statusClass = `status-${app.status.toLowerCase()}`;
      const statusText = statusMap[app.status.toLowerCase()] || app.status;
      
      appEl.innerHTML = `
        <div class="application-header">
          <div>
            <h5 class="application-title">${app.user_name || 'Candidato'}</h5>
            <p class="application-candidate">
              <i class="fas fa-briefcase"></i>
              ${app.job_title || 'Vaga'}
            </p>
          </div>
          <span class="application-status ${statusClass}">${statusText}</span>
        </div>
        <div class="application-footer">
          <span class="application-date">
            <i class="fas fa-calendar"></i>
            ${new Date(app.appliedAt || app.applied_at).toLocaleDateString('pt-BR')}
          </span>
          <a href="/vaga/${app.job_id}" class="btn-link">
            Ver detalhes <i class="fas fa-arrow-right"></i>
          </a>
        </div>
      `;
      
      container.appendChild(appEl);
    });

  } catch (error) {
    console.error('Error loading applications:', error);
    if (container) {
      container.innerHTML = `
        <div class="text-center p-lg">
          <div style="font-size: 2rem; margin-bottom: var(--spacing-sm); color: var(--text-light);">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <p class="text-gray-500" style="font-size: 0.9rem;">Erro ao carregar</p>
        </div>
      `;
    }
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
  // Campos obrigatórios e opcionais
  const fields = {
    required: ['name', 'email'],
    optional: ['cnpj', 'phone', 'website', 'description', 'profilePhotoUrl']
  };
  
  const allFields = [...fields.required, ...fields.optional];
  
  const completedFields = allFields.filter(field => {
    if (field === 'profilePhotoUrl') {
      return user.profilePhotoUrl || user.avatarUrl;
    }
    return user[field] && user[field].toString().trim().length > 0;
  });
  
  const completion = Math.round((completedFields.length / allFields.length) * 100);
  
  // Update stats completion
  const statsCompletion = document.getElementById('statsCompletion');
  if (statsCompletion) {
    statsCompletion.textContent = `${completion}%`;
  }
  
  // Update header badge
  const completionPercent = document.getElementById('completionPercent');
  if (completionPercent) {
    completionPercent.textContent = `${completion}%`;
  }
  
  // Update completion badge color
  const completionBadge = document.getElementById('completionBadge');
  if (completionBadge) {
    if (completion === 100) {
      completionBadge.style.backgroundColor = '#2ECC71';
    } else if (completion >= 70) {
      completionBadge.style.backgroundColor = '#3498DB';
    } else if (completion >= 40) {
      completionBadge.style.backgroundColor = '#F39C12';
    } else {
      completionBadge.style.backgroundColor = '#E74C3C';
    }
  }
  
  // Update progress bar
  const completionBar = document.getElementById('completionBar');
  if (completionBar) {
    completionBar.style.width = `${completion}%`;
  }
}

// Upload avatar photo
async function uploadAvatar(file) {
  try {
    console.log('Uploading avatar:', file.name);
    showProfileMessage('Enviando logo...', 'info');
    
    const formData = new FormData();
    formData.append('profilePhoto', file);
    
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });
    
    const result = await res.json();
    console.log('Avatar upload response:', result);
    
    if (res.ok) {
      currentUser = result;
      
      // Update avatar immediately
      const avatarEl = document.getElementById('profileAvatar');
      if (avatarEl && result.profilePhotoUrl) {
        const photoUrl = result.profilePhotoUrl;
        console.log('Setting avatar to:', photoUrl);
        
        avatarEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = photoUrl;
        img.alt = 'Logo da empresa';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        img.onerror = function() {
          console.error('Failed to load:', this.src);
        };
        avatarEl.appendChild(img);
      }
      
      // Reload profile
      await loadProfile();
      
      showProfileMessage('Logo atualizado com sucesso!', 'success');
    } else {
      showProfileMessage(result.error || 'Erro ao enviar logo', 'error');
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    showProfileMessage('Erro de conexão ao enviar logo', 'error');
  }
}

// Download profile as PDF (placeholder)
function downloadProfile() {
  showProfileMessage('Funcionalidade em desenvolvimento', 'info');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('Perfil empresa loaded');
  
  // Load data
  loadProfile();
  loadJobs();
  loadRecentApplications();

  // Edit toggle - removido listener duplicado pois o botão já tem onclick no HTML
  
  // Form submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', saveProfile);
  } else {
    console.warn('Profile form not found');
  }
  
  // Avatar upload from header
  const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
  const avatarInput = document.getElementById('avatarInput');
  
  if (avatarWrapper && avatarInput) {
    console.log('Setting up avatar click handler');
    
    avatarWrapper.addEventListener('click', function(e) {
      console.log('Avatar wrapper clicked!');
      e.preventDefault();
      e.stopPropagation();
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', function(e) {
      console.log('Avatar input change event triggered');
      const file = e.target.files[0];
      if (file) {
        console.log('File selected:', file.name, file.size, file.type);
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          showProfileMessage('Formato não suportado. Use JPG ou PNG.', 'error');
          return;
        }
        
        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
          showProfileMessage('Imagem muito grande. Tamanho máximo: 2MB.', 'error');
          return;
        }
        
        uploadAvatar(file);
      }
    });
  } else {
    console.error('Avatar wrapper or input element not found!');
  }
  
  // Format inputs
  const editCnpj = document.getElementById('editCnpj');
  if (editCnpj) {
    editCnpj.addEventListener('input', function(e) {
      e.target.value = formatCNPJ(e.target.value);
    });
  }
  
  const editPhone = document.getElementById('editPhone');
  if (editPhone) {
    editPhone.addEventListener('input', function(e) {
      e.target.value = formatPhone(e.target.value);
    });
  }
});

// Global functions for window
window.toggleEditMode = toggleEditMode;
window.downloadProfile = downloadProfile;
window.toggleJobStatus = toggleJobStatus;
window.loadJobs = loadJobs;

// ----- PROFILE SHARING AND LIKES -----

// Load likes count
async function loadLikesCount() {
  try {
    if (!currentUser) return;
    
    // MongoDB retorna _id, não id
    const userId = currentUser._id || currentUser.id;
    
    const res = await fetch(`/api/profiles/${userId}/liked`, {
      credentials: 'include'
    });
    
    if (res.ok) {
      const data = await res.json();
      const likesCountEl = document.getElementById('likesCount');
      if (likesCountEl) {
        likesCountEl.textContent = data.likesCount || 0;
      }
    }
  } catch (error) {
    console.error('Error loading likes count:', error);
  }
}

// Share profile
function shareProfile() {
  if (!currentUser) return;
  
  // MongoDB retorna _id, não id
  const userId = currentUser._id || currentUser.id;
  console.log('Sharing profile for company:', userId);
  
  const profileUrl = `${window.location.origin}/perfil-publico-empresa?id=${userId}`;
  
  // Check if Web Share API is available (mobile)
  if (navigator.share) {
    navigator.share({
      title: `${currentUser.name} - Aprendiz+`,
      text: `Conheça ${currentUser.name} no Aprendiz+`,
      url: profileUrl
    }).catch(err => {
      console.log('Error sharing:', err);
      // Fallback to copy
      copyProfileLink(profileUrl);
    });
  } else {
    // Desktop: copy to clipboard
    copyProfileLink(profileUrl);
  }
}

// Copy profile link to clipboard
function copyProfileLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    showProfileMessage('Link do perfil copiado para a área de transferência!', 'success');
    
    // Show share options modal
    showShareModal(url);
  }).catch(err => {
    console.error('Error copying to clipboard:', err);
    // Fallback: show link in prompt
    prompt('Copie o link do seu perfil:', url);
  });
}

// Show share modal with options
function showShareModal(url) {
  const modal = document.createElement('div');
  modal.className = 'share-modal';
  modal.innerHTML = `
    <div class="share-modal-content">
      <div class="share-modal-header">
        <h3><i class="fas fa-share-alt"></i> Compartilhar Perfil</h3>
        <button onclick="this.closest('.share-modal').remove()" class="share-close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="share-modal-body">
        <p>Compartilhe o perfil da sua empresa nas redes sociais ou copie o link:</p>
        <div class="share-input-group">
          <input type="text" value="${url}" readonly class="share-link-input" id="shareLinkInput">
          <button onclick="copyFromInput()" class="btn btn-primary">
            <i class="fas fa-copy"></i> Copiar
          </button>
        </div>
        <div class="share-social-buttons">
          <a href="https://wa.me/?text=${encodeURIComponent('Conheça nossa empresa: ' + url)}" target="_blank" class="share-btn whatsapp">
            <i class="fab fa-whatsapp"></i> WhatsApp
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" class="share-btn linkedin">
            <i class="fab fa-linkedin"></i> LinkedIn
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="share-btn facebook">
            <i class="fab fa-facebook"></i> Facebook
          </a>
          <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Conheça nossa empresa no Aprendiz+')}" target="_blank" class="share-btn twitter">
            <i class="fab fa-twitter"></i> Twitter
          </a>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Copy from input field
window.copyFromInput = function() {
  const input = document.getElementById('shareLinkInput');
  input.select();
  document.execCommand('copy');
  showProfileMessage('Link copiado!', 'success');
};

// Global share function
window.shareProfile = shareProfile;

// Load likes count after user loads
setTimeout(() => {
  loadLikesCount();
}, 1500);

