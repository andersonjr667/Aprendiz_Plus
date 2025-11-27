
/* global window, document, renderDynamicHeader */
// header.js - Header dinâmico Aprendiz+


function loadHeader() {
  fetch('/components/header.html')
    .then(res => res.text())
    .then(html => {
      const container = document.getElementById('header-container');
      if (container) {
        container.innerHTML = html;
        renderDynamicHeader();
        initHeaderMenu();
        // Load dark mode script and CSS once so toggle works across pages
        if (!window.__apzDarkModeLoaded) {
          try {
            const s = document.createElement('script');
            s.src = '/public/js/dark-mode.js';
            s.defer = true;
            s.onload = function() { window.__apzDarkModeLoaded = true; };
            document.head.appendChild(s);
          } catch (e) {
            console.warn('[HEADER] failed to load dark-mode script', e);
          }
        }
        if (!window.__apzDarkCssLoaded) {
          try {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = '/public/css/dark-overrides.css';
            l.onload = function() { window.__apzDarkCssLoaded = true; };
            document.head.appendChild(l);
          } catch (e) {
            console.warn('[HEADER] failed to load dark-overrides.css', e);
          }
        }
      }
    });
}

window.renderDynamicHeader = function renderDynamicHeader() {
  const nav = document.querySelector('.apz-header__nav');
  const actions = document.querySelector('.apz-header__actions');
  if (!nav || !actions) return;

  // Links padrão
  const linksPadrao = [
    { href: '/vagas', label: 'Vagas' },
    { href: '/noticias', label: 'Notícias' },
    { href: '/contato', label: 'Contato' }
  ];

  // Limpa
  nav.innerHTML = '';
  actions.innerHTML = '';

  // Adiciona links padrão
  linksPadrao.forEach(link => {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;
    nav.appendChild(a);
  });

  // Verifica login
  console.log('[HEADER] window.Auth:', window.Auth);
  if (window.Auth && window.Auth.isAuthenticated && window.Auth.isAuthenticated()) {
    console.log('[HEADER] Usuário autenticado, buscando dados...');
    if (window.Auth.getCurrentUser) {
      window.Auth.getCurrentUser().then(user => {
        console.log('[HEADER] Dados do usuário:', user);
        if (!user) {
          renderLoggedOut(actions);
          return;
        }
        renderLoggedIn(user, actions);
      });
    } else {
      console.log('[HEADER] getCurrentUser não disponível');
      renderLoggedOut(actions);
    }
  } else {
    console.log('[HEADER] Usuário não autenticado');
    renderLoggedOut(actions);
  }
}

function renderLoggedOut(actions) {
  actions.innerHTML = `
    <a href="/login" class="apz-header__login">Entrar</a>
    <a href="/register" class="apz-header__register">Cadastre-se</a>
  `;
}

function renderLoggedIn(user, actions) {
  // Avatar
  const avatar = user.profilePhotoUrl
    ? `<img src="${user.profilePhotoUrl}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;">`
    : `<span style="display:inline-block;width:32px;height:32px;border-radius:50%;background:var(--gray-300);text-align:center;line-height:32px;font-weight:bold;color:var(--gray-700);vertical-align:middle;">${user.name ? user.name[0].toUpperCase() : 'U'}</span>`;

  // Menu por papel
  let menuLinks = '';
  if (user.type === 'candidato') {
    menuLinks = `
      <a href="/mapa-vagas"><i class="fas fa-map"></i> Mapa de Vagas</a>
      <a href="/dashboard-candidato"><i class="fas fa-chart-line"></i> Dashboard</a>
      <a href="/perfil-candidato"><i class="fas fa-user"></i> Meu Perfil</a>
    `;
  } else if (user.type === 'empresa') {
    menuLinks = `
      <a href="/painel-empresa"><i class="fas fa-building"></i> Painel da Empresa</a>
      <a href="/publicar-vaga"><i class="fas fa-bullhorn"></i> Publicar Vaga</a>
      <a href="/analytics"><i class="fas fa-chart-bar"></i> Analytics</a>
      <a href="/perfil-empresa"><i class="fas fa-user"></i> Meu Perfil</a>
    `;
  } else if (user.type === 'admin') {
    menuLinks = `
      <a href="/admin"><i class="fas fa-tachometer-alt"></i> Painel Admin</a>
      <a href="/analytics"><i class="fas fa-chart-bar"></i> Analytics</a>
      <a href="/perfil-admin"><i class="fas fa-user"></i> Meu Perfil</a>
    `;
  } else if (user.type === 'owner') {
    menuLinks = `
      <a href="/admin"><i class="fas fa-tachometer-alt"></i> Painel Admin</a>
      <a href="/analytics"><i class="fas fa-chart-bar"></i> Analytics</a>
      <a href="/admin-manage-admins"><i class="fas fa-user-shield"></i> Gerenciar Admins</a>
      <a href="/perfil-admin"><i class="fas fa-user"></i> Meu Perfil</a>
    `;
  }

  actions.innerHTML = `
    <div class="apz-header__user-menu" style="position:relative;display:inline-block;">
      <button class="apz-header__user-btn" style="background:none;border:none;display:flex;align-items:center;gap:10px;cursor:pointer;padding:6px 12px;">
        ${avatar}
        <span style="font-weight:600;">${user.name || 'Usuário'}</span>
        <i class="fas fa-chevron-down" style="font-size:13px;"></i>
      </button>
      <div class="apz-header__user-dropdown" style="display:none;position:absolute;right:0;top:110%;background:var(--gray-50);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.13);min-width:200px;z-index:1000;overflow:hidden;">
        ${menuLinks}
        <button id="apz-logout-btn" style="width:100%;background:none;border:none;text-align:left;padding:12px 18px;color:#dc2626;cursor:pointer;display:flex;align-items:center;gap:8px;"><i class="fas fa-sign-out-alt"></i> Sair</button>
      </div>
    </div>
  `;

  // Dropdown logic
  const btn = actions.querySelector('.apz-header__user-btn');
  const dropdown = actions.querySelector('.apz-header__user-dropdown');
  if (btn && dropdown) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', function() {
      dropdown.style.display = 'none';
    });
  }
  // Logout
  const logoutBtn = actions.querySelector('#apz-logout-btn');
  if (logoutBtn && window.Auth && window.Auth.removeToken) {
    logoutBtn.addEventListener('click', function() {
      window.Auth.removeToken();
      window.location.reload();
    });
  }
}

function initHeaderMenu() {
  // Mobile menu toggle with accessibility improvements
  const hamburger = document.querySelector('.apz-header__hamburger');
  const mobileMenu = document.querySelector('#apz-mobile-menu');
  const mobileMenuContent = document.querySelector('.apz-header__mobile-menu-content');
  const nav = document.querySelector('.apz-header__nav');
  const mobileClose = mobileMenu ? mobileMenu.querySelector('.apz-header__mobile-close') : null;

  function openMobileMenu() {
    if (!mobileMenu || !mobileMenuContent || !nav) return;
    // Clear previous dynamic content except close button
    Array.from(mobileMenuContent.children).forEach(child => {
      if (!child.classList.contains('apz-header__mobile-close')) child.remove();
    });

    // Clone nav links
    const navClone = nav.cloneNode(true);
    navClone.classList.add('apz-cloned-nav');
    // wrap nav links in a mobile list container
    const navWrap = document.createElement('div');
    navWrap.className = 'apz-header__mobile-list';
    // move anchor elements from clone into navWrap
    navClone.querySelectorAll('a').forEach(a => {
      const item = document.createElement('a');
      item.href = a.href;
      item.textContent = a.textContent;
      item.className = 'apz-header__mobile-link';
      navWrap.appendChild(item);
    });
    mobileMenuContent.appendChild(navWrap);

    // Add divider
    const divider = document.createElement('div');
    divider.className = 'apz-header__mobile-divider';
    mobileMenuContent.appendChild(divider);

    // Add actions (login/register or user links and dark-mode)
    const actionsEl = document.querySelector('.apz-header__actions');
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'apz-header__mobile-list';

    if (actionsEl) {
      // If user menu exists (logged in), extract dropdown links
      const userDropdown = actionsEl.querySelector('.apz-header__user-dropdown');
      if (userDropdown && userDropdown.innerHTML.trim()) {
        userDropdown.querySelectorAll('a').forEach(a => {
          const item = document.createElement('a');
          item.href = a.href;
          item.innerHTML = a.innerHTML;
          item.className = 'apz-header__mobile-link';
          actionsWrap.appendChild(item);
        });
      } else {
        // fallback: copy login/register links if present
        const login = actionsEl.querySelector('.apz-header__login');
        const register = actionsEl.querySelector('.apz-header__register');
        if (login) {
          const a = document.createElement('a');
          a.href = login.href || '/login';
          a.textContent = login.textContent || 'Entrar';
          a.className = 'apz-header__mobile-link apz-header__mobile-action';
          actionsWrap.appendChild(a);
        }
        if (register) {
          const a2 = document.createElement('a');
          a2.href = register.href || '/register';
          a2.textContent = register.textContent || 'Cadastre-se';
          a2.className = 'apz-header__mobile-link apz-header__mobile-action primary';
          actionsWrap.appendChild(a2);
        }
      }
      // Add dark mode toggle inside the mobile menu (always add)
      const dm = document.createElement('button');
      dm.type = 'button';
      dm.className = 'apz-header__mobile-action apz-header__mobile-link';
      dm.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i> Modo escuro';
      dm.addEventListener('click', (e) => {
        e.preventDefault();
        // If a top-level toggle exists (older pages), trigger it; otherwise toggle `html.dark`.
        const orig = document.querySelector('#dark-mode-toggle');
        if (orig) {
          orig.click();
        } else {
          document.documentElement.classList.toggle('dark');
          // Persist optionally if your dark-mode.js expects localStorage (not enforced here)
        }
      });
      actionsWrap.appendChild(dm);
    }

    mobileMenuContent.appendChild(actionsWrap);

    // Ensure links inside mobile menu close it when clicked
    mobileMenuContent.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => closeMobileMenu());
    });

    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.classList.add('is-open');
    }
    // prevent background scroll
    document.body.style.overflow = 'hidden';
    // move focus to first actionable element
    const firstAction = mobileMenuContent.querySelector('a, button');
    if (firstAction) firstAction.focus();
  }

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (hamburger) {
      hamburger.classList.remove('is-open');
      hamburger.focus();
    }
  }

  if (hamburger && mobileMenu && mobileMenuContent && nav) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileMenu.classList.contains('open');
      if (isOpen) closeMobileMenu(); else openMobileMenu();
    });

    // Close button inside mobile menu
    if (mobileClose) {
      mobileClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMobileMenu();
      });
    }

    // Fecha ao clicar fora do conteúdo do menu (overlay)
    mobileMenu.addEventListener('click', (e) => {
      if (!mobileMenuContent.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Fecha ao clicar em qualquer link do menu
    mobileMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        closeMobileMenu();
      }
    });

    // Fecha com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    });
  }
}

// Ensure header loads whether this script is executed before or after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeader);
} else {
  // Document already parsed — load header immediately
  try {
    loadHeader();
  } catch (e) {
    console.error('[HEADER] failed to load immediately:', e);
  }
}
