

require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');

const apiRouter = require('./routes/api');
const pagesRouter = require('./routes/pages');


const app = express();

// Servir arquivos do Leaflet diretamente de node_modules
app.use('/node_modules/leaflet', express.static(path.join(__dirname, 'node_modules/leaflet')));

// Trust proxy para ambientes como Render
app.set('trust proxy', 1);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dbuser:152070an@cluster0.85mgjap.mongodb.net/?appName=Cluster0';
const PORT = 3000;

console.log('Config:', { 
  MONGO_URI: process.env.MONGO_URI,
  PORT,
  NODE_ENV: process.env.NODE_ENV
});

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  // disable automatic buffering so operations fail fast when DB unavailable
  mongoose.set('bufferCommands', false);

  const mongooseOptions = {
    // fail fast if server selection can't be made (DNS issues, network)
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // prefer IPv4 where DNS may return IPv6 that is not routable in some environments
    family: 4
  };

  mongoose.connect(MONGO_URI, mongooseOptions)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => {
      console.warn('MongoDB connection failed, continuing with JSON database:', err && err.message ? err.message : err);
      if (err && err.name === 'MongoParseError') {
        console.warn('MongoParseError: check your MONGO_URI formatting and credentials.');
      }
      if (err && /querySrv|ENOTFOUND|ESERVFAIL/i.test(err.message)) {
        console.warn('SRV DNS lookup failed. Try: `nslookup -type=SRV _mongodb._tcp.<your-cluster-host>` or use a standard `mongodb://` connection string.');
      }
    });

  mongoose.connection.on('error', (e) => console.error('Mongoose connection error:', e));
  mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected'));
}

// Middlewares
// Use helmet but disable its built-in CSP so we can set an explicit header below
app.use(helmet({ contentSecurityPolicy: false }));

// Ensure a strict but compatible Content-Security-Policy header (explicit string)
app.use((req, res, next) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.cloudinary.com https://res.cloudinary.com https://images.unsplash.com https://cdn.jsdelivr.net",
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com",
    "connect-src 'self' https://api.github.com https://viacep.com.br wss:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());

// CORS - allow from env or default
const corsOptions = {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/login', loginLimiter);

// Static files
// Mantém /public para compatibilidade com páginas antigas
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Permite servir /css, /js, /images, /components diretamente da raiz do public
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/components', express.static(path.join(__dirname, 'public/components')));

// Routes
app.use('/api', apiRouter);
app.use('/', pagesRouter);

// Error handling
// Error handling middleware must accept four arguments so Express recognizes it as an error handler
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  try {
    if (res.headersSent) {
      return next(err);
    }
    res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Internal Server Error' });
  } catch (e) {
    console.error('Error in error handler:', e);
    try { res.status(500).json({ error: 'Internal Server Error' }); } catch (__) { /* swallow */ }
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
