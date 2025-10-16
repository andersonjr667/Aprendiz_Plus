const express = require('express');
const path = require('path');
const routes = require('./routes');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuração CORS
app.use(cors());

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public'))); // opcional
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Parsing de corpo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Usar rotas centralizadas
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);
app.use('/', routes);

// Rota para favicon (caso não seja encontrada pelo static)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'images', 'favicon.ico'));
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
