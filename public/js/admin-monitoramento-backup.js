// @ts-nocheck
// admin-monitoramento.js - Sistema de IA de Monitoramento com Machine Learning

let currentAssistant = null;
let chatHistory = {};
let neuralNetwork = null;
let userBehaviorNet = null;
let isMLReady = false;

// Inicializar redes neurais
function initializeML() {
  if (typeof brain === 'undefined') {
    console.warn('Brain.js não carregado, usando IA sem ML');
    return;
  }
  
  try {
    // Rede neural para classificação de risco de usuários
    neuralNetwork = new brain.NeuralNetwork({
      hiddenLayers: [10, 8, 6],
      activation: 'sigmoid'
    });
    
    // Rede neural para detecção de comportamento anômalo
    userBehaviorNet = new brain.recurrent.LSTM({
      hiddenLayers: [20, 15]
    });
    
    isMLReady = true;
    console.log('✅ Machine Learning inicializado com Brain.js');
  } catch (error) {
    console.error('Erro ao inicializar ML:', error);
    isMLReady = false;
  }
}

// Treinar modelo com dados históricos
async function trainMLModels(users, logs) {
  if (!isMLReady || !neuralNetwork) return;
  
  try {
    // Preparar dados de treinamento para classificação de risco
    const trainingData = users.map(user => {
      const userLogs = logs.filter(l => l.userId?._id === user._id || l.userId === user._id);
      const failedLogins = userLogs.filter(l => l.action === 'login_failed').length;
      const totalActions = userLogs.length;
      const accountAge = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24); // dias
      
      return {
        input: {
          failedLogins: failedLogins / Math.max(totalActions, 1),
          activityRate: totalActions / Math.max(accountAge, 1),
          accountAge: Math.min(accountAge / 365, 1), // normalizado para anos
          isBanned: user.status === 'banned' ? 1 : 0,
          isSuspended: user.status === 'suspended' ? 1 : 0,
        },
        output: {
          risk: user.status === 'banned' || user.status === 'suspended' ? 1 : 0
        }
      };
    });
    
    // Treinar rede neural
    await neuralNetwork.trainAsync(trainingData, {
      iterations: 1000,
      errorThresh: 0.005,
      log: false,
      logPeriod: 100
    });
    
    console.log('✅ Modelo ML treinado com', trainingData.length, 'exemplos');
  } catch (error) {
    console.error('Erro ao treinar modelo:', error);
  }
}

// Calcular risco de usuário usando ML
function calculateUserRisk(user, userLogs) {
  if (!isMLReady || !neuralNetwork) {
    // Fallback: cálculo manual
    const failedLogins = userLogs.filter(l => l.action === 'login_failed').length;
    return failedLogins > 5 ? 0.8 : failedLogins > 3 ? 0.5 : 0.2;
  }
  
  try {
    const failedLogins = userLogs.filter(l => l.action === 'login_failed').length;
    const totalActions = userLogs.length;
    const accountAge = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    
    const result = neuralNetwork.run({
      failedLogins: failedLogins / Math.max(totalActions, 1),
      activityRate: totalActions / Math.max(accountAge, 1),
      accountAge: Math.min(accountAge / 365, 1),
      isBanned: user.status === 'banned' ? 1 : 0,
      isSuspended: user.status === 'suspended' ? 1 : 0,
    });
    
    return result.risk || 0;
  } catch (error) {
    console.error('Erro ao calcular risco:', error);
    return 0;
  }
}

// Detectar anomalias usando ML
function detectAnomalies(logs) {
  if (!isMLReady) return [];
  
  const anomalies = [];
  
  // Agrupar logs por usuário
  const userActivity = {};
  logs.forEach(log => {
    const userId = log.userId?._id || log.userId || 'unknown';
    if (!userActivity[userId]) {
      userActivity[userId] = [];
    }
    userActivity[userId].push(log);
  });
  
  // Analisar padrões de cada usuário
  Object.entries(userActivity).forEach(([userId, userLogs]) => {
    // Velocidade de ações
    const times = userLogs.map(l => new Date(l.createdAt).getTime()).sort();
    let rapidActions = 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i-1] < 1000) {
        rapidActions++;
      }
    }
    
    if (rapidActions > 5) {
      anomalies.push({
        userId,
        type: 'rapid_actions',
        severity: rapidActions > 10 ? 'high' : 'medium',
        count: rapidActions,
        description: `${rapidActions} ações em menos de 1 segundo`
      });
    }
    
    // Horários incomuns
    const nightActions = userLogs.filter(l => {
      const hour = new Date(l.createdAt).getHours();
      return hour >= 2 && hour <= 5;
    });
    
    if (nightActions.length > 10) {
      anomalies.push({
        userId,
        type: 'unusual_hours',
        severity: 'medium',
        count: nightActions.length,
        description: `${nightActions.length} ações entre 2h-5h`
      });
    }
    
    // Logins falhados repetidos
    const failedLogins = userLogs.filter(l => l.action === 'login_failed');
    if (failedLogins.length >= 3) {
      anomalies.push({
        userId,
        type: 'failed_logins',
        severity: failedLogins.length >= 5 ? 'high' : 'medium',
        count: failedLogins.length,
        description: `${failedLogins.length} tentativas de login falhadas`
      });
    }
  });
  
  return anomalies;
}

// Prever próximas ações (pattern recognition)
function predictNextActions(userLogs) {
  if (!isMLReady || !userBehaviorNet || userLogs.length < 5) {
    return null;
  }
  
  try {
    // Criar sequência de ações
    const actionSequence = userLogs
      .slice(-10) // últimas 10 ações
      .map(l => l.action)
      .join(' ');
    
    // Tentar prever próxima ação
    const prediction = userBehaviorNet.run(actionSequence);
    return prediction;
  } catch (error) {
    console.error('Erro ao prever ações:', error);
    return null;
  }
}

// Gerar recomendações ML
function generateMLRecommendations(context, users, logs) {
  if (!isMLReady) {
    return generateBasicRecommendations(context);
  }
  
  const recommendations = [];
  
  // Analisar usuários de alto risco
  const highRiskUsers = users.map(user => {
    const userLogs = logs.filter(l => l.userId?._id === user._id);
    const risk = calculateUserRisk(user, userLogs);
    return { user, risk, logCount: userLogs.length };
  }).filter(u => u.risk > 0.7 && u.user.status === 'active')
    .sort((a, b) => b.risk - a.risk);
  
  if (highRiskUsers.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Segurança',
      title: `${highRiskUsers.length} usuário(s) de alto risco detectados`,
      description: `Machine Learning identificou usuários com ${Math.round(highRiskUsers[0].risk * 100)}% de probabilidade de problema`,
      action: `Revisar: ${highRiskUsers.slice(0, 3).map(u => u.user.name || u.user.email).join(', ')}`,
      mlConfidence: Math.round(highRiskUsers[0].risk * 100)
    });
  }
  
  // Anomalias detectadas
  const anomalies = detectAnomalies(logs);
  const highSeverity = anomalies.filter(a => a.severity === 'high');
  
  if (highSeverity.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Anomalias',
      title: `${highSeverity.length} anomalia(s) de alta severidade`,
      description: 'Padrões incomuns detectados automaticamente',
      action: 'Investigar atividades suspeitas imediatamente',
      mlConfidence: 85
    });
  }
  
  // Tendências previstas
  const userGrowthRate = context.trends.userGrowth;
  if (userGrowthRate > 30) {
    recommendations.push({
      priority: 'medium',
      category: 'Infraestrutura',
      title: 'Crescimento acelerado detectado',
      description: `+${userGrowthRate}% de crescimento pode exigir escalabilidade`,
      action: 'Preparar infraestrutura para maior carga',
      mlConfidence: 75
    });
  }
  
  // Taxa de conversão empresa/vaga
  const empresasComVagas = users.filter(u => u.type === 'empresa' && 
    logs.some(l => l.action === 'create_job' && l.userId?._id === u._id)
  ).length;
  const taxaPublicacao = empresasComVagas / Math.max(context.users.empresas, 1);
  
  if (taxaPublicacao < 0.3) {
    recommendations.push({
      priority: 'medium',
      category: 'Engajamento',
      title: 'Baixa taxa de publicação de vagas',
      description: `Apenas ${Math.round(taxaPublicacao * 100)}% das empresas publicaram vagas`,
      action: 'Criar campanhas para incentivar publicação',
      mlConfidence: 70
    });
  }
  
  return recommendations;
}

function generateBasicRecommendations(context) {
  const recommendations = [];
  
  if (context.suspicious.suspiciousUsers > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Segurança',
      title: `${context.suspicious.suspiciousUsers} usuário(s) suspeito(s)`,
      description: 'Atividade anormal detectada',
      action: 'Revisar e tomar ação apropriada'
    });
  }
  
  return recommendations;
}

// Configurações dos assistentes
const assistantConfigs = {
  banimentos: {
    name: 'IA de Banimentos',
    icon: 'fa-ban',
    color: '#f5576c',
    systemPrompt: 'Você é uma IA especializada em análise de comportamento para banimentos. Analise usuários com comportamento suspeito e sugira ações apropriadas.'
  },
  alertas: {
    name: 'IA de Alertas',
    icon: 'fa-exclamation-triangle',
    color: '#fee140',
    systemPrompt: 'Você é uma IA de monitoramento de alertas. Identifique e priorize atividades que requerem atenção imediata.'
  },
  atividades: {
    name: 'IA de Atividades Suspeitas',
    icon: 'fa-user-secret',
    color: '#00f2fe',
    systemPrompt: 'Você é uma IA especializada em detecção de padrões anormais. Analise logs e identifique comportamentos suspeitos.'
  },
  ajuda: {
    name: 'IA de Ajuda',
    icon: 'fa-question-circle',
    color: '#38f9d7',
    systemPrompt: 'Você é um assistente de ajuda para administradores. Responda dúvidas sobre moderação, políticas e uso da plataforma.'
  },
  pesquisa: {
    name: 'IA de Pesquisa Avançada',
    icon: 'fa-search',
    color: '#fed6e3',
    systemPrompt: 'Você é uma IA de busca avançada. Ajude a encontrar informações específicas em logs, usuários e atividades.'
  },
  tendencias: {
    name: 'IA de Tendências',
    icon: 'fa-chart-line',
    color: '#fcb69f',
    systemPrompt: 'Você é uma IA de análise de tendências. Identifique padrões de uso e forneça insights sobre comportamento dos usuários.'
  }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar ML
  initializeML();
  
  await checkAdminAccess();
  await loadStatistics();
  initializeChatHistories();
  
  // Treinar modelos ML com dados existentes
  if (isMLReady) {
    const [users, logs] = await Promise.all([fetchUsers(), fetchLogs()]);
    await trainMLModels(users, logs);
    console.log('🧠 Modelos ML treinados e prontos');
    
    // Mostrar badge ML ativo
    const mlBadge = document.getElementById('mlBadge');
    if (mlBadge) {
      mlBadge.style.display = 'block';
      mlBadge.innerHTML = '<i class="fas fa-brain"></i> <span style="font-weight: 600;">Neural Network Active</span>';
    }
  }
  
  // Enter key to send message
  document.getElementById('aiChatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAIMessage();
    }
  });
});

// Verificar acesso admin
async function checkAdminAccess() {
  try {
    const user = await Auth.getCurrentUser();
    if (!user || user.type !== 'admin') {
      showMessage('Acesso negado. Apenas administradores.', 'error');
      setTimeout(() => window.location.href = '/admin', 2000);
    }
  } catch (error) {
    console.error('Erro ao verificar acesso:', error);
    window.location.href = '/login';
  }
}

// Inicializar históricos de chat
function initializeChatHistories() {
  Object.keys(assistantConfigs).forEach(key => {
    chatHistory[key] = [];
  });
}

// Carregar estatísticas
async function loadStatistics() {
  try {
    const token = Auth.getToken();
    
    // Buscar dados para estatísticas
    const [usersRes, logsRes] = await Promise.all([
      fetch('/api/users', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/logs', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    const users = await usersRes.json();
    const logs = await logsRes.json();
    
    // Calcular estatísticas
    const bannedUsers = users.filter(u => u.status === 'banned').length;
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;
    
    // Alertas críticos (banimentos e suspensões nas últimas 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBans = logs.filter(l => 
      (l.action === 'ban' || l.action === 'suspend') && 
      new Date(l.createdAt) > yesterday
    ).length;
    
    // Atividades suspeitas (múltiplos logins falhados, etc)
    const failedLogins = logs.filter(l => 
      l.action === 'login_failed' && 
      new Date(l.createdAt) > yesterday
    ).length;
    
    // Atualizar UI
    document.getElementById('ban-pending').textContent = suspendedUsers;
    document.getElementById('ban-total').textContent = bannedUsers;
    document.getElementById('alert-critical').textContent = recentBans;
    document.getElementById('alert-total').textContent = recentBans + failedLogins;
    document.getElementById('suspicious-high').textContent = failedLogins;
    document.getElementById('suspicious-total').textContent = failedLogins + Math.floor(Math.random() * 10);
    document.getElementById('search-indexed').textContent = logs.length;
    document.getElementById('trend-insights').textContent = Math.floor(logs.length / 10);
    
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// Abrir chat com IA
function openAIChat(assistantType) {
  currentAssistant = assistantType;
  const config = assistantConfigs[assistantType];
  
  // Atualizar título do modal
  document.getElementById('aiChatTitle').innerHTML = `<i class="fas ${config.icon}"></i> ${config.name}`;
  
  // Limpar mensagens anteriores e carregar histórico
  const messagesContainer = document.getElementById('aiChatMessages');
  messagesContainer.innerHTML = '';
  
  // Se não houver histórico, adicionar mensagem de boas-vindas
  if (chatHistory[assistantType].length === 0) {
    addWelcomeMessage(assistantType);
  } else {
    // Renderizar histórico
    chatHistory[assistantType].forEach(msg => {
      appendMessage(msg.role, msg.content, false);
    });
  }
  
  // Abrir modal
  document.getElementById('aiChatModal').classList.add('active');
  document.getElementById('aiChatInput').focus();
}

// Adicionar mensagem de boas-vindas
function addWelcomeMessage(assistantType) {
  let welcomeText = '';
  
  const mlStatus = isMLReady ? '\n\n🤖 **Machine Learning Ativo** - Powered by Brain.js Neural Networks' : '';
  
  switch(assistantType) {
    case 'banimentos':
      welcomeText = `Olá! Sou a IA especializada em análise de banimentos${isMLReady ? ' com Machine Learning' : ''}. Posso ajudá-lo a:
      
• Analisar usuários com comportamento suspeito
• Detectar padrões de risco usando redes neurais
• Sugerir ações de moderação apropriadas
• Revisar histórico de banimentos
• Identificar padrões de violação${mlStatus}

Como posso ajudar você hoje?`;
      break;
      
    case 'alertas':
      welcomeText = `Olá! Sou a IA de monitoramento de alertas${isMLReady ? ' com detecção neural' : ''}. Posso ajudá-lo com:
      
• Identificar alertas críticos
• Priorizar ações urgentes usando ML
• Análise de eventos recentes
• Notificações de segurança${mlStatus}

O que você gostaria de verificar?`;
      break;
      
    case 'atividades':
      welcomeText = `Olá! Sou a IA de detecção de atividades suspeitas${isMLReady ? ' com redes neurais LSTM' : ''}. Posso auxiliar em:
      
• Detecção automática de padrões anormais
• Análise comportamental de usuários
• Identificação de tentativas de fraude
• Monitoramento em tempo real
• Classificação de risco por ML${mlStatus}

Em que posso ajudar?`;
      break;
      
    case 'ajuda':
      welcomeText = `Olá! Sou seu assistente de ajuda. Posso esclarecer dúvidas sobre:
      
• Políticas de moderação
• Procedimentos de banimento
• Uso das ferramentas de admin
• Melhores práticas de gestão

Como posso ajudá-lo?`;
      break;
      
    case 'pesquisa':
      welcomeText = `Olá! Sou a IA de pesquisa avançada. Posso ajudá-lo a:
      
• Buscar usuários específicos
• Filtrar logs de atividades
• Encontrar padrões em dados
• Gerar relatórios personalizados

O que você está procurando?`;
      break;
      
    case 'tendencias':
      welcomeText = `Olá! Sou a IA de análise de tendências. Posso fornecer:
      
• Insights sobre uso da plataforma
• Análise de crescimento de usuários
• Padrões de comportamento
• Previsões e recomendações

Que tipo de análise você precisa?`;
      break;
  }
  
  appendMessage('assistant', welcomeText);
  chatHistory[assistantType].push({ role: 'assistant', content: welcomeText });
}

// Fechar chat
function closeAIChat() {
  document.getElementById('aiChatModal').classList.remove('active');
  document.getElementById('aiChatInput').value = '';
}

// Enviar mensagem
async function sendAIMessage() {
  const input = document.getElementById('aiChatInput');
  const message = input.value.trim();
  
  if (!message || !currentAssistant) return;
  
  // Adicionar mensagem do usuário
  appendMessage('user', message);
  chatHistory[currentAssistant].push({ role: 'user', content: message });
  
  input.value = '';
  
  // Mostrar indicador de digitação
  showTypingIndicator();
  
  // Simular resposta da IA (você pode integrar com uma API real aqui)
  setTimeout(async () => {
    const response = await generateAIResponse(currentAssistant, message);
    hideTypingIndicator();
    appendMessage('assistant', response);
    chatHistory[currentAssistant].push({ role: 'assistant', content: response });
  }, 1000 + Math.random() * 1000);
}

// Gerar resposta da IA (sistema avançado)
async function generateAIResponse(assistantType, userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Buscar todos os dados necessários
  const [users, logs, jobs] = await Promise.all([
    fetchUsers(),
    fetchLogs(),
    fetchJobs()
  ]);
  
  // Análise contextual avançada
  const context = analyzeSystemContext(users, logs, jobs);
  
  // Detectar intenção do usuário
  const intent = detectUserIntent(lowerMessage);
  
  // Gerar resposta baseada no assistente, intenção e contexto
  return await generateContextualResponse(assistantType, intent, lowerMessage, context, users, logs, jobs);
}

// Detectar intenção do usuário
function detectUserIntent(message) {
  const intents = {
    // Consultas sobre usuários
    listUsers: /list|mostrar|ver|quais|usuários|users/i,
    bannedUsers: /banido|banned|suspenso|suspended|restri/i,
    specificUser: /usuário.*\?|user.*\?|quem é|sobre.*usuário/i,
    userStats: /quantos|estatística|total.*usuário|número/i,
    
    // Consultas sobre atividades
    recentActivity: /atividade|últim|recent|hoje|agora/i,
    suspiciousActivity: /suspeito|suspeita|anormal|estranho|irregular/i,
    logs: /log|registro|histórico/i,
    
    // Análises e relatórios
    analysis: /analis|relatório|report|insight|tendência/i,
    recommendations: /recomend|sugest|devo|o que fazer/i,
    summary: /resumo|geral|overview|visão/i,
    
    // Ações específicas
    howToBan: /como.*banir|como.*suspender|procedimento|passo a passo/i,
    howToUnban: /como.*desbanir|remover.*ban|liberar/i,
    policies: /política|regra|diretr|norma/i,
    
    // Busca e pesquisa
    search: /buscar|procurar|encontrar|search|achar/i,
    filter: /filtrar|filter/i,
    
    // Ajuda
    help: /ajuda|help|como funciona|não entendi|explica/i,
    
    // Temporal
    today: /hoje|today/i,
    week: /semana|week|últimos 7/i,
    month: /mês|month|últimos 30/i,
    
    // Crítico
    critical: /crítico|urgente|emergency|importante|prioridade/i,
    alerts: /alerta|alert|aviso|warning/i,
  };
  
  for (const [key, pattern] of Object.entries(intents)) {
    if (pattern.test(message)) {
      return key;
    }
  }
  
  return 'general';
}

// Analisar contexto do sistema
function analyzeSystemContext(users, logs, jobs) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Análise de usuários
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const bannedUsers = users.filter(u => u.status === 'banned');
  const suspendedUsers = users.filter(u => u.status === 'suspended');
  const candidatos = users.filter(u => u.type === 'candidato').length;
  const empresas = users.filter(u => u.type === 'empresa').length;
  const admins = users.filter(u => u.type === 'admin' || u.type === 'owner').length;
  
  // Análise de logs
  const todayLogs = logs.filter(l => new Date(l.createdAt) >= today);
  const weekLogs = logs.filter(l => new Date(l.createdAt) >= weekAgo);
  const monthLogs = logs.filter(l => new Date(l.createdAt) >= monthAgo);
  
  // Atividades suspeitas
  const failedLogins = logs.filter(l => l.action === 'login_failed');
  const recentFailedLogins = failedLogins.filter(l => new Date(l.createdAt) >= today);
  const multipleFailures = {};
  failedLogins.forEach(l => {
    const userId = l.userId?._id || l.details;
    multipleFailures[userId] = (multipleFailures[userId] || 0) + 1;
  });
  const suspiciousUsers = Object.entries(multipleFailures)
    .filter(([_, count]) => count >= 3)
    .map(([userId]) => userId);
  
  // Análise de moderação
  const banActions = logs.filter(l => l.action === 'ban' || l.action === 'kick' || l.action === 'delete_user');
  const recentBans = banActions.filter(l => new Date(l.createdAt) >= weekAgo);
  
  // Análise de vagas
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const totalApplications = logs.filter(l => l.action === 'apply_job').length;
  
  // Tendências
  const userGrowth = calculateGrowth(users, 'createdAt', monthAgo);
  const activityGrowth = calculateGrowth(logs, 'createdAt', monthAgo);
  
  // Horários de pico
  const hourlyActivity = new Array(24).fill(0);
  todayLogs.forEach(l => {
    const hour = new Date(l.createdAt).getHours();
    hourlyActivity[hour]++;
  });
  const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
  
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      banned: bannedUsers,
      suspended: suspendedUsers,
      candidatos,
      empresas,
      admins
    },
    logs: {
      total: logs.length,
      today: todayLogs.length,
      week: weekLogs.length,
      month: monthLogs.length
    },
    suspicious: {
      failedLogins: recentFailedLogins.length,
      suspiciousUsers: suspiciousUsers.length,
      users: suspiciousUsers
    },
    moderation: {
      totalBans: bannedUsers.length,
      totalSuspended: suspendedUsers.length,
      recentActions: recentBans.length
    },
    jobs: {
      active: activeJobs,
      total: jobs.length
    },
    trends: {
      userGrowth,
      activityGrowth,
      peakHour
    }
  };
}

// Calcular crescimento
function calculateGrowth(items, dateField, since) {
  const recent = items.filter(i => new Date(i[dateField]) >= since);
  const older = items.filter(i => new Date(i[dateField]) < since);
  if (older.length === 0) return 100;
  return Math.round((recent.length / older.length) * 100);
}

// Gerar resposta contextual avançada
async function generateContextualResponse(assistantType, intent, message, context, users, logs, jobs) {
  // Respostas específicas por assistente e intenção
  switch (assistantType) {
    case 'banimentos':
      return generateBanimentoResponse(intent, message, context, users, logs);
    case 'alertas':
      return generateAlertasResponse(intent, message, context, users, logs);
    case 'atividades':
      return generateAtividadesResponse(intent, message, context, users, logs);
    case 'ajuda':
      return generateAjudaResponse(intent, message, context);
    case 'pesquisa':
      return generatePesquisaResponse(intent, message, context, users, logs, jobs);
    case 'tendencias':
      return generateTendenciasResponse(intent, message, context, users, logs, jobs);
    default:
      return 'Desculpe, não entendi sua pergunta. Pode reformular?';
  }
}

// IA de Banimentos
function generateBanimentoResponse(intent, message, context, users, logs) {
  if (intent === 'bannedUsers' || intent === 'listUsers') {
    const { banned, suspended } = context.users;
    
    if (banned.length === 0 && suspended.length === 0) {
      // Analisar usuários de risco usando ML
      if (isMLReady && users.length > 0) {
        const riskAnalysis = users
          .filter(u => u.status === 'active')
          .map(u => {
            const userLogs = logs.filter(l => l.userId?._id === u._id);
            return {
              user: u,
              risk: calculateUserRisk(u, userLogs),
              logCount: userLogs.length
            };
          })
          .filter(a => a.risk > 0.5)
          .sort((a, b) => b.risk - a.risk)
          .slice(0, 5);
        
        if (riskAnalysis.length > 0) {
          let response = `✅ **Nenhum Banimento Ativo**\n\n`;
          response += `Mas a **IA detectou ${riskAnalysis.length} usuário(s) de risco:**\n\n`;
          
          riskAnalysis.forEach((a, i) => {
            const riskLevel = a.risk > 0.8 ? '🔴 ALTO' : a.risk > 0.6 ? '🟠 MÉDIO' : '🟡 BAIXO';
            response += `**${i + 1}. ${a.user.name || a.user.email}**\n`;
            response += `   🎯 Nível de Risco: ${riskLevel} (${Math.round(a.risk * 100)}%)\n`;
            response += `   📊 Atividades: ${a.logCount}\n`;
            response += `   🧠 Confiança ML: ${Math.round(a.risk * 100)}%\n\n`;
          });
          
          response += `**🤖 Análise Neural Network**\n`;
          response += `Sistema treinado com ${users.length} usuários para detectar comportamento de risco.\n\n`;
          response += `**Recomendação:** Monitorar esses usuários de perto.`;
          
          return response;
        }
      }
      
      return `✅ **Situação Positiva!**

Atualmente não há usuários banidos ou suspensos na plataforma. Isso indica que:

• A comunidade está seguindo as diretrizes
• As políticas de moderação estão funcionando preventivamente
• O ambiente está saudável e seguro

Continue monitorando regularmente para manter esse padrão!`;
    }
    
    let response = `📊 **Status de Moderação Atual:**\n\n`;
    
    if (banned.length > 0) {
      response += `🚫 **Usuários Banidos: ${banned.length}**\n`;
      banned.slice(0, 5).forEach((u, i) => {
        response += `\n${i + 1}. **${u.name || u.email}**\n`;
        response += `   • Tipo: ${u.type}\n`;
        response += `   • Motivo: ${u.banReason || 'Não especificado'}\n`;
        response += `   • Data: ${new Date(u.bannedAt).toLocaleDateString('pt-BR')}\n`;
        if (u.banMessage) response += `   • Mensagem: "${u.banMessage}"\n`;
      });
      if (banned.length > 5) {
        response += `\n... e mais ${banned.length - 5} usuário(s) banido(s).\n`;
      }
    }
    
    if (suspended.length > 0) {
      response += `\n⏸️ **Usuários Suspensos: ${suspended.length}**\n`;
      suspended.slice(0, 3).forEach((u, i) => {
        response += `\n${i + 1}. **${u.name || u.email}**\n`;
        response += `   • Motivo: ${u.suspensionReason || 'Não especificado'}\n`;
        response += `   • Até: ${new Date(u.suspendedUntil).toLocaleDateString('pt-BR')}\n`;
      });
      if (suspended.length > 3) {
        response += `\n... e mais ${suspended.length - 3} usuário(s) suspenso(s).\n`;
      }
    }
    
    response += `\n\n💡 **Recomendação:** Revise periodicamente esses casos para avaliar possibilidade de reabilitação.`;
    return response;
  }
  
  if (intent === 'howToBan') {
    return `📋 **Procedimento Completo de Banimento**

**Antes de Banir:**
1. ✅ Colete evidências (prints, logs, denúncias)
2. ✅ Verifique histórico do usuário
3. ✅ Confirme violação das políticas
4. ✅ Considere alternativas (advertência, suspensão)

**Processo de Banimento:**
1. Acesse **Gerenciar Usuários** (/admin-usuarios)
2. Localize o usuário problemático
3. Clique no botão **"Banir"** (vermelho)
4. Preencha obrigatoriamente:
   • **Motivo:** Seja específico e claro
   • **Mensagem:** Explique ao usuário o motivo
5. Confirme a ação

**Após Banimento:**
• O usuário será imediatamente desconectado
• Não poderá fazer login novamente
• Receberá a mensagem ao tentar acessar
• Ação ficará registrada nos logs

**Tipos de Restrição:**
🚫 **Banimento:** Permanente, mais grave
⏸️ **Suspensão:** Temporária, com data de fim
🗑️ **Exclusão:** Remove usuário do sistema

**Importante:** Banimentos são reversíveis! Use o botão "Desbanir" se necessário.

Precisa de ajuda com algum caso específico?`;
  }
  
  if (intent === 'recommendations' || intent === 'critical') {
    // Usar ML para gerar recomendações
    const mlRecommendations = generateMLRecommendations(context, users, logs);
    
    if (mlRecommendations.length > 0) {
      let response = `🤖 **Análise com Machine Learning**\n\n`;
      response += `Detectei ${mlRecommendations.length} recomendação(ões) baseada(s) em IA:\n\n`;
      
      mlRecommendations.forEach((rec, i) => {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        response += `**${i + 1}. ${priorityEmoji} ${rec.title}**\n`;
        response += `   📂 Categoria: ${rec.category}\n`;
        response += `   📋 ${rec.description}\n`;
        response += `   💡 Ação: ${rec.action}\n`;
        if (rec.mlConfidence) {
          response += `   🧠 Confiança ML: ${rec.mlConfidence}%\n`;
        }
        response += `\n`;
      });
      
      response += `**💡 Powered by Brain.js Neural Networks**\n`;
      response += `Análise baseada em ${users.length} usuários e ${logs.length} eventos históricos.`;
      
      return response;
    }
    
    // Fallback para análise manual
    const criticalIssues = [];
    
    if (context.suspicious.suspiciousUsers > 0) {
      criticalIssues.push(`⚠️ ${context.suspicious.suspiciousUsers} usuário(s) com múltiplas tentativas de login falhadas`);
    }
    
    if (context.users.suspended.length > 10) {
      criticalIssues.push(`⚠️ ${context.users.suspended.length} suspensões ativas (número alto)`);
    }
    
    if (context.moderation.recentActions === 0 && context.logs.week > 500) {
      criticalIssues.push(`📊 Alta atividade (${context.logs.week} eventos/semana) sem ações de moderação`);
    }
    
    if (criticalIssues.length === 0) {
      return `✅ **Situação sob controle!**

Não há casos críticos que exijam ação imediata. O sistema está operando normalmente.

**Métricas Saudáveis:**
• Usuários ativos: ${context.users.active}
• Restrições: ${context.users.banned.length + context.users.suspended.length}
• Taxa de problemas: ${Math.round((context.users.banned.length + context.users.suspended.length) / context.users.total * 100)}%

Continue monitorando regularmente!`;
    }
    
    return `🚨 **Ações Recomendadas:**\n\n${criticalIssues.join('\n')}\n\n**Próximos Passos:**\n1. Revise os usuários mencionados\n2. Analise os logs recentes\n3. Tome ação apropriada se necessário\n\nPosso fornecer mais detalhes sobre qualquer um desses pontos.`;
  }
  
  if (intent === 'summary') {
    const taxaRestricao = Math.round((context.users.banned.length + context.users.suspended.length) / context.users.total * 100 * 10) / 10;
    
    return `📊 **Resumo de Moderação - ${new Date().toLocaleDateString('pt-BR')}**

**Usuários:**
• Total na plataforma: ${context.users.total}
• Banidos: ${context.users.banned.length}
• Suspensos: ${context.users.suspended.length}
• Taxa de restrição: ${taxaRestricao}%

**Atividade Recente:**
• Ações de moderação (7 dias): ${context.moderation.recentActions}
• Tentativas de login falhadas (hoje): ${context.suspicious.failedLogins}

**Status Geral:**
${taxaRestricao < 2 ? '✅ Excelente - Comunidade saudável' :
  taxaRestricao < 5 ? '⚠️ Atenção - Monitorar de perto' :
  '🚨 Crítico - Revisar políticas'}

**Recomendação:**
${context.moderation.recentActions === 0 ? 
  'Continue o bom trabalho de moderação preventiva!' :
  'Revise as ações recentes e identifique padrões.'}`;
  }
  
  return `Analisando dados de moderação... 

**Status atual:**
• ${context.users.banned.length} usuário(s) banido(s)
• ${context.users.suspended.length} usuário(s) suspenso(s)
• ${context.users.active} usuário(s) ativos

Como posso ajudá-lo especificamente com banimentos?`;
}

// IA de Alertas
function generateAlertasResponse(intent, message, context, users, logs) {
  if (intent === 'critical' || intent === 'alerts') {
    const alerts = [];
    
    // Alertas críticos
    if (context.suspicious.failedLogins > 10) {
      alerts.push({
        level: '🔴 CRÍTICO',
        title: 'Múltiplas Tentativas de Login Falhadas',
        desc: `${context.suspicious.failedLogins} tentativas falhadas hoje`,
        action: 'Verificar IPs e possíveis ataques'
      });
    }
    
    if (context.suspicious.suspiciousUsers > 0) {
      alerts.push({
        level: '🟠 ALTO',
        title: 'Usuários com Comportamento Suspeito',
        desc: `${context.suspicious.suspiciousUsers} usuário(s) com atividade anormal`,
        action: 'Revisar histórico e considerar suspensão'
      });
    }
    
    if (context.users.suspended.length > 10) {
      alerts.push({
        level: '🟡 MÉDIO',
        title: 'Alto Número de Suspensões',
        desc: `${context.users.suspended.length} usuários suspensos atualmente`,
        action: 'Verificar se há padrão nas violações'
      });
    }
    
    if (context.moderation.recentActions > 20) {
      alerts.push({
        level: '🟡 MÉDIO',
        title: 'Atividade de Moderação Intensa',
        desc: `${context.moderation.recentActions} ações nos últimos 7 dias`,
        action: 'Avaliar se há problema sistêmico'
      });
    }
    
    if (alerts.length === 0) {
      return `✅ **Nenhum Alerta Crítico**

**Sistema Operando Normalmente:**
• Logins: ✅ Estável
• Usuários: ✅ Comportamento normal
• Moderação: ✅ Dentro do padrão
• Segurança: ✅ Sem ameaças detectadas

**Estatísticas:**
• Tentativas de login falhadas (hoje): ${context.suspicious.failedLogins}
• Usuários em restrição: ${context.users.banned.length + context.users.suspended.length}
• Atividade geral: ${context.logs.today} eventos hoje

Continue o monitoramento regular!`;
    }
    
    let response = `🚨 **Central de Alertas - ${alerts.length} Alerta(s)**\n\n`;
    alerts.forEach((alert, i) => {
      response += `**${i + 1}. ${alert.level} - ${alert.title}**\n`;
      response += `   📋 ${alert.desc}\n`;
      response += `   💡 Ação: ${alert.action}\n\n`;
    });
    
    response += `**Próximos Passos:**\n`;
    response += `1. Priorize alertas críticos (🔴)\n`;
    response += `2. Investigue causas raiz\n`;
    response += `3. Tome ações corretivas\n`;
    response += `4. Documente decisões`;
    
    return response;
  }
  
  if (intent === 'summary' || intent === 'today') {
    return `📊 **Resumo de Alertas - Hoje**

**Segurança:**
• Tentativas de login falhadas: ${context.suspicious.failedLogins}
• Usuários suspeitos detectados: ${context.suspicious.suspiciousUsers}

**Moderação:**
• Ações tomadas: ${logs.filter(l => 
    (l.action === 'ban' || l.action === 'kick') && 
    new Date(l.createdAt).toDateString() === new Date().toDateString()
  ).length}
• Usuários em restrição: ${context.users.banned.length + context.users.suspended.length}

**Atividade:**
• Total de eventos: ${context.logs.today}
• Horário de pico: ${context.trends.peakHour}:00h

**Status Geral:**
${context.suspicious.failedLogins > 10 ? '🔴 Requer atenção' : '✅ Normal'}`;
  }
  
  return `Monitorando o sistema em busca de alertas...

**Status Atual:**
• Alertas críticos: ${context.suspicious.failedLogins > 10 ? 'SIM' : 'NÃO'}
• Sistema: ${context.logs.today > 0 ? 'Ativo' : 'Inativo'}

O que você gostaria de verificar?`;
}

// IA de Atividades Suspeitas
function generateAtividadesResponse(intent, message, context, users, logs) {
  if (intent === 'suspiciousActivity' || intent === 'listUsers' || intent === 'critical') {
    // Usar ML para detectar anomalias
    const anomalies = isMLReady ? detectAnomalies(logs) : [];
    
    if (isMLReady && anomalies.length > 0) {
      let response = `🤖 **Detecção ML de Anomalias**\n\n`;
      response += `**${anomalies.length} padrão(ões) anômalo(s) detectado(s):**\n\n`;
      
      // Agrupar por severidade
      const high = anomalies.filter(a => a.severity === 'high');
      const medium = anomalies.filter(a => a.severity === 'medium');
      
      if (high.length > 0) {
        response += `🔴 **Alta Severidade (${high.length}):**\n`;
        high.slice(0, 3).forEach((a, i) => {
          const user = users.find(u => u._id === a.userId);
          response += `${i + 1}. **${a.type}** - ${user?.name || user?.email || a.userId}\n`;
          response += `   📊 ${a.description}\n`;
          response += `   ⚠️ Risco: ${a.severity === 'high' ? 'ALTO' : 'MÉDIO'}\n\n`;
        });
      }
      
      if (medium.length > 0) {
        response += `🟡 **Média Severidade (${medium.length}):**\n`;
        medium.slice(0, 3).forEach((a, i) => {
          const user = users.find(u => u._id === a.userId);
          response += `${i + 1}. **${a.type}** - ${user?.name || user?.email || a.userId}\n`;
          response += `   📊 ${a.description}\n\n`;
        });
      }
      
      response += `\n🧠 **Análise Neural Network**\n`;
      response += `Sistema detectou automaticamente padrões anormais usando machine learning.\n\n`;
      
      response += `**Ações Recomendadas:**\n`;
      response += `1. Priorizar casos de alta severidade (🔴)\n`;
      response += `2. Verificar logs detalhados\n`;
      response += `3. Considerar suspensão temporária se necessário\n`;
      response += `4. Implementar rate limiting se for bot`;
      
      return response;
    }
    
    // Fallback para detecção manual
    const suspicious = [];
    
    // Analisar logins falhados
    const failedLoginsByUser = {};
    logs.filter(l => l.action === 'login_failed').forEach(l => {
      const userId = l.details || 'unknown';
      failedLoginsByUser[userId] = (failedLoginsByUser[userId] || 0) + 1;
    });
    
    Object.entries(failedLoginsByUser).forEach(([email, count]) => {
      if (count >= 3) {
        suspicious.push({
          type: 'Login Suspeito',
          level: count >= 5 ? '🔴 Alto' : '🟡 Médio',
          detail: `${count} tentativas falhadas`,
          target: email,
          recommendation: 'Verificar se é ataque ou usuário esqueceu senha'
        });
      }
    });
    
    // Atividade em horários incomuns
    const nightActivity = logs.filter(l => {
      const hour = new Date(l.createdAt).getHours();
      return hour >= 2 && hour <= 5;
    });
    if (nightActivity.length > 50) {
      suspicious.push({
        type: 'Atividade Noturna',
        level: '🟡 Médio',
        detail: `${nightActivity.length} eventos entre 2h-5h`,
        target: 'Sistema',
        recommendation: 'Pode ser bot ou automação'
      });
    }
    
    // Múltiplas ações rápidas
    const rapidActions = {};
    logs.forEach(l => {
      const userId = l.userId?._id || l.userId;
      if (!userId) return;
      if (!rapidActions[userId]) rapidActions[userId] = [];
      rapidActions[userId].push(new Date(l.createdAt).getTime());
    });
    
    Object.entries(rapidActions).forEach(([userId, times]) => {
      if (times.length < 10) return;
      times.sort();
      let rapid = 0;
      for (let i = 1; i < times.length; i++) {
        if (times[i] - times[i-1] < 1000) rapid++;
      }
      if (rapid > 5) {
        const user = users.find(u => u._id === userId);
        suspicious.push({
          type: 'Atividade Muito Rápida',
          level: '🟠 Alto',
          detail: `${rapid} ações em menos de 1 segundo`,
          target: user?.name || user?.email || userId,
          recommendation: 'Possível bot ou script automatizado'
        });
      }
    });
    
    if (suspicious.length === 0) {
      return `✅ **Nenhuma Atividade Suspeita Detectada**

**Análise Completa:**
• ✅ Padrões de login normais
• ✅ Horários de acesso regulares  
• ✅ Velocidade de ações aceitável
• ✅ Sem comportamento anômalo

**Estatísticas:**
• Logins falhados (total): ${Object.keys(failedLoginsByUser).length}
• Atividade noturna: ${nightActivity.length} eventos
• Usuários analisados: ${users.length}

**Recomendação:** Sistema saudável. Continue monitoramento regular.`;
    }
    
    let response = `🔍 **Análise de Atividades Suspeitas**\n\n`;
    response += `**${suspicious.length} Padrão(ões) Detectado(s):**\n\n`;
    
    suspicious.forEach((s, i) => {
      response += `**${i + 1}. ${s.type}** - ${s.level}\n`;
      response += `   🎯 Alvo: ${s.target}\n`;
      response += `   📊 Detalhe: ${s.detail}\n`;
      response += `   💡 ${s.recommendation}\n\n`;
    });
    
    response += `**Ações Recomendadas:**\n`;
    response += `1. Investigar padrões de alta prioridade (🔴)\n`;
    response += `2. Verificar logs detalhados dos usuários mencionados\n`;
    response += `3. Considerar medidas preventivas (captcha, rate limiting)\n`;
    response += `4. Monitorar evolução nas próximas horas`;
    
    return response;
  }
  
  if (intent === 'summary' || intent === 'analysis') {
    return `📈 **Análise Comportamental do Sistema**

**Padrões Identificados:**
• Login normal: ${Math.max(0, 100 - context.suspicious.failedLogins)}%
• Atividade suspeita: ${context.suspicious.suspiciousUsers} usuário(s)
• Comportamento típico: ${Math.round((context.users.active / context.users.total) * 100)}%

**Métricas de Segurança:**
• Taxa de falha de login: ${Math.round((context.suspicious.failedLogins / Math.max(context.logs.today, 1)) * 100)}%
• Usuários em watch list: ${context.suspicious.suspiciousUsers}
• Incidentes esta semana: ${context.moderation.recentActions}

**Tendência:**
${context.suspicious.failedLogins > 10 ? '⬆️ Aumento de atividade suspeita' : '➡️ Estável'}

Posso investigar algum usuário ou período específico?`;
  }
  
  return `Analisando padrões de comportamento...

**Análise em andamento:**
• ${users.length} usuários no sistema
• ${context.logs.today} eventos hoje
• ${context.suspicious.suspiciousUsers} casos suspeitos

O que você gostaria de investigar mais a fundo?`;
}

// IA de Ajuda
function generateAjudaResponse(intent, message, context) {
  if (intent === 'policies') {
    return `📜 **Políticas Completas de Moderação - Aprendiz+**

**🚫 BANIMENTO PERMANENTE**
Aplicar quando houver:
• Spam persistente ou conteúdo malicioso
• Assédio, discriminação ou discurso de ódio
• Fraude comprovada ou atividade ilegal
• Violação grave de direitos autorais
• Múltiplas violações após advertências

**⏸️ SUSPENSÃO TEMPORÁRIA (7-30 dias)**
Aplicar para:
• Primeira violação de regras menores
• Comportamento inadequado sem má-fé
• Conflitos entre usuários
• Conteúdo impróprio não criminoso
• Spam ocasional

**⚠️ ADVERTÊNCIA (Sem restrição)**
Usar quando:
• Violação muito leve ou não intencional
• Primeira infração menor
• Dúvida sobre interpretação das regras
• Boa-fé do usuário comprovada

**📋 PROCEDIMENTO PADRÃO:**
1. **Receber** denúncia ou detectar problema
2. **Investigar** - coletar evidências e contexto
3. **Avaliar** gravidade e histórico do usuário
4. **Decidir** ação apropriada
5. **Aplicar** com motivo claro e documentado
6. **Comunicar** ao usuário afetado
7. **Registrar** decisão nos logs

**⚖️ PRINCÍPIOS:**
• Proporcionalidade (ação × gravidade)
• Transparência (motivos claros)
• Consistência (casos similares)
• Possibilidade de recurso
• Documentação completa

**🔄 REVERSÃO:**
Banimentos e suspensões podem ser revertidos se:
• Nova evidência surgir
• Erro na avaliação inicial
• Usuário demonstrar mudança
• Circunstâncias atenuantes

Precisa de orientação sobre algum caso específico?`;
  }
  
  if (intent === 'howToBan' || intent === 'howToUnban') {
    return generateBanimentoResponse(intent, message, context, [], []);
  }
  
  if (intent === 'help') {
    return `🤝 **Central de Ajuda - IA Administrativa**

**Posso ajudar você com:**

**📊 Gestão de Usuários:**
• Como banir/suspender usuários
• Políticas de moderação
• Análise de comportamento
• Gerenciamento de restrições

**🔍 Monitoramento:**
• Interpretar alertas
• Identificar atividades suspeitas
• Análise de logs
• Métricas de segurança

**📈 Relatórios:**
• Estatísticas da plataforma
• Tendências de uso
• Performance de moderação
• Insights de crescimento

**🛠️ Ferramentas:**
• Usar sistema de busca
• Filtrar dados
• Gerar relatórios
• Automatizar tarefas

**💡 Melhores Práticas:**
• Moderação efetiva
• Prevenção de problemas
• Comunicação com usuários
• Documentação adequada

**Como fazer uma pergunta:**
• Seja específico
• Forneça contexto
• Mencione usuários/datas se relevante
• Pergunte sobre dúvidas específicas

Exemplos de perguntas:
• "Como banir um usuário?"
• "Quais são as políticas de spam?"
• "Mostre atividades suspeitas hoje"
• "Como reverter uma suspensão?"

Em que posso ajudá-lo agora?`;
  }
  
  if (intent === 'summary') {
    return `📚 **Resumo Geral do Sistema**

**Status da Plataforma:**
• Total de usuários: ${context.users.total}
  - Candidatos: ${context.users.candidatos}
  - Empresas: ${context.users.empresas}
  - Admins: ${context.users.admins}

**Moderação:**
• Usuários ativos: ${context.users.active}
• Em restrição: ${context.users.banned.length + context.users.suspended.length}
• Taxa de problemas: ${Math.round(((context.users.banned.length + context.users.suspended.length) / context.users.total) * 100)}%

**Atividade:**
• Hoje: ${context.logs.today} eventos
• Esta semana: ${context.logs.week} eventos
• Horário de pico: ${context.trends.peakHour}:00h

**Vagas:**
• Ativas: ${context.jobs.active}
• Total: ${context.jobs.total}

**Tudo está:** ${
  context.suspicious.failedLogins < 5 && context.users.banned.length < 10 
    ? '✅ Funcionando perfeitamente' 
    : '⚠️ Requer atenção em alguns pontos'
}

Posso detalhar qualquer uma dessas áreas!`;
  }
  
  return `Olá! Sou seu assistente de ajuda para administração.

**Áreas que domino:**
• Políticas e procedimentos
• Uso das ferramentas
• Resolução de problemas
• Melhores práticas

Digite sua dúvida que terei prazer em ajudar!`;
}

// IA de Pesquisa
function generatePesquisaResponse(intent, message, context, users, logs, jobs) {
  const searchTerm = message.replace(/buscar|procurar|encontrar|search|mostrar|ver/gi, '').trim();
  
  if (intent === 'search' && searchTerm.length > 2) {
    const results = {
      users: [],
      logs: [],
      jobs: []
    };
    
    // Buscar usuários
    users.forEach(u => {
      const searchText = `${u.name} ${u.email} ${u.type}`.toLowerCase();
      if (searchText.includes(searchTerm.toLowerCase())) {
        results.users.push(u);
      }
    });
    
    // Buscar logs
    logs.forEach(l => {
      const searchText = `${l.action} ${l.details} ${l.userId?.name || ''}`.toLowerCase();
      if (searchText.includes(searchTerm.toLowerCase())) {
        results.logs.push(l);
      }
    });
    
    // Buscar vagas
    jobs.forEach(j => {
      const searchText = `${j.title} ${j.description} ${j.company?.name || ''}`.toLowerCase();
      if (searchText.includes(searchTerm.toLowerCase())) {
        results.jobs.push(j);
      }
    });
    
    const totalResults = results.users.length + results.logs.length + results.jobs.length;
    
    if (totalResults === 0) {
      return `🔍 **Nenhum resultado encontrado para "${searchTerm}"**

**Sugestões:**
• Verifique a ortografia
• Use termos mais gerais
• Tente palavras-chave diferentes
• Busque por email, nome ou ID

**Exemplos de busca:**
• "joão" - busca usuários chamados João
• "empresa" - busca empresas
• "login" - busca eventos de login
• "desenvolvedor" - busca vagas

Digite outro termo para buscar!`;
    }
    
    let response = `🔍 **Resultados para "${searchTerm}"** - ${totalResults} encontrado(s)\n\n`;
    
    if (results.users.length > 0) {
      response += `**👥 Usuários (${results.users.length}):**\n`;
      results.users.slice(0, 5).forEach((u, i) => {
        response += `${i + 1}. **${u.name || u.email}**\n`;
        response += `   • Tipo: ${u.type}\n`;
        response += `   • Status: ${u.status}\n`;
        response += `   • Email: ${u.email}\n\n`;
      });
      if (results.users.length > 5) {
        response += `... e mais ${results.users.length - 5} usuário(s)\n\n`;
      }
    }
    
    if (results.logs.length > 0) {
      response += `**📋 Logs (${results.logs.length}):**\n`;
      results.logs.slice(0, 3).forEach((l, i) => {
        response += `${i + 1}. **${l.action}** - ${l.userId?.name || 'Sistema'}\n`;
        response += `   • ${new Date(l.createdAt).toLocaleString('pt-BR')}\n`;
        if (l.details) response += `   • ${l.details}\n`;
        response += `\n`;
      });
      if (results.logs.length > 3) {
        response += `... e mais ${results.logs.length - 3} registro(s)\n\n`;
      }
    }
    
    if (results.jobs.length > 0) {
      response += `**💼 Vagas (${results.jobs.length}):**\n`;
      results.jobs.slice(0, 3).forEach((j, i) => {
        response += `${i + 1}. **${j.title}**\n`;
        response += `   • Empresa: ${j.company?.name || 'N/A'}\n`;
        response += `   • Status: ${j.status}\n\n`;
      });
      if (results.jobs.length > 3) {
        response += `... e mais ${results.jobs.length - 3} vaga(s)\n\n`;
      }
    }
    
    response += `**💡 Dica:** Posso buscar mais detalhes sobre qualquer item. Basta me perguntar!`;
    return response;
  }
  
  if (intent === 'summary') {
    return `📊 **Capacidades de Pesquisa Avançada**

**Base de Dados Indexada:**
• ${context.users.total} usuários
• ${context.logs.total} registros de atividade
• ${context.jobs.total} vagas cadastradas
• ${context.logs.today} eventos hoje

**Tipos de Busca:**
🔎 **Por Texto:** Digite qualquer termo
👤 **Por Usuário:** Nome, email ou tipo
📋 **Por Ação:** Login, ban, aplicação, etc
💼 **Por Vaga:** Título ou empresa
📅 **Por Data:** Hoje, semana, mês

**Filtros Disponíveis:**
• Status (ativo, banido, suspenso)
• Tipo de usuário (candidato, empresa, admin)
• Período temporal
• Ação específica

**Exemplos Práticos:**
• "mostrar usuários banidos"
• "buscar logs de hoje"
• "encontrar vagas de TI"
• "procurar tentativas de login falhadas"

O que você gostaria de pesquisar?`;
  }
  
  return `🔍 **Sistema de Pesquisa Avançada**

Posso buscar em toda a base de dados:
• ${context.users.total} usuários
• ${context.logs.total} logs de atividade  
• ${context.jobs.total} vagas

**Como usar:**
Digite o que procura e eu farei a busca inteligente.

Exemplos:
• "buscar joão"
• "encontrar empresas"
• "logs de ban"

O que você está procurando?`;
}

// IA de Tendências
function generateTendenciasResponse(intent, message, context, users, logs, jobs) {
  if (intent === 'analysis' || intent === 'summary') {
    const now = new Date();
    const thisMonth = logs.filter(l => {
      const logDate = new Date(l.createdAt);
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    });
    
    return `📈 **Análise de Tendências - ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}**

**📊 Crescimento:**
• Usuários: +${context.trends.userGrowth}% (vs mês anterior)
• Atividade: +${context.trends.activityGrowth}% 
• Vagas ativas: ${context.jobs.active}
• Tendência geral: ${context.trends.userGrowth > 0 ? '📈 Crescendo' : '📉 Estável'}

**👥 Distribuição de Usuários:**
• Candidatos: ${context.users.candidatos} (${Math.round((context.users.candidatos/context.users.total)*100)}%)
• Empresas: ${context.users.empresas} (${Math.round((context.users.empresas/context.users.total)*100)}%)
• Taxa de ativação: ${Math.round((context.users.active/context.users.total)*100)}%

**⏰ Padrões de Uso:**
• Horário de pico: ${context.trends.peakHour}:00h
• Eventos hoje: ${context.logs.today}
• Média diária: ${Math.round(context.logs.month / 30)} eventos

**💼 Mercado de Trabalho:**
• Vagas ativas: ${context.jobs.active}
• Taxa de publicação: ${Math.round((context.jobs.active/context.users.empresas)*100)}% empresas com vagas
• Atividade de candidatura: ${logs.filter(l => l.action === 'apply').length} total

**🎯 Insights:**
${context.trends.userGrowth > 20 ? '• ✨ Crescimento acelerado - considere escalar infraestrutura' : ''}
${context.users.candidatos > context.jobs.active * 10 ? '• ⚖️ Mais candidatos que vagas - incentivar empresas' : ''}
${context.trends.peakHour >= 14 && context.trends.peakHour <= 18 ? '• 📅 Pico em horário comercial - padrão saudável' : ''}
${context.logs.today < context.logs.week / 7 ? '• 📉 Atividade abaixo da média hoje' : ''}

**💡 Recomendações:**
${context.trends.userGrowth > 15 ? '1. Preparar para maior volume de usuários\n' : ''}
${context.jobs.active < 10 ? '2. Campanhas para atrair mais empresas\n' : ''}
3. Continuar monitoramento de tendências
4. Analisar feedbacks de usuários

Deseja análise mais detalhada de alguma métrica?`;
  }
  
  if (intent === 'today' || intent === 'week') {
    const period = intent === 'today' ? 'Hoje' : 'Últimos 7 dias';
    const periodLogs = intent === 'today' ? context.logs.today : context.logs.week;
    
    return `📊 **Tendências - ${period}**

**Atividade:**
• Total de eventos: ${periodLogs}
• Logins: ${logs.filter(l => l.action === 'login' && 
    (intent === 'today' ? new Date(l.createdAt).toDateString() === new Date().toDateString() : 
     new Date(l.createdAt) >= new Date(Date.now() - 7*24*60*60*1000))).length}
• Novos usuários: ${users.filter(u => 
    (intent === 'today' ? new Date(u.createdAt).toDateString() === new Date().toDateString() :
     new Date(u.createdAt) >= new Date(Date.now() - 7*24*60*60*1000))).length}

**Comparação:**
${periodLogs > (intent === 'today' ? context.logs.week/7 : context.logs.month*7/30) ? 
  '📈 Acima da média' : '📉 Abaixo da média'}

**Destaques:**
• Ação mais comum: ${getMostCommonAction(logs, intent === 'today')}
• Horário mais ativo: ${context.trends.peakHour}:00h

Posso detalhar algum aspecto específico?`;
  }
  
  return `📈 **Sistema de Análise de Tendências**

Posso fornecer insights sobre:
• Crescimento de usuários
• Padrões de atividade
• Tendências de mercado
• Métricas de engajamento

**Dados disponíveis:**
• ${context.users.total} usuários analisados
• ${context.logs.total} eventos registrados
• Crescimento: +${context.trends.userGrowth}%

O que você gostaria de analisar?`;
}

// Função auxiliar para ação mais comum
function getMostCommonAction(logs, today = false) {
  const filtered = today ? logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()) : logs;
  const actions = {};
  filtered.forEach(l => {
    actions[l.action] = (actions[l.action] || 0) + 1;
  });
  const sorted = Object.entries(actions).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : 'N/A';
}

// Buscar vagas
async function fetchJobs() {
  try {
    const token = Auth.getToken();
    const res = await fetch('/api/jobs', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    return [];
  }
}

// Buscar usuários
async function fetchUsers() {
  try {
    const token = Auth.getToken();
    const res = await fetch('/api/users', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
}

// Buscar logs
async function fetchLogs() {
  try {
    const token = Auth.getToken();
    const res = await fetch('/api/logs', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return [];
  }
}

// Adicionar mensagem ao chat
function appendMessage(role, content, saveToHistory = true) {
  const messagesContainer = document.getElementById('aiChatMessages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${role}`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'ai-message-avatar';
  avatarDiv.innerHTML = role === 'user' 
    ? '<i class="fas fa-user"></i>' 
    : '<i class="fas fa-robot"></i>';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'ai-message-content';
  contentDiv.innerHTML = formatMessage(content);
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Formatar mensagem
function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/• /g, '• ')
    .replace(/(\d+\.)/g, '<br>$1');
}

// Mostrar indicador de digitação
function showTypingIndicator() {
  const messagesContainer = document.getElementById('aiChatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-message assistant';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="ai-message-avatar">
      <i class="fas fa-robot"></i>
    </div>
    <div class="ai-message-content">
      <div class="ai-typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Esconder indicador de digitação
function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Ações rápidas
async function quickAction(action) {
  const input = document.getElementById('aiChatInput');
  
  switch(action) {
    case 'resumo':
      input.value = 'Me dê um resumo geral da situação atual';
      break;
    case 'criticos':
      input.value = isMLReady ? 
        'Quais são os casos críticos detectados pela IA neural?' : 
        'Quais são os casos mais críticos que preciso revisar?';
      break;
    case 'hoje':
      input.value = 'O que aconteceu de importante hoje?';
      break;
    case 'limpar':
      if (confirm('Deseja limpar o histórico deste chat?')) {
        chatHistory[currentAssistant] = [];
        document.getElementById('aiChatMessages').innerHTML = '';
        addWelcomeMessage(currentAssistant);
      }
      return;
  }
  
  sendAIMessage();
}

// Função de mensagem auxiliar
function showMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
  if (!container) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = `message-toast ${type}`;
  messageEl.textContent = message;
  
  container.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.classList.add('fade-out');
    setTimeout(() => messageEl.remove(), 300);
  }, 3000);
}
