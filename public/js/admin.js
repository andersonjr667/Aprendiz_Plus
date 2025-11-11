// admin.js — Admin Dashboard Enhanced

let currentUser = null;

async function checkAdminAccess() {
  try {
    const token = Auth.getToken();
    if (!token) {
      window.location.href = '/login';
      return false;
    }

    const response = await fetch('/api/users/me', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      window.location.href = '/login';
      return false;
    }

    currentUser = await response.json();

    if (currentUser.type !== 'admin') {
      showMessage('Acesso negado. Apenas administradores podem acessar esta página.', 'error');
      setTimeout(() => window.location.href = '/', 2000);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao verificar acesso:', error);
    window.location.href = '/login';
    return false;
  }
}

async function loadAdminSummary() {
  try {
    const token = Auth.getToken();
    
    // Carregar dados em paralelo
    const [usersRes, jobsRes, newsRes, applicationsRes] = await Promise.all([
      fetch('/api/users', { 
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/jobs', { credentials: 'include' }),
      fetch('/api/news', { credentials: 'include' }),
      fetch('/api/applications/all', { 
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => ({ ok: false, json: async () => [] }))
    ]);

    const container = document.getElementById('summary');
    if (!container) return;

    let statsHTML = '';

    // Processar usuários
    if (usersRes.ok) {
      const users = await usersRes.json();
      const totalUsers = users.length;
      const candidatos = users.filter(u => u.type === 'candidato').length;
      const empresas = users.filter(u => u.type === 'empresa').length;
      const admins = users.filter(u => u.type === 'admin' || u.type === 'owner').length;

      statsHTML += `
        <div class="stat-box">
          <h4>Total de Usuários</h4>
          <div class="stat-value">${totalUsers}</div>
          <div class="stat-change">
            <i class="fas fa-users"></i> 
            ${candidatos} candidatos, ${empresas} empresas, ${admins} admins
          </div>
        </div>
      `;
    }

    // Processar vagas
    if (jobsRes.ok) {
      const jobsData = await jobsRes.json();
      const jobs = jobsData.items || jobsData;
      const totalJobs = Array.isArray(jobs) ? jobs.length : 0;
      const activeJobs = Array.isArray(jobs) ? 
        jobs.filter(j => j.status === 'ativa' || j.status === 'active').length : 0;

      statsHTML += `
        <div class="stat-box">
          <h4>Vagas</h4>
          <div class="stat-value">${totalJobs}</div>
          <div class="stat-change">
            <i class="fas fa-check-circle"></i> ${activeJobs} ativas
          </div>
        </div>
      `;
    }

    // Processar notícias
    if (newsRes.ok) {
      const news = await newsRes.json();
      const totalNews = news.length;

      statsHTML += `
        <div class="stat-box">
          <h4>Notícias</h4>
          <div class="stat-value">${totalNews}</div>
          <div class="stat-change">
            <i class="fas fa-newspaper"></i> Publicadas
          </div>
        </div>
      `;
    }

    // Processar candidaturas
    if (applicationsRes.ok) {
      const applications = await applicationsRes.json();
      const totalApps = applications.length;
      const pendingApps = applications.filter(a => a.status === 'pending').length;

      statsHTML += `
        <div class="stat-box">
          <h4>Candidaturas</h4>
          <div class="stat-value">${totalApps}</div>
          <div class="stat-change">
            <i class="fas fa-hourglass-half"></i> ${pendingApps} pendentes
          </div>
        </div>
      `;
    }

    container.innerHTML = statsHTML;

  } catch (error) {
    console.error('Erro ao carregar resumo:', error);
    const container = document.getElementById('summary');
    if (container) {
      container.innerHTML = '<p class="error">Erro ao carregar estatísticas</p>';
    }
  }
}

async function loadRecentActivity() {
  try {
    const token = Auth.getToken();
    const response = await fetch('/api/logs?limit=20', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (!response.ok) {
      container.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">Erro ao carregar atividades recentes</p>';
      return;
    }

    const logs = await response.json();

    if (logs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #999;">
          <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p style="font-size: 1.1rem; font-weight: 500;">Nenhuma atividade recente</p>
          <p style="font-size: 0.9rem;">As atividades do sistema aparecerão aqui</p>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map(log => {
      const timeAgo = formatTimeAgo(log.createdAt || log.timestamp);
      const icon = getActionIcon(log.action);
      const actionText = getActionText(log.action);
      const resourceType = log.resourceType || 'item';
      const userBadge = getUserTypeBadge(log.userType);
      
      let detailsText = '';
      if (log.details) {
        if (log.details.userName) detailsText = log.details.userName;
        else if (log.details.jobTitle) detailsText = log.details.jobTitle;
        else if (log.details.newsTitle) detailsText = log.details.newsTitle;
        else if (log.details.field) detailsText = log.details.field;
      }

      return `
        <div class="activity-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; background: #f8f9fa; border-left: 3px solid var(--brand-green, #2ECC71);">
          <div style="min-width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #2ECC71, #27AE60); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">
            <i class="fas fa-${icon}"></i>
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <strong style="color: #333;">${log.userName}</strong>
              ${userBadge}
              <span style="color: #666;">${actionText}</span>
              <em style="color: #2ECC71; font-weight: 500;">${resourceType}</em>
              ${detailsText ? `<span style="color: #666;">• ${detailsText}</span>` : ''}
            </div>
            <div style="color: #999; font-size: 0.85rem; margin-top: 0.25rem;">
              <i class="fas fa-clock" style="font-size: 0.75rem;"></i> ${timeAgo}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao carregar atividades:', error);
    const container = document.getElementById('recentActivity');
    if (container) {
      container.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 2rem;">Erro ao carregar atividades recentes</p>';
    }
  }
}

async function loadSystemAlerts() {
  const container = document.getElementById('systemAlerts');
  if (!container) return;

  try {
    const token = Auth.getToken();
    
    // Carregar dados para gerar alertas
    const [usersRes, jobsRes] = await Promise.all([
      fetch('/api/users', { 
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/jobs', { credentials: 'include' })
    ]);

    const alerts = [];

    // Verificar usuários novos
    if (usersRes.ok) {
      const users = await usersRes.json();
      const recentUsers = users.filter(u => {
        const createdDate = new Date(u.createdAt);
        const daysSinceCreated = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
        return daysSinceCreated <= 7;
      });

      if (recentUsers.length > 0) {
        alerts.push({
          type: 'info',
          icon: 'user-plus',
          message: `${recentUsers.length} novo(s) usuário(s) registrado(s) nos últimos 7 dias`
        });
      }

      // Verificar usuários inativos
      const inactiveUsers = users.filter(u => u.status === 'inactive');
      if (inactiveUsers.length > 0) {
        alerts.push({
          type: 'warning',
          icon: 'user-times',
          message: `${inactiveUsers.length} usuário(s) inativo(s) no sistema`
        });
      }
    }

    // Verificar vagas
    if (jobsRes.ok) {
      const jobsData = await jobsRes.json();
      const jobs = jobsData.items || jobsData;
      
      if (Array.isArray(jobs)) {
        const activeJobs = jobs.filter(j => j.status === 'ativa' || j.status === 'active');
        
        if (activeJobs.length > 50) {
          alerts.push({
            type: 'success',
            icon: 'briefcase',
            message: `Excelente! Mais de ${activeJobs.length} vagas ativas na plataforma`
          });
        }

        // Vagas sem candidaturas
        const jobsWithoutApps = jobs.filter(j => !j.applicants_count || j.applicants_count === 0);
        if (jobsWithoutApps.length > 10) {
          alerts.push({
            type: 'warning',
            icon: 'exclamation-triangle',
            message: `${jobsWithoutApps.length} vagas sem candidaturas ainda`
          });
        }
      }
    }

    // Sistema operacional
    alerts.push({
      type: 'success',
      icon: 'check-circle',
      message: 'Todos os sistemas operacionais'
    });

    if (alerts.length === 0) {
      container.innerHTML = '<p class="no-content">Nenhum alerta no momento</p>';
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div class="alert-box ${alert.type}">
        <i class="fas fa-${alert.icon}"></i>
        <span>${alert.message}</span>
      </div>
    `).join('');

  } catch (error) {
    console.error('Erro ao carregar alertas:', error);
    container.innerHTML = '<p class="error">Erro ao carregar alertas</p>';
  }
}

// Utilitários
function getUserTypeBadge(userType) {
  const badges = {
    'admin': '<span style="background: #dc3545; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">ADMIN</span>',
    'empresa': '<span style="background: #007bff; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">EMPRESA</span>',
    'candidato': '<span style="background: #28a745; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">CANDIDATO</span>',
    'system': '<span style="background: #6c757d; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">SISTEMA</span>'
  };
  return badges[userType] || '';
}

function getActionIcon(action) {
  const icons = {
    'create': 'plus-circle',
    'update': 'edit',
    'delete': 'trash-alt',
    'login': 'sign-in-alt',
    'logout': 'sign-out-alt',
    'register': 'user-plus',
    'ban': 'ban',
    'kick': 'user-clock',
    'unban': 'unlock',
    'profile_update': 'user-edit',
    'apply': 'paper-plane',
    'upload': 'upload'
  };
  return icons[action] || 'circle';
}

function getActionText(action) {
  const texts = {
    'create': 'criou',
    'update': 'atualizou',
    'delete': 'excluiu',
    'login': 'fez login',
    'logout': 'fez logout',
    'register': 'registrou',
    'ban': 'baniu',
    'kick': 'expulsou',
    'unban': 'desbaniu',
    'profile_update': 'atualizou perfil',
    'apply': 'candidatou-se',
    'upload': 'fez upload'
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
  if (!container) return;

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

// Inicialização
window.addEventListener('DOMContentLoaded', async () => {
  const hasAccess = await checkAdminAccess();
  
  if (hasAccess) {
    await Promise.all([
      loadAdminSummary(),
      loadRecentActivity(),
      loadSystemAlerts()
    ]);
    
    // Add refresh button listener
    const refreshBtn = document.getElementById('refreshActivity');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('i');
        if (icon) {
          icon.classList.add('fa-spin');
        }
        refreshBtn.disabled = true;
        
        await loadRecentActivity();
        
        if (icon) {
          icon.classList.remove('fa-spin');
        }
        refreshBtn.disabled = false;
      });
    }
  }
});

