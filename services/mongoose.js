const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

/**
 * Tenta conectar ao MongoDB com retry exponencial.
 * - Remove opções deprecadas usadas em drivers antigos.
 * - Usa serverSelectionTimeoutMS para timeouts rápidos.
 */
async function connect({ maxAttempts = 5, baseDelay = 1000 } = {}) {
  if (isConnected) return mongoose.connection;

  const enabled = (process.env.MONGO_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) {
    console.log('MongoDB Atlas desabilitado via MONGO_ENABLED');
    return null;
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI ou MONGODB_URI não definido nas variáveis de ambiente');
  }

  // Opções compatíveis com mongoose v6+ / driver Node 4.x
  const opts = {
    // diminui o tempo de espera para falha de seleção de servidor
    serverSelectionTimeoutMS: 5000,
    // family / tls options podem ser adicionados se necessário
  };

  let attempt = 0;
  let lastErr = null;

  while (attempt < maxAttempts) {
    try {
      attempt += 1;
      console.log(`Tentando conectar ao MongoDB (tentativa ${attempt}/${maxAttempts})`);
      await mongoose.connect(uri, opts);
      isConnected = true;
      console.log('Conectado ao MongoDB Atlas');
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
