# Aprendiz+

MVP monolítico: backend Node.js/Express + frontend estático (HTML5, CSS puro, JS Vanilla).

Estrutura principal:

```
Aprendiz_Plus/
├── server.js
├── package.json
├── .env.example
├── public/
│   ├── css/
│   ├── js/
│   └── pages/
├── models/
├── routes/
├── middleware/
├── scripts/ (seed.js)
└── README.md
```

Tecnologias: Node.js, Express, Mongoose, JWT, bcrypt, Multer, Helmet, express-validator.

Variáveis de ambiente (exemplo em `.env.example`):
- MONGO_URI
- JWT_SECRET
- NODE_ENV
- PORT
- CORS_ORIGIN

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

Próximos passos sugeridos:
- Implementar envio de emails para recuperação de senha.
- Melhorar validações e tratamentos de erros.
- Completar frontend (dashboards, fluxos de publicação mais completos).

