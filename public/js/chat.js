// Estado do chat
let currentChatId = null;
let currentUser = null;
let chats = [];
let messages = [];
let messagePolling = null;

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar autenticação
        currentUser = await api.getCurrentUser();
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
            api.logout();
            window.location.href = 'login.html';
        });

        // Carregar lista de chats
        await loadChats();

        // Verificar se há chatId na URL
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdParam = urlParams.get('chatId');
        if (chatIdParam) {
            openChat(chatIdParam);
        }

        // Configurar formulário de envio
        document.getElementById('messageForm').addEventListener('submit', handleSendMessage);

        // Auto-resize do textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            // Atualizar contador de caracteres
            document.getElementById('charCount').textContent = this.value.length;
        });

        // Arquivar chat
        document.getElementById('archiveChatBtn').addEventListener('click', archiveChat);

    } catch (error) {
        console.error('Erro ao inicializar chat:', error);
        showError('Erro ao carregar chat');
    }
});

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
                </div>
            `;
            return;
        }

        chatListEl.innerHTML = chats.map(chat => `
            <div class="chat-item ${chat._id === currentChatId ? 'active' : ''}" onclick="openChat('${chat._id}')">
                <img src="${chat.otherUser.profilePhoto || '../images/default-avatar.png'}" 
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

        // Atualizar item ativo na lista
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.chat-item[onclick="openChat('${chatId}')"]`)?.classList.add('active');

        // Encontrar dados do chat
        const chat = chats.find(c => c._id === chatId);
        if (chat) {
            document.getElementById('chatAvatar').src = chat.otherUser.profilePhoto || '../images/default-avatar.png';
            document.getElementById('chatUserName').textContent = chat.otherUser.name;
            document.getElementById('chatJobTitle').textContent = chat.job ? chat.job.title : 'Chat';
        }

        // Carregar mensagens
        await loadMessages();

        // Iniciar polling a cada 5 segundos
        messagePolling = setInterval(loadMessages, 5000);

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

        // Recarregar lista de chats para atualizar contador
        await loadChats();

    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
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
                <div class="message-content">
                    <p class="message-text">${escapeHtml(message.content)}</p>
                    <div class="message-time">${formatTime(message.createdAt)}</div>
                </div>
            </div>
        `;
    });

    messagesEl.innerHTML = html;
    
    // Scroll para o final
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Enviar mensagem
async function handleSendMessage(e) {
    e.preventDefault();

    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content) return;

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;

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

        // Recarregar mensagens imediatamente
        await loadMessages();

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showError(error.message);
    } finally {
        sendBtn.disabled = false;
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

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

// Limpar polling ao sair da página
window.addEventListener('beforeunload', () => {
    if (messagePolling) {
        clearInterval(messagePolling);
    }
});
