// Importa proteção de rotas públicas/privadas em todas as páginas
import('/js/auth-guard.js').catch(()=>{});

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

// Simple global showMessage utility used across pages that expect a
// `showMessage(message, type)` function. It will try to use an existing
// `#messageContainer` / `#messageText` pattern when present, otherwise
// falls back to a floating toast at the bottom-right.
function showMessage(message, type = 'info') {
  try {
    const container = document.getElementById('messageContainer');
    const messageText = document.getElementById('messageText');
    if (container) {
      // If page follows message container convention
      if (messageText) messageText.textContent = message;
      container.className = `message-container ${type}`;
      container.style.display = 'block';
      if (type !== 'error') {
        setTimeout(() => { container.style.display = 'none'; }, 5000);
      }
      return;
    }

    // Fallback: create a temporary toast
    const toast = document.createElement('div');
    toast.className = `global-toast ${type}`;
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      background: type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#34495e'),
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '6px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
      zIndex: 99999,
      fontSize: '14px'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
  } catch (e) {
    // Last resort: console
    console.log('[showMessage]', message, type);
  }
}

window.showMessage = showMessage;