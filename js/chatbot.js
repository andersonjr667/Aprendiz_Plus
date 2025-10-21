// Elemento do chatbot
const chatbotContainer = document.createElement('div');
chatbotContainer.className = 'chatbot-container';
chatbotContainer.innerHTML = `
    <div class="chatbot-header">
        <h3>Assistente Virtual</h3>
        <button class="chatbot-toggle">
            <i class="fas fa-comments"></i>
        </button>
    </div>
    <div class="chatbot-messages"></div>
    <div class="chatbot-input">
        <input type="text" placeholder="Digite sua mensagem...">
        <button>
            <i class="fas fa-paper-plane"></i>
        </button>
    </div>
`;

// Estilos do chatbot
const style = document.createElement('style');
style.textContent = `
    .chatbot-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        max-height: 500px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        z-index: 1000;
        transform: translateY(calc(100% - 50px));
        transition: transform 0.3s ease;
    }

    .chatbot-container.open {
        transform: translateY(0);
    }

    .chatbot-header {
        padding: 15px;
        background: var(--primary-color);
        color: white;
        border-radius: 10px 10px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
    }

    .chatbot-header h3 {
        margin: 0;
        font-size: 16px;
    }

    .chatbot-messages {
        padding: 15px;
        height: 300px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .chatbot-message {
        padding: 10px 15px;
        border-radius: 15px;
        max-width: 80%;
        word-wrap: break-word;
    }

    .chatbot-message.user {
        background: var(--light-gray);
        align-self: flex-end;
    }

    .chatbot-message.bot {
        background: var(--primary-light);
        align-self: flex-start;
    }

    .chatbot-input {
        padding: 15px;
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 10px;
    }

    .chatbot-input input {
        flex: 1;
        padding: 8px;
        border: 1px solid var(--border-color);
        border-radius: 5px;
        outline: none;
    }

    .chatbot-input button {
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 5px;
        padding: 8px 15px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .chatbot-input button:hover {
        background: var(--primary-dark);
    }

    .chatbot-toggle {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 20px;
    }

    .chatbot-question {
        font-weight: bold;
        margin-bottom: 5px;
    }
`;

// Adicionar estilos ao documento
document.head.appendChild(style);

// Classe do Chatbot
class Chatbot {
    constructor() {
        this.container = chatbotContainer;
        this.messagesContainer = this.container.querySelector('.chatbot-messages');
        this.input = this.container.querySelector('input');
        this.sendButton = this.container.querySelector('.chatbot-input button');
        this.toggleButton = this.container.querySelector('.chatbot-toggle');
        this.header = this.container.querySelector('.chatbot-header');

        this.setupEventListeners();
        document.body.appendChild(this.container);
        this.addMessage('bot', {
            question: 'Olá! Como posso ajudar?',
            answer: 'Estou aqui para responder suas dúvidas sobre a plataforma.'
        });
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        this.header.addEventListener('click', () => {
            this.container.classList.toggle('open');
        });

        // Fechar chatbot ao clicar fora
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target) && this.container.classList.contains('open')) {
                this.container.classList.remove('open');
            }
        });
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${type}`;
        
        if (type === 'bot' && content.question) {
            messageDiv.innerHTML = `
                <div class="chatbot-question">${content.question}</div>
                <div>${content.answer}</div>
            `;
        } else {
            messageDiv.textContent = content;
        }

        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;

        // Adicionar mensagem do usuário
        this.addMessage('user', message);
        this.input.value = '';

        try {
            const response = await fetch('/api/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                this.addMessage('bot', data.response);
            } else {
                this.addMessage('bot', {
                    question: 'Erro',
                    answer: data.message || 'Desculpe, não consegui processar sua mensagem.'
                });
            }

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.addMessage('bot', {
                question: 'Erro',
                answer: 'Desculpe, ocorreu um erro ao processar sua mensagem.'
            });
        }
    }
}

// Inicializar chatbot quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar apenas se o usuário estiver logado
    if (localStorage.getItem('token')) {
        window.chatbot = new Chatbot();
    }
});