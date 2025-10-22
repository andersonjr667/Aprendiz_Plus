const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

async function connect() {
  if (isConnected) return mongoose.connection;

  const enabled = (process.env.MONGO_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) {
    console.log('MongoDB Atlas desabilitado via MONGO_ENABLED');
    return null;
  }

  // Aceita tanto MONGO_URI quanto MONGODB_URI (compatibilidade com scripts antigos)
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI ou MONGODB_URI não definido no .env');
  }

  // Opções seguras recomendadas
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // outras opções podem ser adicionadas conforme necessário
  };

  try {
    await mongoose.connect(uri, opts);
    isConnected = true;
    console.log('Conectado ao MongoDB Atlas');
    return mongoose.connection;
  } catch (err) {
    console.error('Erro conectando ao MongoDB Atlas:', err.message || err);
    throw err;
  }
}

async function disconnect() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = {
  connect,
  disconnect,
  get isConnected() {
    return isConnected;
  }
};
