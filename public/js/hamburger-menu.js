// Hamburger menu functionality with smooth animations
document.addEventListener('DOMContentLoaded', () => {
  initHamburgerMenu();
});

function initHamburgerMenu() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;
  
  // Criar overlay se não existir
  let overlay = document.querySelector('.menu-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);
  }
  
  if (menuToggle && navLinks) {
    // Toggle menu on button click
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = navLinks.classList.contains('active');
      
      if (!isActive) {
        // Abrindo o menu
        navLinks.classList.add('active');
        menuToggle.classList.add('active');
        overlay.classList.add('active');
        body.style.overflow = 'hidden'; // Previne scroll do body
        
        // Adiciona animação de entrada suave
        navLinks.style.pointerEvents = 'none';
        setTimeout(() => {
          navLinks.style.pointerEvents = 'auto';
        }, 400);
      } else {
        // Fechando o menu
        closeMenu();
      }
    });

    // Close menu when clicking on overlay
    overlay.addEventListener('click', () => {
      closeMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.top-nav') && navLinks.classList.contains('active')) {
        closeMenu();
      }
    });

    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll('a, button');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        // Pequeno delay para melhor UX
        setTimeout(() => {
          closeMenu();
        }, 200);
      });
    });

    // Close menu on window resize if width > 768px
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
          closeMenu();
        }
      }, 250);
    });

    // Close menu on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        closeMenu();
      }
    });

    // Função para fechar o menu com animação
    function closeMenu() {
      navLinks.classList.remove('active');
      menuToggle.classList.remove('active');
      overlay.classList.remove('active');
      body.style.overflow = '';
    }
  }
}

// Adiciona efeito de hover nos links do menu mobile
if (window.innerWidth <= 768) {
  document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      const links = navLinks.querySelectorAll('a, button');
      links.forEach(link => {
        link.addEventListener('touchstart', function() {
          this.style.transform = 'scale(0.98)';
        });
        link.addEventListener('touchend', function() {
          this.style.transform = '';
        });
      });
    }
  });
}
