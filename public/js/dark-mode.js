/* dark-mode.js - simple theme toggle with persistence */
(function() {
  const STORAGE_KEY = 'apz-dark-mode';

  function applyMode(mode) {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateToggleButton(mode);
  }

  function updateToggleButton(mode) {
    const btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;
    btn.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    const icon = btn.querySelector('i');
    if (icon) {
      if (mode === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
      } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
      }
    }
  }

  function getStoredMode() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeMode(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      // ignore
    }
  }

  function detectPreferred() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) {}
    return 'light';
  }

  function toggleMode() {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyMode(next);
    storeMode(next);
  }

  document.addEventListener('click', function(e) {
    const btn = e.target.closest && e.target.closest('#dark-mode-toggle');
    if (btn) {
      e.preventDefault();
      toggleMode();
    }
  });

  document.addEventListener('DOMContentLoaded', function() {
    const stored = getStoredMode();
    const mode = stored || detectPreferred();
    applyMode(mode);
  });

  // also expose a small API
  window.apzDarkMode = {
    toggle: toggleMode,
    set: function(mode) { applyMode(mode); storeMode(mode); }
  };

})();
