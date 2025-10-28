// Helpers para autenticação (armazenamento de JWT)
// Inicializa o header quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (window.Auth && window.Auth.updateHeader) {
    window.Auth.updateHeader();
  }
});

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
            `<a href="/perfil-candidato">Meu Perfil</a>` : 
            user.type === 'empresa' ? 
            `<a href="/perfil-empresa">Minha Empresa</a>
             <a href="/publicar-vaga" class="btn btn-primary">Publicar Vaga</a>` :
            user.type === 'admin' ? 
            `<a href="/admin">Admin</a>` : ''
          }
          <button onclick="logout()" class="btn btn-outline">Sair</button>
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
async function login(event) {
  event.preventDefault();
  const form = event.target;
  const data = { email: form.email.value, password: form.password.value };
  showMessage('Entrando...', 'info');
  try {
    const res = await fetch('/api/auth/login', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data), 
      credentials: 'include' 
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      if (json.token) window.Auth.setToken(json.token);
      showMessage('Login realizado com sucesso', 'success');
      window.Auth.updateHeader(); // Atualiza o header
      window.location = '/';
    } else {
      showMessage(json.error || 'Erro ao fazer login', 'error');
    }
  } catch (err) {
    showMessage(err.message || 'Erro de rede', 'error');
  }
}

async function register(event) {
  event.preventDefault();
  const form = event.target;
  const data = { 
    name: form.name.value, 
    email: form.email.value, 
    password: form.password.value, 
    type: document.getElementById('userType').value 
  };
  showMessage('Registrando...', 'info');
  try {
  const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
    const json = await res.json();
    if (res.ok && json.ok) {
      showMessage('Conta criada com sucesso. Redirecionando para login...', 'success');
      window.location = '/login?registered=true';
    } else {
      const msg = (json.errors && json.errors[0] && json.errors[0].msg) || json.error || 'Erro ao criar conta';
      showMessage(msg, 'error');
    }
  } catch (err) {
    showMessage(err.message || 'Erro de rede', 'error');
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    window.Auth.removeToken();
    window.Auth.updateHeader();
    showMessage('Logout realizado com sucesso', 'success');
    window.location = '/';
  } catch (err) {
    showMessage('Erro ao fazer logout', 'error');
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
