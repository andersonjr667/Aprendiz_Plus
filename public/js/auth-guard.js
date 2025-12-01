// Lista de páginas públicas (sem login)
console.log('[AUTH-GUARD] Iniciando proteção de rota...');
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
  const isPublic = PUBLIC_PAGES.some(p => file === p || path.endsWith('/' + p));
  console.log('[AUTH-GUARD] Página atual:', path, '| Arquivo:', file, '| Pública?', isPublic);
  return isPublic;
}


async function isLoggedIn() {
  // Aguarda até 1s pelo Auth (caso seja carregado de forma assíncrona)
  let waited = 0;
  while (waited < 1000) {
    if (window.Auth && typeof window.Auth.isLoggedIn === 'function') {
      const logged = window.Auth.isLoggedIn();
      console.log('[AUTH-GUARD] window.Auth.isLoggedIn():', logged);
      return logged;
    }
    await new Promise(r => setTimeout(r, 50));
    waited += 50;
  }
  // Fallback: verifica cookie 'token' (simples, não seguro para produção)
  const fallback = document.cookie.includes('token=');
  console.log('[AUTH-GUARD] Fallback cookie token:', fallback);
  return fallback;
}



(async function enforceAuth() {
  const isPublic = isPublicPage();
  if (isPublic) {
    console.log('[AUTH-GUARD] Página pública, acesso liberado.');
    return;
  }
  const logged = await isLoggedIn();
  if (logged) {
    console.log('[AUTH-GUARD] Usuário autenticado, acesso liberado.');
    return;
  }
  console.warn('[AUTH-GUARD] Não autenticado! Redirecionando para /login');
  window.location.href = '/login';
})();
