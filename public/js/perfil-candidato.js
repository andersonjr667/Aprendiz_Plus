// Enhanced profile management for candidates
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

// Format CPF
function formatCPF(value) {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Load user profile
async function loadProfile() {
  try {
    console.log('Loading profile...');
    const res = await fetch('/api/users/me', { credentials: 'include' });
    const data = await res.json();
    
    console.log('Profile response:', { status: res.status, data });
    
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
  document.getElementById('profileTitle').textContent = 'Candidato';
  
  // Update avatar
  const avatarEl = document.getElementById('profileAvatar');
  if (user.profilePhotoUrl || user.avatarUrl) {
    // Show actual photo
    avatarEl.innerHTML = `<img src="${user.profilePhotoUrl || user.avatarUrl}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  } else if (user.name) {
    // Show initials
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }

  // Update display fields
  document.getElementById('displayName').textContent = user.name || '-';
  document.getElementById('displayEmail').textContent = user.email || '-';
  document.getElementById('displayCpf').textContent = user.cpf ? formatCPF(user.cpf) : '-';
  document.getElementById('displayPhone').textContent = user.phone || '-';
  document.getElementById('displayBio').textContent = user.bio || 'Nenhuma descrição adicionada';

  // Update skills
  const skillsContainer = document.getElementById('displaySkills');
  if (user.skills && user.skills.length > 0) {
    skillsContainer.innerHTML = user.skills.map(skill => 
      `<span class="skill-tag">${skill}</span>`
    ).join('');
  } else {
    skillsContainer.innerHTML = '<span class="text-gray-500">Nenhuma habilidade adicionada</span>';
  }

  // Fill edit form
  document.getElementById('editName').value = user.name || '';
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editCpf').value = user.cpf || '';
  document.getElementById('editPhone').value = user.phone || '';
  document.getElementById('editBio').value = user.bio || '';
  document.getElementById('editSkills').value = user.skills ? user.skills.join(', ') : '';
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
  console.log('Save profile called');
  
  // Use FormData to handle file upload
  const formData = new FormData();
  
  formData.append('name', document.getElementById('editName').value.trim());
  formData.append('cpf', document.getElementById('editCpf').value.replace(/\D/g, ''));
  formData.append('phone', document.getElementById('editPhone').value.replace(/\D/g, ''));
  formData.append('bio', document.getElementById('editBio').value.trim());
  
  const skills = document.getElementById('editSkills').value
    .split(',')
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);
  formData.append('skills', JSON.stringify(skills));

  // Handle profile photo
  const photoInput = document.getElementById('editPhoto');
  if (photoInput && photoInput.files[0]) {
    console.log('Profile photo selected:', photoInput.files[0]);
    formData.append('profilePhoto', photoInput.files[0]);
  }

  // Validation
  const name = formData.get('name');
  if (!name) {
    showProfileMessage('Nome é obrigatório', 'error');
    return;
  }

  console.log('FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(key, value);
  }

  try {
    showProfileMessage('Salvando alterações...', 'info');
    
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      body: formData // Don't set Content-Type header, let browser set it for FormData
    });

    const result = await res.json();
    console.log('Save response:', { status: res.status, result });

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

// Load applications
async function loadApplications() {
  try {
    const res = await fetch('/api/users/me/applications', { credentials: 'include' });
    const data = await res.json();
    
    const container = document.getElementById('applications');
    
    if (!res.ok || !data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center p-xl">
          <div style="font-size: 3rem; margin-bottom: var(--spacing-md); color: var(--brand-blue);"><i class="fas fa-briefcase"></i></div>
          <h4>Nenhuma candidatura ainda</h4>
          <p class="text-gray-500">Candidate-se a vagas para vê-las aqui</p>
          <a href="/vagas" class="btn btn-primary">Buscar Vagas</a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    document.getElementById('statsApplications').textContent = data.length;

    data.forEach(app => {
      const appEl = document.createElement('div');
      appEl.className = 'card-flat';
      appEl.style.marginBottom = 'var(--spacing-md)';
      appEl.style.padding = 'var(--spacing-md)';
      
      const statusClass = `status-${app.status.toLowerCase()}`;
      
      appEl.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h4><a href="/vaga-detalhes?id=${app.job_id}">${app.job_title || 'Vaga'}</a></h4>
            <p class="text-gray-500">Candidatura enviada em ${new Date(app.appliedAt).toLocaleDateString('pt-BR')}</p>
          </div>
          <span class="application-status ${statusClass}">${app.status}</span>
        </div>
      `;
      
      container.appendChild(appEl);
    });

  } catch (error) {
    console.error('Error loading applications:', error);
    document.getElementById('applications').innerHTML = '<p class="text-error">Erro ao carregar candidaturas</p>';
  }
}

// Load recommendations
async function loadRecommendations() {
  try {
    const res = await fetch('/api/jobs/recommendations', { credentials: 'include' });
    const data = await res.json();
    
    const container = document.getElementById('recommendations');
    
    if (!res.ok || !data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center p-lg">
          <div style="font-size: 2rem; margin-bottom: var(--spacing-sm); color: var(--brand-teal);"><i class="fas fa-bullseye"></i></div>
          <p class="text-gray-500">Nenhuma recomendação no momento</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
    data.slice(0, 5).forEach(job => {
      const jobEl = document.createElement('div');
      jobEl.style.marginBottom = 'var(--spacing-md)';
      
      jobEl.innerHTML = `
        <div class="p-md" style="border-left: 3px solid var(--brand-green);">
          <h5><a href="/vaga-detalhes?id=${job.id}">${job.title}</a></h5>
          <p class="text-sm text-gray-500">${job.company_name || 'Empresa'}</p>
        </div>
      `;
      
      container.appendChild(jobEl);
    });

  } catch (error) {
    console.error('Error loading recommendations:', error);
    document.getElementById('recommendations').innerHTML = '<p class="text-error">Erro ao carregar recomendações</p>';
  }
}

// Calculate and update profile completion
function updateProfileCompletion(user) {
  const fields = ['name', 'email', 'cpf', 'phone', 'bio', 'skills'];
  const completedFields = fields.filter(field => {
    if (field === 'skills') {
      return user.skills && user.skills.length > 0;
    }
    return user[field] && user[field].toString().trim().length > 0;
  });
  
  const completion = Math.round((completedFields.length / fields.length) * 100);
  document.getElementById('statsCompletion').textContent = `${completion}%`;
  
  // Update views (mock data for now)
  document.getElementById('statsViews').textContent = Math.floor(Math.random() * 50) + 10;
}

// Download profile as PDF (placeholder)
function downloadProfile() {
  showProfileMessage('Funcionalidade em desenvolvimento', 'info');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('Perfil candidato loaded');
  
  // Load data
  loadProfile();
  loadApplications();
  loadRecommendations();
  loadResume();

  // Edit toggle
  const editToggle = document.getElementById('editToggle');
  if (editToggle) {
    editToggle.addEventListener('click', toggleEditMode);
  }
  
  // Cancel edit
  const cancelEdit = document.getElementById('cancelEdit');
  if (cancelEdit) {
    cancelEdit.addEventListener('click', toggleEditMode);
  }
  
  // Form submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', saveProfile);
  }
  
  // Resume upload
  const resumeInput = document.getElementById('resumeInput');
  if (resumeInput) {
    resumeInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = allowedTypes.some(ext => fileName.endsWith(ext));
        
        if (!hasValidExtension) {
          showProfileMessage('Formato de arquivo não suportado. Use PDF, DOC ou DOCX.', 'error');
          return;
        }
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          showProfileMessage('Arquivo muito grande. Tamanho máximo: 5MB.', 'error');
          return;
        }
        
        uploadResume(file);
      }
    });
  }
  
  // Format inputs
  const editCpf = document.getElementById('editCpf');
  if (editCpf) {
    editCpf.addEventListener('input', function(e) {
      e.target.value = formatCPF(e.target.value);
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

// Resume management functions
let currentResume = null;

// Load resume information
async function loadResume() {
  try {
    const res = await fetch('/api/users/me/resume', { credentials: 'include' });
    const data = await res.json();
    
    if (res.ok && data.resumeUrl) {
      currentResume = data;
      showResumeActions(data);
      updateQuickResumeButton(true);
    } else {
      showResumeUpload();
      updateQuickResumeButton(false);
    }
  } catch (error) {
    console.error('Error loading resume:', error);
    showResumeUpload();
    updateQuickResumeButton(false);
  }
}

// Update quick resume button in sidebar
function updateQuickResumeButton(hasResume) {
  const btn = document.getElementById('quickResumeBtn');
  const text = document.getElementById('quickResumeText');
  
  if (hasResume) {
    btn.className = 'btn btn-success btn-block';
    text.textContent = 'Baixar Currículo';
  } else {
    btn.className = 'btn btn-outline-secondary btn-block';
    text.textContent = 'Adicionar Currículo';
  }
}

// Quick resume action
function quickResumeAction() {
  if (currentResume && currentResume.resumeUrl) {
    downloadResume();
  } else {
    // Scroll to resume section
    document.getElementById('resumeSection').scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
    // Highlight the upload area
    const uploadArea = document.getElementById('resumeUploadArea');
    uploadArea.style.borderColor = 'var(--brand-blue)';
    uploadArea.style.background = 'var(--brand-blue-light)';
    setTimeout(() => {
      uploadArea.style.borderColor = '';
      uploadArea.style.background = '';
    }, 2000);
  }
}

// Show upload area
function showResumeUpload() {
  document.getElementById('resumeUploadArea').style.display = 'block';
  document.getElementById('resumeActions').style.display = 'none';
}

// Show resume actions
function showResumeActions(resumeData) {
  document.getElementById('resumeUploadArea').style.display = 'none';
  document.getElementById('resumeActions').style.display = 'flex';
  
  // Update resume info
  const fileName = resumeData.resumeUrl ? resumeData.resumeUrl.split('/').pop() : 'currículo.pdf';
  document.getElementById('resumeFileName').textContent = fileName;
  
  if (resumeData.updatedAt) {
    const date = new Date(resumeData.updatedAt).toLocaleDateString('pt-BR');
    document.getElementById('resumeFileDate').textContent = `Enviado em ${date}`;
  }
}

// Upload resume
async function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);
  
  try {
    // Show progress
    showUploadProgress();
    
    const res = await fetch('/api/users/me/resume', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    const result = await res.json();
    
    if (res.ok) {
      currentResume = result;
      showResumeActions(result);
      updateQuickResumeButton(true);
      showProfileMessage('Currículo enviado com sucesso!', 'success');
    } else {
      showProfileMessage(result.error || 'Erro ao enviar currículo', 'error');
      showResumeUpload();
      updateQuickResumeButton(false);
    }
  } catch (error) {
    console.error('Error uploading resume:', error);
    showProfileMessage('Erro de conexão ao enviar currículo', 'error');
    showResumeUpload();
  }
}

// Show upload progress
function showUploadProgress() {
  const uploadArea = document.getElementById('resumeUploadArea');
  uploadArea.innerHTML = `
    <div class="resume-progress">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--brand-blue); margin-bottom: var(--spacing-sm);"></i>
      <p>Enviando currículo...</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 70%;"></div>
      </div>
    </div>
  `;
}

// Download resume
async function downloadResume() {
  if (!currentResume || !currentResume.resumeUrl) {
    showProfileMessage('Nenhum currículo encontrado', 'error');
    return;
  }
  
  try {
    const link = document.createElement('a');
    link.href = currentResume.resumeUrl;
    link.download = currentResume.resumeUrl.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading resume:', error);
    showProfileMessage('Erro ao baixar currículo', 'error');
  }
}

// Replace resume
function replaceResume() {
  document.getElementById('resumeInput').click();
}

// Delete resume
async function deleteResume() {
  if (!confirm('Tem certeza que deseja remover seu currículo?')) {
    return;
  }
  
  try {
    const res = await fetch('/api/users/me/resume', {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (res.ok) {
      currentResume = null;
      showResumeUpload();
      updateQuickResumeButton(false);
      showProfileMessage('Currículo removido com sucesso!', 'success');
    } else {
      const result = await res.json();
      showProfileMessage(result.error || 'Erro ao remover currículo', 'error');
    }
  } catch (error) {
    console.error('Error deleting resume:', error);
    showProfileMessage('Erro de conexão ao remover currículo', 'error');
  }
}

// Global resume functions
window.downloadResume = downloadResume;
window.replaceResume = replaceResume;
window.deleteResume = deleteResume;
window.quickResumeAction = quickResumeAction;
