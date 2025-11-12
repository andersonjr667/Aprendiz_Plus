// Sistema de Diálogos UI - Cards personalizados para confirmações
(function(window) {
  const UI = {};
  let overlayElement = null;
  let dialogElement = null;
  let toastContainer = null;

  // Inicializar estrutura HTML
  function init() {
    if (overlayElement) return; // Já inicializado

    // Criar overlay
    overlayElement = document.createElement('div');
    overlayElement.className = 'ui-overlay';
    overlayElement.addEventListener('click', function(e) {
      if (e.target === overlayElement) {
        closeDialog();
      }
    });

    // Criar container de toasts
    toastContainer = document.createElement('div');
    toastContainer.className = 'ui-toast-container';

    document.body.appendChild(overlayElement);
    document.body.appendChild(toastContainer);
  }

  // Criar e mostrar diálogo
  function showDialog(options) {
    init();

    const {
      title = 'Confirmação',
      message = '',
      icon = 'confirm',
      iconSymbol = '❓',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      confirmClass = 'ui-dialog-btn-confirm',
      showCancel = true,
      onConfirm = null,
      onCancel = null
    } = options;

    // Criar card do diálogo
    dialogElement = document.createElement('div');
    dialogElement.className = 'ui-dialog';
    dialogElement.innerHTML = `
      <div class="ui-dialog-header">
        <div class="ui-dialog-icon ${icon}">
          ${iconSymbol}
        </div>
        <div class="ui-dialog-title">
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      <div class="ui-dialog-body">
        <p class="ui-dialog-message">${escapeHtml(message)}</p>
      </div>
      <div class="ui-dialog-footer">
        ${showCancel ? `<button class="ui-dialog-btn ui-dialog-btn-cancel" data-action="cancel">${escapeHtml(cancelText)}</button>` : ''}
        <button class="ui-dialog-btn ${confirmClass}" data-action="confirm">${escapeHtml(confirmText)}</button>
      </div>
    `;

    // Adicionar event listeners
    dialogElement.querySelector('[data-action="confirm"]').addEventListener('click', function() {
      closeDialog();
      if (onConfirm) onConfirm();
    });

    if (showCancel) {
      dialogElement.querySelector('[data-action="cancel"]').addEventListener('click', function() {
        closeDialog();
        if (onCancel) onCancel();
      });
    }

    // Adicionar ao overlay
    overlayElement.innerHTML = '';
    overlayElement.appendChild(dialogElement);
    overlayElement.classList.add('active');

    // Focar no botão de confirmação
    setTimeout(() => {
      dialogElement.querySelector('[data-action="confirm"]').focus();
    }, 100);
  }

  // Fechar diálogo
  function closeDialog() {
    if (!overlayElement) return;

    overlayElement.classList.add('hiding');
    setTimeout(() => {
      overlayElement.classList.remove('active', 'hiding');
      if (dialogElement) {
        dialogElement.remove();
        dialogElement = null;
      }
    }, 300);
  }

  // UI.confirm - Retorna Promise
  UI.confirm = function(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }

    return new Promise((resolve) => {
      showDialog({
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  };

  // UI.alert - Retorna Promise
  UI.alert = function(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }

    return new Promise((resolve) => {
      showDialog({
        title: 'Aviso',
        icon: 'alert',
        iconSymbol: '⚠️',
        confirmText: 'OK',
        confirmClass: 'ui-dialog-btn-primary',
        showCancel: false,
        ...options,
        onConfirm: () => resolve()
      });
    });
  };

  // UI.success - Retorna Promise
  UI.success = function(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }

    return new Promise((resolve) => {
      showDialog({
        title: 'Sucesso',
        icon: 'success',
        iconSymbol: '✓',
        confirmText: 'OK',
        confirmClass: 'ui-dialog-btn-confirm',
        showCancel: false,
        ...options,
        onConfirm: () => resolve()
      });
    });
  };

  // UI.danger - Retorna Promise (para ações perigosas como logout)
  UI.danger = function(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }

    return new Promise((resolve) => {
      showDialog({
        title: 'Atenção',
        icon: 'alert',
        iconSymbol: '⚠️',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        confirmClass: 'ui-dialog-btn-danger',
        showCancel: true,
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  };

  // UI.toast - Notificações não-bloqueantes
  UI.toast = function(message, type = 'info', duration = 4000) {
    init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `ui-toast ${type}`;
    toast.innerHTML = `
      <div class="ui-toast-icon">${icons[type] || icons.info}</div>
      <div class="ui-toast-content">
        <p class="ui-toast-message">${escapeHtml(message)}</p>
      </div>
      <button class="ui-toast-close" aria-label="Fechar">×</button>
    `;

    const closeBtn = toast.querySelector('.ui-toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    toastContainer.appendChild(toast);

    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remover
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }

    return toast;
  };

  function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Expor UI globalmente
  window.UI = UI;

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
