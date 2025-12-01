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


async function isLoggedIn() {
  // Aguarda até 1s pelo Auth (caso seja carregado de forma assíncrona)
  let waited = 0;
  while (waited < 1000) {
    if (window.Auth && typeof window.Auth.isLoggedIn === 'function') {
      return window.Auth.isLoggedIn();
    }
    await new Promise(r => setTimeout(r, 50));
    waited += 50;
  }
  // Fallback: verifica cookie 'token' (simples, não seguro para produção)
  return document.cookie.includes('token=');
}


(async function enforceAuth() {
  if (isPublicPage()) return;
  if (await isLoggedIn()) return;
  window.location.href = '/login';
})();
