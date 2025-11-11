# 🎯 Aprendiz+ | Plataforma Completa de Conectividade entre Candidatos e Empresas

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Aprendiz+** é uma plataforma full-stack completa e moderna para conectar candidatos a oportunidades de emprego, desenvolvida como MVP monolítico utilizando arquitetura Node.js/Express no backend e frontend estático com HTML5, CSS3 puro e JavaScript Vanilla.

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Características Principais](#-características-principais)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Stack Tecnológica](#-stack-tecnológica)
- [Estrutura de Diretórios](#-estrutura-de-diretórios)
- [Modelos de Dados](#-modelos-de-dados)
- [Funcionalidades Detalhadas](#-funcionalidades-detalhadas)
- [Sistema de Autenticação](#-sistema-de-autenticação)
- [Sistema de Emails](#-sistema-de-emails)
- [API Endpoints](#-api-endpoints)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Guia de Uso](#-guia-de-uso)
- [Segurança](#-segurança)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎨 Sobre o Projeto

Aprendiz+ foi desenvolvido para resolver o desafio de conectar candidatos qualificados com empresas que buscam talentos, oferecendo uma experiência moderna, intuitiva e rica em funcionalidades.

Aprendiz+ foi desenvolvido para resolver o desafio de conectar candidatos qualificados com empresas que buscam talentos, oferecendo uma experiência moderna, intuitiva e rica em funcionalidades.

### 🎯 Objetivos

- **Para Candidatos**: Encontrar oportunidades de emprego compatíveis com seu perfil, skills e localização
- **Para Empresas**: Publicar vagas e encontrar os melhores candidatos de forma eficiente
- **Para Administradores**: Gerenciar a plataforma com ferramentas robustas de moderação e monitoramento

### 🌟 Diferenciais

- 🤖 **Sistema de IA para Recomendações**: Machine learning para matching inteligente entre vagas e candidatos
- 💬 **Chat Integrado**: Comunicação direta entre candidatos e empresas
- 📊 **Dashboards Analíticos**: Estatísticas detalhadas de candidaturas e visualizações
- 🗺️ **Busca Geolocalizada**: Encontre vagas próximas com visualização em mapa interativo
- 🏆 **Gamificação**: Sistema de pontos, níveis, badges e conquistas
- ⭐ **Sistema de Avaliações**: Candidatos avaliam empresas e vice-versa
- ✅ **Verificação de Identidade**: Validação de email, CNPJ e documentos
- 🛡️ **Anti-Spam Inteligente**: Proteção contra abusos e spam automatizado
- 📧 **Sistema Completo de Emails**: Notificações automatizadas e alertas personalizados

---

## ✨ Características Principais

### 🔐 Autenticação e Autorização
- ✅ Sistema JWT com cookies httpOnly
- ✅ Três níveis de acesso: Candidato, Empresa e Admin
- ✅ Recuperação de senha via email
- ✅ Confirmação de email obrigatória
- ✅ Proteção de rotas por role
- ✅ Sessões seguras com refresh tokens

### 👥 Gestão de Usuários
- ✅ Perfis completos para candidatos (skills, experiências, educação, idiomas)
- ✅ Perfis corporativos para empresas (CNPJ, setor, tamanho, cultura)
- ✅ Upload de fotos de perfil (Cloudinary)
- ✅ Privacidade configurável
- ✅ Sistema de verificação de perfil
- ✅ Estatísticas de visualização

### 💼 Gestão de Vagas
- ✅ Publicação ilimitada de vagas
- ✅ Categorização por área, nível e tipo
- ✅ Filtros avançados (salário, localização, tipo de contrato)
- ✅ Sistema de candidaturas com status tracking
- ✅ Vagas em destaque
- ✅ Vagas similares por IA
- ✅ Data de expiração automática

### 💬 Chat e Comunicação
- ✅ Chat em tempo real entre candidato e empresa
- ✅ Histórico completo de conversas
- ✅ Indicadores de leitura
- ✅ Anexos em mensagens
- ✅ Notificações de novas mensagens
- ✅ Arquivamento de conversas

### 📊 Dashboards e Analytics
- ✅ **Dashboard do Candidato**:
  - Total de candidaturas (enviadas, em análise, aceitas, recusadas)
  - Vagas salvas
  - Perfil de visualizações
  - Pontuação de gamificação
  - Conquistas desbloqueadas
  
- ✅ **Dashboard da Empresa**:
  - Vagas publicadas (ativas, expiradas)
  - Total de candidaturas recebidas
  - Visualizações de vagas
  - Taxa de conversão
  - Candidatos favoritos

- ✅ **Painel Administrativo**:
  - Monitoramento em tempo real
  - Estatísticas globais
  - Logs de auditoria
  - Gerenciamento de usuários
  - Moderação de conteúdo
  - Detecção de spam

### 🗺️ Geolocalização
- ✅ Busca de vagas por raio (km)
- ✅ Mapa interativo com Leaflet.js
- ✅ Clusters de vagas por região
- ✅ Geocoding de endereços brasileiros
- ✅ Cálculo de distância (fórmula de Haversine)
- ✅ Detecção de localização do usuário

### ✅ Sistema de Verificação
- ✅ **Email**: Link de confirmação com token
- ✅ **CNPJ**: Validação automática para empresas
- ✅ **Documentos**: Upload e aprovação por admin
- ✅ Badge de verificado no perfil
- ✅ Boost na visibilidade para perfis verificados

### 🏆 Gamificação
- ✅ **Sistema de Pontos**:
  - +10 por completar perfil
  - +5 por candidatura
  - +20 por verificação de email
  - +30 por verificação de documentos
  - +15 por primeira vaga publicada
  - +10 por receber avaliação positiva
  
- ✅ **Níveis**:
  - Iniciante (0-50 pontos)
  - Bronze (51-150 pontos)
  - Prata (151-300 pontos)
  - Ouro (301-500 pontos)
  - Platina (501-800 pontos)
  - Diamante (801+ pontos)
  
- ✅ **Conquistas** (8 badges):
  - Primeiro Passo
  - Verificado
  - Comunicador
  - Persistente
  - Popular
  - Profissional Completo
  - Ativo
  - Estrela Cadente

### ⭐ Sistema de Avaliações
- ✅ Candidatos avaliam empresas (ambiente, cultura, processo seletivo)
- ✅ Empresas avaliam candidatos (profissionalismo, skills, comunicação)
- ✅ Rating de 1 a 5 estrelas
- ✅ Comentários de experiência
- ✅ Moderação de avaliações (pending, approved, rejected)
- ✅ Sistema de denúncia de spam
- ✅ Média de rating calculada automaticamente

### ❤️ Favoritos e Listas
- ✅ Salvar vagas favoritas
- ✅ Marcar candidatos favoritos (empresas)
- ✅ Listas personalizadas ("Vagas Urgentes", "Top Candidatos")
- ✅ Compartilhamento de listas
- ✅ Organização por categorias

### 🛡️ Anti-Spam e Segurança
- ✅ Rate limiting por IP e usuário
- ✅ Análise de conteúdo duplicado
- ✅ Detecção de palavras spam
- ✅ Bloqueio automático após tentativas
- ✅ Blacklist de IPs
- ✅ Logs de tentativas de spam

### 📰 Sistema de Notícias
- ✅ Publicação de artigos e notícias
- ✅ Categorização
- ✅ Editor rico de conteúdo
- ✅ Newsletter por email
- ✅ Comentários (futuro)

### 📧 Sistema de Emails Automatizados
- ✅ Boas-vindas
- ✅ Confirmação de cadastro
- ✅ Recuperação de senha
- ✅ Confirmação de publicação de vaga
- ✅ Notificação de candidatura
- ✅ Alerta de vagas compatíveis
- ✅ Atualização de status
- ✅ Lembretes de perfil incompleto
- ✅ Newsletter

---

## 🏗️ Arquitetura do Sistema

O Aprendiz+ segue uma arquitetura **monolítica MVC** (Model-View-Controller) com separação clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Cliente)                    │
│                                                          │
│  HTML5 + CSS3 + JavaScript Vanilla + Leaflet.js         │
│  - Pages (Views)                                         │
│  - Scripts (Controllers no cliente)                      │
│  - Estilos (Design System)                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTP/HTTPS
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   BACKEND (Servidor)                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Express.js Router                      │ │
│  │  - routes/api.js (API REST)                        │ │
│  │  - routes/pages.js (Servir HTML)                   │ │
│  └──────────┬─────────────────────┬───────────────────┘ │
│             │                     │                      │
│  ┌──────────▼─────────┐  ┌───────▼──────────┐          │
│  │   Middleware       │  │   Controllers     │          │
│  │  - auth.js         │  │  (em routes/)     │          │
│  │  - roleCheck.js    │  │                   │          │
│  │  - upload.js       │  └───────┬───────────┘          │
│  │  - audit.js        │          │                      │
│  └────────────────────┘          │                      │
│                                  │                      │
│             ┌────────────────────▼──────────────┐       │
│             │        Models (Mongoose)          │       │
│             │  - User.js                        │       │
│             │  - Job.js                         │       │
│             │  - Application.js                 │       │
│             │  - Chat.js / Message.js           │       │
│             │  - Notification.js                │       │
│             │  - Gamification.js                │       │
│             │  - Review.js / Favorite.js        │       │
│             │  - Verification.js / AntiSpam.js  │       │
│             │  - GeoLocation.js                 │       │
│             └────────┬──────────────────────────┘       │
└──────────────────────┼───────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
┌────────▼─────────┐      ┌──────────▼────────┐
│   MongoDB         │      │  File System      │
│  - Collections    │      │  - db.json        │
│  - Indexes        │      │  - uploads/       │
│  - Aggregations   │      └───────────────────┘
└───────────────────┘
         │
         │
┌────────▼─────────────────────────────────────┐
│          Serviços Externos                   │
│  - Cloudinary (Upload de imagens)           │
│  - SMTP (Nodemailer para emails)            │
│  - TensorFlow.js (Recomendações IA)         │
└──────────────────────────────────────────────┘
```

### Fluxo de Requisição Típico

1. **Cliente** faz requisição HTTP
2. **Express** roteia para o endpoint correto
3. **Middleware** valida autenticação/autorização
4. **Controller** processa a lógica de negócio
5. **Model** interage com o banco de dados
6. **Serviços** chamam APIs externas (se necessário)
7. **Response** retorna JSON ou HTML ao cliente

---

## 🛠️ Stack Tecnológica

### Backend

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | 18.x | Runtime JavaScript |
| **Express.js** | 4.18.2 | Framework web minimalista |
| **Mongoose** | 8.0.0 | ODM para MongoDB |
| **MongoDB** | 5.x+ | Banco de dados NoSQL |
| **JWT** | 9.0.2 | Autenticação stateless |
| **bcrypt** | 5.1.1 | Hash de senhas |
| **Multer** | 1.4.5 | Upload de arquivos |
| **Cloudinary** | 2.8.0 | Armazenamento de imagens |
| **Nodemailer** | 7.0.10 | Envio de emails |
| **TensorFlow.js** | 4.22.0 | Machine Learning |
| **Natural** | 8.1.0 | Processamento de linguagem natural |

### Segurança

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Helmet** | 7.1.0 | Headers de segurança HTTP |
| **express-mongo-sanitize** | 2.2.0 | Prevenir NoSQL injection |
| **express-rate-limit** | 7.1.4 | Rate limiting |
| **express-validator** | 7.0.1 | Validação de dados |
| **cookie-parser** | 1.4.6 | Parse de cookies seguros |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **HTML5** | - | Markup semântico |
| **CSS3** | - | Estilização (variáveis CSS, Grid, Flexbox) |
| **JavaScript (Vanilla)** | ES6+ | Lógica do cliente |
| **Leaflet.js** | 1.9.x | Mapas interativos |
| **Font Awesome** | 6.x | Ícones |
| **Google Fonts** | - | Tipografia (Inter, Poppins) |

### DevOps & Ferramentas

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Webpack** | 5.102.1 | Bundler de assets |
| **Jest** | 29.7.0 | Framework de testes |
| **Supertest** | 6.3.3 | Testes de API |
| **ESLint** | 8.53.0 | Linter JavaScript |
| **Nodemon** | 3.0.1 | Auto-reload em desenvolvimento |
| **dotenv** | 16.3.1 | Gerenciamento de variáveis de ambiente |

---

## 📁 Estrutura de Diretórios

```
Aprendiz_Plus/
├── 📄 server.js                    # Entry point da aplicação
├── 📄 package.json                 # Dependências e scripts
├── 📄 .env.example                 # Template de variáveis de ambiente
├── 📄 webpack.config.js            # Configuração do Webpack
├── 📄 jsconfig.json                # Configuração do JavaScript
├── 📄 README.md                    # Documentação principal
│
├── 📁 config/                      # Configurações
│   ├── cloudinary.js               # Setup do Cloudinary
│   ├── email.js                    # Configuração SMTP
│   └── emailTemplates.js           # Templates de email HTML
│
├── 📁 middleware/                  # Middlewares Express
│   ├── auth.js                     # Verificação JWT
│   ├── roleCheck.js                # Controle de acesso por role
│   ├── upload.js                   # Configuração Multer
│   └── audit.js                    # Logging de ações
│
├── 📁 models/                      # Modelos Mongoose + File-based
│   ├── User.js                     # Modelo de usuário (MongoDB)
│   ├── Job.js                      # Modelo de vaga (MongoDB)
│   ├── Application.js              # Modelo de candidatura (MongoDB)
│   ├── News.js                     # Modelo de notícia (MongoDB)
│   ├── Upload.js                   # Modelo de upload (MongoDB)
│   ├── AuditLog.js                 # Modelo de auditoria (MongoDB)
│   ├── ContactMessage.js           # Mensagens de contato (MongoDB)
│   ├── ProfileLike.js              # Likes em perfis (MongoDB)
│   ├── JobRecommendationModel.js   # IA de recomendações (TensorFlow)
│   ├── Chat.js                     # Conversas (File-based)
│   ├── Message.js                  # Mensagens (File-based)
│   ├── Notification.js             # Notificações (File-based)
│   ├── Favorite.js                 # Favoritos (File-based)
│   ├── Review.js                   # Avaliações (File-based)
│   ├── Gamification.js             # Sistema de pontos (File-based)
│   ├── Verification.js             # Verificações (File-based)
│   ├── AntiSpam.js                 # Anti-spam (File-based)
│   └── GeoLocation.js              # Geolocalização (Utility)
│
├── 📁 routes/                      # Rotas da aplicação
│   ├── api.js                      # Endpoints REST (50+ rotas)
│   └── pages.js                    # Rotas para servir HTML
│
├── 📁 services/                    # Lógica de negócio
│   ├── emailService.js             # Envio de emails
│   └── jobAlertService.js          # Alertas de vagas
│
├── 📁 scripts/                     # Scripts utilitários
│   ├── seed.js                     # Popular banco com dados fake
│   ├── create-admin.js             # Criar usuário admin
│   ├── verify-admin.js             # Verificar admin
│   ├── test-email-system.js        # Testar sistema de email
│   ├── send-job-alerts.js          # Enviar alertas (cron job)
│   └── test-super-admin-protections.js
│
├── 📁 tests/                       # Testes automatizados
│   ├── auth.test.js                # Testes de autenticação
│   └── jobs.test.js                # Testes de vagas
│
├── 📁 data/                        # Dados persistidos
│   └── db.json                     # Banco file-based (chats, notificações, etc)
│
├── 📁 uploads/                     # Arquivos enviados pelos usuários
│   ├── profiles/                   # Fotos de perfil
│   ├── documents/                  # Documentos de verificação
│   └── attachments/                # Anexos de mensagens
│
└── 📁 public/                      # Assets estáticos (servidos pelo Express)
    │
    ├── 📁 css/                     # Folhas de estilo
    │   ├── main.css                # Estilos globais
    │   ├── variables.css           # Variáveis CSS (cores, fonts, spacing)
    │   ├── perfil-candidato.css    # Perfil do candidato
    │   ├── perfil-empresa.css      # Perfil da empresa
    │   ├── perfil-admin.css        # Painel admin
    │   ├── vagas.css               # Listagem de vagas
    │   ├── vaga-detalhes.css       # Detalhes da vaga
    │   ├── painel-empresa.css      # Dashboard empresa
    │   ├── noticias.css            # Listagem de notícias
    │   ├── news-detail.css         # Detalhes da notícia
    │   ├── upload.css              # Upload de arquivos
    │   ├── ai-assistant.css        # Assistente IA
    │   └── features.css            # Estilos das novas funcionalidades
    │
    ├── 📁 js/                      # Scripts JavaScript
    │   ├── main.js                 # Script global
    │   ├── global.js               # Funções utilitárias
    │   ├── api.js                  # Wrapper da API
    │   ├── auth.js                 # Gerenciamento de autenticação
    │   ├── login.js                # Página de login
    │   ├── register.js             # Página de cadastro
    │   ├── forgot-password.js      # Recuperação de senha
    │   ├── reset-password.js       # Resetar senha
    │   ├── perfil-candidato.js     # Perfil candidato
    │   ├── perfil-empresa.js       # Perfil empresa
    │   ├── perfil-admin.js         # Perfil admin
    │   ├── vagas.js                # Listagem de vagas
    │   ├── vagas-new.js            # Listagem de vagas (nova versão)
    │   ├── vaga-detalhes.js        # Detalhes da vaga
    │   ├── vaga-detalhes-new.js    # Detalhes da vaga (nova versão)
    │   ├── job-detail.js           # Detalhes da vaga (alternativa)
    │   ├── publicar-vaga.js        # Publicar vaga
    │   ├── publish-job.js          # Publicar vaga (alternativa)
    │   ├── painel-empresa.js       # Dashboard empresa
    │   ├── candidatos.js           # Listagem de candidatos
    │   ├── empresas.js             # Listagem de empresas
    │   ├── noticias.js             # Listagem de notícias
    │   ├── news.js                 # Listagem de notícias (alternativa)
    │   ├── news-detail.js          # Detalhes da notícia
    │   ├── contato.js              # Formulário de contato
    │   ├── admin.js                # Painel admin
    │   ├── admin-usuarios.js       # Gerenciar usuários
    │   ├── admin-noticia.js        # Gerenciar notícias
    │   ├── admin-monitoramento.js  # Monitoramento do sistema
    │   ├── upload.js               # Upload de arquivos
    │   ├── search-results.js       # Resultados de busca
    │   ├── hamburger-menu.js       # Menu hamburguer (mobile)
    │   ├── chatbot.js              # Chatbot de suporte
    │   ├── ai-assistant.js         # Assistente IA
    │   ├── ai-recommendations.js   # Recomendações IA
    │   ├── ai-recommendations-v2.js # Recomendações IA v2
    │   ├── vagas-recommendations.js # Recomendações em vagas
    │   └── features.js             # Funcionalidades extras (chat, gamificação)
    │
    ├── 📁 images/                  # Imagens estáticas
    │   ├── logo.png
    │   ├── hero-bg.jpg
    │   ├── default-avatar.png
    │   └── ...
    │
    └── 📁 pages/                   # Páginas HTML
        ├── index.html              # Landing page
        ├── login.html              # Login
        ├── register.html           # Cadastro
        ├── forgot-password.html    # Esqueci minha senha
        ├── reset-password.html     # Resetar senha
        │
        ├── perfil-candidato.html   # Perfil do candidato
        ├── perfil-empresa.html     # Perfil da empresa
        ├── perfil-admin.html       # Perfil do admin
        ├── perfil-publico-candidato.html
        ├── perfil-publico-empresa.html
        ├── perfil-publico-admin.html
        │
        ├── vagas.html              # Listagem de vagas
        ├── vaga-detalhes.html      # Detalhes da vaga
        ├── publicar-vaga.html      # Publicar vaga
        ├── mapa-vagas.html         # Mapa de vagas
        │
        ├── candidatos.html         # Listagem de candidatos
        ├── empresas.html           # Listagem de empresas
        │
        ├── dashboard-candidato.html # Dashboard do candidato
        ├── dashboard-empresa.html   # Dashboard da empresa
        ├── painel-empresa.html      # Painel da empresa
        │
        ├── chat.html               # Chat
        ├── favoritos.html          # Favoritos
        │
        ├── noticias.html           # Notícias
        ├── news.html               # Notícias (alternativa)
        ├── news-detail.html        # Detalhes da notícia
        │
        ├── contato.html            # Contato
        │
        ├── admin.html              # Painel admin
        ├── admin-panel.html        # Painel admin (alternativa)
        ├── admin-usuarios.html     # Gerenciar usuários
        ├── admin-noticia.html      # Gerenciar notícias
        ├── admin-monitoramento.html # Monitoramento
        │
        ├── upload.html             # Upload
        ├── ai-test.html            # Teste de IA
        ├── test-ai.html            # Teste de IA (alternativa)
        ├── teste-api.html          # Teste de API
        │
        ├── search-results.html     # Resultados de busca
        ├── recuperar-senha.html    # Recuperar senha
        └── 404.html                # Página não encontrada
```

---

## 🗄️ Modelos de Dados

### User (MongoDB)

## Variáveis de Ambiente

Configure o arquivo `.env` baseado em `.env.example`:

**Banco de Dados:**
- `MONGO_URI` - URL de conexão MongoDB
- `JWT_SECRET` - Chave secreta para JWT
- `NODE_ENV` - Ambiente (development/production)
- `PORT` - Porta do servidor
- `CORS_ORIGIN` - Origem permitida para CORS

**Cloudinary (Upload de Imagens):**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Email (Sistema de Notificações):**
- `EMAIL_HOST` - Servidor SMTP (ex: smtp.gmail.com)
- `EMAIL_PORT` - Porta SMTP (587 para TLS)
- `EMAIL_SECURE` - true/false
- `EMAIL_USER` - Email de envio
- `EMAIL_PASSWORD` - Senha do email (use app password para Gmail)
- `EMAIL_FROM` - Email remetente
- `EMAIL_FROM_NAME` - Nome do remetente
- `ADMIN_EMAIL` - Email do admin para receber notificações
- `APP_URL` - URL base da aplicação

## Sistema de Emails

O sistema inclui envio automático de emails para:

✅ **Autenticação:**
- Email de boas-vindas
- Confirmação de cadastro
- Recuperação de senha

✅ **Vagas e Candidaturas:**
- Confirmação de publicação de vaga
- Notificação de nova candidatura (para empresa)
- Confirmação de candidatura (para candidato)
- Atualização de status de candidatura

✅ **Alertas Inteligentes:**
- Alertas de vagas compatíveis com perfil do candidato
- Newsletter de notícias

✅ **Comunicação:**
- Formulário de contato
- Lembretes de perfil incompleto
- Notificações administrativas

### Testar Sistema de Email

```bash
node scripts/test-email-system.js
```

### Enviar Alertas de Vagas

```bash
node scripts/send-job-alerts.js
```

Para automatizar (exemplo com cron - diariamente às 9h):
```
0 9 * * * cd /path/to/Aprendiz_Plus && node scripts/send-job-alerts.js
```

Scripts importantes:
- npm run dev (nodemon)
- npm start
- npm run seed (popula DB local com dados de exemplo)
- npm test (jest)

Observações:
- O backend serve as páginas estáticas em `public/pages` e a API em `/api`.
- Uploads são armazenados em `/uploads`.
- JWT é armazenado em cookie `token` com httpOnly.

Como rodar localmente:

1. Instale dependências:

```powershell
npm install
```

2. Configure `.env` (baseado em `.env.example`).

3. Popule o banco (opcional):

```powershell
npm run seed
```

4. Inicie em modo dev:

```powershell
npm run dev
```

5. Acesse `http://localhost:3000/`.

## API Endpoints de Email

### Públicos
- `POST /api/contact` - Enviar mensagem de contato
- `GET /api/auth/confirm-email/:token` - Confirmar email

### Autenticados
- `POST /api/auth/resend-confirmation` - Reenviar confirmação de email
- `PUT /api/users/me/email-preferences` - Atualizar preferências de email
- `GET /api/job-alerts/matching-jobs` - Ver vagas compatíveis
- `POST /api/email/test` - Testar envio de email

### Admin
- `POST /api/job-alerts/send-all` - Enviar alertas para todos
- `GET /api/contact-messages` - Listar mensagens de contato
- `PUT /api/contact-messages/:id` - Atualizar mensagem
- `POST /api/news/:id/send-newsletter` - Enviar newsletter
- `POST /api/users/:id/check-profile` - Verificar perfil incompleto

## Funcionalidades Implementadas

✅ Sistema completo de autenticação (JWT)
✅ Gerenciamento de usuários (candidatos, empresas, admin)
✅ Publicação e busca de vagas
✅ Sistema de candidaturas
✅ Upload de imagens (Cloudinary)
✅ Sistema de notícias
✅ Auditoria e logs
✅ **Sistema completo de emails**
✅ **Alertas inteligentes de vagas**
✅ **Formulário de contato**
✅ **Notificações por email**
✅ **🛡️ Dono do Sistema com proteções especiais**

## 🛡️ Dono do Sistema

O sistema possui uma conta de **Dono** (Owner) com proteções especiais e permissões irrestritas.

### Proteções Implementadas:
- ❌ Não pode ser excluído por outros admins
- ❌ Não pode ser banido por outros admins
- ❌ Não pode ser suspenso por outros admins
- ❌ Não pode ter seu status alterado por outros admins
- ❌ Não pode ser editado por outros admins

### Permissões Especiais:
- ✅ Pode excluir outros administradores
- ✅ Pode banir outros administradores
- ✅ Pode suspender outros administradores
- ✅ Acesso total a todas as funcionalidades do sistema

📖 **Documentação completa**: Ver `docs/SUPER_ADMIN.md` e `docs/SUPER_ADMIN_SUMMARY.md`

**ID do Dono**: `691256819ab90a9899d0d05d`

> **⚠️ Importante**: Mantenha as credenciais do dono em segurança. Esta é a conta mais privilegiada do sistema.

