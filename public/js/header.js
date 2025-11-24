
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
    : `<span style="display:inline-block;width:32px;height:32px;border-radius:50%;background:#eee;text-align:center;line-height:32px;font-weight:bold;color:#666;vertical-align:middle;">${user.name ? user.name[0].toUpperCase() : 'U'}</span>`;

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
      <div class="apz-header__user-dropdown" style="display:none;position:absolute;right:0;top:110%;background:#fff;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.13);min-width:200px;z-index:1000;overflow:hidden;">
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
  // Mobile menu toggle
  const hamburger = document.querySelector('.apz-header__hamburger');
  const mobileMenu = document.querySelector('.apz-header__mobile-menu');
  const mobileMenuContent = document.querySelector('.apz-header__mobile-menu-content');
  const nav = document.querySelector('.apz-header__nav');
  if (hamburger && mobileMenu && mobileMenuContent && nav) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenuContent.innerHTML = nav.innerHTML;
      mobileMenu.classList.add('open');
    });
    // Fecha ao clicar fora do menu
    document.addEventListener('click', (e) => {
      if (!mobileMenuContent.contains(e.target) && !hamburger.contains(e.target)) {
        mobileMenu.classList.remove('open');
      }
    });
    // Fecha ao clicar em qualquer link do menu
    mobileMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        mobileMenu.classList.remove('open');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', loadHeader);
