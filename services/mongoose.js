const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Tenta conectar ao MongoDB com retry exponencial e reconexão automática.
 * - Remove opções deprecadas usadas em drivers antigos.
 * - Usa serverSelectionTimeoutMS para timeouts rápidos.
 * - Reconecta automaticamente em caso de desconexão.
 */
async function connect({ maxAttempts = 5, baseDelay = 1000 } = {}) {
  if (isConnected) {
    console.log('\x1b[34m%s\x1b[0m', '📊 Usando conexão MongoDB existente');
    return mongoose.connection;
  }

  const enabled = (process.env.MONGO_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  MongoDB Atlas desabilitado via MONGO_ENABLED');
    return null;
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('\x1b[31m%s\x1b[0m', '❌ MONGO_URI ou MONGODB_URI não definido nas variáveis de ambiente');
    throw new Error('Configuração do MongoDB ausente');
  }

  // Opções compatíveis com mongoose v6+ / driver Node 4.x e otimizadas para Render
  const opts = {
    serverSelectionTimeoutMS: 10000, // Aumentado para maior tolerância em ambiente de produção
    socketTimeoutMS: 45000, // Tempo limite aumentado para Render
    maxPoolSize: 50, // Limite máximo de conexões simultâneas
    wtimeoutMS: 2500,
    retryWrites: true,
    socketTimeoutMS: 45000,       // Tempo limite para operações
    maxPoolSize: 50,             // Máximo de conexões simultâneas
    minPoolSize: 10,            // Mínimo de conexões mantidas
    connectTimeoutMS: 10000,    // Tempo limite para conexão inicial
    heartbeatFrequencyMS: 30000, // Frequência de heartbeat
    retryWrites: true,          // Retry de operações de escrita
    retryReads: true,           // Retry de operações de leitura
    // Configurações para alta disponibilidade
    autoIndex: false,           // Não criar índices em produção
    serverSelectionTimeoutMS: 5000,  // Tempo para seleção de servidor
  };

  let attempt = 0;
  let lastErr = null;

  // Configurar listeners de eventos do Mongoose
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB desconectado. Tentando reconectar...');
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      connectionAttempts++;
      setTimeout(() => {
        console.log(`Tentativa de reconexão ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        connect({ maxAttempts: 1, baseDelay }).catch(console.error);
      }, Math.min(1000 * Math.pow(2, connectionAttempts), 30000));
    }
  });

  mongoose.connection.on('connected', () => {
    console.log('MongoDB conectado com sucesso');
    connectionAttempts = 0;
    isConnected = true;
  });

  mongoose.connection.on('error', (err) => {
    console.error('Erro na conexão MongoDB:', err.message);
  });

  while (attempt < maxAttempts) {
    try {
      attempt += 1;
      console.log(`Tentando conectar ao MongoDB (tentativa ${attempt}/${maxAttempts})`);
      await mongoose.connect(uri, opts);
      
      // Configurar índices importantes em background
      if (process.env.NODE_ENV === 'production') {
        mongoose.connection.db.collection('users').createIndex({ email: 1 }, { background: true });
        mongoose.connection.db.collection('users').createIndex({ cpf: 1 }, { background: true });
      }
      
      return mongoose.connection;
    } catch (err) {
      lastErr = err;
      console.error(`Falha na tentativa ${attempt} de conectar ao MongoDB:`, err.message || err);

      // Em erros de DNS/ENOTFOUND, pode ser transitório localmente — aguarda e tenta novamente
      if (attempt >= maxAttempts) break;

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30_000);
      console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  console.error('Não foi possível conectar ao MongoDB após várias tentativas');
  // deixa o chamador decidir se encerra o processo (server.js atualmente encerra)
  throw lastErr || new Error('Falha desconhecida na conexão ao MongoDB');
}

async function disconnect() {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Desconectado do MongoDB');
  } catch (e) {
    console.error('Erro ao desconectar do MongoDB:', e.message || e);
  }
}

module.exports = {
  connect,
  disconnect,
  get isConnected() {
    return isConnected;
  }
};
