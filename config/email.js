const nodemailer = require('nodemailer');

// Configuração do transporter
const createTransporter = () => {
  // Para produção, use um serviço SMTP real (Gmail, SendGrid, AWS SES, etc)
  // Para desenvolvimento, pode usar Ethereal (emails de teste)
  
  if (process.env.NODE_ENV === 'production') {
    // Configuração para produção (exemplo com Gmail)
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else if (process.env.EMAIL_HOST) {
    // Configuração customizada via variáveis de ambiente
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Para desenvolvimento sem configuração, criar transporter de teste
    console.log('⚠️  Usando modo de teste de email. Configure EMAIL_HOST para envios reais.');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER || 'test@ethereal.email',
        pass: process.env.EMAIL_PASSWORD || 'test123'
      }
    });
  }
};

module.exports = {
  createTransporter,
  fromEmail: process.env.EMAIL_FROM || 'noreply@aprendizmais.com.br',
  fromName: process.env.EMAIL_FROM_NAME || 'Aprendiz+'
};
