// Estado do chat
let currentChatId = null;
let currentUser = null;
let chats = [];
let messages = [];
let messagePolling = null;
let isTyping = false;
let typingTimeout = null;

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar autenticação
        // Preferir o helper global `window.Auth` para obter o usuário atual
        if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
            currentUser = await window.Auth.getCurrentUser();
        } else if (typeof api !== 'undefined' && api.getCurrentUser) {
            // fallback para compatibilidade com versões antigas
            currentUser = await api.getCurrentUser();
        } else {
            currentUser = null;
        }
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Configurar link do perfil
        const profileLink = document.getElementById('userProfileLink');
        if (currentUser.type === 'candidato') {
            profileLink.href = 'perfil-candidato.html';
        } else if (currentUser.type === 'empresa') {
            profileLink.href = 'perfil-empresa.html';
        } else if (currentUser.type === 'admin') {
            profileLink.href = 'perfil-admin.html';
        }

        // Configurar logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (window.logout) window.logout();
            else if (typeof api !== 'undefined' && api.logout) api.logout();
            else {
                // fallback: clear local token and redirect
                if (window.Auth && window.Auth.removeToken) window.Auth.removeToken();
                window.location.href = 'login.html';
            }
        });

        // Configurar menu mobile
        setupMobileMenu();

        // Carregar lista de chats
        await loadChats();

        // Verificar se há chatId na URL
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdParam = urlParams.get('chatId');
        const applicationIdParam = urlParams.get('applicationId');

        if (chatIdParam) {
            openChat(chatIdParam);
        } else if (applicationIdParam) {
            // Se veio de uma aplicação, tentar criar/abrir chat
            await createChatFromApplication(applicationIdParam);
        }

        // Configurar formulário de envio
        document.getElementById('messageForm').addEventListener('submit', handleSendMessage);

        // Auto-resize do textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', handleInputChange);

        // Configurar eventos de digitação
        messageInput.addEventListener('keydown', handleTyping);
        messageInput.addEventListener('keyup', handleStopTyping);

        // Arquivar chat
        document.getElementById('archiveChatBtn').addEventListener('click', archiveChat);

        // Fechar chat (mobile)
        document.getElementById('closeChatBtn').addEventListener('click', closeChat);

        // Mostrar notificações se houver
        showNotificationCount();

    } catch (error) {
        console.error('Erro ao inicializar chat:', error);
        showError('Erro ao carregar chat. Tente recarregar a página.');
    }
});

// Configurar menu mobile
function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('chatSidebar');
    const closeBtn = document.getElementById('closeChatBtn');

    // Mostrar botão mobile apenas em telas pequenas
    if (window.innerWidth <= 768) {
        mobileToggle.style.display = 'block';
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            mobileToggle.style.display = 'block';
            closeBtn.style.display = currentChatId ? 'block' : 'none';
        } else {
            mobileToggle.style.display = 'none';
            closeBtn.style.display = 'none';
            sidebar.classList.remove('active');
        }
    });

    mobileToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
    });

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !mobileToggle.contains(e.target) &&
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
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
        const chatListEl = document.getElementById('chatList');
        chatListEl.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando conversas...</div>';

        const response = await fetch('/api/chats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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

        chatListEl.innerHTML = chats.map(chat => `
            <div class="chat-item ${chat._id === currentChatId ? 'active' : ''}" onclick="openChat('${chat._id}')">
                <img src="${chat.otherUser.profilePhoto || '/public/images/default-avatar.png'}"
                     alt="${chat.otherUser.name}"
                     class="chat-item-avatar">
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <span class="chat-item-name">${chat.otherUser.name}</span>
                        <span class="chat-item-time">${formatTime(chat.lastMessageAt)}</span>
                    </div>
                    ${chat.job ? `<div class="chat-item-job">${chat.job.title}</div>` : ''}
                    ${chat.lastMessage ? `<div class="chat-item-last">${chat.lastMessage}</div>` : ''}
                </div>
                ${chat.unreadCount > 0 ? `<span class="chat-item-badge">${chat.unreadCount}</span>` : ''}
            </div>
        `).join('');

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

        // Iniciar polling a cada 5 segundos
        messagePolling = setInterval(loadMessages, 5000);

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
        const response = await fetch(`/api/chats/${currentChatId}/messages`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

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
        if (!messagePolling) { // Só mostrar erro se não for polling
            showError('Erro ao carregar mensagens');
        }
    }
}

// Renderizar mensagens
function renderMessages() {
    const messagesEl = document.getElementById('chatMessages');

    if (messages.length === 0) {
        messagesEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-dots fa-2x"></i>
                <p style="margin-top: 15px;">Nenhuma mensagem ainda. Comece a conversa!</p>
            </div>
        `;
        return;
    }

    let html = '';
    let lastDate = null;

    messages.forEach(message => {
        const messageDate = new Date(message.createdAt);
        const dateStr = messageDate.toLocaleDateString('pt-BR');

        // Adicionar divisor de data
        if (dateStr !== lastDate) {
            html += `
                <div class="date-divider">
                    <span>${formatDate(messageDate)}</span>
                </div>
            `;
            lastDate = dateStr;
        }

        const isSent = message.senderId._id === currentUser._id;

        html += `
            <div class="message ${isSent ? 'sent' : 'received'}">
                ${!isSent ? `<img src="${message.senderId.profilePhoto || '/public/images/default-avatar.png'}" alt="${message.senderId.name}" class="message-avatar">` : ''}
                <div class="message-content">
                    <p class="message-text">${escapeHtml(message.content)}</p>
                    <div class="message-time">${formatTime(message.createdAt)}</div>
                </div>
            </div>
        `;
    });

    // Adicionar indicador de digitação se necessário
    if (isTyping) {
        const otherUser = getOtherUser();
        html += `
            <div class="message received typing">
                <img src="${otherUser?.profilePhoto || '/public/images/default-avatar.png'}" alt="Typing" class="message-avatar">
                <div class="message-content">
                    <div class="typing-indicator">
                        <span>Digitando</span>
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    messagesEl.innerHTML = html;

    // Scroll para o final
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

    try {
        const response = await fetch(`/api/chats/${currentChatId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao enviar mensagem');
        }

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
        showError(error.message);
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
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
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
function showMessage(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;

    // Adicionar ao container
    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
        notification.remove();
    }, 5000);
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
