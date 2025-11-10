// Enhanced profile management for candidates
console.log('perfil-candidato.js loaded!');

let currentUser = null;
let isEditMode = false;
let isInterestsEditMode = false;
let selectedSkills = [];
let selectedInterests = [];
let originalInterests = [];

// Lista de áreas de interesse disponíveis
const AVAILABLE_INTERESTS = [
  { id: 'tecnologia', name: 'Tecnologia', icon: '💻' },
  { id: 'saude', name: 'Saúde', icon: '🏥' },
  { id: 'educacao', name: 'Educação', icon: '📚' },
  { id: 'vendas', name: 'Vendas', icon: '💼' },
  { id: 'marketing', name: 'Marketing', icon: '📢' },
  { id: 'financas', name: 'Finanças', icon: '💰' },
  { id: 'recursos-humanos', name: 'Recursos Humanos', icon: '👥' },
  { id: 'administracao', name: 'Administração', icon: '📊' },
  { id: 'logistica', name: 'Logística', icon: '🚚' },
  { id: 'atendimento', name: 'Atendimento', icon: '☎️' },
  { id: 'engenharia', name: 'Engenharia', icon: '⚙️' },
  { id: 'design', name: 'Design', icon: '🎨' },
  { id: 'gastronomia', name: 'Gastronomia', icon: '🍽️' },
  { id: 'turismo', name: 'Turismo', icon: '✈️' },
  { id: 'comunicacao', name: 'Comunicação', icon: '📱' },
  { id: 'direito', name: 'Direito', icon: '⚖️' },
  { id: 'meio-ambiente', name: 'Meio Ambiente', icon: '🌱' },
  { id: 'esportes', name: 'Esportes', icon: '⚽' },
  { id: 'beleza', name: 'Beleza', icon: '💄' },
  { id: 'construcao', name: 'Construção', icon: '🏗️' }
];

// Lista completa de habilidades pré-definidas
const PREDEFINED_SKILLS = [
  "Comunicação", "Empatia", "Escuta ativa", "Trabalho em equipe", "Colaboração",
  "Adaptabilidade", "Flexibilidade", "Criatividade", "Pensamento crítico",
  "Resolução de problemas", "Gestão do tempo", "Organização", "Disciplina",
  "Autoconfiança", "Proatividade", "Responsabilidade", "Inteligência emocional",
  "Autocontrole", "Motivação", "Resiliência", "Paciência", "Autoconhecimento",
  "Liderança", "Negociação", "Persuasão", "Assertividade", "Capacidade de decisão",
  "Visão estratégica", "Pensamento analítico", "Curiosidade", "Aprendizado contínuo",
  "Abertura a feedbacks", "Gestão de conflitos", "Empreendedorismo", "Iniciativa",
  "Senso de urgência", "Ética profissional", "Pontualidade", "Comprometimento",
  "Foco em resultados", "Sociabilidade", "Networking", "Autonomia", "Humildade"
];

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
      
      // Se não autorizado, redirecionar para login
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
    initializeInterests(data);
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showProfileMessage('Erro de conexão ao carregar perfil', 'error');
  }
}

// Display profile data
function displayProfile(user) {
  console.log('Displaying profile for user:', user);
  
  // Update header
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
  
  const profileTitle = document.getElementById('profileTitle');
  if (profileTitle) {
    profileTitle.textContent = 'Candidato';
  }
  
  // Update avatar in header
  const avatarEl = document.getElementById('profileAvatar');
  console.log('Avatar element found:', !!avatarEl);
  console.log('User data:', { profilePhotoUrl: user.profilePhotoUrl, avatarUrl: user.avatarUrl });
  
  if (avatarEl) {
    if (user.profilePhotoUrl || user.avatarUrl) {
      // Show actual photo
      let photoUrl = user.profilePhotoUrl || user.avatarUrl;
      
      // Add cache busting only for local URLs (not Cloudinary)
      if (photoUrl && photoUrl.startsWith('/uploads')) {
        photoUrl += '?t=' + Date.now();
      }
      
      console.log('Displaying profile photo:', photoUrl);
      console.log('Avatar element before clearing:', avatarEl.innerHTML);
      
      // Clear previous content and add image
      avatarEl.innerHTML = '';
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = 'Foto de perfil';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      
      img.onerror = function() {
        console.error('Failed to load image:', this.src);
        console.error('Image error event fired');
        avatarEl.innerHTML = `<i class="fas fa-user" style="font-size: 4rem; color: #2ECC71;"></i>`;
      };
      img.onload = function() {
        console.log('Image loaded successfully:', photoUrl);
        console.log('Image dimensions:', this.naturalWidth, 'x', this.naturalHeight);
        console.log('Image complete:', this.complete);
      };
      avatarEl.appendChild(img);
      
      console.log('Avatar element after adding image:', avatarEl.innerHTML);
      console.log('Image element:', img);
      
      // Force a reflow
      setTimeout(() => {
        console.log('After timeout - Avatar HTML:', avatarEl.innerHTML);
        const imgCheck = avatarEl.querySelector('img');
        if (imgCheck) {
          console.log('Image still exists, src:', imgCheck.src);
          console.log('Image computed style display:', window.getComputedStyle(imgCheck).display);
          console.log('Image computed style visibility:', window.getComputedStyle(imgCheck).visibility);
          console.log('Image computed style opacity:', window.getComputedStyle(imgCheck).opacity);
          console.log('Image computed style z-index:', window.getComputedStyle(imgCheck).zIndex);
        } else {
          console.error('Image element disappeared!');
        }
      }, 500);
    } else {
      // Show icon
      console.log('No profile photo, showing icon');
      avatarEl.innerHTML = `<i class="fas fa-user" style="font-size: 4rem; color: #2ECC71; pointer-events: none;"></i>`;
    }
  }

  // Update display fields
  const displayName = document.getElementById('displayName');
  if (displayName) displayName.textContent = user.name || '-';
  
  const displayEmail = document.getElementById('displayEmail');
  if (displayEmail) displayEmail.textContent = user.email || '-';
  
  const displayCpf = document.getElementById('displayCpf');
  if (displayCpf) displayCpf.textContent = user.cpf ? formatCPF(user.cpf) : 'Não informado';
  
  const displayPhone = document.getElementById('displayPhone');
  if (displayPhone) displayPhone.textContent = user.phone || 'Não informado';
  
  const displayBio = document.getElementById('displayBio');
  if (displayBio) displayBio.textContent = user.bio || 'Nenhuma descrição adicionada. Clique em "Editar" para adicionar informações sobre você.';

  // Update skills
  const skillsContainer = document.getElementById('displaySkills');
  if (skillsContainer) {
    if (user.skills && user.skills.length > 0) {
      skillsContainer.innerHTML = user.skills.map(skill => 
        `<span class="skill-tag">${skill}</span>`
      ).join('');
    } else {
      skillsContainer.innerHTML = '<span style="color: #999;">Nenhuma habilidade adicionada</span>';
    }
  }

  // Fill edit form
  const editName = document.getElementById('editName');
  if (editName) editName.value = user.name || '';
  
  const editEmail = document.getElementById('editEmail');
  if (editEmail) editEmail.value = user.email || '';
  
  const editCpf = document.getElementById('editCpf');
  if (editCpf) editCpf.value = user.cpf || '';
  
  const editPhone = document.getElementById('editPhone');
  if (editPhone) editPhone.value = user.phone || '';
  
  const editBio = document.getElementById('editBio');
  if (editBio) editBio.value = user.bio || '';
  
  // Initialize skills selector with user's skills
  selectedSkills = user.skills ? [...user.skills] : [];
  console.log('User skills loaded:', selectedSkills);
  updateSelectedSkillsDisplay();
  updateHiddenSkillsInput();
  
  console.log('Profile displayed successfully');
}

// Skills management functions
function initializeSkillsSelector() {
  const searchInput = document.getElementById('skillSearchInput');
  const addCustomBtn = document.getElementById('addCustomSkillBtn');
  const suggestionsDiv = document.getElementById('skillsSuggestions');
  
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.trim().toLowerCase();
      if (query.length > 0) {
        showSkillSuggestions(query);
      } else {
        suggestionsDiv.style.display = 'none';
      }
    });
    
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const customSkill = this.value.trim();
        if (customSkill && !selectedSkills.includes(customSkill)) {
          addSkill(customSkill);
        }
      }
    });
    
    searchInput.addEventListener('blur', function() {
      // Delay to allow click on suggestion
      setTimeout(() => {
        suggestionsDiv.style.display = 'none';
      }, 200);
    });
  }
  
  if (addCustomBtn) {
    addCustomBtn.addEventListener('click', function() {
      const input = document.getElementById('skillSearchInput');
      const customSkill = input.value.trim();
      if (customSkill && !selectedSkills.includes(customSkill)) {
        addSkill(customSkill);
      }
    });
  }
}

function showSkillSuggestions(query) {
  const suggestionsDiv = document.getElementById('skillsSuggestions');
  const filtered = PREDEFINED_SKILLS.filter(skill => 
    skill.toLowerCase().includes(query) && !selectedSkills.includes(skill)
  );
  
  if (filtered.length > 0) {
    suggestionsDiv.innerHTML = filtered.slice(0, 10).map((skill, index) => `
      <div class="skill-suggestion-item" data-skill="${skill}">
        ${skill}
      </div>
    `).join('');
    
    // Add click listeners to suggestions
    suggestionsDiv.querySelectorAll('.skill-suggestion-item').forEach(item => {
      item.addEventListener('click', function() {
        const skill = this.getAttribute('data-skill');
        addSkill(skill);
      });
    });
    
    suggestionsDiv.style.display = 'block';
  } else {
    suggestionsDiv.innerHTML = `
      <div class="skill-suggestion-item disabled">
        Nenhuma sugestão encontrada. Clique em "Adicionar personalizada" para adicionar.
      </div>
    `;
    suggestionsDiv.style.display = 'block';
  }
}

function addSkill(skill) {
  const trimmedSkill = skill.trim();
  
  if (!trimmedSkill) {
    return;
  }
  
  if (!selectedSkills.includes(trimmedSkill)) {
    selectedSkills.push(trimmedSkill);
    updateSelectedSkillsDisplay();
    updateHiddenSkillsInput();
    
    console.log('Skill added:', trimmedSkill);
    console.log('Current selected skills:', selectedSkills);
    
    // Clear search
    const searchInput = document.getElementById('skillSearchInput');
    if (searchInput) searchInput.value = '';
    
    // Hide suggestions
    const suggestionsDiv = document.getElementById('skillsSuggestions');
    if (suggestionsDiv) suggestionsDiv.style.display = 'none';
  } else {
    console.log('Skill already selected:', trimmedSkill);
  }
}

function removeSkill(skill) {
  selectedSkills = selectedSkills.filter(s => s !== skill);
  updateSelectedSkillsDisplay();
  updateHiddenSkillsInput();
}

function updateSelectedSkillsDisplay() {
  const container = document.getElementById('selectedSkills');
  if (!container) return;
  
  if (selectedSkills.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = selectedSkills.map((skill, index) => `
    <div class="selected-skill-tag">
      <span>${skill}</span>
      <span class="remove-skill" data-skill-index="${index}">
        <i class="fas fa-times"></i>
      </span>
    </div>
  `).join('');
  
  // Add event listeners to remove buttons
  container.querySelectorAll('.remove-skill').forEach((btn) => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-skill-index'));
      removeSkillByIndex(index);
    });
  });
}

function removeSkillByIndex(index) {
  if (index >= 0 && index < selectedSkills.length) {
    selectedSkills.splice(index, 1);
    updateSelectedSkillsDisplay();
    updateHiddenSkillsInput();
  }
}

function updateHiddenSkillsInput() {
  const hiddenInput = document.getElementById('editSkills');
  if (hiddenInput) {
    hiddenInput.value = selectedSkills.join(', ');
  }
  console.log('Hidden input updated:', selectedSkills.join(', '));
}

// Toggle edit mode// Toggle edit mode
function toggleEditMode() {
  const viewMode = document.getElementById('viewMode');
  const editMode = document.getElementById('editMode');
  const editButton = document.getElementById('btnEdit');
  const editText = document.getElementById('editText');

  isEditMode = !isEditMode;

  if (isEditMode) {
    viewMode.style.display = 'none';
    editMode.style.display = 'block';
    editText.textContent = 'Cancelar';
    editButton.className = 'btn-edit';
  } else {
    viewMode.style.display = 'block';
    editMode.style.display = 'none';
    editText.textContent = 'Editar';
    editButton.className = 'btn-edit';
    // Reset form to current data
    if (currentUser) {
      displayProfile(currentUser);
    }
  }
}

// Save profile changes
async function saveProfile(event) {
  event.preventDefault();
  console.log('=== Save profile called ===');
  console.log('Selected skills before save:', selectedSkills);
  
  // Use FormData to handle file upload
  const formData = new FormData();
  
  const name = document.getElementById('editName').value.trim();
  const cpf = document.getElementById('editCpf').value.replace(/\D/g, '');
  const phone = document.getElementById('editPhone').value.replace(/\D/g, '');
  const bio = document.getElementById('editBio').value.trim();
  
  formData.append('name', name);
  formData.append('cpf', cpf);
  formData.append('phone', phone);
  formData.append('bio', bio);
  
  // Use selectedSkills array directly instead of parsing from input
  formData.append('skills', JSON.stringify(selectedSkills));

  // Handle profile photo
  const photoInput = document.getElementById('editPhoto');
  if (photoInput && photoInput.files && photoInput.files[0]) {
    console.log('Profile photo selected:', photoInput.files[0]);
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
      body: formData // Don't set Content-Type header, let browser set it for FormData
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
      
      // Reload profile to ensure we have fresh data from server
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

// Load applications
async function loadApplications() {
  const container = document.getElementById('applicationsSection');
  
  if (!container) {
    console.error('Container #applicationsSection não encontrado');
    return;
  }
  
  try {
    const res = await fetch('/api/users/me/applications', { credentials: 'include' });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center p-xl">
          <div style="font-size: 3rem; margin-bottom: var(--spacing-md); color: var(--brand-blue);">
            <i class="fas fa-briefcase"></i>
          </div>
          <h4 style="margin-bottom: var(--spacing-sm);">Nenhuma candidatura ainda</h4>
          <p class="text-gray-500" style="margin-bottom: var(--spacing-lg);">Comece a se candidatar às vagas disponíveis</p>
          <a href="/vagas" class="btn btn-primary">
            <i class="fas fa-search"></i> Buscar Vagas
          </a>
        </div>
      `;
      
      // Atualiza contador
      const statsEl = document.getElementById('statsApplications');
      if (statsEl) statsEl.textContent = '0';
      
      return;
    }

    container.innerHTML = '';
    
    // Atualiza contador
    const statsEl = document.getElementById('statsApplications');
    if (statsEl) statsEl.textContent = data.length;

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
    if (container) {
      container.innerHTML = `
        <div class="text-center p-lg">
          <div style="font-size: 2rem; margin-bottom: var(--spacing-sm); color: var(--text-gray);">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <p class="text-gray-500">Não foi possível carregar suas candidaturas</p>
          <button onclick="loadApplications()" class="btn btn-secondary" style="margin-top: var(--spacing-md);">
            <i class="fas fa-redo"></i> Tentar novamente
          </button>
        </div>
      `;
    }
  }
}

// Load recommendations
async function loadRecommendations() {
  const container = document.getElementById('recommendationsSection');
  
  if (!container) {
    console.error('Container #recommendationsSection não encontrado');
    return;
  }
  
  try {
    const res = await fetch('/api/jobs/recommendations', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Recommendations response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Recommendations error:', res.status, errorText);
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Recommendations data:', data);
    
    // Dicas úteis para o candidato
    const tips = [
      {
        icon: 'fa-file-alt',
        title: 'Mantenha seu currículo atualizado',
        text: 'Um currículo completo aumenta suas chances em até 40%'
      },
      {
        icon: 'fa-lightbulb',
        title: 'Complete suas habilidades',
        text: 'Candidatos com 5+ habilidades recebem 3x mais visualizações'
      },
      {
        icon: 'fa-star',
        title: 'Destaque suas conquistas',
        text: 'Adicione projetos e experiências relevantes no seu perfil'
      },
      {
        icon: 'fa-bell',
        title: 'Ative as notificações',
        text: 'Seja o primeiro a saber sobre novas vagas na sua área'
      },
      {
        icon: 'fa-search',
        title: 'Personalize sua busca',
        text: 'Defina suas áreas de interesse para receber melhores recomendações'
      },
      {
        icon: 'fa-users',
        title: 'Faça networking',
        text: 'Conecte-se com profissionais da sua área e participe de eventos'
      },
      {
        icon: 'fa-graduation-cap',
        title: 'Invista em capacitação',
        text: 'Cursos e certificações aumentam sua empregabilidade em 60%'
      },
      {
        icon: 'fa-clock',
        title: 'Candidate-se rapidamente',
        text: 'As primeiras 24h são cruciais - vagas recebem 80% das candidaturas nesse período'
      },
      {
        icon: 'fa-briefcase',
        title: 'Personalize sua candidatura',
        text: 'Adapte seu currículo para cada vaga - isso triplica suas chances'
      },
      {
        icon: 'fa-chart-line',
        title: 'Acompanhe suas métricas',
        text: 'Monitore visualizações do perfil e ajuste sua estratégia'
      },
      {
        icon: 'fa-linkedin',
        title: 'Otimize seu LinkedIn',
        text: '90% dos recrutadores checam o LinkedIn antes de entrevistar'
      },
      {
        icon: 'fa-comment-dots',
        title: 'Prepare-se para entrevistas',
        text: 'Pratique respostas comuns e pesquise sobre a empresa'
      },
      {
        icon: 'fa-tools',
        title: 'Mostre seus projetos',
        text: 'Tenha um portfólio online - aumenta credibilidade em 70%'
      },
      {
        icon: 'fa-trophy',
        title: 'Destaque diferencias competitivos',
        text: 'O que te torna único? Idiomas, certificações, projetos especiais?'
      },
      {
        icon: 'fa-handshake',
        title: 'Seja proativo',
        text: 'Entre em contato com recrutadores e demonstre interesse genuíno'
      },
      {
        icon: 'fa-envelope',
        title: 'Escreva um bom resumo',
        text: 'Sua bio é a primeira impressão - seja claro e objetivo'
      },
      {
        icon: 'fa-check-circle',
        title: 'Complete 100% do perfil',
        text: 'Perfis completos têm 40x mais chances de serem visualizados'
      },
      {
        icon: 'fa-bullseye',
        title: 'Seja específico nas áreas de interesse',
        text: 'Quanto mais claro seu objetivo, melhores as recomendações'
      },
      {
        icon: 'fa-rocket',
        title: 'Atualize regularmente',
        text: 'Perfis ativos aparecem primeiro nas buscas dos recrutadores'
      },
      {
        icon: 'fa-phone',
        title: 'Mantenha contatos atualizados',
        text: 'Verifique se email e telefone estão corretos - oportunidades podem escapar'
      }
    ];
    
    if (!data || data.length === 0) {
      // Mostra dicas quando não há recomendações
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      
      container.innerHTML = `
        <div class="text-center p-lg">
          <div style="font-size: 2rem; margin-bottom: var(--spacing-sm); color: var(--brand-teal);">
            <i class="fas ${randomTip.icon}"></i>
          </div>
          <h5 style="margin-bottom: var(--spacing-xs);">${randomTip.title}</h5>
          <p class="text-gray-500">${randomTip.text}</p>
        </div>
        <div style="margin-top: var(--spacing-lg); padding: var(--spacing-md); background: #f8f9fa; border-radius: 8px;">
          <p class="text-sm text-gray-600" style="margin: 0;">
            <i class="fas fa-info-circle" style="color: var(--brand-teal);"></i>
            Complete seu perfil para receber recomendações personalizadas de vagas
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
    // Mostra até 3 vagas recomendadas
    data.slice(0, 3).forEach(item => {
      const job = item.job;
      const jobEl = document.createElement('div');
      jobEl.style.marginBottom = 'var(--spacing-md)';
      
      jobEl.innerHTML = `
        <div class="p-md" style="border-left: 3px solid var(--brand-green); background: white; border-radius: 4px;">
          <h5 style="margin-bottom: var(--spacing-xs);">
            <a href="/vaga-detalhes?id=${job._id}" style="color: var(--text-primary);">${job.title}</a>
          </h5>
          <p class="text-sm text-gray-500" style="margin: 0;">${job.company_name || 'Empresa'}</p>
        </div>
      `;
      
      container.appendChild(jobEl);
    });
    
    // Adiciona uma dica aleatória no final
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const tipEl = document.createElement('div');
    tipEl.style.marginTop = 'var(--spacing-lg)';
    tipEl.innerHTML = `
      <div style="padding: var(--spacing-md); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
        <div style="display: flex; align-items: start; gap: var(--spacing-sm);">
          <i class="fas ${randomTip.icon}" style="font-size: 1.5rem; margin-top: 2px;"></i>
          <div>
            <h6 style="margin: 0 0 var(--spacing-xs) 0; color: white;">${randomTip.title}</h6>
            <p style="margin: 0; font-size: 0.875rem; opacity: 0.95;">${randomTip.text}</p>
          </div>
        </div>
      </div>
    `;
    container.appendChild(tipEl);

  } catch (error) {
    console.error('Error loading recommendations:', error);
    if (container) {
      // Mostra uma dica mesmo quando há erro
      container.innerHTML = `
        <div class="text-center p-lg">
          <div style="font-size: 2rem; margin-bottom: var(--spacing-sm); color: var(--brand-teal);">
            <i class="fas fa-lightbulb"></i>
          </div>
          <h5 style="margin-bottom: var(--spacing-xs);">Complete suas habilidades</h5>
          <p class="text-gray-500">Candidatos com 5+ habilidades recebem 3x mais visualizações</p>
        </div>
        <div style="margin-top: var(--spacing-lg); padding: var(--spacing-md); background: #f8f9fa; border-radius: 8px;">
          <p class="text-sm text-gray-600" style="margin: 0;">
            <i class="fas fa-info-circle" style="color: var(--brand-teal);"></i>
            Adicione suas habilidades na seção Informações Profissionais
          </p>
        </div>
      `;
    }
  }
}

// Calculate and update profile completion
function updateProfileCompletion(user) {
  // Campos obrigatórios e opcionais
  const fields = {
    required: ['name', 'email'],
    optional: ['cpf', 'phone', 'bio', 'skills', 'profilePhotoUrl', 'interests']
  };
  
  const allFields = [...fields.required, ...fields.optional];
  
  const completedFields = allFields.filter(field => {
    if (field === 'skills') {
      return user.skills && user.skills.length > 0;
    }
    if (field === 'interests') {
      return user.interests && user.interests.length >= 3;
    }
    if (field === 'profilePhotoUrl') {
      return user.profilePhotoUrl || user.avatarUrl;
    }
    return user[field] && user[field].toString().trim().length > 0;
  });
  
  const completion = Math.round((completedFields.length / allFields.length) * 100);
  
  // Update in sidebar stats
  const statsCompletion = document.getElementById('statsCompletion');
  if (statsCompletion) {
    statsCompletion.textContent = `${completion}%`;
  }
  
  // Update in header badge
  const completionPercent = document.getElementById('completionPercent');
  if (completionPercent) {
    completionPercent.textContent = `${completion}%`;
  }
  
  // Update completion badge color based on percentage
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
  
  // Update views count based on profile completion
  const statsViews = document.getElementById('statsViews');
  if (statsViews) {
    // Mais completo = mais visualizações
    const baseViews = Math.floor(completion / 10) * 5;
    statsViews.textContent = baseViews + Math.floor(Math.random() * 10);
  }
  
  // Update next steps
  updateNextSteps(user, completedFields, allFields);
}

// Update next steps checklist
function updateNextSteps(user, completedFields, allFields) {
  const nextStepsList = document.getElementById('nextStepsList');
  if (!nextStepsList) return;
  
  const steps = [
    {
      field: 'profilePhotoUrl',
      title: 'Adicionar foto de perfil',
      description: 'Uma foto profissional aumenta sua credibilidade',
      icon: 'fa-camera',
      completed: user.profilePhotoUrl || user.avatarUrl
    },
    {
      field: 'cpf',
      title: 'Informar CPF',
      description: 'Necessário para candidaturas formais',
      icon: 'fa-id-card',
      completed: user.cpf && user.cpf.trim().length > 0
    },
    {
      field: 'phone',
      title: 'Adicionar telefone',
      description: 'Empresas podem entrar em contato diretamente',
      icon: 'fa-phone',
      completed: user.phone && user.phone.trim().length > 0
    },
    {
      field: 'bio',
      title: 'Escrever uma biografia',
      description: 'Conte sobre você e suas experiências',
      icon: 'fa-user-edit',
      completed: user.bio && user.bio.trim().length > 0
    },
    {
      field: 'skills',
      title: 'Adicionar habilidades',
      description: 'Mínimo 3 habilidades recomendadas',
      icon: 'fa-star',
      completed: user.skills && user.skills.length >= 3
    },
    {
      field: 'interests',
      title: 'Selecionar áreas de interesse',
      description: 'Mínimo 3 áreas para receber recomendações personalizadas',
      icon: 'fa-heart',
      completed: user.interests && user.interests.length >= 3
    }
  ];
  
  // Filter incomplete steps
  const incompleteSteps = steps.filter(step => !step.completed);
  
  if (incompleteSteps.length === 0) {
    // All steps completed
    nextStepsList.innerHTML = `
      <div class="next-steps-empty">
        <i class="fas fa-check-circle"></i>
        <h4>Perfil Completo!</h4>
        <p>Você preencheu todas as informações importantes</p>
      </div>
    `;
  } else {
    // Show incomplete steps
    nextStepsList.innerHTML = incompleteSteps.map(step => `
      <div class="next-step-item">
        <div class="next-step-icon">
          <i class="fas ${step.icon}" style="font-size: 12px; color: #F39C12;"></i>
        </div>
        <div class="next-step-content">
          <div class="next-step-title">${step.title}</div>
          <div class="next-step-description">${step.description}</div>
        </div>
      </div>
    `).join('');
  }
}

// Initialize interests section
function initializeInterests(user) {
  // Load user's saved interests
  selectedInterests = user.interests || [];
  originalInterests = [...selectedInterests];
  
  // Display in view mode
  displayInterestsView(user);
  
  // Load grid for edit mode (but don't show yet)
  loadInterestsGrid();
}

// Display interests in view mode
function displayInterestsView(user) {
  const viewList = document.getElementById('interestsViewList');
  if (!viewList) return;
  
  const userInterests = user.interests || [];
  
  if (userInterests.length === 0) {
    viewList.innerHTML = `
      <p style="text-align: center; color: #7f8c8d; padding: 20px;">
        <i class="fas fa-heart" style="font-size: 2rem; margin-bottom: 10px; display: block; color: #e0e0e0;"></i>
        Nenhuma área de interesse selecionada. Clique em "Editar" para adicionar.
      </p>
    `;
    return;
  }
  
  // Get interest details
  const interestTags = userInterests.map(interestId => {
    const interest = AVAILABLE_INTERESTS.find(i => i.id === interestId);
    if (!interest) return '';
    
    return `
      <div class="interest-view-tag">
        <span class="interest-icon">${interest.icon}</span>
        <span class="interest-name">${interest.name}</span>
      </div>
    `;
  }).join('');
  
  viewList.innerHTML = interestTags;
}

// Load interests grid for edit mode
function loadInterestsGrid() {
  const interestsGrid = document.getElementById('interestsGrid');
  if (!interestsGrid) return;
  
  // Render all available interests
  interestsGrid.innerHTML = AVAILABLE_INTERESTS.map(interest => {
    const isSelected = selectedInterests.includes(interest.id);
    return `
      <div class="interest-item ${isSelected ? 'selected' : ''}" data-interest-id="${interest.id}">
        <div class="interest-check">
          <i class="fas fa-check"></i>
        </div>
        <div class="interest-icon">${interest.icon}</div>
        <div class="interest-name">${interest.name}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  const interestItems = interestsGrid.querySelectorAll('.interest-item');
  interestItems.forEach(item => {
    item.addEventListener('click', toggleInterest);
  });
}

// Toggle interests edit mode
function toggleInterestsEditMode() {
  console.log('toggleInterestsEditMode called');
  console.log('Current isInterestsEditMode:', isInterestsEditMode);
  
  isInterestsEditMode = !isInterestsEditMode;
  
  const viewMode = document.getElementById('interestsViewMode');
  const editMode = document.getElementById('interestsEditMode');
  const btnEdit = document.getElementById('btnEditInterests');
  const editText = document.getElementById('editInterestsText');
  
  console.log('Elements found:', {
    viewMode: !!viewMode,
    editMode: !!editMode,
    btnEdit: !!btnEdit,
    editText: !!editText
  });
  
  if (isInterestsEditMode) {
    // Entering edit mode
    console.log('Entering edit mode');
    if (viewMode) viewMode.style.display = 'none';
    if (editMode) editMode.style.display = 'block';
    if (btnEdit) btnEdit.classList.add('active');
    if (editText) editText.textContent = 'Cancelar';
    
    // Reload grid with current selections
    loadInterestsGrid();
  } else {
    // Exiting edit mode - restore original
    console.log('Exiting edit mode');
    selectedInterests = [...originalInterests];
    if (viewMode) viewMode.style.display = 'block';
    if (editMode) editMode.style.display = 'none';
    if (btnEdit) btnEdit.classList.remove('active');
    if (editText) editText.textContent = 'Editar';
  }
}

// Toggle interest selection
function toggleInterest(e) {
  const item = e.currentTarget;
  const interestId = item.getAttribute('data-interest-id');
  
  if (item.classList.contains('selected')) {
    // Remove interest
    item.classList.remove('selected');
    selectedInterests = selectedInterests.filter(id => id !== interestId);
  } else {
    // Add interest
    item.classList.add('selected');
    selectedInterests.push(interestId);
  }
}

// Save interests changes
async function saveInterestsChanges() {
  try {
    console.log('Saving interests:', selectedInterests);
    showProfileMessage('Salvando interesses...', 'info');
    
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        interests: selectedInterests
      })
    });
    
    const result = await res.json();
    console.log('Save interests response:', result);
    
    if (res.ok) {
      showProfileMessage('Interesses salvos com sucesso!', 'success');
      currentUser.interests = selectedInterests;
      originalInterests = [...selectedInterests];
      
      // Exit edit mode
      isInterestsEditMode = false;
      document.getElementById('interestsViewMode').style.display = 'block';
      document.getElementById('interestsEditMode').style.display = 'none';
      document.getElementById('btnEditInterests').classList.remove('active');
      document.getElementById('editInterestsText').textContent = 'Editar';
      
      // Update view
      displayInterestsView(currentUser);
      updateProfileCompletion(currentUser);
    } else {
      console.error('Save failed:', result);
      showProfileMessage(result.error || 'Erro ao salvar interesses', 'error');
    }
  } catch (error) {
    console.error('Error saving interests:', error);
    showProfileMessage('Erro de conexão ao salvar interesses', 'error');
  }
}

// Download profile as PDF (placeholder)
function downloadProfile() {
  showProfileMessage('Funcionalidade em desenvolvimento', 'info');
}

// Upload avatar photo
async function uploadAvatar(file) {
  try {
    console.log('Uploading avatar:', file.name);
    showProfileMessage('Enviando foto...', 'info');
    
    const formData = new FormData();
    formData.append('profilePhoto', file);
    
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });
    
    const result = await res.json();
    console.log('Avatar upload response:', result);
    console.log('profilePhotoUrl from response:', result.profilePhotoUrl);
    
    if (res.ok) {
      // Update current user
      currentUser = result;
      
      // Update avatar immediately
      const avatarEl = document.getElementById('profileAvatar');
      if (avatarEl) {
        if (result.profilePhotoUrl || result.avatarUrl) {
          const photoUrl = result.profilePhotoUrl || result.avatarUrl;
          console.log('Setting avatar to:', photoUrl);
          
          // Clear and create new image element
          avatarEl.innerHTML = '';
          const img = document.createElement('img');
          img.src = photoUrl;
          img.alt = 'Foto de perfil';
          img.onerror = function() {
            console.error('Failed to load:', this.src);
          };
          img.onload = function() {
            console.log('Avatar image loaded!');
          };
          avatarEl.appendChild(img);
        }
      }
      
      // Reload profile to update everything
      await loadProfile();
      
      showProfileMessage('Foto atualizada com sucesso!', 'success');
    } else {
      showProfileMessage(result.error || 'Erro ao enviar foto', 'error');
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    showProfileMessage('Erro de conexão ao enviar foto', 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('Perfil candidato loaded');
  
  // Initialize skills selector
  initializeSkillsSelector();
  
  // Load data
  loadProfile();
  loadApplications();
  loadRecommendations();
  loadResume();

  // Edit toggle - usando o ID correto do HTML
  const editToggle = document.getElementById('btnEdit');
  if (editToggle) {
    editToggle.addEventListener('click', toggleEditMode);
  } else {
    console.warn('Edit button not found');
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
  } else {
    console.warn('Profile form not found');
  }
  
  // Interests edit button
  const btnEditInterests = document.getElementById('btnEditInterests');
  if (btnEditInterests) {
    btnEditInterests.addEventListener('click', toggleInterestsEditMode);
    console.log('Interests edit button listener attached');
  } else {
    console.warn('Interests edit button not found');
  }
  
  // Save interests button
  const saveInterestsBtn = document.getElementById('saveInterestsBtn');
  if (saveInterestsBtn) {
    saveInterestsBtn.addEventListener('click', saveInterestsChanges);
    console.log('Save interests button listener attached');
  }
  
  // Cancel interests button
  const cancelInterestsBtn = document.getElementById('cancelInterestsBtn');
  if (cancelInterestsBtn) {
    cancelInterestsBtn.addEventListener('click', toggleInterestsEditMode);
    console.log('Cancel interests button listener attached');
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
  
  // Avatar upload from header
  const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
  const avatarInput = document.getElementById('avatarInput');
  
  console.log('Avatar wrapper:', avatarWrapper);
  console.log('Avatar input:', avatarInput);
  
  if (avatarWrapper && avatarInput) {
    console.log('Setting up avatar click handler');
    
    avatarWrapper.addEventListener('click', function(e) {
      console.log('Avatar wrapper clicked!');
      e.preventDefault();
      e.stopPropagation();
      avatarInput.click();
      console.log('Input click triggered');
    });
    
    console.log('Avatar input found and event listener attached');
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
      } else {
        console.log('No file selected');
      }
    });
  } else {
    console.error('Avatar wrapper or input element not found!');
    console.error('Wrapper:', avatarWrapper);
    console.error('Input:', avatarInput);
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

// Global functions for window (mantém apenas as necessárias)
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
  document.getElementById('resumeActions').style.display = 'block';
  
  // Get original filename or use friendly name
  let fileName = 'Currículo.pdf';
  if (resumeData.resumeUrl) {
    const urlFileName = resumeData.resumeUrl.split('/').pop();
    const extension = urlFileName.split('.').pop();
    fileName = `Currículo.${extension}`;
  }
  
  const fileNameElement = document.getElementById('resumeFileName');
  if (fileNameElement) {
    fileNameElement.textContent = fileName;
  }
  
  // Format date nicely
  const fileDateElement = document.getElementById('resumeFileDate');
  if (resumeData.updatedAt && fileDateElement) {
    const date = new Date(resumeData.updatedAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if today, yesterday, or format date
    if (date.toDateString() === today.toDateString()) {
      fileDateElement.textContent = 'Enviado hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      fileDateElement.textContent = 'Enviado ontem';
    } else {
      const formattedDate = date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      fileDateElement.textContent = `Enviado em ${formattedDate}`;
    }
  }
  
  console.log('Resume actions shown. URL:', resumeData.resumeUrl);
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
  if (!uploadArea) return;
  
  uploadArea.innerHTML = `
    <div class="resume-progress" style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--brand-blue); margin-bottom: 20px;"></i>
      <h4 style="color: #333; margin-bottom: 10px;">Enviando currículo...</h4>
      <p style="color: #666; font-size: 0.95rem;">Aguarde enquanto processamos seu arquivo</p>
      <div class="progress-bar" style="width: 100%; height: 6px; background: #e0e0e0; border-radius: 10px; margin-top: 20px; overflow: hidden;">
        <div class="progress-fill" style="width: 70%; height: 100%; background: linear-gradient(90deg, #2ECC71, #27AE60); animation: progressPulse 1.5s ease-in-out infinite;"></div>
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
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = currentResume.resumeUrl;
    
    // Extract filename from URL or use default
    const urlParts = currentResume.resumeUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || 'curriculo.pdf';
    
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showProfileMessage('Download iniciado!', 'success');
  } catch (error) {
    console.error('Error downloading resume:', error);
    showProfileMessage('Erro ao baixar currículo', 'error');
  }
}

// Open resume directly (now served locally)
async function openResumeDirectly() {
  if (!currentResume || !currentResume.resumeUrl) {
    showProfileMessage('Nenhum currículo encontrado', 'error');
    return;
  }
  
  try {
    console.log('Opening resume:', currentResume.resumeUrl);
    
    const fileUrl = currentResume.resumeUrl;
    
    // Open file directly in new tab (browser's native PDF viewer)
    const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow) {
      // Popup blocker
      showProfileMessage('⚠️ Por favor, permita pop-ups para visualizar o currículo', 'warning');
      setTimeout(() => {
        if (confirm('Bloqueador de pop-ups detectado.\n\nDeseja baixar o arquivo?')) {
          downloadResume();
        }
      }, 500);
    } else {
      showProfileMessage('✓ Abrindo visualizador...', 'success');
    }
    
  } catch (error) {
    console.error('Error opening resume:', error);
    showProfileMessage('Erro ao abrir currículo. Use o botão "Baixar".', 'error');
  }
}

// View resume in new tab or modal
async function viewResume() {
  if (!currentResume || !currentResume.resumeUrl) {
    showProfileMessage('Nenhum currículo encontrado', 'error');
    return;
  }
  
  try {
    console.log('Opening resume URL:', currentResume.resumeUrl);
    const fileUrl = currentResume.resumeUrl;
    
    // Open file directly in new tab (browser's native PDF viewer)
    const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow) {
      // Popup blocker might have prevented opening
      showProfileMessage('⚠️ Bloqueador de pop-ups detectado! Por favor, permita pop-ups para este site.', 'warning');
      
      // Show alternative option
      setTimeout(() => {
        const userChoice = confirm(
          'Não foi possível abrir o visualizador.\n\n' +
          'Clique em OK para baixar o arquivo diretamente,\n' +
          'ou CANCELAR para tentar novamente após permitir pop-ups.'
        );
        
        if (userChoice) {
          downloadResume();
        }
      }, 500);
    } else {
      showProfileMessage('✓ Abrindo visualizador de currículo...', 'success');
    }
  } catch (error) {
    console.error('Error viewing resume:', error);
    showProfileMessage('Erro ao visualizar currículo. Use o botão "Baixar" como alternativa.', 'error');
  }
}

// Replace resume
function replaceResume() {
  document.getElementById('resumeInput').click();
}

// Confirm delete resume (with better UX)
function confirmDeleteResume() {
  // Show custom confirmation
  const confirmDelete = confirm(
    '⚠️ Confirmar exclusão\n\n' +
    'Tem certeza que deseja excluir seu currículo?\n\n' +
    'Esta ação não pode ser desfeita.'
  );
  
  if (confirmDelete) {
    deleteResume();
  }
}

// Delete resume
async function deleteResume() {
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
window.viewResume = viewResume;
window.openResumeDirectly = openResumeDirectly;
window.replaceResume = replaceResume;
window.deleteResume = deleteResume;
window.confirmDeleteResume = confirmDeleteResume;
window.quickResumeAction = quickResumeAction;
