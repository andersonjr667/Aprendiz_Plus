// @ts-nocheck
// admin-monitoramento.js - Sistema de IA com TensorFlow.js

let currentAssistant = null;
let chatHistory = {};
let isMLReady = false;

// Modelos TensorFlow.js
let riskModel = null;
let anomalyModel = null;
let behaviorModel = null;

// ==========================================
// TENSORFLOW.JS - MACHINE LEARNING
// ==========================================

// Inicializar modelos de ML
async function initializeML() {
  try {
    console.log('🧠 Inicializando TensorFlow.js...');
    
    if (typeof tf === 'undefined') {
      console.error('TensorFlow.js não carregado!');
      return false;
    }
    
    await tf.ready();
    console.log('TensorFlow Backend:', tf.getBackend());
    
    // Modelo 1: Classificação de Risco de Usuários (Sequential)
    riskModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [8], units: 16, activation: 'relu', name: 'dense1' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 12, activation: 'relu', name: 'dense2' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu', name: 'dense3' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'output' })
      ]
    });
    
    riskModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    // Modelo 2: Detecção de Anomalias (Autoencoder)
    anomalyModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [6], units: 12, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'relu' }), // Bottleneck
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 12, activation: 'relu' }),
        tf.layers.dense({ units: 6, activation: 'sigmoid' })
      ]
    });
    
    anomalyModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });
    
    isMLReady = true;
    console.log('✅ TensorFlow.js inicializado!');
    console.log(`📊 Modelo de Risco: ${riskModel.countParams()} parâmetros`);
    console.log(`🔍 Modelo de Anomalias: ${anomalyModel.countParams()} parâmetros`);
    
    // Atualizar badge visual
    const badge = document.querySelector('.ml-badge');
    if (badge) {
      badge.style.background = 'linear-gradient(135deg, #FF6F00 0%, #FFA000 100%)';
      badge.innerHTML = '<i class="fas fa-brain"></i> TensorFlow.js Active';
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar TensorFlow.js:', error);
    isMLReady = false;
    return false;
  }
}

// Treinar modelos com dados históricos
async function trainMLModels(users, logs) {
  if (!isMLReady || !riskModel) {
    console.warn('⚠️ TensorFlow.js não está pronto');
    return false;
  }
  
  try {
    console.log('📚 Preparando dados de treinamento...');
    
    // Preparar dados para modelo de risco
    const riskInputs = [];
    const riskOutputs = [];
    
    users.forEach(user => {
      const userLogs = logs.filter(log => {
        const logUserId = log.userId?._id || log.userId;
        return logUserId === user._id;
      });
      
      const failedLogins = userLogs.filter(log => 
        log.action && log.action.toLowerCase().includes('failed')
      ).length;
      
      const totalActions = userLogs.length;
      const accountAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const activityRate = totalActions / Math.max(accountAge, 1);
      const recentActivity = userLogs.filter(log => 
        Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
      ).length;
      
      // 8 features
      riskInputs.push([
        Math.min(failedLogins / 10, 1),
        Math.min(activityRate / 10, 1),
        Math.min(accountAge / 365, 1),
        user.status === 'banned' ? 1 : 0,
        user.status === 'suspended' ? 1 : 0,
        Math.min(recentActivity / 50, 1),
        user.role === 'admin' ? 0.2 : user.role === 'company' ? 0.5 : 0.8,
        Math.min(totalActions / 1000, 1)
      ]);
      
      // Label: alto risco = 1
      const isHighRisk = (user.status === 'banned' || user.status === 'suspended' || failedLogins > 5 || activityRate > 20) ? 1 : 0;
      riskOutputs.push([isHighRisk]);
    });
    
    if (riskInputs.length < 5) {
      console.warn('Poucos dados para treinar');
      return false;
    }
    
    // Treinar modelo de risco
    const xs = tf.tensor2d(riskInputs);
    const ys = tf.tensor2d(riskOutputs);
    
    console.log(`📊 Treinando modelo de risco com ${riskInputs.length} exemplos...`);
    
    await riskModel.fit(xs, ys, {
      epochs: 50,
      batchSize: Math.min(32, Math.floor(riskInputs.length / 2)),
      validationSplit: 0.2,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Época ${epoch}: loss = ${logs.loss.toFixed(4)}, acc = ${(logs.acc || 0).toFixed(4)}`);
          }
        }
      }
    });
    
    xs.dispose();
    ys.dispose();
    
    // Treinar autoencoder (apenas com usuários normais)
    const normalBehaviorInputs = [];
    
    users.filter(u => u.status === 'active').forEach(user => {
      const userLogs = logs.filter(log => {
        const logUserId = log.userId?._id || log.userId;
        return logUserId === user._id;
      });
      
      if (userLogs.length > 5) {
        const actionsPerHour = new Array(24).fill(0);
        
        userLogs.slice(-50).forEach(log => {
          const hour = new Date(log.timestamp).getHours();
          actionsPerHour[hour]++;
        });
        
        const morning = actionsPerHour.slice(6, 12).reduce((a, b) => a + b, 0) / 6;
        const afternoon = actionsPerHour.slice(12, 18).reduce((a, b) => a + b, 0) / 6;
        const evening = actionsPerHour.slice(18, 24).reduce((a, b) => a + b, 0) / 6;
        const night = actionsPerHour.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
        
        normalBehaviorInputs.push([
          Math.min(morning / 5, 1),
          Math.min(afternoon / 5, 1),
          Math.min(evening / 5, 1),
          Math.min(night / 5, 1),
          Math.min(userLogs.length / 100, 1),
          user.role === 'admin' ? 0.2 : user.role === 'company' ? 0.5 : 0.8
        ]);
      }
    });
    
    if (normalBehaviorInputs.length >= 10) {
      const anomalyXs = tf.tensor2d(normalBehaviorInputs);
      
      console.log(`🔍 Treinando detector de anomalias com ${normalBehaviorInputs.length} exemplos...`);
      
      await anomalyModel.fit(anomalyXs, anomalyXs, {
        epochs: 100,
        batchSize: 16,
        validationSplit: 0.2,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`Época ${epoch}: loss = ${logs.loss.toFixed(4)}`);
            }
          }
        }
      });
      
      anomalyXs.dispose();
    }
    
    console.log('✅ Modelos treinados com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao treinar modelos:', error);
    return false;
  }
}

// Calcular risco usando TensorFlow
async function calculateUserRisk(user, userLogs) {
  if (!isMLReady || !riskModel) {
    // Fallback manual
    const failedLogins = userLogs.filter(log => 
      log.action && log.action.toLowerCase().includes('failed')
    ).length;
    
    if (user.status === 'banned' || user.status === 'suspended') return 1;
    if (failedLogins > 5) return 0.7;
    if (failedLogins > 2) return 0.4;
    return 0.2;
  }
  
  try {
    const failedLogins = userLogs.filter(log => 
      log.action && log.action.toLowerCase().includes('failed')
    ).length;
    
    const totalActions = userLogs.length;
    const accountAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const activityRate = totalActions / Math.max(accountAge, 1);
    const recentActivity = userLogs.filter(log => 
      Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
    ).length;
    
    const features = tf.tensor2d([[
      Math.min(failedLogins / 10, 1),
      Math.min(activityRate / 10, 1),
      Math.min(accountAge / 365, 1),
      user.status === 'banned' ? 1 : 0,
      user.status === 'suspended' ? 1 : 0,
      Math.min(recentActivity / 50, 1),
      user.role === 'admin' ? 0.2 : user.role === 'company' ? 0.5 : 0.8,
      Math.min(totalActions / 1000, 1)
    ]]);
    
    const prediction = riskModel.predict(features);
    const riskValue = (await prediction.data())[0];
    
    features.dispose();
    prediction.dispose();
    
    return riskValue;
  } catch (error) {
    console.error('Erro ao calcular risco:', error);
    return 0.5;
  }
}

// Detectar anomalias com TensorFlow
async function detectAnomalies(logs, users) {
  const anomalies = [];
  
  const userLogsMap = {};
  logs.forEach(log => {
    const userId = log.userId?._id || log.userId;
    if (!userLogsMap[userId]) {
      userLogsMap[userId] = [];
    }
    userLogsMap[userId].push(log);
  });
  
  for (const [userId, userLogs] of Object.entries(userLogsMap)) {
    const user = users.find(u => u._id === userId);
    if (!user) continue;
    
    userLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Detecção rápida (bot)
    let rapidActionsCount = 0;
    for (let i = 1; i < userLogs.length; i++) {
      const timeDiff = new Date(userLogs[i].timestamp) - new Date(userLogs[i-1].timestamp);
      if (timeDiff < 1000) rapidActionsCount++;
    }
    
    if (rapidActionsCount > 5) {
      anomalies.push({
        type: 'rapid_actions',
        userId,
        username: user.username || user.email,
        severity: 'high',
        confidence: 0.95,
        description: `${rapidActionsCount} ações em <1s (possível bot)`,
        timestamp: userLogs[userLogs.length - 1].timestamp
      });
    }
    
    // Falhas de login
    const failedLogins = userLogs.filter(log => 
      log.action && log.action.toLowerCase().includes('failed')
    );
    
    if (failedLogins.length >= 3) {
      anomalies.push({
        type: 'failed_logins',
        userId,
        username: user.username || user.email,
        severity: 'high',
        confidence: 0.90,
        description: `${failedLogins.length} tentativas de login falhadas`,
        timestamp: failedLogins[failedLogins.length - 1].timestamp
      });
    }
    
    // ML Anomaly Detection
    if (isMLReady && anomalyModel && userLogs.length > 10) {
      try {
        const actionsPerHour = new Array(24).fill(0);
        
        userLogs.slice(-50).forEach(log => {
          const hour = new Date(log.timestamp).getHours();
          actionsPerHour[hour]++;
        });
        
        const morning = actionsPerHour.slice(6, 12).reduce((a, b) => a + b, 0) / 6;
        const afternoon = actionsPerHour.slice(12, 18).reduce((a, b) => a + b, 0) / 6;
        const evening = actionsPerHour.slice(18, 24).reduce((a, b) => a + b, 0) / 6;
        const night = actionsPerHour.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
        
        const features = tf.tensor2d([[
          Math.min(morning / 5, 1),
          Math.min(afternoon / 5, 1),
          Math.min(evening / 5, 1),
          Math.min(night / 5, 1),
          Math.min(userLogs.length / 100, 1),
          user.role === 'admin' ? 0.2 : user.role === 'company' ? 0.5 : 0.8
        ]]);
        
        const reconstruction = anomalyModel.predict(features);
        const originalData = await features.data();
        const reconstructedData = await reconstruction.data();
        
        let reconstructionError = 0;
        for (let i = 0; i < originalData.length; i++) {
          reconstructionError += Math.pow(originalData[i] - reconstructedData[i], 2);
        }
        reconstructionError = Math.sqrt(reconstructionError / originalData.length);
        
        if (reconstructionError > 0.3) {
          const severity = reconstructionError > 0.6 ? 'high' : reconstructionError > 0.4 ? 'medium' : 'low';
          anomalies.push({
            type: 'ml_anomaly',
            userId,
            username: user.username || user.email,
            severity,
            confidence: Math.min(reconstructionError, 1),
            description: `Padrão anômalo detectado por TensorFlow (erro: ${(reconstructionError * 100).toFixed(1)}%)`,
            timestamp: new Date().toISOString(),
            details: {
              morning: morning.toFixed(1),
              afternoon: afternoon.toFixed(1),
              evening: evening.toFixed(1),
              night: night.toFixed(1)
            }
          });
        }
        
        features.dispose();
        reconstruction.dispose();
      } catch (error) {
        console.error('Erro na detecção ML:', error);
      }
    }
  }
  
  return anomalies;
}

// ==========================================
// SISTEMA DE INTELIGÊNCIA ARTIFICIAL
// ==========================================

// Detectar intenção do usuário
function detectUserIntent(message) {
  const msg = message.toLowerCase();
  
  // Banimentos
  if (msg.includes('banido') || msg.includes('ban') || msg.includes('bloqueado')) {
    if (msg.includes('list') || msg.includes('quais') || msg.includes('quantos')) return 'listBanned';
    if (msg.includes('por que') || msg.includes('motivo') || msg.includes('razão')) return 'banReasons';
    if (msg.includes('desbanir') || msg.includes('desbloquear')) return 'unban';
    return 'bannedUsers';
  }
  
  // Alertas
  if (msg.includes('alert') || msg.includes('aviso') || msg.includes('notifica')) {
    if (msg.includes('crítico') || msg.includes('urgente')) return 'criticalAlerts';
    if (msg.includes('recente') || msg.includes('hoje') || msg.includes('agora')) return 'recentAlerts';
    return 'alerts';
  }
  
  // Atividades suspeitas
  if (msg.includes('suspeita') || msg.includes('suspeito') || msg.includes('anormal') || msg.includes('estranho')) {
    return 'suspiciousActivity';
  }
  
  // Análise de risco
  if (msg.includes('risco') || msg.includes('perigoso') || msg.includes('crítico')) {
    if (msg.includes('alto') || msg.includes('maior')) return 'highRisk';
    return 'riskAnalysis';
  }
  
  // Estatísticas
  if (msg.includes('estat') || msg.includes('número') || msg.includes('quantos') || msg.includes('total')) {
    if (msg.includes('usuário')) return 'userStats';
    if (msg.includes('atividade')) return 'activityStats';
    return 'statistics';
  }
  
  // Tendências
  if (msg.includes('tendência') || msg.includes('crescimento') || msg.includes('padrão') || msg.includes('comportamento')) {
    return 'trends';
  }
  
  // Pesquisa
  if (msg.includes('procur') || msg.includes('busca') || msg.includes('encontr') || msg.includes('achar')) {
    return 'search';
  }
  
  // Ajuda
  if (msg.includes('ajuda') || msg.includes('help') || msg.includes('como') || msg.includes('posso')) {
    return 'help';
  }
  
  // Relatório
  if (msg.includes('relatório') || msg.includes('resumo') || msg.includes('geral') || msg.includes('visão')) {
    return 'report';
  }
  
  return 'general';
}

// Analisar contexto do sistema
async function analyzeSystemContext(users, logs, jobs) {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const context = {
    users: {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      banned: users.filter(u => u.status === 'banned').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      candidates: users.filter(u => u.role === 'candidate').length,
      companies: users.filter(u => u.role === 'company').length,
      admins: users.filter(u => u.role === 'admin').length
    },
    logs: {
      total: logs.length,
      last24h: logs.filter(log => new Date(log.timestamp).getTime() > oneDayAgo).length,
      last7days: logs.filter(log => new Date(log.timestamp).getTime() > oneWeekAgo).length
    },
    jobs: {
      total: jobs.length,
      active: jobs.filter(j => j.status === 'active').length
    }
  };
  
  // Detectar anomalias
  context.anomalies = await detectAnomalies(logs, users);
  
  // Calcular riscos
  const usersWithRisk = await Promise.all(
    users.filter(u => u.status === 'active').slice(0, 20).map(async user => {
      const userLogs = logs.filter(log => {
        const logUserId = log.userId?._id || log.userId;
        return logUserId === user._id;
      });
      const risk = await calculateUserRisk(user, userLogs);
      return { user, risk };
    })
  );
  
  context.highRiskUsers = usersWithRisk.filter(u => u.risk > 0.7).map(u => ({
    ...u.user,
    riskScore: u.risk
  }));
  
  return context;
}

// Gerar resposta do assistente de banimentos
async function generateBanimentoResponse(message, context) {
  const intent = detectUserIntent(message);
  let response = '';
  
  if (intent === 'listBanned' || intent === 'bannedUsers') {
    const bannedUsers = context.users.filter(u => u.status === 'banned');
    response = `📋 **Usuários Banidos**\n\n`;
    response += `Total: ${bannedUsers.length} usuário(s)\n\n`;
    
    if (bannedUsers.length === 0) {
      response += '✅ Nenhum usuário banido no momento.';
    } else {
      bannedUsers.slice(0, 10).forEach(user => {
        response += `🚫 **${user.username || user.email}**\n`;
        response += `   └ Email: ${user.email}\n`;
        response += `   └ Tipo: ${user.role}\n\n`;
      });
    }
  } else if (intent === 'highRisk') {
    response = `⚠️ **Análise de Alto Risco**\n\n`;
    
    if (isMLReady) {
      response += `🧠 **Detecção via TensorFlow.js:**\n`;
      response += `Analisando padrões comportamentais com Deep Learning...\n\n`;
    }
    
    if (context.highRiskUsers && context.highRiskUsers.length > 0) {
      response += `Encontrei ${context.highRiskUsers.length} usuário(s) de alto risco:\n\n`;
      
      for (const user of context.highRiskUsers.slice(0, 5)) {
        const userLogs = context.logs.filter(log => {
          const logUserId = log.userId?._id || log.userId;
          return logUserId === user._id;
        });
        
        const risk = await calculateUserRisk(user, userLogs);
        const riskPercentage = (risk * 100).toFixed(1);
        
        response += `🔴 **${user.username || user.email}** - Risco: ${riskPercentage}%\n`;
        response += `   └ Email: ${user.email}\n`;
        response += `   └ Tipo: ${user.role}\n`;
        response += `   └ Status: ${user.status}\n\n`;
      }
      
      response += `\n💡 **Recomendação:** Revisar esses usuários e considerar ações preventivas.`;
    } else {
      response += `✅ Nenhum usuário de alto risco detectado no momento.`;
    }
  } else {
    response = `Olá! Sou o assistente de **Banimentos**.\n\n`;
    response += `Posso ajudá-lo com:\n`;
    response += `• Listar usuários banidos\n`;
    response += `• Analisar riscos de banimento\n`;
    response += `• Sugerir ações preventivas\n\n`;
    response += `Como posso ajudar?`;
  }
  
  return response;
}

// Gerar resposta do assistente de alertas
async function generateAlertasResponse(message, context) {
  const intent = detectUserIntent(message);
  let response = '';
  
  if (intent === 'criticalAlerts' || intent === 'alerts') {
    response = `🔔 **Sistema de Alertas**\n\n`;
    
    const anomalies = await detectAnomalies(context.logs, context.users);
    const criticalAnomalies = anomalies.filter(a => a.severity === 'high');
    
    if (criticalAnomalies.length > 0) {
      response += `⚠️ **${criticalAnomalies.length} Alerta(s) Crítico(s):**\n\n`;
      
      criticalAnomalies.slice(0, 5).forEach(anomaly => {
        response += `🔴 **${anomaly.username}**\n`;
        response += `   └ ${anomaly.description}\n`;
        response += `   └ Confiança: ${(anomaly.confidence * 100).toFixed(0)}%\n\n`;
      });
    } else {
      response += `✅ Nenhum alerta crítico no momento.\n\n`;
    }
    
    if (isMLReady) {
      response += `\n🧠 **Monitoramento TensorFlow.js ativo** - Análise em tempo real.`;
    }
  } else {
    response = `Sou o assistente de **Alertas**.\n\n`;
    response += `Monitoro atividades suspeitas e notificações importantes.\n\n`;
    response += `Pergunte-me sobre alertas críticos ou recentes!`;
  }
  
  return response;
}

// Gerar resposta do assistente de atividades suspeitas
async function generateAtividadesResponse(message, context) {
  const intent = detectUserIntent(message);
  let response = '';
  
  if (intent === 'suspiciousActivity') {
    response = `🔍 **Atividades Suspeitas Detectadas**\n\n`;
    
    const anomalies = await detectAnomalies(context.logs, context.users);
    
    if (anomalies.length > 0) {
      if (isMLReady) {
        response += `🧠 **Análise TensorFlow.js:**\n`;
        response += `Identifiquei ${anomalies.length} padrão(ões) anômalo(s):\n\n`;
      } else {
        response += `Encontrei ${anomalies.length} atividade(s) suspeita(s):\n\n`;
      }
      
      anomalies.slice(0, 10).forEach(anomaly => {
        const severityEmoji = anomaly.severity === 'high' ? '🔴' : anomaly.severity === 'medium' ? '🟡' : '🟢';
        const confidence = anomaly.confidence ? ` (${(anomaly.confidence * 100).toFixed(0)}% confiança)` : '';
        
        response += `${severityEmoji} **${anomaly.username}**\n`;
        response += `   └ ${anomaly.description}${confidence}\n`;
        
        if (anomaly.details) {
          response += `   └ Padrão: Manhã ${anomaly.details.morning}, Tarde ${anomaly.details.afternoon}, Noite ${anomaly.details.evening}\n`;
        }
        
        response += `\n`;
      });
      
      response += `\n💡 **Ação recomendada:** Investigar usuários com atividades anômalas.`;
    } else {
      response += `✅ Nenhuma atividade suspeita detectada no momento.`;
    }
  } else {
    response = `Sou o assistente de **Atividades Suspeitas**.\n\n`;
    if (isMLReady) {
      response += `🧠 Uso TensorFlow.js para detectar anomalias comportamentais.\n\n`;
    }
    response += `Pergunte-me sobre padrões suspeitos de usuários!`;
  }
  
  return response;
}

// Gerar resposta do assistente de ajuda
function generateAjudaResponse(message, context) {
  return `🤖 **Central de Ajuda**\n\n` +
    `Sou seu assistente de IA para monitoramento administrativo.\n\n` +
    `**Assistentes disponíveis:**\n\n` +
    `🚫 **Banimentos** - Gerenciar e analisar banimentos\n` +
    `🔔 **Alertas** - Notificações e avisos do sistema\n` +
    `🔍 **Atividades Suspeitas** - Detectar comportamentos anômalos\n` +
    `❓ **Ajuda** - Suporte e orientação\n` +
    `🔎 **Pesquisa Avançada** - Buscar informações específicas\n` +
    `📈 **Tendências** - Análise de padrões e crescimento\n\n` +
    (isMLReady ? `🧠 **TensorFlow.js ativo** - Análise com Machine Learning\n\n` : '') +
    `Como posso ajudá-lo?`;
}

// Gerar resposta do assistente de pesquisa
function generatePesquisaResponse(message, context) {
  const intent = detectUserIntent(message);
  let response = '';
  
  if (intent === 'search') {
    response = `🔎 **Pesquisa Avançada**\n\n`;
    response += `📊 **Estatísticas do Sistema:**\n\n`;
    response += `👥 Usuários: ${context.users.total}\n`;
    response += `   └ Ativos: ${context.users.active}\n`;
    response += `   └ Banidos: ${context.users.banned}\n`;
    response += `   └ Suspensos: ${context.users.suspended}\n\n`;
    response += `📝 Logs: ${context.logs.total}\n`;
    response += `   └ Últimas 24h: ${context.logs.last24h}\n`;
    response += `   └ Últimos 7 dias: ${context.logs.last7days}\n\n`;
    response += `💼 Vagas: ${context.jobs.total} (${context.jobs.active} ativas)`;
  } else {
    response = `Sou o assistente de **Pesquisa Avançada**.\n\n`;
    response += `Posso buscar informações detalhadas sobre usuários, logs e atividades.\n\n`;
    response += `O que você gostaria de pesquisar?`;
  }
  
  return response;
}

// Gerar resposta do assistente de tendências
async function generateTendenciasResponse(message, context) {
  const intent = detectUserIntent(message);
  let response = '';
  
  if (intent === 'trends' || intent === 'report') {
    response = `📈 **Análise de Tendências**\n\n`;
    
    response += `📊 **Visão Geral:**\n`;
    response += `• Total de usuários: ${context.users.total}\n`;
    response += `• Atividade (24h): ${context.logs.last24h} ações\n`;
    response += `• Taxa de banimento: ${((context.users.banned / context.users.total) * 100).toFixed(1)}%\n\n`;
    
    if (isMLReady && context.highRiskUsers && context.highRiskUsers.length > 0) {
      response += `⚠️ **Usuários de Alto Risco:** ${context.highRiskUsers.length}\n\n`;
    }
    
    if (context.anomalies && context.anomalies.length > 0) {
      response += `🔍 **Anomalias Detectadas:** ${context.anomalies.length}\n`;
      const criticalCount = context.anomalies.filter(a => a.severity === 'high').length;
      if (criticalCount > 0) {
        response += `   └ Críticas: ${criticalCount}\n`;
      }
    }
    
    response += `\n💡 **Tendência:** ${context.logs.last24h > 100 ? 'Alta atividade' : 'Atividade normal'}`;
  } else {
    response = `Sou o assistente de **Tendências**.\n\n`;
    if (isMLReady) {
      response += `🧠 Analiso padrões usando TensorFlow.js.\n\n`;
    }
    response += `Pergunte-me sobre crescimento, padrões de uso e projeções!`;
  }
  
  return response;
}

// ==========================================
// INTERFACE DO CHAT
// ==========================================

// Abrir assistente
async function openAssistant(type) {
  currentAssistant = type;
  
  const modal = document.getElementById('aiChatModal');
  const title = document.getElementById('aiChatTitle');
  const messagesDiv = document.getElementById('aiChatMessages');
  
  const titles = {
    banimentos: '🚫 Assistente de Banimentos',
    alertas: '🔔 Assistente de Alertas',
    atividades: '🔍 Atividades Suspeitas',
    ajuda: '❓ Central de Ajuda',
    pesquisa: '🔎 Pesquisa Avançada',
    tendencias: '📈 Análise de Tendências'
  };
  
  title.textContent = titles[type] || 'Assistente de IA';
  modal.style.display = 'flex';
  
  // Inicializar histórico se não existir
  if (!chatHistory[type]) {
    chatHistory[type] = [];
    addWelcomeMessage(type);
  } else {
    renderChatHistory(type);
  }
  
  document.getElementById('aiChatInput').focus();
}

// Fechar chat
function closeAIChat() {
  document.getElementById('aiChatModal').style.display = 'none';
}

// Adicionar mensagem de boas-vindas
function addWelcomeMessage(type) {
  const welcomeMessages = {
    banimentos: isMLReady ? 
      'Olá! Sou o assistente de Banimentos com TensorFlow.js. Posso analisar riscos e sugerir ações.' :
      'Olá! Sou o assistente de Banimentos. Como posso ajudar?',
    alertas: isMLReady ?
      'Sistema de Alertas com Machine Learning ativo. Monitorando em tempo real.' :
      'Sistema de Alertas ativo. Como posso ajudar?',
    atividades: isMLReady ?
      'Detector de Anomalias com TensorFlow.js pronto. Pergunte sobre atividades suspeitas!' :
      'Detector de atividades suspeitas pronto!',
    ajuda: 'Central de Ajuda disponível. Como posso orientá-lo?',
    pesquisa: 'Pesquisa Avançada pronta. O que deseja buscar?',
    tendencias: isMLReady ?
      'Análise de Tendências com Machine Learning. Pergunte sobre padrões!' :
      'Análise de Tendências disponível!'
  };
  
  const message = {
    role: 'assistant',
    content: welcomeMessages[type] || 'Como posso ajudar?',
    timestamp: new Date()
  };
  
  chatHistory[type].push(message);
  renderChatHistory(type);
}

// Renderizar histórico do chat
function renderChatHistory(type) {
  const messagesDiv = document.getElementById('aiChatMessages');
  messagesDiv.innerHTML = '';
  
  chatHistory[type].forEach(message => {
    addMessageToDOM(message.role, message.content);
  });
  
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Adicionar mensagem ao DOM
function addMessageToDOM(role, content) {
  const messagesDiv = document.getElementById('aiChatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${role}`;
  
  // Converter markdown básico
  const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  
  messageDiv.innerHTML = `
    <div class="message-content">${formattedContent}</div>
    <div class="message-time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
  `;
  
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Enviar mensagem
async function sendAIMessage() {
  const input = document.getElementById('aiChatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Adicionar mensagem do usuário
  chatHistory[currentAssistant].push({
    role: 'user',
    content: message,
    timestamp: new Date()
  });
  
  addMessageToDOM('user', message);
  input.value = '';
  
  // Mostrar indicador de digitação
  showTypingIndicator();
  
  try {
    // Buscar dados do sistema
    const [usersRes, logsRes, jobsRes] = await Promise.all([
      fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
      fetch('/api/audit/logs?limit=1000', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
      fetch('/api/jobs', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    ]);
    
    const users = await usersRes.json();
    const logs = await logsRes.json();
    const jobs = await jobsRes.json();
    
    // Analisar contexto
    const context = await analyzeSystemContext(users, logs, jobs);
    context.users = users;
    context.logs = logs;
    context.jobs = jobs;
    
    // Gerar resposta baseada no assistente
    let response = '';
    
    switch(currentAssistant) {
      case 'banimentos':
        response = await generateBanimentoResponse(message, context);
        break;
      case 'alertas':
        response = await generateAlertasResponse(message, context);
        break;
      case 'atividades':
        response = await generateAtividadesResponse(message, context);
        break;
      case 'ajuda':
        response = generateAjudaResponse(message, context);
        break;
      case 'pesquisa':
        response = generatePesquisaResponse(message, context);
        break;
      case 'tendencias':
        response = await generateTendenciasResponse(message, context);
        break;
      default:
        response = 'Desculpe, não entendi. Como posso ajudar?';
    }
    
    hideTypingIndicator();
    
    // Adicionar resposta do assistente
    chatHistory[currentAssistant].push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    addMessageToDOM('assistant', response);
    
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    hideTypingIndicator();
    
    const errorResponse = 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.';
    chatHistory[currentAssistant].push({
      role: 'assistant',
      content: errorResponse,
      timestamp: new Date()
    });
    
    addMessageToDOM('assistant', errorResponse);
  }
}

// Indicador de digitação
function showTypingIndicator() {
  const messagesDiv = document.getElementById('aiChatMessages');
  const indicator = document.createElement('div');
  indicator.className = 'ai-message assistant typing-indicator';
  indicator.innerHTML = `
    <div class="message-content">
      <span></span><span></span><span></span>
    </div>
  `;
  indicator.id = 'typingIndicator';
  messagesDiv.appendChild(indicator);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
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
        'Quais são os casos críticos detectados pela IA?' : 
        'Quais são os casos mais críticos?';
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

// Enter para enviar
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('aiChatInput');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }
  
  // Inicializar ML e treinar modelos
  (async () => {
    await initializeML();
    
    if (isMLReady) {
      try {
        const [usersRes, logsRes] = await Promise.all([
          fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/audit/logs?limit=1000', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        ]);
        
        const users = await usersRes.json();
        const logs = await logsRes.json();
        
        await trainMLModels(users, logs);
      } catch (error) {
        console.error('Erro ao treinar modelos iniciais:', error);
      }
    }
  })();
});
