# Aprendiz+

Novas páginas e fluxos adicionados:

- Frontend:
  - `pages/forgot-password.html` — formulário para solicitar recuperação de senha.
  - `pages/reset-password.html` — formulário para aplicar a nova senha com token.
  - `js/forgot-password.js`, `js/reset-password.js` — integração com API.

- Backend:
  - `POST /api/auth/forgot-password` — gera token (hash salvo no DB) e envia e-mail (se SMTP configurado) ou loga token.
  - `POST /api/auth/reset-password` — aplica a nova senha usando token.
  - `POST /api/auth/admin-reset-password` — endpoint protegido por `ADMIN_RESET_TOKEN` para reset manual de senha.

Requisitos para funcionamento completo:

- Banco de dados MongoDB configurado (variável `MONGODB_URI` ou `MONGO_URI`).
- Variáveis de ambiente importantes no Render / ambiente:
  - `NODE_ENV=production`
  - `MONGO_ENABLED=true`
  - `MONGODB_URI` (ou `MONGO_URI`)
  - `JWT_SECRET`
  - `COOKIE_SECRET`
  - `ADMIN_RESET_TOKEN` (chave secreta para resets administrativos)
  - `APP_URL` (ex: `https://aprendiz-plus.onrender.com`) — usado nos links de reset
  - (Opcional para envio real de e-mails) `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Deploy no Render

1. Confirme as variáveis de ambiente no painel do serviço Render.
2. No dashboard do serviço clique em "Manual Deploy" para disparar um novo deploy do branch `main`. Ou use a API do Render para criar um deploy (necessita `RENDER_API_KEY`).
3. Acompanhe os logs do build e do servidor na aba Live Logs.

Testes rápidos

- Solicitar reset (sem SMTP) — o token aparecerá nos logs do servidor:
  ```bash
  curl -X POST 'https://aprendiz-plus.onrender.com/api/auth/forgot-password' \
    -H 'Content-Type: application/json' \
    -d '{"email":"alsj1520@gmail.com"}'
  ```

- Aplicar reset com token (substitua `<token>`):
  ```bash
  curl -X POST 'https://aprendiz-plus.onrender.com/api/auth/reset-password' \
    -H 'Content-Type: application/json' \
    -d '{"email":"alsj1520@gmail.com","token":"<token>","newPassword":"NovaSenha123"}'
  ```

- Reset admin (use `ADMIN_RESET_TOKEN` como header `x-admin-token`):
  ```bash
  curl -X POST 'https://aprendiz-plus.onrender.com/api/auth/admin-reset-password' \
    -H 'Content-Type: application/json' \
    -H 'x-admin-token: <ADMIN_RESET_TOKEN>' \
    -d '{"email":"alsj1520@gmail.com","newPassword":"NovaSenha123"}'
  ```

Observações de segurança

- Não compartilhe `MONGODB_URI` ou `ADMIN_RESET_TOKEN` publicamente.
- Remova/rotacione `ADMIN_RESET_TOKEN` após uso administrativo.
- Configure SMTP para produção e remova logs de tokens quando estiver em produção.

Se quiser, eu posso criar as páginas com um layout mais integrado (cabeçalho/rodapé) e adicionar links visuais no formulário de login. Me diga se prefere que eu faça isso agora e eu atualizo os arquivos de layout.