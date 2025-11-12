// Helpers para autenticação (armazenamento de JWT)
(function(window){
  const STORAGE_KEY = 'aprendizplus_token';

  function setToken(token){
    if(!token) return removeToken();
    try{ localStorage.setItem(STORAGE_KEY, token); }catch(e){ console.warn('Não foi possível salvar token', e); }
  }
  function getToken(){
    try{ return localStorage.getItem(STORAGE_KEY); }catch(e){ return null; }
  }
  function removeToken(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }
  function isAuthenticated(){ return !!getToken(); }

    async function getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/users/me', { 
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 403) {
        // User is banned or suspended
        const data = await res.json();
        
        if (data.banned) {
          removeToken();
          alert(`Sua conta foi BANIDA.\n\nMotivo: ${data.reason}\n${data.message ? '\nMensagem: ' + data.message : ''}\n\nVocê será redirecionado para a página inicial.`);
          window.location.href = '/';
          return null;
        }
        
        if (data.suspended) {
          removeToken();
          const suspendedUntil = new Date(data.suspendedUntil);
          const days = Math.ceil((suspendedUntil - new Date()) / (1000 * 60 * 60 * 24));
          alert(`Sua conta está SUSPENSA até ${suspendedUntil.toLocaleDateString('pt-BR')} (${days} dias).\n\nMotivo: ${data.reason}\n${data.message ? '\nMensagem: ' + data.message : ''}\n\nVocê será redirecionado para a página inicial.`);
          window.location.href = '/';
          return null;
        }
      }
      
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      console.error('Erro ao obter usuário atual:', e);
      return null;
    }
  }

  function updateHeader() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;

    getCurrentUser().then(user => {
      if (user) {
        // Usuario logado
        nav.innerHTML = `
          <a href="/vagas">Vagas</a>
          <a href="/noticias">Notícias</a>
          ${user.type === 'candidato' ? 
            `<a href="/dashboard-candidato">
              <i class="fas fa-chart-line"></i> Dashboard
             </a>
             <a href="/perfil-candidato">Meu Perfil</a>` : 
            user.type === 'empresa' ? 
            `<a href="/painel-empresa">
              <i class="fas fa-chart-line"></i> Painel
             </a>
             <a href="/perfil-empresa">Minha Empresa</a>
             <a href="/publicar-vaga" class="btn btn-primary">Publicar Vaga</a>` :
            user.type === 'owner' ? 
            `<a href="/perfil-admin">
              <i class="fas fa-crown"></i> Meu Perfil
             </a>
             <a href="/admin">
              <i class="fas fa-tachometer-alt"></i> Painel Admin
             </a>
             <a href="/admin-manage-admins" class="btn btn-primary" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <i class="fas fa-user-shield"></i> Gerenciar Admins
             </a>` :
            user.type === 'admin' ? 
            `<a href="/perfil-admin">Meu Perfil</a>
             <a href="/admin">Painel Admin</a>` : ''
          }
          <button onclick="logout()" class="btn btn-logout">
            <i class="fas fa-sign-out-alt"></i> Sair
          </button>
        `;
      } else {
        // Usuario não logado
        nav.innerHTML = `
          <a href="/vagas">Vagas</a>
          <a href="/para-empresas">Para Empresas</a>
          <a href="/noticias">Notícias</a>
          <a href="/login" class="nav-link-login">Fazer Login</a>
          <a href="/register" class="btn btn-primary">Cadastre-se</a>
        `;
      }
    });
  }

  // Expor globalmente
  window.Auth = {
    setToken, getToken, removeToken, isAuthenticated,
    getCurrentUser, updateHeader
  };
})(window);

// Inicializa o header quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (window.Auth && window.Auth.updateHeader) {
    window.Auth.updateHeader();
  }
});

async function login(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  
  // Validação de entrada
  if (!email) {
    showMessage('Por favor, insira seu e-mail', 'error');
    return;
  }
  if (!password) {
    showMessage('Por favor, insira sua senha', 'error');
    return;
  }
  if (!email.includes('@')) {
    showMessage('E-mail inválido. Verifique o formato (exemplo: seu@email.com)', 'error');
    return;
  }
  
  showMessage('Entrando...', 'info');
  try {
    const res = await fetch('/api/auth/login', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email, password }), 
      credentials: 'include' 
    });
    const json = await res.json();
    
    // Handle banned/suspended users
    if (res.status === 403) {
      if (json.banned) {
        showMessage(`Sua conta foi BANIDA. Motivo: ${json.reason}. ${json.message}`, 'error');
        return;
      }
      if (json.suspended) {
        const days = json.daysLeft || 0;
        showMessage(`Sua conta está SUSPENSA por mais ${days} dia(s). Motivo: ${json.reason}. ${json.message}`, 'error');
        return;
      }
    }
    
    if (res.ok && json.ok) {
      if (json.token) window.Auth.setToken(json.token);
      showMessage('Login realizado com sucesso', 'success');
      window.Auth.updateHeader(); // Atualiza o header
      setTimeout(() => { window.location = '/'; }, 500);
    } else {
      // Mensagens de erro mais claras e construtivas
      let errorMsg = 'Erro ao fazer login';
      if (json.error === 'Invalid credentials') {
        errorMsg = 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
      } else if (json.error) {
        errorMsg = json.error;
      }
      showMessage(errorMsg, 'error');
    }
  } catch (err) {
    showMessage('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
  }
}

async function register(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const type = document.getElementById('userType').value;
  
  // Validação de entrada
  if (!name) {
    showMessage('Por favor, insira seu nome completo', 'error');
    return;
  }
  if (!email) {
    showMessage('Por favor, insira seu e-mail', 'error');
    return;
  }
  if (!email.includes('@')) {
    showMessage('E-mail inválido. Use o formato: seu@email.com', 'error');
    return;
  }
  if (!password) {
    showMessage('Por favor, insira uma senha', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('A senha deve ter no mínimo 6 caracteres', 'error');
    return;
  }
  
  showMessage('Registrando...', 'info');
  try {
  const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, type }), credentials: 'include' });
    const json = await res.json();
    if (res.ok && json.ok) {
      showMessage('Conta criada com sucesso. Redirecionando para login...', 'success');
      setTimeout(() => { window.location = '/login?registered=true'; }, 500);
    } else {
      // Mensagens de erro mais claras e construtivas
      let errorMsg = 'Erro ao criar conta';
      if (json.errors && json.errors[0] && json.errors[0].msg) {
        errorMsg = json.errors[0].msg;
      } else if (json.error === 'Email already in use') {
        errorMsg = 'Este e-mail já está registrado. Tente fazer login ou use outro e-mail.';
      } else if (json.error) {
        errorMsg = json.error;
      }
      showMessage(errorMsg, 'error');
    }
  } catch (err) {
    showMessage('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
  }
}

async function logout() {
  // Usar UI.danger para confirmação de logout
  try {
    const confirmed = window.UI && window.UI.danger 
      ? await window.UI.danger({
          title: 'Sair da Conta',
          message: 'Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.',
          confirmText: 'Sim, sair',
          cancelText: 'Cancelar'
        })
      : confirm('Tem certeza que deseja sair?');
    
    if (!confirmed) return;
  } catch (e) {
    console.error('Erro ao exibir confirmação:', e);
    // fallback to native confirm
    const confirmed = confirm('Tem certeza que deseja sair?');
    if (!confirmed) return;
  }

  try {
    const token = window.Auth.getToken();
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    // Remove token and user data
    window.Auth.removeToken();
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    // Mostrar toast de sucesso
    if (window.UI && window.UI.toast) {
      window.UI.toast('Logout realizado com sucesso!', 'success', 2000);
    }
    
    setTimeout(() => window.location.href = '/', 1000);
  } catch (error) {
    // Even if server fails, clear local data
    window.Auth.removeToken();
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    if (window.UI && window.UI.toast) {
      window.UI.toast('Logout realizado', 'success', 2000);
    }
    
    setTimeout(() => window.location.href = '/', 1000);
  }
}

window.login = login;
window.register = register;
window.logout = logout;

// Simple toast / message helper shown in top-right
function showMessage(message, type = 'info', timeout = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.position = 'fixed';
    container.style.top = '16px';
    container.style.right = '16px';
    container.style.zIndex = 9999;
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.textContent = message;
  el.style.marginTop = '8px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '6px';
  el.style.color = '#fff';
  el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
  if (type === 'success') el.style.background = '#16a34a';
  else if (type === 'error') el.style.background = '#dc2626';
  else el.style.background = '#2563eb';
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, timeout);
}
