// @ts-nocheck
// admin-usuarios.js - Gestão de Usuários
console.log('admin-usuarios.js loaded');

let currentUser = null;
let currentModerationAction = null;
let currentModerationUserId = null;
let currentModerationUserName = null;

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

    if (currentUser.type !== 'admin' && currentUser.type !== 'owner') {
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

async function loadUsers() {
  const type = (document.getElementById('filterType') && document.getElementById('filterType').value) || '';
  const searchTerm = (document.getElementById('searchInput') && document.getElementById('searchInput').value.trim()) || '';
  const token = Auth.getToken();
  
  try {
    const res = await fetch('/api/users' + (type ? ('?type=' + encodeURIComponent(type)) : ''), {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let data = await res.json();
    const tbody = document.querySelector('#usersTable tbody');
    const thead = document.querySelector('#usersTable thead tr');
    
    if (!tbody || !thead) return;
    
    if (!res.ok) {
      tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar usuários</td></tr>';
      return;
    }

    // Filter by search term
    if (searchTerm) {
      data = data.filter(u => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search);
      });
    }

    // Update results count
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
      const typeText = type ? ` (${type})` : '';
      const searchText = searchTerm ? ` com "${searchTerm}"` : '';
      resultsCount.innerHTML = `<i class="fas fa-users"></i> <strong>${data.length}</strong> usuário${data.length !== 1 ? 's' : ''} encontrado${data.length !== 1 ? 's' : ''}${typeText}${searchText}`;
    }

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #999;">Nenhum usuário encontrado</td></tr>';
      return;
    }

    // Check if we're viewing companies specifically
    const isCompanyView = type.toLowerCase() === 'empresa';
    
    // Update table headers based on view
    if (isCompanyView) {
      thead.innerHTML = `
        <th>Nome</th>
        <th>Email</th>
        <th>Website</th>
        <th>Vagas Ativas</th>
        <th>Status</th>
        <th>Ações</th>
      `;
    } else {
      thead.innerHTML = `
        <th>Nome</th>
        <th>Email</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Ações</th>
      `;
    }

    tbody.innerHTML = '';
    
    // If company view, fetch job counts
    let jobCounts = {};
    if (isCompanyView) {
      try {
        const jobsRes = await fetch('/api/jobs', {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const jobs = await jobsRes.json();
        
        // Count active jobs per company
        jobs.forEach(job => {
          if (job.company && job.company._id) {
            const companyId = job.company._id;
            jobCounts[companyId] = (jobCounts[companyId] || 0) + 1;
          }
        });
      } catch (err) {
        console.error('Erro ao carregar vagas:', err);
      }
    }
    
    data.forEach(u => {
      const tr = document.createElement('tr');
      let statusClass = 'active';
      let statusText = 'Ativo';
      
      if (u.status === 'banned') {
        statusClass = 'banned';
        statusText = 'Banido';
      } else if (u.status === 'suspended') {
        statusClass = 'suspended';
        statusText = 'Suspenso';
      } else if (u.status === 'inactive') {
        statusClass = 'inactive';
        statusText = 'Inativo';
      }
      
      if (isCompanyView) {
        const jobCount = jobCounts[u._id] || 0;
        const website = u.website ? `<a href="${u.website}" target="_blank" rel="noopener noreferrer" style="color: #007bff;">${u.website}</a>` : '<span style="color: #999;">-</span>';
        
        tr.innerHTML = `
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <strong>${u.name || 'Sem nome'}</strong>
              ${u.description ? `<small style="color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${u.description}">${u.description}</small>` : ''}
            </div>
          </td>
          <td>${u.email}</td>
          <td>${website}</td>
          <td>
            <span class="badge" style="background: ${jobCount > 0 ? '#28a745' : '#6c757d'}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">
              ${jobCount} vaga${jobCount !== 1 ? 's' : ''}
            </span>
          </td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>
            <div class="action-buttons">
              <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-warning action-ban' title="Banir empresa" ${u.status === 'banned' ? 'disabled' : ''}>
                <i class="fas fa-ban"></i> Banir
              </button>
              <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-outline action-kick' title="Expulsar temporariamente" ${u.status === 'banned' || u.status === 'suspended' ? 'disabled' : ''}>
                <i class="fas fa-user-clock"></i> Expulsar
              </button>
              <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-danger action-delete' title="Deletar empresa">
                <i class="fas fa-trash"></i> Deletar
              </button>
              ${u.status === 'banned' || u.status === 'suspended' ? `
                <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-success action-unban' title="Desbanir empresa">
                  <i class="fas fa-unlock"></i> Desbanir
                </button>
              ` : ''}
            </div>
          </td>
        `;
      } else {
        tr.innerHTML = `
          <td>${u.name || 'Sem nome'}</td>
          <td>${u.email}</td>
          <td><span style="text-transform: capitalize;">${u.type}</span></td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>
            <div class="action-buttons">
              <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-warning action-ban' title="Banir usuário" ${u.status === 'banned' ? 'disabled' : ''}>
                <i class="fas fa-ban"></i> Banir
              </button>
              <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-outline action-kick' title="Expulsar temporariamente" ${u.status === 'banned' || u.status === 'suspended' ? 'disabled' : ''}>
                <i class="fas fa-user-clock"></i> Expulsar
              </button>
              <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-danger action-delete' title="Deletar usuário">
                <i class="fas fa-trash"></i> Deletar
              </button>
              ${u.status === 'banned' || u.status === 'suspended' ? `
                <button data-id='${u._id}' data-name='${u.name || u.email}' class='btn btn-success action-unban' title="Desbanir usuário">
                  <i class="fas fa-unlock"></i> Desbanir
                </button>
              ` : ''}
            </div>
          </td>
        `;
      }
      
      tbody.appendChild(tr);
    });

    // Event listeners para ações de moderação
    document.querySelectorAll('.action-ban').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;
        console.log('Ban button clicked:', { id, name });
        openModerationModal('ban', id, name);
      });
    });

    document.querySelectorAll('.action-kick').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;
        console.log('Kick button clicked:', { id, name });
        openModerationModal('kick', id, name);
      });
    });

    document.querySelectorAll('.action-delete').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;
        console.log('Delete button clicked:', { id, name });
        openModerationModal('delete', id, name);
      });
    });

    document.querySelectorAll('.action-unban').forEach(b => {
      b.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;
        
        if (!(await window.confirm(`Tem certeza que deseja desbanir ${name}?`))) {
          return;
        }

        try {
          const res = await fetch(`/api/users/${id}/unban`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Auth.getToken()}`
            }
          });

          const d = await res.json();
          
          if (res.ok) {
            showMessage('Usuário desbanido com sucesso!', 'success');
            loadUsers();
          } else {
            showMessage(d.error || 'Erro ao desbanir usuário', 'error');
          }
        } catch (error) {
          console.error('Erro:', error);
          showMessage('Erro ao desbanir usuário', 'error');
        }
      });
    });

  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    const tbody = document.querySelector('#usersTable tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar usuários</td></tr>';
    }
  }
}

function showMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
  if (!container) return;

  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.style.cssText = `
    position: fixed;
    top: 90px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  
  messageEl.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
    <span style="margin-left: 0.5rem;">${message}</span>
  `;
  
  container.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => messageEl.remove(), 300);
  }, 3000);
}

// Moderation Modal Functions
function openModerationModal(action, userId, userName) {
  console.log('Opening moderation modal:', { action, userId, userName });
  
  currentModerationAction = action;
  currentModerationUserId = userId;
  currentModerationUserName = userName;

  const modal = document.getElementById('moderationModal');
  const modalTitle = document.getElementById('modalTitle');
  const userInfo = document.getElementById('userInfo');
  const durationGroup = document.getElementById('durationGroup');

  if (!modal || !modalTitle || !userInfo || !durationGroup) {
    console.error('Modal elements not found!');
    return;
  }

  // Update modal content based on action
  let actionText = action === 'ban' ? 'Banir' : action === 'kick' ? 'Expulsar' : 'Deletar';
  let actionColor = action === 'ban' ? '#dc3545' : action === 'kick' ? '#ffc107' : '#6c757d';
  
  modalTitle.textContent = `${actionText} Usuário`;
  modalTitle.style.color = actionColor;
  userInfo.textContent = `Você está prestes a ${actionText.toLowerCase()} o usuário: ${userName}`;

  // Show/hide duration field based on action
  if (action === 'kick') {
    durationGroup.style.display = 'block';
    document.getElementById('moderationDuration').required = true;
  } else {
    durationGroup.style.display = 'none';
    document.getElementById('moderationDuration').required = false;
    document.getElementById('moderationDuration').value = '';
  }

  // Reset form
  document.getElementById('moderationReason').value = '';
  document.getElementById('moderationMessage').value = '';

  // Show modal
  modal.style.display = 'flex';
  console.log('Modal displayed');
}

function closeModerationModal() {
  const modal = document.getElementById('moderationModal');
  modal.style.display = 'none';
  
  currentModerationAction = null;
  currentModerationUserId = null;
  currentModerationUserName = null;
}

async function confirmModeration() {
  console.log('Confirming moderation:', currentModerationAction);
  
  const reason = document.getElementById('moderationReason').value;
  const message = document.getElementById('moderationMessage').value.trim();
  const duration = document.getElementById('moderationDuration').value;

  console.log('Moderation data:', { reason, message, duration });

  if (!reason) {
    showMessage('Por favor, selecione um motivo', 'error');
    return;
  }

  if (currentModerationAction === 'kick' && (!duration || duration < 1 || duration > 365)) {
    showMessage('Por favor, informe uma duração válida (1-365 dias)', 'error');
    return;
  }

  if (currentModerationAction === 'delete') {
    if (!(await window.confirm(`ATENÇÃO: Você está prestes a DELETAR permanentemente o usuário ${currentModerationUserName}. Esta ação NÃO PODE ser desfeita. Tem certeza?`))) {
      return;
    }

    try {
      console.log('Sending DELETE request to:', `/api/users/${currentModerationUserId}`);
      
      const res = await fetch(`/api/users/${currentModerationUserId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ reason, message })
      });

      const d = await res.json();
      console.log('DELETE response:', d);
      
      if (res.ok) {
        showMessage('Usuário deletado com sucesso!', 'success');
        closeModerationModal();
        loadUsers();
      } else {
        showMessage(d.error || 'Erro ao deletar usuário', 'error');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      showMessage('Erro ao deletar usuário', 'error');
    }
    return;
  }

  // For ban and kick actions
  const endpoint = currentModerationAction === 'ban' ? 'ban' : 'kick';
  const body = { reason, message };
  
  if (currentModerationAction === 'kick') {
    body.duration = parseInt(duration);
  }

  try {
    console.log('Sending POST request to:', `/api/users/${currentModerationUserId}/${endpoint}`);
    console.log('Request body:', body);
    
    const res = await fetch(`/api/users/${currentModerationUserId}/${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Auth.getToken()}`
      },
      body: JSON.stringify(body)
    });

    const d = await res.json();
    console.log('POST response:', d);
    
    if (res.ok) {
      const actionText = currentModerationAction === 'ban' ? 'banido' : 'expulso';
      showMessage(`Usuário ${actionText} com sucesso!`, 'success');
      closeModerationModal();
      loadUsers();
    } else {
      showMessage(d.error || `Erro ao ${currentModerationAction === 'ban' ? 'banir' : 'expulsar'} usuário`, 'error');
    }
  } catch (error) {
    console.error('Erro:', error);
    showMessage(`Erro ao ${currentModerationAction === 'ban' ? 'banir' : 'expulsar'} usuário`, 'error');
  }
}

// Inicialização
window.addEventListener('DOMContentLoaded', async function() {
  const hasAccess = await checkAdminAccess();
  
  if (hasAccess) {
    const btn = document.getElementById('loadBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const filterType = document.getElementById('filterType');
    
    if (btn) {
      btn.addEventListener('click', loadUsers);
    }
    
    // Clear search button
    if (clearSearch && searchInput) {
      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        loadUsers();
      });
    }
    
    // Search on Enter key
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          loadUsers();
        }
      });
      
      // Show/hide clear button and real-time search
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        // Show/hide clear button
        if (clearSearch) {
          clearSearch.style.display = e.target.value ? 'block' : 'none';
        }
        
        // Real-time search (debounced)
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          loadUsers();
        }, 500); // Wait 500ms after user stops typing
      });
    }
    
    // Filter change triggers search
    if (filterType) {
      filterType.addEventListener('change', loadUsers);
    }
    
    // Modal event listeners
    const modalClose = document.querySelector('.modal-close');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');

    if (modalClose) {
      modalClose.addEventListener('click', closeModerationModal);
    }

    if (modalCancel) {
      modalCancel.addEventListener('click', closeModerationModal);
    }

    if (modalConfirm) {
      modalConfirm.addEventListener('click', confirmModeration);
      console.log('Modal confirm button listener attached');
    }

    // Close modal when clicking outside
    const modal = document.getElementById('moderationModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModerationModal();
        }
      });
    }
    
    console.log('Loading users...');
    loadUsers();
    console.log('Admin usuarios page initialized successfully');
  }
});
