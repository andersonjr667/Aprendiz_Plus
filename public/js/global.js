
/* global window, document */

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


// Função global para ativar todos os dropdowns de perfil do header
function activateProfileDropdowns() {
  document.querySelectorAll('.admin-header-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const menu = btn.parentElement.querySelector('.admin-header-menu');
      if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    btn.querySelectorAll('img,span').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        const menu = btn.parentElement.querySelector('.admin-header-menu');
        if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
    });
  });
  document.addEventListener('click', function() {
    document.querySelectorAll('.admin-header-menu').forEach(menu => menu.style.display = 'none');
  });
}

// Call on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  // Não injeta mais o header antigo!
  // Apenas ativa dropdowns e verifica status do usuário
  setTimeout(activateProfileDropdowns, 100);
  if (window.Auth && window.Auth.isAuthenticated()) {
    checkUserStatus();
  }
});