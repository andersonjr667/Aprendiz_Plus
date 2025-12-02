// auth-guard.js - Simplified guard that follows header.js login detection
// Protege rotas não públicas redirecionando para /login quando usuário não autenticado

const PUBLIC_PAGES = new Set([
  'index.html', 'index', '/', '',
  'login.html', 'login',
  'register.html', 'register',
  'forgot-password', 'forgot-password.html',
  '404', '404.html',
  'contato', 'contato.html',
  'noticias', 'noticias.html',
  'vagas', 'vagas.html',
  'perfil-candidato.html', 'perfil-empresa.html', 'perfil-publico.html', 'perfil.html',
  'dashboard-candidato.html', 'dashboard-candidato',
  'gerar-curriculo', 'gerar-curriculo.html'
]);

function getCurrentFile() {
  const path = window.location.pathname || '/';
  return path.split('/').pop().toLowerCase();
}

function isPublicPage() {
  const file = getCurrentFile();
  if (PUBLIC_PAGES.has(file)) return true;
  // allow matches like /some/path/index.html
  const path = window.location.pathname || '/';
  for (const p of PUBLIC_PAGES) {
    if (!p) continue;
    if (path.endsWith('/' + p) || path === p) return true;
  }
  return false;
}

function waitForEvent(eventName, timeout = 2000) {
  return new Promise(resolve => {
    let done = false;
    function cleanup() { done = true; document.removeEventListener(eventName, onEvent); clearTimeout(timer); }
    function onEvent() { if (done) return; cleanup(); resolve(true); }
    document.addEventListener(eventName, onEvent);
    const timer = setTimeout(() => { if (!done) { cleanup(); resolve(false); } }, timeout);
  });
}

async function waitForAuthObject(timeout = 2000) {
  const start = Date.now();
  while ((Date.now() - start) < timeout) {
    if (window.Auth) return window.Auth;
    await new Promise(r => setTimeout(r, 100));
  }
  return window.Auth || null;
}

function headerShowsLoggedIn() {
  try {
    const actions = document.querySelector('.apz-header__actions');
    if (!actions) return false;
    if (actions.querySelector('.apz-header__user-menu') || actions.querySelector('#apz-logout-btn')) return true;
    return false;
  } catch (e) { return false; }
}

function headerShowsLoggedOut() {
  try {
    const actions = document.querySelector('.apz-header__actions');
    if (!actions) return false;
    if (actions.querySelector('.apz-header__login') || actions.querySelector('a[href="/login"]')) return true;
    return false;
  } catch (e) { return false; }
}

async function serverSessionCheck(timeout = 1500) {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch('/api/users/me', { credentials: 'include', signal: ctrl.signal });
    clearTimeout(id);
    return res && res.ok;
  } catch (e) { return false; }
}

async function guard() {
  if (isPublicPage()) return;

  // 1) Wait for header to render (header.js dispatches 'apz:header-ready') — prefer DOM-based detection
  const headerReady = await waitForEvent('apz:header-ready', 2500);
  if (headerReady) {
    if (headerShowsLoggedIn()) return;
    if (headerShowsLoggedOut()) {
      // header explicitly shows login links -> user is not logged -> redirect
      window.location.href = '/login';
      return;
    }
    // otherwise fall through to auth object checks
  }

  // 2) Ask auth object (same approach used by header.js)
  const auth = await waitForAuthObject(2000);
  if (auth) {
    try {
      if (typeof auth.isAuthenticated === 'function' && auth.isAuthenticated()) return;
      if (typeof auth.getToken === 'function' && auth.getToken()) return;
    } catch (e) { /* ignore */ }
  }

  // 3) quick localStorage token check (fast)
  try {
    const t = localStorage.getItem('aprendizplus_token');
    if (t) return;
  } catch (e) { }

  // 4) server-side cookie session check
  if (await serverSessionCheck(1500)) return;

  // not authenticated -> redirect to login
  window.location.href = '/login';
}

// Run guard without blocking page load
guard().catch(e => console.error('[AUTH-GUARD] unexpected error', e));
