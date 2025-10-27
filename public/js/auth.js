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

  // Expor globalmente
  window.Auth = {
    setToken, getToken, removeToken, isAuthenticated
  };
})(window);
async function login(event) {
  event.preventDefault();
  const form = event.target;
  const data = { email: form.email.value, password: form.password.value };
  const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (json.ok) window.location = '/'; else alert(json.error || 'Erro');
}

async function register(event) {
  event.preventDefault();
  const form = event.target;
  const data = { name: form.name.value, email: form.email.value, password: form.password.value, type: form.type.value };
  const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (json.ok) window.location = '/login'; else alert((json.errors && json.errors[0].msg) || json.error || 'Erro');
}

window.login = login;
window.register = register;
