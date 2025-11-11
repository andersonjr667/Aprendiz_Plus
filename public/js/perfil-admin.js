// perfil-admin.js - Funcionalidades do perfil do administrador

// ID do dono do sistema
const OWNER_ID = '691256819ab90a9899d0d05d';

let currentUser = null;
let allUsers = [];
let allJobs = [];
let allNews = [];
let allLogs = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser();
  initializeTabs();
  initializeAvatarUpload();
  await loadDashboardData();
  
  // Event listeners
  document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);
  document.getElementById('passwordForm')?.addEventListener('submit', handlePasswordChange);
  
  // Filtros
  document.getElementById('userSearch')?.addEventListener('input', filterUsers);
  document.getElementById('userTypeFilter')?.addEventListener('change', filterUsers);
  document.getElementById('jobSearch')?.addEventListener('input', filterJobs);
  document.getElementById('jobStatusFilter')?.addEventListener('change', filterJobs);
  document.getElementById('logActionFilter')?.addEventListener('change', filterLogs);
  document.getElementById('logDateFilter')?.addEventListener('change', filterLogs);
});

// Inicializar upload de avatar
function initializeAvatarUpload() {
  const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
  const avatarInput = document.getElementById('avatarInput');
  
  if (avatarWrapper && avatarInput) {
    avatarWrapper.addEventListener('click', () => {
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validar tipo de arquivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          showMessage('Por favor, selecione uma imagem válida (JPG, PNG ou WEBP)', 'error');
          e.target.value = '';
          return;
        }
        
        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showMessage('A imagem deve ter no máximo 5MB', 'error');
          e.target.value = '';
          return;
        }
        
        await handleAvatarUpload(file);
        e.target.value = ''; // Limpar input
      }
    });
  }
}

// Carregar usuário atual
async function loadCurrentUser() {
  try {
    const token = Auth.getToken();
    const response = await fetch('/api/users/me', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Não autorizado');
    }
    
    currentUser = await response.json();
    
    // Verificar se é admin
    if (currentUser.type !== 'admin') {
      showMessage('Acesso negado. Apenas administradores podem acessar esta página.', 'error');
      setTimeout(() => window.location.href = '/', 2000);
      return;
    }
    
    updateProfileHeader();
    updateProfileForm();
    
  } catch (error) {
    console.error('Erro ao carregar usuário:', error);
    showMessage('Erro ao carregar dados do usuário', 'error');
    setTimeout(() => window.location.href = '/login', 2000);
  }
}

// Atualizar header do perfil
function updateProfileHeader() {
  const profileAvatar = document.getElementById('profileAvatar');
  const avatar = currentUser.avatarUrl || currentUser.profilePhotoUrl;
  
  if (avatar && profileAvatar) {
    profileAvatar.innerHTML = `<img src="${avatar}" alt="${currentUser.name}">`;
  }
  
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileEmail').textContent = currentUser.email;
  
  const joinedDate = new Date(currentUser.createdAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
  document.getElementById('memberSince').textContent = joinedDate;
  
  // Aplicar classe especial se for o dono do sistema
  const profileHeader = document.querySelector('.profile-header');
  console.log('Verificando se é dono do sistema:', {
    userId: currentUser._id,
    ownerId: OWNER_ID,
    isDono: currentUser._id === OWNER_ID
  });
  
  if (profileHeader && currentUser._id === OWNER_ID) {
    console.log('✅ Usuário é o DONO DO SISTEMA! Aplicando decorações...');
    profileHeader.classList.add('owner-profile');
    
    // Adicionar círculos decorativos com logos
    addOwnerDecorations(profileHeader);
    
    // Adicionar badge de dono
    const profileBadges = document.querySelector('.profile-badges');
    if (profileBadges && !profileBadges.querySelector('.owner-badge')) {
      const ownerBadge = document.createElement('span');
      ownerBadge.className = 'badge owner-badge';
      ownerBadge.innerHTML = '<i class="fas fa-crown"></i> Dono do Sistema';
      ownerBadge.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
      ownerBadge.style.color = '#000';
      ownerBadge.style.fontWeight = '600';
      profileBadges.insertBefore(ownerBadge, profileBadges.firstChild);
    }
  } else {
    console.log('ℹ️ Usuário não é o dono do sistema');
  }
}

// Adicionar decorações especiais para o dono do sistema
function addOwnerDecorations(headerElement) {
  // Verificar se já existem decorações
  if (headerElement.querySelector('.owner-profile-decorations')) {
    console.log('Decorações já existem, pulando...');
    return;
  }
  
  console.log('Adicionando decorações de dono do sistema...');
  
  const decorations = document.createElement('div');
  decorations.className = 'owner-profile-decorations';
  
  // Criar 5 círculos com logo
  for (let i = 0; i < 5; i++) {
    const circle = document.createElement('div');
    circle.className = 'owner-logo-circle';
    
    // Adicionar logo
    const logoImg = document.createElement('img');
    logoImg.src = '/images/logo.png';
    logoImg.alt = 'Logo Aprendiz+';
    
    logoImg.onload = function() {
      console.log(`Logo carregada com sucesso no círculo ${i + 1}`);
    };
    
    logoImg.onerror = function() {
      // Se a logo não carregar, usar ícone ao invés
      console.warn(`Falha ao carregar logo no círculo ${i + 1}, usando fallback`);
      this.style.display = 'none';
      const icon = document.createElement('i');
      icon.className = 'fas fa-briefcase';
      circle.appendChild(icon);
    };
    
    circle.appendChild(logoImg);
    decorations.appendChild(circle);
  }
  
  // Inserir no início do header (antes do content)
  headerElement.insertBefore(decorations, headerElement.firstChild);
  console.log('Decorações adicionadas com sucesso!');
}

// Compartilhar perfil
function shareProfile() {
  const profileUrl = `${window.location.origin}/perfil-publico-admin?id=${currentUser._id}`;
  
  if (navigator.share) {
    navigator.share({
      title: `Perfil de ${currentUser.name}`,
      text: 'Confira meu perfil no Aprendiz+',
      url: profileUrl
    }).catch(err => console.log('Erro ao compartilhar:', err));
  } else {
    navigator.clipboard.writeText(profileUrl).then(() => {
      showMessage('Link copiado para a área de transferência!', 'success');
    });
  }
}

// Atualizar formulário de perfil
function updateProfileForm() {
  document.getElementById('name').value = currentUser.name || '';
  document.getElementById('email').value = currentUser.email || '';
  document.getElementById('phone').value = currentUser.phone || '';
  document.getElementById('bio').value = currentUser.bio || '';
}

// Sistema de Tabs
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.profile-nav-item');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const tabName = button.dataset.tab;
      
      // Atualizar botões
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Atualizar conteúdo
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabName}`).classList.add('active');
      
      // Carregar dados específicos da tab
      await loadTabData(tabName);
    });
  });
}

// Carregar dados da tab
async function loadTabData(tabName) {
  switch(tabName) {
    case 'dashboard':
      await loadDashboardData();
      break;
    case 'users':
      await loadUsers();
      break;
    case 'jobs':
      await loadJobs();
      break;
    case 'news':
      await loadNews();
      break;
    case 'logs':
      await loadLogs();
      break;
  }
}

// Dashboard
async function loadDashboardData() {
  try {
    const token = Auth.getToken();
    
    // Carregar estatísticas
    const [usersRes, jobsRes, applicationsRes, newsRes] = await Promise.all([
      fetch('/api/users', { 
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/jobs', { credentials: 'include' }),
      fetch('/api/applications/all', { 
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => ({ ok: false })),
      fetch('/api/news', { credentials: 'include' })
    ]);
    
    if (usersRes.ok) {
      const users = await usersRes.json();
      document.getElementById('totalUsers').textContent = users.length;
      document.getElementById('totalCandidates').textContent = 
        users.filter(u => u.type === 'candidato').length;
      document.getElementById('totalCompanies').textContent = 
        users.filter(u => u.type === 'empresa').length;
    }
    
    if (jobsRes.ok) {
      const jobs = await jobsRes.json();
      document.getElementById('totalJobs').textContent = 
        jobs.filter(j => j.status === 'ativa').length;
    }
    
    if (applicationsRes.ok) {
      const applications = await applicationsRes.json();
      document.getElementById('totalApplications').textContent = applications.length || 0;
    }
    
    if (newsRes.ok) {
      const news = await newsRes.json();
      document.getElementById('totalNews').textContent = news.length;
    }
    
    // Carregar atividade recente
    await loadRecentActivity();
    
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    showMessage('Erro ao carregar estatísticas', 'error');
  }
}

// Atividade recente
async function loadRecentActivity() {
  try {
    const token = Auth.getToken();
    const response = await fetch('/api/logs?limit=10', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar atividades');
    
    const logs = await response.json();
    const container = document.getElementById('recentActivity');
    
    if (logs.length === 0) {
      container.innerHTML = '<p class="no-content">Nenhuma atividade recente</p>';
      return;
    }
    
    container.innerHTML = logs.map(log => `
      <div class="activity-item">
        <i class="fas fa-${getActionIcon(log.action)}"></i>
        <div class="activity-content">
          <strong>${log.userName || 'Usuário'}</strong> ${getActionText(log.action)} 
          <em>${log.entity}</em>
          <span class="activity-time">${formatTimeAgo(log.createdAt)}</span>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Erro ao carregar atividades:', error);
    document.getElementById('recentActivity').innerHTML = 
      '<p class="error">Erro ao carregar atividades</p>';
  }
}

// Gerenciar Usuários
async function loadUsers() {
  try {
    const token = Auth.getToken();
    const response = await fetch('/api/users', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar usuários');
    
    allUsers = await response.json();
    displayUsers(allUsers);
    
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    showMessage('Erro ao carregar usuários', 'error');
  }
}

function displayUsers(users) {
  const container = document.getElementById('usersTable');
  
  if (users.length === 0) {
    container.innerHTML = '<p class="no-content">Nenhum usuário encontrado</p>';
    return;
  }
  
  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Tipo</th>
          <th>Status</th>
          <th>Cadastro</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>
              <div class="user-cell">
                <img src="${user.avatarUrl || user.profilePhotoUrl || '/images/default-avatar.png'}" 
                     alt="${user.name}" class="table-avatar">
                <span>${user.name}</span>
              </div>
            </td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.type}">${formatUserType(user.type)}</span></td>
            <td><span class="badge badge-${user.status}">${user.status || 'ativo'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>
              <div class="table-actions">
                <button onclick="viewUserProfile('${user._id}')" class="btn-icon" title="Ver perfil">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="toggleUserStatus('${user._id}', '${user.status || 'active'}')" 
                        class="btn-icon" title="${user.status === 'active' ? 'Desativar' : 'Ativar'}">
                  <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                </button>
                ${user.type !== 'admin' ? `
                  <button onclick="deleteUser('${user._id}')" class="btn-icon btn-danger" title="Excluir">
                    <i class="fas fa-trash"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterUsers() {
  const search = document.getElementById('userSearch').value.toLowerCase();
  const typeFilter = document.getElementById('userTypeFilter').value;
  
  const filtered = allUsers.filter(user => {
    const matchSearch = user.name.toLowerCase().includes(search) || 
                       user.email.toLowerCase().includes(search);
    const matchType = !typeFilter || user.type === typeFilter;
    return matchSearch && matchType;
  });
  
  displayUsers(filtered);
}

// Gerenciar Vagas
async function loadJobs() {
  try {
    const response = await fetch('/api/jobs', { credentials: 'include' });
    if (!response.ok) throw new Error('Erro ao carregar vagas');
    
    allJobs = await response.json();
    displayJobs(allJobs);
    
  } catch (error) {
    console.error('Erro ao carregar vagas:', error);
    showMessage('Erro ao carregar vagas', 'error');
  }
}

function displayJobs(jobs) {
  const container = document.getElementById('jobsTable');
  
  if (jobs.length === 0) {
    container.innerHTML = '<p class="no-content">Nenhuma vaga encontrada</p>';
    return;
  }
  
  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Empresa</th>
          <th>Localização</th>
          <th>Status</th>
          <th>Candidaturas</th>
          <th>Publicação</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${jobs.map(job => `
          <tr>
            <td><strong>${job.title}</strong></td>
            <td>${job.companyName || 'N/A'}</td>
            <td>${job.location || 'N/A'}</td>
            <td><span class="badge badge-${job.status}">${job.status || 'ativa'}</span></td>
            <td>${job.applicationsCount || 0}</td>
            <td>${new Date(job.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>
              <div class="table-actions">
                <button onclick="viewJob('${job._id}')" class="btn-icon" title="Ver vaga">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="deleteJob('${job._id}')" class="btn-icon btn-danger" title="Excluir">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterJobs() {
  const search = document.getElementById('jobSearch').value.toLowerCase();
  const statusFilter = document.getElementById('jobStatusFilter').value;
  
  const filtered = allJobs.filter(job => {
    const matchSearch = job.title.toLowerCase().includes(search) || 
                       (job.companyName && job.companyName.toLowerCase().includes(search));
    const matchStatus = !statusFilter || job.status === statusFilter;
    return matchSearch && matchStatus;
  });
  
  displayJobs(filtered);
}

// Gerenciar Notícias
async function loadNews() {
  try {
    const response = await fetch('/api/news', { credentials: 'include' });
    if (!response.ok) throw new Error('Erro ao carregar notícias');
    
    allNews = await response.json();
    displayNews(allNews);
    
  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    showMessage('Erro ao carregar notícias', 'error');
  }
}

function displayNews(news) {
  const container = document.getElementById('newsTable');
  
  if (news.length === 0) {
    container.innerHTML = '<p class="no-content">Nenhuma notícia encontrada</p>';
    return;
  }
  
  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Autor</th>
          <th>Publicação</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${news.map(item => `
          <tr>
            <td>
              <div class="news-cell">
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="table-thumb">` : ''}
                <strong>${item.title}</strong>
              </div>
            </td>
            <td>${item.authorName || 'Desconhecido'}</td>
            <td>${new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>
              <div class="table-actions">
                <button onclick="viewNews('${item._id}')" class="btn-icon" title="Ver notícia">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editNews('${item._id}')" class="btn-icon" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteNews('${item._id}')" class="btn-icon btn-danger" title="Excluir">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Gerenciar Logs
async function loadLogs() {
  try {
    const token = Auth.getToken();
    const response = await fetch('/api/logs', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Erro ao carregar logs');
    
    allLogs = await response.json();
    displayLogs(allLogs);
    
  } catch (error) {
    console.error('Erro ao carregar logs:', error);
    showMessage('Erro ao carregar logs', 'error');
  }
}

function displayLogs(logs) {
  const container = document.getElementById('logsTable');
  
  if (logs.length === 0) {
    container.innerHTML = '<p class="no-content">Nenhum log encontrado</p>';
    return;
  }
  
  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Data/Hora</th>
          <th>Usuário</th>
          <th>Ação</th>
          <th>Entidade</th>
          <th>Detalhes</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(log => `
          <tr>
            <td>${new Date(log.createdAt).toLocaleString('pt-BR')}</td>
            <td>${log.userName || 'Sistema'}</td>
            <td><span class="badge badge-${log.action}">${log.action}</span></td>
            <td>${log.entity}</td>
            <td><small>${log.details || '-'}</small></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterLogs() {
  const actionFilter = document.getElementById('logActionFilter').value;
  const dateFilter = document.getElementById('logDateFilter').value;
  
  const filtered = allLogs.filter(log => {
    const matchAction = !actionFilter || log.action === actionFilter;
    const matchDate = !dateFilter || 
      new Date(log.createdAt).toISOString().split('T')[0] === dateFilter;
    return matchAction && matchDate;
  });
  
  displayLogs(filtered);
}

// Ações de usuário
function viewUserProfile(userId) {
  // Determinar tipo de usuário
  const user = allUsers.find(u => u._id === userId);
  if (!user) return;
  
  let url;
  if (user.type === 'candidato') {
    url = `/perfil-publico-candidato?id=${userId}`;
  } else if (user.type === 'empresa') {
    url = `/perfil-publico-empresa?id=${userId}`;
  } else if (user.type === 'admin') {
    url = `/perfil-publico-admin?id=${userId}`;
  }
  
  window.open(url, '_blank');
}

async function toggleUserStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  if (!confirm(`Deseja ${newStatus === 'active' ? 'ativar' : 'desativar'} este usuário?`)) {
    return;
  }
  
  try {
    const token = Auth.getToken();
    const response = await fetch(`/api/users/${userId}/status`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('Erro ao atualizar status');
    
    showMessage('Status do usuário atualizado com sucesso', 'success');
    await loadUsers();
    
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao atualizar status do usuário', 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    const token = Auth.getToken();
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Erro ao excluir usuário');
    
    showMessage('Usuário excluído com sucesso', 'success');
    await loadUsers();
    
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao excluir usuário', 'error');
  }
}

// Ações de vaga
function viewJob(jobId) {
  window.open(`/vaga/${jobId}`, '_blank');
}

async function deleteJob(jobId) {
  if (!confirm('Tem certeza que deseja excluir esta vaga?')) {
    return;
  }
  
  try {
    const token = Auth.getToken();
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Erro ao excluir vaga');
    
    showMessage('Vaga excluída com sucesso', 'success');
    await loadJobs();
    
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao excluir vaga', 'error');
  }
}

// Ações de notícia
function viewNews(newsId) {
  window.open(`/news-detail?id=${newsId}`, '_blank');
}

function editNews(newsId) {
  window.location.href = `/admin-noticia?id=${newsId}`;
}

async function deleteNews(newsId) {
  if (!confirm('Tem certeza que deseja excluir esta notícia?')) {
    return;
  }
  
  try {
    const token = Auth.getToken();
    const response = await fetch(`/api/news/${newsId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Erro ao excluir notícia');
    
    showMessage('Notícia excluída com sucesso', 'success');
    await loadNews();
    
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao excluir notícia', 'error');
  }
}

// Atualizar perfil
async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    bio: document.getElementById('bio').value
  };
  
  try {
    const token = Auth.getToken();
    const response = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) throw new Error('Erro ao atualizar perfil');
    
    showMessage('Perfil atualizado com sucesso', 'success');
    await loadCurrentUser();
    
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao atualizar perfil', 'error');
  }
}

// Alterar senha
async function handlePasswordChange(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (newPassword !== confirmPassword) {
    showMessage('As senhas não coincidem', 'error');
    return;
  }
  
  try {
    const token = Auth.getToken();
    const response = await fetch('/api/users/me/password', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao alterar senha');
    }
    
    showMessage('Senha alterada com sucesso', 'success');
    document.getElementById('passwordForm').reset();
    
  } catch (error) {
    console.error('Erro:', error);
    showMessage(error.message, 'error');
  }
}

// Upload de avatar
async function handleAvatarUpload(file) {
  console.log('=== handleAvatarUpload ===');
  console.log('File:', file);
  console.log('File type:', file.type);
  console.log('File size:', file.size);
  
  const formData = new FormData();
  formData.append('profilePhoto', file);
  
  console.log('FormData created');
  
  // Criar preview imediato
  const reader = new FileReader();
  reader.onload = (e) => {
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
      profileAvatar.innerHTML = `<img src="${e.target.result}" alt="Preview" style="opacity: 0.5;">`;
    }
  };
  reader.readAsDataURL(file);
  
  // Mostrar mensagem de carregamento
  showMessage('Fazendo upload da foto...', 'info');
  
  try {
    const token = Auth.getToken();
    console.log('Token:', token ? 'exists' : 'missing');
    
    const response = await fetch('/api/users/me', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response:', errorData);
      throw new Error(errorData.error || 'Erro ao fazer upload da foto');
    }
    
    const data = await response.json();
    console.log('Success response:', data);
    showMessage('Foto atualizada com sucesso!', 'success');
    
    // Atualizar avatar com a URL do Cloudinary
    const profileAvatar = document.getElementById('profileAvatar');
    if (data.user && data.user.profilePhotoUrl && profileAvatar) {
      profileAvatar.innerHTML = `<img src="${data.user.profilePhotoUrl}" alt="${data.user.name}">`;
    }
    
    // Atualizar dados do usuário
    currentUser = data.user;
    
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    showMessage(error.message || 'Erro ao fazer upload da foto', 'error');
    
    // Restaurar avatar anterior
    updateProfileHeader();
  }
}

// Utilitários
function formatUserType(type) {
  const types = {
    'candidato': 'Candidato',
    'empresa': 'Empresa',
    'admin': 'Administrador'
  };
  return types[type] || type;
}

function getActionIcon(action) {
  const icons = {
    'create': 'plus',
    'update': 'edit',
    'delete': 'trash',
    'login': 'sign-in-alt',
    'logout': 'sign-out-alt'
  };
  return icons[action] || 'circle';
}

function getActionText(action) {
  const texts = {
    'create': 'criou',
    'update': 'atualizou',
    'delete': 'excluiu',
    'login': 'fez login em',
    'logout': 'fez logout de'
  };
  return texts[action] || action;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  const intervals = {
    ano: 31536000,
    mês: 2592000,
    semana: 604800,
    dia: 86400,
    hora: 3600,
    minuto: 60
  };
  
  for (const [name, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return `há ${interval} ${name}${interval !== 1 ? 's' : ''}`;
    }
  }
  
  return 'agora mesmo';
}

function showMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, 5000);
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
  const modal = document.getElementById('avatarModal');
  if (event.target === modal) {
    closeAvatarModal();
  }
};
