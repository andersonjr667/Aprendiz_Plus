// Reescrita defensiva do chat client
let currentChatId = null;
let currentUser = null;
let chats = [];
let messages = [];
let messagePolling = null;
let isTyping = false;
let typingTimeout = null;
let presencePolling = null;
let loadChatsController = null;
let loadMessagesController = null;

function safeGet(id) {
    return document.getElementById(id) || null;
}

async function initChatPage() {
    try {
        // Obter usuário (defensivo)
        if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
            currentUser = await window.Auth.getCurrentUser();
        } else if (window.api && typeof window.api.getCurrentUser === 'function') {
            currentUser = await window.api.getCurrentUser();
        } else {
            currentUser = null;
        }

        if (!currentUser) {
            // não autenticado -> redirecionar
            window.location.href = '/login';
            return;
        }

        // Profile link / logout (opcional)
        const profileLink = safeGet('userProfileLink');
        if (profileLink) {
            if (currentUser.type === 'candidato') profileLink.href = '/perfil-candidato';
            else if (currentUser.type === 'empresa') profileLink.href = '/perfil-empresa';
            else if (currentUser.type === 'admin') profileLink.href = '/perfil-admin';
        }

        const logoutBtn = safeGet('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.logout) window.logout();
                else if (window.api && window.api.logout) window.api.logout();
                else {
                    if (window.Auth && window.Auth.removeToken) window.Auth.removeToken();
                    window.location.href = '/login';
                }
            });
        }

        // Setup UI handlers (defensivo)
        setupMobileMenu();

        const messageForm = safeGet('messageForm');
        const messageInput = safeGet('messageInput');
        const archiveBtn = safeGet('archiveChatBtn');
        const closeBtn = safeGet('closeChatBtn');

        if (messageForm && typeof handleSendMessage === 'function') messageForm.addEventListener('submit', handleSendMessage);
        if (messageInput) {
            messageInput.addEventListener('input', handleInputChange);
            messageInput.addEventListener('keydown', handleTyping);
            messageInput.addEventListener('keyup', handleStopTyping);
        }
        if (archiveBtn) archiveBtn.addEventListener('click', archiveChat);
        if (closeBtn) closeBtn.addEventListener('click', closeChat);

        // Carregar conversas em background (não bloquear inicialização)
        loadChats().catch(() => {});

        // Start lightweight presence polling to keep online/offline status fresh
        try {
            if (presencePolling) clearInterval(presencePolling);
            // increase presence polling interval to reduce server load
            presencePolling = setInterval(() => {
                if (document.visibilityState === 'visible') loadChats().catch(() => {});
            }, 30000);
        } catch (e) { /* ignore */ }

        // Processar URL params - open/create chat ASAP without waiting for full list
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdParam = urlParams.get('chatId');
        const applicationIdParam = urlParams.get('applicationId');
        if (chatIdParam) {
            // open immediately
            openChat(chatIdParam).catch(() => {});
        } else if (applicationIdParam) {
            // create in background so UI stays responsive
            setTimeout(() => createChatFromApplication(applicationIdParam).catch(() => {}), 0);
        }

        // Notificações
        showNotificationCount();
    } catch (err) {
        console.error('Erro ao inicializar chat:', err);
        showError('Erro ao carregar chat. Tente recarregar a página.');
    }
}

document.addEventListener('DOMContentLoaded', initChatPage);

// Cleanup timers on unload
window.addEventListener('beforeunload', () => {
    try { if (messagePolling) clearInterval(messagePolling); } catch (e) {}
    try { if (presencePolling) clearInterval(presencePolling); } catch (e) {}
});

// Configurar menu mobile
function setupMobileMenu() {
    const mobileToggle = safeGet('mobileMenuToggle');
    const sidebar = safeGet('chatSidebar');
    const closeBtn = safeGet('closeChatBtn');

    if (!mobileToggle || !sidebar) {
        // nothing to do if mobile toggle or sidebar not present
        return;
    }

    // Mostrar botão mobile apenas em telas pequenas
    function updateMobileVisibility() {
        if (window.innerWidth <= 768) {
            mobileToggle.style.display = 'block';
            if (closeBtn) closeBtn.style.display = currentChatId ? 'block' : 'none';
        } else {
            mobileToggle.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'none';
            sidebar.classList.remove('active');
        }
    }

    updateMobileVisibility();

    window.addEventListener('resize', updateMobileVisibility);

    mobileToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
    });

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Criar chat a partir de uma aplicação
async function createChatFromApplication(applicationId) {
    try {
        showMessage('Abrindo chat...', 'info');

        const res = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ applicationId })
        });

        if (res.ok) {
            const chat = await res.json();
            // Atualizar URL sem recarregar
            window.history.replaceState({}, '', `/chat?chatId=${chat._id}`);
            openChat(chat._id);
        } else {
            const error = await res.json();
            showError(error.error || 'Erro ao abrir chat');
        }
    } catch (error) {
        console.error('Error creating chat from application:', error);
        showError('Erro de conexão ao abrir chat');
    }
}

// Fechar chat (mobile)
function closeChat() {
    if (messagePolling) {
        clearInterval(messagePolling);
    }

    currentChatId = null;
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('chatArea').style.display = 'none';
    document.getElementById('chatSidebar').classList.remove('active');

    // Limpar seleção
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Carregar lista de conversas
async function loadChats() {
    try {
        const chatListEl = safeGet('chatList');
        if (!chatListEl) return;
        // Insert improved skeleton loading UI
        chatListEl.innerHTML = '';
        const skeleton = document.createElement('div');
        skeleton.className = 'chat-skeleton';
        for (let i = 0; i < 5; i++) {
            const item = document.createElement('div');
            item.className = 'skeleton-item';

            const avatar = document.createElement('div');
            avatar.className = 'skeleton-avatar';

            const lines = document.createElement('div');
            lines.className = 'skeleton-lines';
            const l1 = document.createElement('div'); l1.className = 'skeleton-line long';
            const l2 = document.createElement('div'); l2.className = 'skeleton-line medium';
            const l3 = document.createElement('div'); l3.className = 'skeleton-line short';
            lines.appendChild(l1); lines.appendChild(l2); lines.appendChild(l3);

            item.appendChild(avatar);
            item.appendChild(lines);
            skeleton.appendChild(item);
        }
        chatListEl.appendChild(skeleton);

        // Abort previous loadChats if any
        try { if (loadChatsController) loadChatsController.abort(); } catch (e) {}
        loadChatsController = new AbortController();
        const response = await fetch('/api/chats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            signal: loadChatsController.signal
        });

        if (!response.ok) throw new Error('Erro ao carregar conversas');

        chats = await response.json();

        if (chats.length === 0) {
            chatListEl.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px;">
                    <i class="fas fa-comments fa-2x"></i>
                    <p style="margin-top: 15px;">Nenhuma conversa ainda</p>
                    <small style="color: #95a5a6;">Chats aparecerão aqui quando você iniciar conversas</small>
                </div>
            `;
            return;
        }

        // Render as DOM nodes to avoid inline onclick handlers
        chatListEl.innerHTML = '';
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-item ${chat._id === currentChatId ? 'active' : ''}`;
            item.tabIndex = 0;
            item.addEventListener('click', () => openChat(chat._id));

            const img = document.createElement('img');
            img.src = chat.otherUser.profilePhoto || '/public/images/default-avatar.png';
            img.loading = 'lazy';
            img.alt = chat.otherUser.name || '';
            img.className = 'chat-item-avatar';

            const content = document.createElement('div');
            content.className = 'chat-item-content';

            const header = document.createElement('div');
            header.className = 'chat-item-header';
            const name = document.createElement('span'); name.className = 'chat-item-name'; name.textContent = chat.otherUser.name || 'Usuário';
            const time = document.createElement('span'); time.className = 'chat-item-time'; time.textContent = formatTime(chat.lastMessageAt);
            header.appendChild(name); header.appendChild(time);

            content.appendChild(header);
            if (chat.job) {
                const jobEl = document.createElement('div'); jobEl.className = 'chat-item-job'; jobEl.textContent = chat.job.title || '';
                content.appendChild(jobEl);
            }
            if (chat.lastMessage) {
                const lastEl = document.createElement('div'); lastEl.className = 'chat-item-last'; lastEl.textContent = chat.lastMessage;
                content.appendChild(lastEl);
            }

            item.appendChild(img);
            item.appendChild(content);
            if (chat.unreadCount > 0) {
                const badge = document.createElement('span'); badge.className = 'chat-item-badge'; badge.textContent = chat.unreadCount;
                item.appendChild(badge);
            }

            chatListEl.appendChild(item);
        });

    } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        document.getElementById('chatList').innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <i class="fas fa-exclamation-circle fa-2x" style="color: #e74c3c;"></i>
                <p style="margin-top: 15px;">Erro ao carregar conversas</p>
                <button onclick="loadChats()" class="btn btn-primary" style="margin-top: 10px;">Tentar novamente</button>
            </div>
        `;
    }
}

// Abrir chat específico
async function openChat(chatId) {
    try {
        currentChatId = chatId;

        // Parar polling anterior
        if (messagePolling) {
            clearInterval(messagePolling);
        }

        // Atualizar UI
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('chatArea').style.display = 'flex';

        // Fechar sidebar no mobile
        if (window.innerWidth <= 768) {
            document.getElementById('chatSidebar').classList.remove('active');
        }

        // Atualizar item ativo na lista
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.chat-item[onclick="openChat('${chatId}')"]`)?.classList.add('active');

        // Encontrar dados do chat
        const chat = chats.find(c => c._id === chatId);
        if (chat) {
            document.getElementById('chatAvatar').src = chat.otherUser.profilePhoto || '/public/images/default-avatar.png';
            document.getElementById('chatUserName').textContent = chat.otherUser.name;
            document.getElementById('chatJobTitle').textContent = chat.job ? chat.job.title : 'Chat';

            // Atualizar status online/offline
            const statusElement = document.querySelector('.chat-header-status') || createStatusElement();
            const statusDot = statusElement.querySelector('.status-dot');
            const statusText = statusElement.querySelector('span:last-child');

            if (statusDot && statusText) {
                statusDot.className = `status-dot ${chat.otherUser.isOnline ? 'online' : 'offline'}`;
                statusText.textContent = chat.otherUser.isOnline ? 'Online' : 'Offline';
            }
        }

        // Carregar mensagens
        await loadMessages();

        // Iniciar polling (8s) para reduzir carga e melhorar performance geral
        if (messagePolling) clearInterval(messagePolling);
        messagePolling = setInterval(loadMessages, 8000);

        // Marcar como lidas
        await markAsRead(chatId);

        // Focar no input
        document.getElementById('messageInput').focus();

    } catch (error) {
        console.error('Erro ao abrir chat:', error);
        showError('Erro ao abrir conversa');
    }
}

// Carregar mensagens
async function loadMessages() {
    try {
        // Abort previous messages fetch if still pending
        try { if (loadMessagesController) loadMessagesController.abort(); } catch (e) {}
        loadMessagesController = new AbortController();

        // Quick offline check
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            throw Object.assign(new Error('Offline'), { isNetwork: true, message: 'Você está offline. Conecte-se à internet para carregar mensagens.' });
        }
        const response = await fetch(`/api/chats/${currentChatId}/messages`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        , signal: loadMessagesController.signal });

        if (!response.ok) throw new Error('Erro ao carregar mensagens');

        const newMessages = await response.json();

        // Verificar se há novas mensagens
        if (JSON.stringify(messages) === JSON.stringify(newMessages)) {
            return;
        }

        messages = newMessages;
        renderMessages();

        // Scroll para o final se for nova mensagem do usuário atual
        if (messages.length > 0 && messages[messages.length - 1].senderId._id === currentUser._id) {
            scrollToBottom();
        }

        // Recarregar lista de chats para atualizar contador
        await loadChats();

    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        // Distinguish network errors so the user sees clearer guidance
        if (error.isNetwork || /Failed to fetch|ECONNREFUSED|NetworkError/i.test(error.message || '')) {
            showMessage('Falha de conexão ao carregar mensagens. Verifique se o servidor está rodando (porta 3000) e sua conexão.', 'error', { persistent: true, actions: [ { label: 'Tentar novamente', onClick: async (btn) => { btn.disabled = true; try { await loadMessages(); } catch(e){} finally { btn.disabled = false; } } } ] });
        } else if (!messagePolling) { // Só mostrar erro se não for polling
            showError('Erro ao carregar mensagens');
        }
    }
}

// Renderizar mensagens
function renderMessages() {
    const messagesEl = safeGet('chatMessages');
    if (!messagesEl) return;

    if (messages.length === 0) {
        messagesEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-dots fa-2x"></i>
                <p style="margin-top: 15px;">Nenhuma mensagem ainda. Comece a conversa!</p>
            </div>
        `;
        return;
    }

    messagesEl.innerHTML = '';
    let lastDate = null;

    messages.forEach(message => {
        const messageDate = new Date(message.createdAt);
        const dateStr = messageDate.toLocaleDateString('pt-BR');

        if (dateStr !== lastDate) {
            const divider = document.createElement('div');
            divider.className = 'date-divider';
            divider.textContent = formatDate(messageDate);
            messagesEl.appendChild(divider);
            lastDate = dateStr;
        }

        const isSent = message.senderId && message.senderId._id === currentUser._id;
        const msgWrap = document.createElement('div');
        msgWrap.className = `message ${isSent ? 'sent' : 'received'}`;

        if (!isSent) {
            const avatar = document.createElement('img');
            avatar.className = 'message-avatar';
            avatar.src = (message.senderId && message.senderId.profilePhoto) || '/public/images/default-avatar.png';
            avatar.alt = (message.senderId && message.senderId.name) || '';
            msgWrap.appendChild(avatar);
        }

        const content = document.createElement('div');
        content.className = 'message-content';
        const p = document.createElement('p'); p.className = 'message-text'; p.innerHTML = escapeHtml(message.content || '');
        const time = document.createElement('div'); time.className = 'message-time'; time.textContent = formatTime(message.createdAt);
        content.appendChild(p); content.appendChild(time);
        msgWrap.appendChild(content);
        messagesEl.appendChild(msgWrap);
    });

    if (isTyping) {
        const otherUser = getOtherUser() || {};
        const typingWrap = document.createElement('div');
        typingWrap.className = 'message received typing';
        const avatar = document.createElement('img'); avatar.className = 'message-avatar'; avatar.src = otherUser.profilePhoto || '/public/images/default-avatar.png'; avatar.alt = otherUser.name || '';
        const content = document.createElement('div'); content.className = 'message-content';
        const typingInner = document.createElement('div'); typingInner.className = 'typing-indicator'; typingInner.innerHTML = `<span>Digitando</span><div class="typing-dots"><span></span><span></span><span></span></div>`;
        content.appendChild(typingInner); typingWrap.appendChild(avatar); typingWrap.appendChild(content);
        messagesEl.appendChild(typingWrap);
    }

    scrollToBottom();
}

// Enviar mensagem
async function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content) return;

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    input.disabled = true;

    // Helper to actually send and return parsed JSON or throw
    async function sendMessageContent(payload) {
        let response;
        try {
            response = await fetch(`/api/chats/${currentChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content: payload })
            });
        } catch (netErr) {
            // Network level error (CORS, offline, DNS, etc.)
            netErr.isNetwork = true;
            throw netErr;
        }

        // Try to parse body safely
        let body = null;
        try {
            body = await response.clone().json();
        } catch (parseErr) {
            try {
                body = await response.clone().text();
            } catch (e) { body = null; }
        }

        if (!response.ok) {
            const err = new Error((body && (body.error || body.message)) || `HTTP ${response.status}`);
            err.status = response.status;
            err.body = body;
            throw err;
        }

        return body;
    }

    // Quick offline check to give faster feedback
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        showMessage('Você está offline. Verifique sua conexão de rede.', 'error', { persistent: true });
        sendBtn.disabled = false;
        input.disabled = false;
        return;
    }

    try {
        await sendMessageContent(content);

        // Limpar input
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('charCount').textContent = '0';

        // Parar digitação
        stopTyping();

        // Recarregar mensagens imediatamente
        await loadMessages();

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);

        // Friendly title + details
        const title = error.isNetwork ? 'Erro de conexão' : (error.status ? `Erro ${error.status}` : 'Erro ao enviar mensagem');
        const detail = error.isNetwork ? (error.message || 'Falha na conexão. Verifique sua internet ou se o servidor está ativo na porta 3000.') : (error.body && (typeof error.body === 'string' ? error.body : JSON.stringify(error.body))) || error.message;

        // Show notification with retry action
        showMessage(`${title}: ${detail}`, 'error', {
            persistent: true,
            actions: [
                { label: 'Tentar novamente', onClick: async (btn) => {
                    // disable button while retrying
                    btn.disabled = true;
                    try {
                        await sendMessageContent(content);
                        // on success, refresh messages and remove notifications
                        await loadMessages();
                        showSuccess('Mensagem enviada');
                    } catch (retryErr) {
                        console.error('Retry failed:', retryErr);
                        showError(retryErr.message || 'Erro ao reenviar mensagem');
                    } finally {
                        btn.disabled = false;
                    }
                } },
                { label: 'Detalhes', onClick: (btn) => {
                    try {
                        const details = (error.body && typeof error.body === 'object') ? JSON.stringify(error.body, null, 2) : (error.body || error.message || 'Sem detalhes');
                        // Usar modal simples via alert para agora
                        alert(`Detalhes do erro:\n\n${details}`);
                    } catch (e) {
                        alert(error.message || 'Sem detalhes disponíveis');
                    }
                } }
            ]
        });
    } finally {
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
    }
}

// Arquivar chat
async function archiveChat() {
    if (!confirm('Deseja arquivar esta conversa?')) return;

    try {
        const response = await fetch(`/api/chats/${currentChatId}/archive`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Erro ao arquivar conversa');

        // Fechar chat
        currentChatId = null;
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('chatArea').style.display = 'none';

        // Recarregar lista
        await loadChats();

        showSuccess('Conversa arquivada');

    } catch (error) {
        console.error('Erro ao arquivar:', error);
        showError('Erro ao arquivar conversa');
    }
}

// Manipular mudança no input
function handleInputChange() {
    const input = this;
    const charCount = document.getElementById('charCount');
    const sendBtn = document.getElementById('sendBtn');

    // Auto-resize
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';

    // Contador de caracteres
    charCount.textContent = input.value.length;

    // Habilitar/desabilitar botão de envio
    sendBtn.disabled = input.value.trim().length === 0;

    // Limite de caracteres
    if (input.value.length > 2000) {
        input.value = input.value.substring(0, 2000);
        charCount.textContent = '2000';
        showMessage('Limite de 2000 caracteres atingido', 'warning');
    }
}

// Manipular digitação
function handleTyping() {
    if (!isTyping) {
        isTyping = true;
        sendTypingIndicator();
    }

    // Limpar timeout anterior
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    // Definir novo timeout
    typingTimeout = setTimeout(stopTyping, 3000);
}

// Parar digitação
function handleStopTyping() {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    typingTimeout = setTimeout(stopTyping, 1000);
}

// Formatadores
function formatTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    // Menos de 1 minuto
    if (diff < 60000) {
        return 'Agora';
    }

    // Menos de 1 hora
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins}min`;
    }

    // Hoje
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // Ontem
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    }

    // Essa semana
    if (diff < 604800000) {
        return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    }

    // Mais antigo
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDate(date) {
    const now = new Date();
    const d = new Date(date);

    if (d.toDateString() === now.toDateString()) {
        return 'Hoje';
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    }

    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Marcar mensagens como lidas
async function markAsRead(chatId) {
    try {
        await fetch(`/api/chats/${chatId}/read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    } catch (error) {
        console.error('Erro ao marcar como lido:', error);
    }
}

// Obter usuário da conversa
function getOtherUser() {
    const chat = chats.find(c => c._id === currentChatId);
    return chat ? chat.otherUser : null;
}

// Scroll para o final das mensagens
function scrollToBottom() {
    const container = safeGet('chatMessages');
    if (!container) return;
    try { container.scrollTop = container.scrollHeight; } catch (e) { /* ignore */ }
}

// Parar indicador de digitação
function stopTyping() {
    if (isTyping) {
        isTyping = false;
        sendTypingIndicator(false);
    }
}

// Enviar indicador de digitação
async function sendTypingIndicator(isTyping = true) {
    try {
        await fetch(`/api/chats/${currentChatId}/typing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ isTyping })
        });
    } catch (error) {
        console.error('Erro ao enviar indicador de digitação:', error);
    }
}

// Mostrar contador de notificações
async function showNotificationCount() {
    try {
        const response = await fetch('/api/notifications/count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById('notificationBadge');

            if (data.count > 0) {
                badge.textContent = data.count > 99 ? '99+' : data.count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar contador de notificações:', error);
    }
}

// Melhorar função showError
function showError(message) {
    showMessage(message, 'error');
}

// Melhorar função showSuccess
function showSuccess(message) {
    showMessage(message, 'success');
}

// Sistema de notificações melhorado
function showMessage(message, type = 'info', opts = {}) {
    // opts: { persistent: boolean, actions: [{ label, onClick(button) }] }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const iconClass = type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';

    const content = document.createElement('div');
    content.className = 'notification-content';
    content.innerHTML = `<i class="fas ${iconClass}"></i> <span class="notification-text">${message}</span>`;
    notification.appendChild(content);

    // Actions container
    if (Array.isArray(opts.actions) && opts.actions.length > 0) {
        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'notification-actions';
        opts.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'btn notification-btn';
            btn.textContent = action.label || 'OK';
            btn.addEventListener('click', (ev) => {
                try {
                    action.onClick && action.onClick(btn, ev);
                } catch (err) {
                    console.error('Notification action error:', err);
                }
                // If not persistent, remove after action
                if (!opts.persistent) notification.remove();
            });
            actionsWrap.appendChild(btn);
        });
        notification.appendChild(actionsWrap);
    }

    // Close button for persistent notifications
    if (opts.persistent) {
        const close = document.createElement('button');
        close.className = 'notification-close';
        close.innerHTML = '&times;';
        close.addEventListener('click', () => notification.remove());
        notification.appendChild(close);
    }

    // Add to container
    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);

    // Auto-remove if not persistent
    if (!opts.persistent) {
        setTimeout(() => {
            try { notification.remove(); } catch (e) {}
        }, opts.timeout || 5000);
    }

    return notification;
}

// Criar elemento de status se não existir
function createStatusElement() {
    const headerText = document.querySelector('.chat-header-text');
    if (!headerText) return null;

    const statusElement = document.createElement('div');
    statusElement.className = 'chat-header-status';
    statusElement.innerHTML = `
        <span class="status-dot offline"></span>
        <span>Offline</span>
    `;

    headerText.appendChild(statusElement);
    return statusElement;
}
