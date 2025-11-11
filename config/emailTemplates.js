/**
 * Templates de Email para o Sistema Aprendiz+
 * Todos os templates são responsivos e seguem a identidade visual
 */

const baseStyle = `
  body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f4f4;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 30px;
    text-align: center;
  }
  .header h1 {
    color: #ffffff;
    margin: 0;
    font-size: 28px;
  }
  .content {
    padding: 40px 30px;
    color: #333333;
    line-height: 1.6;
  }
  .content h2 {
    color: #667eea;
    margin-top: 0;
  }
  .button {
    display: inline-block;
    padding: 12px 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff !important;
    text-decoration: none;
    border-radius: 5px;
    margin: 20px 0;
    font-weight: bold;
  }
  .footer {
    background-color: #f8f8f8;
    padding: 20px 30px;
    text-align: center;
    color: #666666;
    font-size: 12px;
  }
  .info-box {
    background-color: #f0f4ff;
    border-left: 4px solid #667eea;
    padding: 15px;
    margin: 20px 0;
  }
  .warning-box {
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 15px;
    margin: 20px 0;
  }
`;

const emailTemplates = {
  // Template de boas-vindas
  welcome: (userName, userType) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo ao Aprendiz+</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Bem-vindo ao Aprendiz+!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${userName}!</h2>
          <p>É um prazer tê-lo(a) conosco! Seu cadastro como <strong>${userType === 'candidate' ? 'Candidato' : 'Empresa'}</strong> foi realizado com sucesso.</p>
          
          <div class="info-box">
            <strong>O que você pode fazer agora:</strong>
            <ul>
              ${userType === 'candidate' ? `
                <li>Complete seu perfil profissional</li>
                <li>Busque por vagas de aprendiz</li>
                <li>Receba recomendações personalizadas</li>
                <li>Candidate-se às vagas que mais combinam com você</li>
              ` : `
                <li>Complete o perfil da sua empresa</li>
                <li>Publique vagas de aprendiz</li>
                <li>Receba candidaturas qualificadas</li>
                <li>Gerencie seus processos seletivos</li>
              `}
            </ul>
          </div>
          
          <center>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/${userType === 'candidate' ? 'dashboard-candidato' : 'dashboard-empresa'}.html" class="button">
              Acessar Minha Conta
            </a>
          </center>
          
          <p>Se tiver dúvidas, estamos à disposição para ajudar!</p>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
          <p>Este é um email automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Template de confirmação de cadastro
  confirmEmail: (userName, confirmationToken) => {
    const confirmUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/confirm-email/${confirmationToken}`;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirme seu Email</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Confirme seu Email</h1>
        </div>
        <div class="content">
          <h2>Olá, ${userName}!</h2>
          <p>Obrigado por se cadastrar no Aprendiz+. Para ativar sua conta, precisamos confirmar seu endereço de email.</p>
          
          <center>
            <a href="${confirmUrl}" class="button">
              Confirmar Email
            </a>
          </center>
          
          <div class="warning-box">
            <strong>⏰ Este link expira em 24 horas.</strong>
          </div>
          
          <p>Se você não se cadastrou no Aprendiz+, ignore este email.</p>
          
          <p style="font-size: 12px; color: #666;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br>
            <a href="${confirmUrl}">${confirmUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `},

  // Template de recuperação de senha
  resetPassword: (userName, resetToken) => {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/pages/reset-password.html?token=${resetToken}`;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de Senha</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Recuperação de Senha</h1>
        </div>
        <div class="content">
          <h2>Olá, ${userName}!</h2>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no Aprendiz+.</p>
          
          <center>
            <a href="${resetUrl}" class="button">
              Redefinir Senha
            </a>
          </center>
          
          <div class="warning-box">
            <strong>⏰ Este link expira em 1 hora.</strong>
          </div>
          
          <p>Se você não solicitou a recuperação de senha, ignore este email. Sua senha permanecerá segura.</p>
          
          <p style="font-size: 12px; color: #666;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `},

  // Template de confirmação de publicação de vaga
  jobPublished: (companyName, jobTitle, jobId) => {
    const jobUrl = `${process.env.APP_URL || 'http://localhost:3000'}/pages/vaga-detalhes.html?id=${jobId}`;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vaga Publicada com Sucesso</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Vaga Publicada!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${companyName}!</h2>
          <p>Sua vaga foi publicada com sucesso na plataforma Aprendiz+.</p>
          
          <div class="info-box">
            <strong>Detalhes da vaga:</strong><br>
            <strong>Título:</strong> ${jobTitle}<br>
            <strong>Status:</strong> Ativa e visível para candidatos
          </div>
          
          <center>
            <a href="${jobUrl}" class="button">
              Visualizar Vaga
            </a>
          </center>
          
          <p><strong>Próximos passos:</strong></p>
          <ul>
            <li>Você receberá notificações por email a cada nova candidatura</li>
            <li>Acompanhe as candidaturas no painel da empresa</li>
            <li>Analise os perfis e entre em contato com os candidatos</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `},

  // Template de notificação de candidatura (para empresa)
  newApplication: (companyName, candidateName, jobTitle, applicationId, jobId) => {
    const applicationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/pages/painel-empresa.html?tab=candidaturas&job=${jobId}`;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Candidatura Recebida</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Nova Candidatura!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${companyName}!</h2>
          <p>Você recebeu uma nova candidatura para a vaga:</p>
          
          <div class="info-box">
            <strong>Vaga:</strong> ${jobTitle}<br>
            <strong>Candidato:</strong> ${candidateName}<br>
            <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </div>
          
          <center>
            <a href="${applicationUrl}" class="button">
              Ver Candidatura
            </a>
          </center>
          
          <p>Acesse o painel da empresa para visualizar o perfil completo do candidato e dar continuidade ao processo seletivo.</p>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `},

  // Template de alerta de vaga compatível (para candidato)
  jobAlert: (candidateName, jobs) => {
    const jobsList = jobs.map(job => `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; color: #667eea;">${job.title}</h3>
        <p style="margin: 5px 0;"><strong>Empresa:</strong> ${job.company}</p>
        <p style="margin: 5px 0;"><strong>Local:</strong> ${job.location}</p>
        <p style="margin: 5px 0;"><strong>Área:</strong> ${job.area}</p>
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/vaga-detalhes.html?id=${job.id}" 
           style="display: inline-block; margin-top: 10px; padding: 8px 20px; background-color: #667eea; color: white; text-decoration: none; border-radius: 3px;">
          Ver Detalhes
        </a>
      </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Novas Vagas Compatíveis</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Novas Vagas Para Você!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${candidateName}!</h2>
          <p>Encontramos ${jobs.length} nova${jobs.length > 1 ? 's' : ''} vaga${jobs.length > 1 ? 's' : ''} que combina${jobs.length > 1 ? 'm' : ''} com seu perfil:</p>
          
          ${jobsList}
          
          <center>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/vagas.html" class="button">
              Ver Todas as Vagas
            </a>
          </center>
          
          <div class="info-box">
            <strong>💡 Dica:</strong> Candidate-se rapidamente às vagas de seu interesse para aumentar suas chances!
          </div>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
          <p>Para parar de receber estes alertas, acesse as configurações da sua conta.</p>
        </div>
      </div>
    </body>
    </html>
  `},

  // Template de confirmação de candidatura (para candidato)
  applicationConfirmation: (candidateName, jobTitle, companyName) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Candidatura Enviada</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Candidatura Enviada!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${candidateName}!</h2>
          <p>Sua candidatura foi enviada com sucesso!</p>
          
          <div class="info-box">
            <strong>Vaga:</strong> ${jobTitle}<br>
            <strong>Empresa:</strong> ${companyName}<br>
            <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </div>
          
          <p><strong>O que acontece agora?</strong></p>
          <ul>
            <li>A empresa analisará seu perfil</li>
            <li>Se houver interesse, você será contatado</li>
            <li>Acompanhe o status no seu painel</li>
          </ul>
          
          <center>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/dashboard-candidato.html" class="button">
              Ver Minhas Candidaturas
            </a>
          </center>
          
          <p>Boa sorte! 🍀</p>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Template de formulário de contato (para admin)
  contactForm: (name, email, subject, message, phone = null) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Mensagem de Contato</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📨 Nova Mensagem de Contato</h1>
        </div>
        <div class="content">
          <h2>Você recebeu uma nova mensagem pelo formulário de contato</h2>
          
          <div class="info-box">
            <strong>Nome:</strong> ${name}<br>
            <strong>Email:</strong> <a href="mailto:${email}">${email}</a><br>
            ${phone ? `<strong>Telefone:</strong> ${phone}<br>` : ''}
            <strong>Assunto:</strong> ${subject}<br>
            <strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Mensagem:</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          
          <center>
            <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" class="button">
              Responder Email
            </a>
          </center>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Sistema de Mensagens</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Template de confirmação de contato (para usuário)
  contactConfirmation: (name) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mensagem Recebida</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Mensagem Recebida!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${name}!</h2>
          <p>Recebemos sua mensagem e agradecemos pelo contato!</p>
          
          <div class="info-box">
            <strong>Nossa equipe analisará sua mensagem e retornará em breve.</strong>
          </div>
          
          <p>Tempo médio de resposta: <strong>1-2 dias úteis</strong></p>
          
          <p>Se sua dúvida for urgente, você também pode:</p>
          <ul>
            <li>Consultar nossa seção de <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/faq.html">Perguntas Frequentes</a></li>
            <li>Acessar sua conta e usar o chat de suporte</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Template de nova notícia publicada (newsletter)
  newsPublished: (userName, news) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Notícia Publicada</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📰 Nova Notícia no Aprendiz+</h1>
        </div>
        <div class="content">
          <h2>Olá, ${userName}!</h2>
          <p>Temos conteúdo novo para você!</p>
          
          ${news.imageUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${news.imageUrl}" alt="${news.title}" style="max-width: 100%; height: auto; border-radius: 8px;">
            </div>
          ` : ''}
          
          <h3 style="color: #667eea; margin-top: 20px;">${news.title}</h3>
          
          ${news.category ? `<p><strong>Categoria:</strong> ${news.category}</p>` : ''}
          
          <p>${news.content ? news.content.substring(0, 200) + '...' : 'Leia mais sobre esta notícia em nosso portal.'}</p>
          
          <center>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/news-detail.html?id=${news.id}" class="button">
              Ler Notícia Completa
            </a>
          </center>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
          <p>Para parar de receber newsletters, acesse as configurações da sua conta.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Template de atualização de status de candidatura
  applicationStatusUpdate: (candidateName, jobTitle, companyName, status, feedback = null) => {
    const statusMessages = {
      'em-analise': {
        title: '🔍 Candidatura em Análise',
        message: 'Sua candidatura está sendo analisada pela empresa.',
        color: '#3498db'
      },
      'entrevista': {
        title: '🎯 Convocado para Entrevista!',
        message: 'Parabéns! A empresa tem interesse em conhecê-lo melhor.',
        color: '#27ae60'
      },
      'aprovado': {
        title: '🎉 Parabéns! Você foi aprovado!',
        message: 'Sua candidatura foi aprovada! A empresa entrará em contato em breve.',
        color: '#27ae60'
      },
      'rejeitado': {
        title: '😔 Candidatura não aprovada',
        message: 'Infelizmente, nesta vez sua candidatura não foi aprovada.',
        color: '#e74c3c'
      }
    };

    const statusInfo = statusMessages[status] || {
      title: '📋 Atualização de Candidatura',
      message: 'Houve uma atualização no status da sua candidatura.',
      color: '#667eea'
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Atualização de Candidatura</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: ${statusInfo.color};">
          <h1>${statusInfo.title}</h1>
        </div>
        <div class="content">
          <h2>Olá, ${candidateName}!</h2>
          <p>${statusInfo.message}</p>
          
          <div class="info-box">
            <strong>Vaga:</strong> ${jobTitle}<br>
            <strong>Empresa:</strong> ${companyName}<br>
            <strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}<br>
            <strong>Data da atualização:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </div>
          
          ${feedback ? `
            <div style="background-color: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">💬 Feedback da Empresa:</h3>
              <p style="white-space: pre-wrap;">${feedback}</p>
            </div>
          ` : ''}
          
          <center>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/dashboard-candidato.html" class="button">
              Ver Minhas Candidaturas
            </a>
          </center>
          
          ${status === 'rejeitado' ? `
            <p style="margin-top: 30px; color: #666;">
              <strong>Não desista!</strong> Continue se candidatando e melhorando seu perfil. 
              Temos certeza que a oportunidade certa está chegando! 💪
            </p>
          ` : ''}
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `},

  // Template de lembrete de perfil incompleto
  profileIncompleteReminder: (userName, userType, missingFields) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete seu Perfil</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 Complete seu Perfil!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${userName}!</h2>
          <p>Notamos que seu perfil ainda não está completo. Um perfil completo aumenta suas chances em até <strong>70%</strong>!</p>
          
          <div class="warning-box">
            <strong>⚠️ Informações faltando:</strong>
            <ul style="margin: 10px 0;">
              ${missingFields.map(field => `<li>${field}</li>`).join('')}
            </ul>
          </div>
          
          <p><strong>Benefícios de um perfil completo:</strong></p>
          <ul>
            ${userType === 'candidato' ? `
              <li>Apareça melhor nas buscas das empresas</li>
              <li>Receba recomendações mais precisas</li>
              <li>Destaque-se dos outros candidatos</li>
            ` : `
              <li>Atraia candidatos mais qualificados</li>
              <li>Ganhe credibilidade no mercado</li>
              <li>Destaque suas vagas</li>
            `}
          </ul>
          
          <center>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/${userType === 'candidato' ? 'perfil-candidato' : 'perfil-empresa'}.html" class="button">
              Completar Perfil Agora
            </a>
          </center>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Conectando jovens talentos ao mercado de trabalho</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Template de notificação para admin
  adminNotification: (title, message, actionUrl = null, actionText = null) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notificação Admin</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);">
          <h1>🔔 ${title}</h1>
        </div>
        <div class="content">
          <h2>Notificação do Sistema</h2>
          <div style="white-space: pre-wrap; background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${message}
          </div>
          
          ${actionUrl ? `
            <center>
              <a href="${actionUrl}" class="button">
                ${actionText || 'Ver Detalhes'}
              </a>
            </center>
          ` : ''}
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Data: ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
        <div class="footer">
          <p>© 2025 Aprendiz+ - Painel Administrativo</p>
        </div>
      </div>
    </body>
    </html>
  `
};

module.exports = emailTemplates;
