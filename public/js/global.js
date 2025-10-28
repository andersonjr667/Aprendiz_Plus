// Global script to inject header in all pages
function injectHeader() {
  const header = document.createElement('header');
  header.className = 'nav-header';
  header.innerHTML = `
    <nav class="top-nav container">
      <div class="nav-logo"><a href="/">Aprendiz+</a></div>
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

// Call on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  injectHeader();
  // If auth.js is loaded, it will handle updating the header
  if (window.Auth && window.Auth.updateHeader) {
    window.Auth.updateHeader();
  }
});