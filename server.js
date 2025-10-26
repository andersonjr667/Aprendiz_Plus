const express = require('express');
const path = require('path');
const routes = require('./routes');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongooseService = require('./services/mongoose');
require('dotenv').config();

// Variáveis para controle do servidor
let server;
const SHUTDOWN_TIMEOUT = 10000; // 10 segundos para shutdown gracioso

// Função para inicializar o banco de dados
async function initializeDatabase() {
  try {
    await mongooseService.connect({
      maxAttempts: 5,
      baseDelay: 2000
    });
    console.log('✅ Conexão com MongoDB estabelecida com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error);
    process.exit(1);
  }
}

const app = express();

// Inicializa a conexão com o banco de dados
initializeDatabase();

// Segurança e performance
if (process.env.NODE_ENV === 'production') {
  // quando atrás de proxy/reverse-proxy (Heroku, Railway, etc.)
  app.set('trust proxy', 1);
}
app.use(helmet());
app.use(compression());

// Configuração do Morgan para logging colorido e informativo
const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : ':method :url :status :response-time ms';

// Função para colorir status code
morgan.token('status', (req, res) => {
  const status = res.statusCode;
  const color = status >= 500 ? 31 // vermelho
    : status >= 400 ? 33 // amarelo
    : status >= 300 ? 36 // ciano
    : 32; // verde
  return `\x1b[${color}m${status}\x1b[0m`;
});

// Função para colorir método HTTP
morgan.token('method', (req) => {
  const color = req.method === 'GET' ? 34 // azul
    : req.method === 'POST' ? 32 // verde
    : req.method === 'PUT' ? 33 // amarelo
    : req.method === 'DELETE' ? 31 // vermelho
    : 35; // magenta
  return `\x1b[${color}m${req.method}\x1b[0m`;
});

app.use(morgan(morganFormat, {
    skip: (req, res) => {
        // Pula logs de recursos estáticos e requisições bem-sucedidas em desenvolvimento
        return process.env.NODE_ENV !== 'production' && 
               (req.path.startsWith('/css') || 
                req.path.startsWith('/js') || 
                req.path.startsWith('/images') ||
                req.path.includes('zybTracker'));
    }
}));

// Rate limiting para rotas /api
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Configuração CORS (origens controladas via env)
const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // permitir requests sem origin (ex: mobile apps, curl, server-side)
    if (!origin) return callback(null, true);
    if (allowed.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname)));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/documents', express.static(path.join(__dirname, 'documents')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/data/images_perfil_candidato', express.static(path.join(__dirname, 'data', 'images_perfil_candidato')));

// Parsing de corpo e cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'sua-chave-secreta'));

// Middleware para ignorar requisições do zybTracker
app.use((req, res, next) => {
    if (req.path.includes('zybTracker')) {
        return res.status(200).end();
    }
    next();
});

// Middleware de autenticação de empresa
const companyAuth = require('./middleware/company-auth');

// Rotas principais
const adminRoutes = require('./routes/admin');
const pagesRoutes = require('./routes/pages');

// Importar e configurar rotas da API
const authRoutes = require('./routes/api/auth');
const usersRoutes = require('./routes/api/users');
const jobsRoutes = require('./routes/api/jobs');
const candidatesRoutes = require('./routes/api/candidates');
const newsRoutes = require('./routes/api/news');
const auditRoutes = require('./routes/api/audit');
const recommendationsRoutes = require('./routes/api/recommendations');
const chatbotRoutes = require('./routes/api/chatbot');
const commentsRoutes = require('./routes/api/comments');
const companiesRoutes = require('./routes/api/companies');

// Usar rotas centralizadas
app.use('/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/', pagesRoutes);

// Rota para favicon (caso não seja encontrada pelo static)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'favicon.ico'));
});

// 404 - deve ser a última rota
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
});

// Error handler mínimo para CORS e outros erros de middleware
app.use((err, req, res, next) => {
  if (err && err.message && err.message.indexOf('CORS policy') === 0) {
    return res.status(403).json({ error: err.message });
  }
  // delegate to next error handlers (routes may have their own)
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;

// Inicialização do servidor com retry e reconexão
async function startServer() {
    try {
        // Tenta conectar ao MongoDB
        if (process.env.MONGO_ENABLED === 'true') {
            console.log('\x1b[34m%s\x1b[0m', '🔄 Iniciando conexão com MongoDB...');
            await mongooseService.connect({
                maxAttempts: 5,
                baseDelay: 2000
            });
        }

        // Verifica se a porta está em uso antes de iniciar
        const tcpServer = require('net').createServer();
        await new Promise((resolve, reject) => {
            tcpServer.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`A porta ${PORT} já está em uso. Por favor, encerre o processo ou use outra porta.`));
                } else {
                    reject(err);
                }
            });
            tcpServer.once('listening', () => {
                tcpServer.close();
                resolve();
            });
            tcpServer.listen(PORT);
        });

        // Inicia o servidor HTTP
        server = app.listen(PORT, () => {
            console.log('\x1b[32m%s\x1b[0m', `✅ Servidor iniciado com sucesso na porta ${PORT}`);
            if (process.env.MONGO_ENABLED === 'true') {
                console.log('\x1b[34m%s\x1b[0m', '📊 MongoDB conectado e pronto');
            } else {
                console.log('\x1b[33m%s\x1b[0m', '⚠️  Modo local ativo (sem MongoDB)');
            }
        });

        // Configurar timeout do servidor
        server.timeout = 30000; // 30 segundos
        server.keepAliveTimeout = 65000; // Recomendado para Nginx/proxy
        
        // Monitorar eventos do servidor
        server.on('error', (error) => {
            console.error('\x1b[31m%s\x1b[0m', '❌ Erro no servidor HTTP:', error);
            if (error.code === 'EADDRINUSE') {
                console.log('\x1b[33m%s\x1b[0m', '⚠️  Porta em uso, tentando novamente em 1 minuto...');
                setTimeout(startServer, 60000);
            }
        });

    } catch (error) {
        console.error('Erro fatal ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Função de shutdown gracioso
async function shutdown(signal) {
    console.log('\x1b[33m%s\x1b[0m', `⚠️  Iniciando shutdown do servidor (${signal})...`);
    
    if (server) {
        server.close(() => {
            console.log('\x1b[32m%s\x1b[0m', '✅ Servidor HTTP fechado com sucesso');
        });
    }

    if (process.env.MONGO_ENABLED === 'true') {
        try {
            await mongoose.connection.close();
            console.log('\x1b[32m%s\x1b[0m', '✅ Conexão MongoDB fechada com sucesso');
        } catch (err) {
            console.error('\x1b[31m%s\x1b[0m', '❌ Erro ao fechar conexão MongoDB:', err);
        }
    }

    // Força o shutdown após o timeout
    setTimeout(() => {
        console.error('\x1b[31m%s\x1b[0m', '❌ Timeout de shutdown atingido, forçando encerramento');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT);
}

// Handlers para shutdown gracioso
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Inicia o servidor
startServer();
