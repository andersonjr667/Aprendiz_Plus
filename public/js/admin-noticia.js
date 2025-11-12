// admin-noticia.js - Gestão de Notícias

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

async function createNews(e) {
  e.preventDefault();
  
  const token = Auth.getToken();
  const f = new FormData(e.target);
  const payload = Object.fromEntries(f.entries());
  
  if (!payload.title || !payload.content) {
    showMessage('Por favor, preencha todos os campos', 'error');
    return;
  }

  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const d = await res.json();
    
    if (res.ok) {
      showMessage('Notícia criada com sucesso!', 'success');
      e.target.reset();
      loadNewsList();
    } else {
      showMessage(d.error || 'Erro ao criar notícia', 'error');
    }
  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao criar notícia', 'error');
  }
}

async function loadNewsList() {
  const token = Auth.getToken();
  
  try {
    const res = await fetch('/api/news', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const d = await res.json();
    const c = document.getElementById('list');
    
    if (!c) return;
    
    if (!res.ok) {
      c.innerHTML = '<p class="error">Erro ao carregar notícias</p>';
      return;
    }

    if (d.length === 0) {
      c.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>Nenhuma notícia publicada ainda</p>
        </div>
      `;
      return;
    }

    c.innerHTML = '';
    
    d.forEach(n => {
      const div = document.createElement('div');
      div.className = 'news-item';
      
      const createdDate = new Date(n.createdAt);
      const formattedDate = createdDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      
      div.innerHTML = `
        <h4>${n.title}</h4>
        <p>${(n.content || '').slice(0, 300)}${n.content && n.content.length > 300 ? '...' : ''}</p>
        <div style="color: #666; font-size: 0.875rem; margin-bottom: 1rem;">
          <i class="fas fa-calendar"></i> Publicado em ${formattedDate}
        </div>
        <div class="news-actions">
          <button data-id='${n.id}' class='btn btn-outline remove'>
            <i class="fas fa-trash"></i> Remover
          </button>
          <a href="/news-detail?id=${n.id}" class="btn btn-secondary" target="_blank">
            <i class="fas fa-eye"></i> Visualizar
          </a>
        </div>
      `;
      
      c.appendChild(div);
    });

    // Adicionar event listeners aos botões de remoção
    document.querySelectorAll('.remove').forEach(b => {
      b.addEventListener('click', async e => {
        if (!confirm('Tem certeza que deseja remover esta notícia?')) return;
        
        const id = e.currentTarget.dataset.id;
        
        try {
          const res = await fetch('/api/news/' + id, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            showMessage('Notícia removida com sucesso!', 'success');
            loadNewsList();
          } else {
            const d = await res.json();
            showMessage(d.error || 'Erro ao remover notícia', 'error');
          }
        } catch (error) {
          console.error('Erro:', error);
          showMessage('Erro ao remover notícia', 'error');
        }
      });
    });

  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    const c = document.getElementById('list');
    if (c) {
      c.innerHTML = '<p class="error">Erro ao carregar notícias</p>';
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

// Inicialização
window.addEventListener('DOMContentLoaded', async function() {
  const hasAccess = await checkAdminAccess();
  
  if (hasAccess) {
    const form = document.getElementById('newsForm');
    if (form) {
      form.addEventListener('submit', createNews);
    }
    
    loadNewsList();
  }
});
