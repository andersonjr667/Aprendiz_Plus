document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    // Prefer header-nav (which será inserido no header). Fallback para .nav-menu
    let mobileNav = document.querySelector('.header-nav');
    if (!mobileNav) {
        mobileNav = document.querySelector('.nav-menu');
    }

    // Se não tiver nav, não faz nada
    if (!mobileNav) return;

    // Evita recriar múltiplos botões se houver mais de uma execução
    let hamburgerMenu = document.querySelector('.hamburger-menu');
    if (!hamburgerMenu) {
        const menuButton = document.createElement('button');
        menuButton.classList.add('hamburger-menu');
        menuButton.setAttribute('aria-label', 'Abrir menu');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        // Inserir antes do nav-menu para ficar visível em mobile
        const header = document.querySelector('.header');
        if (header) header.prepend(menuButton);
        hamburgerMenu = menuButton;
    }

    function openMenu() {
        hamburgerMenu.classList.add('active');
        mobileNav.classList.add('active');
        body.classList.add('menu-open');
        hamburgerMenu.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        hamburgerMenu.classList.remove('active');
        mobileNav.classList.remove('active');
        body.classList.remove('menu-open');
        hamburgerMenu.setAttribute('aria-expanded', 'false');
    }

    hamburgerMenu.addEventListener('click', function(e) {
        if (mobileNav.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Fechar ao clicar em um link (apenas links dentro do mobileNav)
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => closeMenu());
    });

    // Fechar ao clicar fora do menu quando aberto
    document.addEventListener('click', (ev) => {
        if (!mobileNav.contains(ev.target) && !hamburgerMenu.contains(ev.target)) {
            if (mobileNav.classList.contains('active')) closeMenu();
        }
    });

    // Permitir fechar com ESC
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeMenu();
    });
});