const express = require('express');
const path = require('path');
const routes = require('./routes');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Segurança e performance
if (process.env.NODE_ENV === 'production') {
  // quando atrás de proxy/reverse-proxy (Heroku, Railway, etc.)
  app.set('trust proxy', 1);
}
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.MORGAN_FORMAT || 'combined'));

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
    if (allowed.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname)));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/documents', express.static(path.join(__dirname, 'documents')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/data/images_perfil_candidato', express.static(path.join(__dirname, 'data', 'images_perfil_candidato')));

// Parsing de corpo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
