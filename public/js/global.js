// Global script to inject header in all pages
function injectHeader() {
  const header = document.createElement('header');
  header.className = 'nav-header';
  header.innerHTML = `
    <nav class="top-nav container">
      <div class="nav-logo"><a href="/">Aprendiz+</a></div>
      <button class="mobile-menu-toggle" aria-label="Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-links">
        <a href="/vagas">Vagas</a>
        <a href="/para-empresas">Para Empresas</a> 
        <a href="/noticias">Notícias</a>
        <a href="/login">Login</a>
      </div>
    </nav>
  `;
  
  // Insert header at the beginning of body
  document.body.insertBefore(header, document.body.firstChild);
}

// Hamburger menu toggle functionality
function initHamburgerMenu() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.top-nav') && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
      }
    });

    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
      });
    });
  }
}

// Global function to check user status and handle bans/suspensions
async function checkUserStatus() {
  if (!window.Auth || !window.Auth.getToken()) {
    return true; // Not logged in, no need to check
  }

  try {
    const user = await window.Auth.getCurrentUser();
    // getCurrentUser already handles bans/suspensions and redirects
    return !!user;
  } catch (err) {
    console.error('Error checking user status:', err);
    return false;
  }
}

// Expose globally
window.checkUserStatus = checkUserStatus;

// Call on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  injectHeader();
  initHamburgerMenu();
  // If auth.js is loaded, it will handle updating the header
  if (window.Auth && window.Auth.updateHeader) {
    window.Auth.updateHeader();
  }
  
  // Check user status on every page load
  if (window.Auth && window.Auth.isAuthenticated()) {
    checkUserStatus();
  }
});