// Lista de páginas públicas (sem login)
const PUBLIC_PAGES = [
  'index.html', 'index', '/', '',
  'login.html', 'login',
  'register.html', 'register',
  'forgot-password.html', 'forgot-password',
  '404.html', '404',
  'contato.html', 'contato',
  'noticias.html', 'noticias',
  'vagas.html', 'vagas',
  'perfil-candidato.html', 'perfil-empresa.html', 'perfil-publico.html', 'perfil.html', // perfis públicos
  'gerar-curriculo.html', 'gerar-curriculo', '/gerar-curriculo'
];

function isPublicPage() {
  const path = window.location.pathname.toLowerCase();
  const file = path.split('/').pop();
  // Permite acesso se for página pública
  return PUBLIC_PAGES.some(p => file === p || path.endsWith('/' + p));
}

function isLoggedIn() {
  // window.Auth pode ser inicializado por header.js ou auth.js
  if (window.Auth && typeof window.Auth.isLoggedIn === 'function') {
    return window.Auth.isLoggedIn();
  }
  // Fallback: verifica cookie 'token' (simples, não seguro para produção)
  return document.cookie.includes('token=');
}

(function enforceAuth() {
  if (isPublicPage()) return;
  if (isLoggedIn()) return;
  // Redireciona para login.html (ou index.html)
  window.location.href = '/login';
})();
