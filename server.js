

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
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => {
      console.warn('MongoDB connection failed, continuing with JSON database:', err.message);
    });
}

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "*"],
      imgSrc: [
        "'self'",
        "data:",
        "https://*.tile.openstreetmap.org",
        "https://tile.openstreetmap.org",
        "https://c.tile.openstreetmap.org",
        "https://b.tile.openstreetmap.org",
        "https://a.tile.openstreetmap.org"
      ],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"]
    }
  }
}));
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
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
