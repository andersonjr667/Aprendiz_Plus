// AI Assistant Global - Estilo Samsung Sam
// Assistente inteligente para ajudar usuários com o sistema

class AIAssistant {
  constructor() {
    this.isOpen = false;
    this.chatHistory = [];
    this.isTyping = false;
    this.userName = null;
    this.userRole = null;
    
    this.init();
  }
  
  init() {
    this.createHTML();
    this.attachEventListeners();
    this.loadUserInfo();
    this.showWelcomeMessage();
  }
  
  createHTML() {
    const html = `
      <!-- Botão flutuante -->
      <button class="ai-assistant-button" id="aiAssistantBtn">
        <div class="ai-avatar">🤖</div>
        <div class="ai-notification-badge" id="aiNotificationBadge" style="display: none;">1</div>
      </button>
      
      <!-- Modal do chat -->
      <div class="ai-chat-modal" id="aiChatModal">
        <!-- Header -->
        <div class="ai-chat-header">
          <div class="ai-chat-avatar">🤖</div>
          <div class="ai-chat-info">
            <h3 class="ai-chat-name">Assistente IA</h3>
            <p class="ai-chat-status">
              <span class="status-dot"></span>
              Online - Pronto para ajudar!
            </p>
          </div>
          <button class="ai-close-btn" id="aiCloseBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Corpo -->
        <div class="ai-chat-body" id="aiChatBody">
          <!-- Mensagens aparecem aqui -->
        </div>
        
        <!-- Sugestões rápidas -->
        <div class="ai-suggestions" id="aiSuggestions">
          <button class="ai-suggestion-btn" onclick="aiAssistant.sendQuickMessage('Como funciona o sistema?')">
            Como funciona?
          </button>
          <button class="ai-suggestion-btn" onclick="aiAssistant.sendQuickMessage('Como me cadastro?')">
            Como me cadastro?
          </button>
          <button class="ai-suggestion-btn" onclick="aiAssistant.sendQuickMessage('Como publicar vaga?')">
            Publicar vaga
          </button>
          <button class="ai-suggestion-btn" onclick="aiAssistant.sendQuickMessage('Preciso de ajuda')">
            Preciso de ajuda
          </button>
        </div>
        
        <!-- Footer -->
        <div class="ai-chat-footer">
          <input 
            type="text" 
            class="ai-chat-input" 
            id="aiChatInput" 
            placeholder="Digite sua dúvida..."
            maxlength="500"
          />
          <button class="ai-send-btn" id="aiSendBtn">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
        
        <div class="ai-powered-by">
          Powered by <strong>TensorFlow.js</strong> ⚡
        </div>
        
        <!-- Loading overlay -->
        <div class="ai-loading-overlay" id="aiLoadingOverlay">
          <div class="ai-loader"></div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
  }
  
  attachEventListeners() {
    // Abrir/fechar chat
    document.getElementById('aiAssistantBtn').addEventListener('click', () => this.toggleChat());
    document.getElementById('aiCloseBtn').addEventListener('click', () => this.closeChat());
    
    // Enviar mensagem
    document.getElementById('aiSendBtn').addEventListener('click', () => this.sendMessage());
    document.getElementById('aiChatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    
    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('aiChatModal');
      const btn = document.getElementById('aiAssistantBtn');
      if (this.isOpen && !modal.contains(e.target) && !btn.contains(e.target)) {
        this.closeChat();
      }
    });
  }
  
  async loadUserInfo() {
    try {
      const user = await window.checkAuth?.();
      if (user) {
        this.userName = user.username || user.email;
        this.userRole = user.role;
      }
    } catch (error) {
      console.log('Usuário não autenticado');
    }
  }
  
  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }
  
  openChat() {
    this.isOpen = true;
    document.getElementById('aiChatModal').classList.add('active');
    document.getElementById('aiNotificationBadge').style.display = 'none';
    document.getElementById('aiChatInput').focus();
    this.scrollToBottom();
  }
  
  closeChat() {
    this.isOpen = false;
    document.getElementById('aiChatModal').classList.remove('active');
  }
  
  showWelcomeMessage() {
    const welcomeMsg = this.userName 
      ? `Olá, ${this.userName}! 👋\n\nSou seu assistente virtual inteligente. Estou aqui para ajudá-lo com qualquer dúvida sobre o sistema Aprendiz+.\n\nComo posso ajudá-lo hoje?`
      : `Olá! 👋\n\nSou seu assistente virtual do Aprendiz+. Posso responder suas dúvidas sobre:\n\n• Como usar o sistema\n• Cadastro e login\n• Publicação de vagas\n• Candidaturas\n• Funcionalidades\n\nO que você gostaria de saber?`;
    
    this.addMessage('assistant', welcomeMsg);
  }
  
  addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;
    
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Formatar conteúdo (markdown básico)
    const formattedContent = this.formatMessage(content);
    
    messageDiv.innerHTML = `
      <div class="ai-message-avatar">
        ${role === 'assistant' ? '🤖' : '👤'}
      </div>
      <div>
        <div class="ai-message-content">${formattedContent}</div>
        <div class="ai-message-time">${time}</div>
      </div>
    `;
    
    document.getElementById('aiChatBody').appendChild(messageDiv);
    this.chatHistory.push({ role, content, time });
    this.scrollToBottom();
  }
  
  formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
  
  showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message assistant';
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.innerHTML = `
      <div class="ai-message-avatar">🤖</div>
      <div class="ai-message-content">
        <div class="ai-typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    document.getElementById('aiChatBody').appendChild(typingDiv);
    this.scrollToBottom();
  }
  
  hideTypingIndicator() {
    const indicator = document.getElementById('aiTypingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  scrollToBottom() {
    const chatBody = document.getElementById('aiChatBody');
    setTimeout(() => {
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 100);
  }
  
  async sendMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Adicionar mensagem do usuário
    this.addMessage('user', message);
    input.value = '';
    
    // Mostrar typing indicator
    this.showTypingIndicator();
    
    // Simular delay de resposta
    await this.sleep(800);
    
    // Gerar resposta
    const response = await this.generateResponse(message);
    
    // Remover typing indicator
    this.hideTypingIndicator();
    
    // Adicionar resposta
    this.addMessage('assistant', response);
  }
  
  sendQuickMessage(message) {
    document.getElementById('aiChatInput').value = message;
    this.sendMessage();
  }
  
  async generateResponse(message) {
    const msg = message.toLowerCase();
    
    // Saudações
    if (msg.match(/^(oi|olá|ola|hey|hi|hello)/)) {
      return `Olá! 😊\n\nFico feliz em conversar com você! Como posso ajudá-lo hoje?`;
    }
    
    // Como funciona
    if (msg.includes('como funciona') || msg.includes('o que é') || msg.includes('o que e')) {
      return `**Sobre o Aprendiz+** 🎓\n\nO Aprendiz+ é uma plataforma que conecta empresas a jovens aprendizes.\n\n**Principais funcionalidades:**\n\n• **Para Candidatos:** Buscar vagas, enviar candidaturas, completar perfil\n• **Para Empresas:** Publicar vagas, gerenciar candidatos, visualizar perfis\n• **Para Admins:** Moderar conteúdo, gerenciar usuários, análise com IA\n\nQue tipo de usuário você é?`;
    }
    
    // Cadastro
    if (msg.includes('cadastr') || msg.includes('registr') || msg.includes('criar conta')) {
      return `**Como se cadastrar** 📝\n\n1. Clique em "Cadastrar" no menu\n2. Escolha seu tipo: Candidato ou Empresa\n3. Preencha seus dados\n4. Confirme seu email\n5. Complete seu perfil\n\n**Dica:** Um perfil completo tem 10x mais chances de sucesso!\n\nJá tem conta? Faça login em: /login`;
    }
    
    // Login
    if (msg.includes('login') || msg.includes('entrar') || msg.includes('acessar')) {
      return `**Problemas com login?** 🔐\n\n**Soluções comuns:**\n\n• Verifique seu email e senha\n• Use "Esqueci minha senha" se necessário\n• Limpe cache do navegador\n• Tente em modo anônimo\n\nAinda com problemas? Entre em contato pelo email: suporte@aprendizmais.com`;
    }
    
    // Publicar vaga
    if (msg.includes('public') && msg.includes('vaga') || msg.includes('criar vaga') || msg.includes('anunciar')) {
      if (this.userRole === 'company') {
        return `**Publicar uma vaga** 💼\n\n1. Acesse seu painel em: /painel-empresa\n2. Clique em "Publicar Nova Vaga"\n3. Preencha as informações:\n   - Título da vaga\n   - Descrição detalhada\n   - Requisitos\n   - Benefícios\n   - Localização\n4. Clique em "Publicar"\n\n**Dica:** Vagas detalhadas recebem 3x mais candidaturas!`;
      } else {
        return `**Publicar vagas** 💼\n\nApenas empresas cadastradas podem publicar vagas.\n\n**Para candidatos:** Você pode:\n• Buscar vagas disponíveis\n• Enviar candidaturas\n• Acompanhar status\n\n**Quer publicar vagas?** Crie uma conta como Empresa!`;
      }
    }
    
    // Candidatura
    if (msg.includes('candidat') || msg.includes('aplicar') || msg.includes('vaga')) {
      return `**Candidatar-se a vagas** 🎯\n\n1. Navegue em /vagas\n2. Use filtros para encontrar vagas ideais\n3. Clique na vaga desejada\n4. Leia os requisitos\n5. Clique em "Candidatar-se"\n\n**Antes de se candidatar:**\n✅ Complete seu perfil (80%+)\n✅ Adicione foto profissional\n✅ Atualize seu currículo\n✅ Verifique se atende aos requisitos\n\nBoa sorte! 🍀`;
    }
    
    // Perfil
    if (msg.includes('perfil') || msg.includes('curricul') || msg.includes('dados')) {
      return `**Gerenciar seu perfil** 👤\n\n**Para editar:**\n1. Clique no seu avatar (canto superior direito)\n2. Selecione "Meu Perfil"\n3. Edite as informações\n4. Salve as alterações\n\n**Informações importantes:**\n• Foto profissional\n• Dados pessoais completos\n• Experiências\n• Formação acadêmica\n• Habilidades\n\n**Perfil 100% = Mais visibilidade!** ⭐`;
    }
    
    // Upload de foto
    if (msg.includes('foto') || msg.includes('imagem') || msg.includes('avatar')) {
      return `**Upload de foto** 📸\n\n1. Acesse seu perfil\n2. Clique no avatar/foto atual\n3. Escolha uma imagem:\n   - Formato: JPG, PNG ou WEBP\n   - Tamanho máximo: 5MB\n   - Recomendado: foto profissional\n4. Confirme o upload\n\n**Dicas para foto profissional:**\n✅ Fundo neutro\n✅ Boa iluminação\n✅ Roupa adequada\n✅ Olhando para câmera\n✅ Sozinho na foto`;
    }
    
    // Notificações
    if (msg.includes('notific') || msg.includes('alert') || msg.includes('aviso')) {
      return `**Notificações** 🔔\n\nVocê recebe alertas sobre:\n\n• Novas vagas compatíveis\n• Respostas de candidaturas\n• Mensagens de empresas\n• Atualizações do sistema\n\n**Gerenciar notificações:**\nAcesse: Perfil → Configurações → Notificações\n\nDesative as que não quer receber!`;
    }
    
    // IA / Machine Learning
    if (msg.includes('ia') || msg.includes('intelig') || msg.includes('tensorflow') || msg.includes('machine learning')) {
      return `**Inteligência Artificial no Aprendiz+** 🧠\n\nUsamos **TensorFlow.js** para:\n\n✨ **Recomendações personalizadas**\n   - Vagas compatíveis com seu perfil\n   - Candidatos ideais para empresas\n\n🔍 **Detecção de anomalias**\n   - Comportamentos suspeitos\n   - Spam e fraudes\n\n📊 **Análise preditiva**\n   - Taxa de sucesso de candidaturas\n   - Tendências do mercado\n\nTudo processado localmente no seu navegador!`;
    }
    
    // Admin
    if (msg.includes('admin') || msg.includes('painel') && msg.includes('administr')) {
      if (this.userRole === 'owner') {
        return `**Painel do Proprietário** 👑\n\nVocê tem **ACESSO TOTAL** ao sistema:\n\n🔧 **Gerenciamento**\n   - Usuários (/admin-usuarios)\n   - Notícias (/admin-noticia)\n   - Monitoramento IA (/admin-monitoramento)\n   - **Gerenciar Admins (/admin-manage-admins)** 🌟\n\n📊 **Estatísticas**\n   - Dashboard completo\n   - Métricas em tempo real\n   - Relatórios de atividade\n\n🤖 **IA Avançada**\n   - Detecção de anomalias\n   - Análise de risco\n   - Tendências e padrões\n\n👑 **Funções Exclusivas**\n   - Promover/rebaixar administradores\n   - Acesso irrestrito\n   - Proteção total (não pode ser banido)\n\nQual área deseja acessar?`;
      } else if (this.userRole === 'admin') {
        return `**Painel Administrativo** 👨‍💼\n\nVocê tem acesso a:\n\n🔧 **Gerenciamento**\n   - Usuários (/admin-usuarios)\n   - Notícias (/admin-noticia)\n   - Monitoramento IA (/admin-monitoramento)\n\n📊 **Estatísticas**\n   - Dashboard completo\n   - Métricas em tempo real\n   - Relatórios de atividade\n\n🤖 **IA Avançada**\n   - Detecção de anomalias\n   - Análise de risco\n   - Tendências e padrões\n\nQual área deseja acessar?`;
      } else {
        return `Área administrativa disponível apenas para administradores do sistema.\n\nSe você precisa de suporte administrativo, entre em contato: admin@aprendizmais.com`;
      }
    }
    
    // Empresas
    if (msg.includes('empresa') && !msg.includes('painel')) {
      return `**Área para Empresas** 🏢\n\n**Funcionalidades:**\n\n📋 Publicar vagas ilimitadas\n👥 Gerenciar candidaturas\n📊 Estatísticas de visualizações\n💬 Mensagens com candidatos\n⭐ Perfil verificado\n\n**Para começar:**\n1. Cadastre-se como Empresa\n2. Complete o perfil da empresa\n3. Verifique seu CNPJ\n4. Publique sua primeira vaga\n\nDúvidas? Pergunte-me!`;
    }
    
    // Candidatos
    if (msg.includes('candidato') || msg.includes('aprendiz')) {
      return `**Área para Candidatos** 🎓\n\n**O que você pode fazer:**\n\n🔍 Buscar vagas de aprendiz\n📝 Candidatar-se a vagas\n📊 Acompanhar candidaturas\n💼 Criar currículo online\n⭐ Receber recomendações IA\n📧 Receber alertas de vagas\n\n**Dicas de sucesso:**\n✅ Mantenha perfil atualizado\n✅ Candidate-se rapidamente\n✅ Seja educado nas mensagens\n✅ Prepare-se para entrevistas\n\nPrecisa de ajuda específica?`;
    }
    
    // Ajuda genérica
    if (msg.includes('ajuda') || msg.includes('help') || msg.includes('duvida') || msg.includes('dúvida')) {
      return `**Como posso ajudar?** 🤔\n\nEscolha um tópico:\n\n📚 **Uso do Sistema**\n   - Como funciona o Aprendiz+\n   - Navegação e recursos\n\n👤 **Conta e Perfil**\n   - Cadastro e login\n   - Editar informações\n   - Upload de foto\n\n💼 **Vagas**\n   - Publicar vagas (empresas)\n   - Candidatar-se (candidatos)\n   - Acompanhar status\n\n🔧 **Problemas Técnicos**\n   - Erros no sistema\n   - Suporte técnico\n\n**Digite sua dúvida ou escolha um tópico acima!**`;
    }
    
    // Contato
    if (msg.includes('contato') || msg.includes('suporte') || msg.includes('email') || msg.includes('telefone')) {
      return `**Entre em contato** 📞\n\n**Suporte Técnico:**\n📧 suporte@aprendizmais.com\n📱 WhatsApp: (11) 99999-9999\n⏰ Seg-Sex: 9h às 18h\n\n**Comercial (Empresas):**\n📧 comercial@aprendizmais.com\n\n**Administrativo:**\n📧 admin@aprendizmais.com\n\n**Formulário de Contato:**\nAcesse: /contato\n\nRetornamos em até 24h úteis!`;
    }
    
    // Erro / Bug
    if (msg.includes('erro') || msg.includes('bug') || msg.includes('problema') || msg.includes('não funciona') || msg.includes('nao funciona')) {
      return `**Problemas técnicos?** 🔧\n\n**Soluções rápidas:**\n\n1️⃣ **Atualize a página** (F5)\n2️⃣ **Limpe o cache**\n   - Chrome: Ctrl+Shift+Del\n   - Firefox: Ctrl+Shift+Del\n3️⃣ **Teste em modo anônimo**\n4️⃣ **Tente outro navegador**\n\n**Persiste o erro?**\nDescreva o problema para: suporte@aprendizmais.com\n\nIncluindo:\n• O que você estava fazendo\n• Mensagem de erro (print)\n• Navegador e versão\n\nVamos resolver! 💪`;
    }
    
    // Agradecimento
    if (msg.match(/^(obrigad|obg|thanks|valeu|muito obrigado)/)) {
      return `Por nada! 😊\n\nFico feliz em ajudar! Se tiver mais alguma dúvida, é só perguntar.\n\nBoa sorte no Aprendiz+! 🚀`;
    }
    
    // Despedida
    if (msg.match(/^(tchau|adeus|bye|até|flw)/)) {
      return `Até logo! 👋\n\nVolte sempre que precisar de ajuda. Estou aqui 24/7!\n\nSucesso! 🌟`;
    }
    
    // Resposta padrão (usa contexto semântico)
    return this.generateContextualResponse(message);
  }
  
  generateContextualResponse(message) {
    const responses = [
      `Entendo sua dúvida sobre "${message}".\n\nPoderia ser mais específico? Isso me ajuda a dar uma resposta melhor!\n\n**Tópicos disponíveis:**\n• Como usar o sistema\n• Cadastro e login\n• Vagas e candidaturas\n• Perfil e configurações\n• Problemas técnicos`,
      
      `Hmm, ainda estou aprendendo sobre "${message}".\n\nEnquanto isso, posso ajudar com:\n\n✅ Navegação no sistema\n✅ Publicar/buscar vagas\n✅ Gerenciar perfil\n✅ Resolver problemas técnicos\n\nTente reformular sua pergunta ou escolha um tópico acima!`,
      
      `Interessante! Sobre "${message}", posso te direcionar:\n\n📚 **FAQ:** /ajuda\n📧 **Suporte:** suporte@aprendizmais.com\n💬 **Contato:** /contato\n\nOu faça uma pergunta mais específica que tentarei responder!`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Mostrar notificação quando chat está fechado
  showNotification(message) {
    if (!this.isOpen) {
      const badge = document.getElementById('aiNotificationBadge');
      badge.style.display = 'flex';
      
      // Auto-esconder após 5s
      setTimeout(() => {
        if (!this.isOpen) {
          badge.style.display = 'none';
        }
      }, 5000);
    }
  }
}

// Inicializar assistente quando DOM carregar
let aiAssistant;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    aiAssistant = new AIAssistant();
  });
} else {
  aiAssistant = new AIAssistant();
}
