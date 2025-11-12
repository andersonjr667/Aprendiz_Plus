// Simple UI dialogs (cards/modals/toasts)
(function(window){
  const UI = {};

  // Inject modal HTML and CSS container
  function init() {
    if (document.getElementById('ui-dialogs-root')) return;

    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/public/css/ui-dialogs.css';
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'ui-dialogs-root';
    root.innerHTML = `
      <div id="ui-overlay" class="ui-hidden"></div>
      <div id="ui-modal" class="ui-hidden" role="dialog" aria-modal="true">
        <div class="ui-modal-card">
          <div class="ui-modal-header"><h3 id="ui-modal-title"></h3></div>
          <div class="ui-modal-body" id="ui-modal-body"></div>
          <div class="ui-modal-actions" id="ui-modal-actions"></div>
        </div>
      </div>
      <div id="ui-toast-container"></div>
    `;
    document.body.appendChild(root);
  }

  function showOverlay() {
    const ov = document.getElementById('ui-overlay');
    const modal = document.getElementById('ui-modal');
    ov.classList.remove('ui-hidden');
    modal.classList.remove('ui-hidden');
  }
  function hideOverlay() {
    const ov = document.getElementById('ui-overlay');
    const modal = document.getElementById('ui-modal');
    ov.classList.add('ui-hidden');
    modal.classList.add('ui-hidden');
  }

  // confirm returns a Promise<boolean>
  UI.confirm = function(options){
    // options: { title, message, acceptText, cancelText }
    return new Promise((resolve) => {
      init();
      const title = options.title || 'Confirmação';
      const message = options.message || '';
      const acceptText = options.acceptText || 'Confirmar';
      const cancelText = options.cancelText || 'Cancelar';

      document.getElementById('ui-modal-title').textContent = title;
      document.getElementById('ui-modal-body').innerHTML = `<p>${escapeHtml(message)}</p>`;

      const actions = document.getElementById('ui-modal-actions');
      actions.innerHTML = '';

      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn btn-secondary ui-btn-cancel';
      btnCancel.textContent = cancelText;
      btnCancel.onclick = () => { hideOverlay(); resolve(false); };

      const btnOk = document.createElement('button');
      btnOk.className = 'btn btn-primary ui-btn-ok';
      btnOk.textContent = acceptText;
      btnOk.onclick = () => { hideOverlay(); resolve(true); };

      actions.appendChild(btnCancel);
      actions.appendChild(btnOk);

      showOverlay();
    });
  };

  // alertCard: simple info card, resolves when closed
  UI.alertCard = function(options){
    return new Promise((resolve) => {
      init();
      const title = options.title || '';
      const message = options.message || '';
      const okText = options.okText || 'OK';

      document.getElementById('ui-modal-title').textContent = title;
      document.getElementById('ui-modal-body').innerHTML = `<div>${escapeHtml(message)}</div>`;

      const actions = document.getElementById('ui-modal-actions');
      actions.innerHTML = '';

      const btnOk = document.createElement('button');
      btnOk.className = 'btn btn-primary ui-btn-ok';
      btnOk.textContent = okText;
      btnOk.onclick = () => { hideOverlay(); resolve(); };

      actions.appendChild(btnOk);
      showOverlay();
    });
  };

  // select with multiple options, resolves selected value or null
  UI.select = function(options){
    return new Promise((resolve) => {
      init();
      const title = options.title || 'Escolha uma opção';
      const message = options.message || '';
      const items = options.items || [];

      document.getElementById('ui-modal-title').textContent = title;
      document.getElementById('ui-modal-body').innerHTML = `<div>${escapeHtml(message)}</div>`;
      const actions = document.getElementById('ui-modal-actions');
      actions.innerHTML = '';

      items.forEach(it => {
        const b = document.createElement('button');
        b.className = 'btn btn-secondary';
        b.textContent = it.label || it.value;
        b.onclick = () => { hideOverlay(); resolve(it.value); };
        actions.appendChild(b);
      });

      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn btn-secondary ui-btn-cancel';
      btnCancel.textContent = options.cancelText || 'Cancelar';
      btnCancel.onclick = () => { hideOverlay(); resolve(null); };
      actions.appendChild(btnCancel);

      showOverlay();
    });
  };

  // prompt (input) returns string or null
  UI.prompt = function(options){
    return new Promise((resolve) => {
      init();
      const title = options.title || '';
      const message = options.message || '';
      const placeholder = options.placeholder || '';
      const defaultValue = options.defaultValue || '';

      document.getElementById('ui-modal-title').textContent = title;
      document.getElementById('ui-modal-body').innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;"><div>${escapeHtml(message)}</div><input id="ui-prompt-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" style="padding:8px;border:1px solid #ddd;border-radius:6px;"/></div>`;
      const actions = document.getElementById('ui-modal-actions');
      actions.innerHTML = '';

      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn btn-secondary ui-btn-cancel';
      btnCancel.textContent = options.cancelText || 'Cancelar';
      btnCancel.onclick = () => { hideOverlay(); resolve(null); };

      const btnOk = document.createElement('button');
      btnOk.className = 'btn btn-primary ui-btn-ok';
      btnOk.textContent = options.okText || 'OK';
      btnOk.onclick = () => { const v = document.getElementById('ui-prompt-input').value; hideOverlay(); resolve(v); };

      actions.appendChild(btnCancel);
      actions.appendChild(btnOk);
      showOverlay();
      setTimeout(()=>{ const el = document.getElementById('ui-prompt-input'); if(el) el.focus(); },50);
    });
  };

  // toast
  UI.toast = function(message, type='info', timeout=4000){
    init();
    const container = document.getElementById('ui-toast-container');
    const el = document.createElement('div');
    el.className = `ui-toast ui-toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(()=>{ el.classList.add('ui-toast-hide'); setTimeout(()=>el.remove(),300); }, timeout);
  };

  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, function(s){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s];
    });
  }

  window.UI = UI;
  // auto init if DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Override native dialogs to route through UI (fallbacks included)
  window._nativeAlert = window.alert;
  window._nativeConfirm = window.confirm;
  window._nativePrompt = window.prompt;

  window.alert = function(msg){
    if (window.UI && UI.alertCard) { UI.alertCard({message: String(msg)}); }
    else window._nativeAlert(msg);
  };

  window.confirm = function(msg){
    if (window.UI && UI.confirm) { return UI.confirm({message: String(msg)}); }
    return Promise.resolve(window._nativeConfirm(msg));
  };

  window.prompt = function(msg, defaultVal){
    if (window.UI && UI.prompt) { return UI.prompt({message: String(msg), defaultValue: defaultVal || ''}); }
    return Promise.resolve(window._nativePrompt(msg, defaultVal));
  };
})(window);
