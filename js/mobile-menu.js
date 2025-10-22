document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    const header = document.querySelector('.header');
    const mobileNav = document.querySelector('.header-nav');
    const hamburgerMenu = document.querySelector('.hamburger-menu');

    if (!mobileNav || !hamburgerMenu) return;

    // Garantir que o botão tenha 3 spans para o icon hamburger (fallback caso templates não incluam)
    if (hamburgerMenu && hamburgerMenu.querySelectorAll('span').length < 3) {
        hamburgerMenu.innerHTML = '<span></span><span></span><span></span>';
    }

    // Garantir aria-expanded inicial
    if (!hamburgerMenu.hasAttribute('aria-expanded')) {
        hamburgerMenu.setAttribute('aria-expanded', 'false');
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