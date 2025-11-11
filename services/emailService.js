const { createTransporter, fromEmail, fromName } = require('../config/email');
const emailTemplates = require('../config/emailTemplates');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Inicializa o transporter (lazy loading)
   */
  async getTransporter() {
    if (!this.transporter) {
      this.transporter = createTransporter();
      
      // Verificar conexão em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        try {
          await this.transporter.verify();
          console.log('✅ Servidor de email conectado');
        } catch (error) {
          console.warn('⚠️  Não foi possível conectar ao servidor de email:', error.message);
          console.warn('⚠️  Emails não serão enviados. Configure as variáveis de ambiente EMAIL_*');
        }
      }
    }
    return this.transporter;
  }

  /**
   * Método genérico para enviar email
   */
  async sendEmail(to, subject, html) {
    try {
      const transporter = await this.getTransporter();
      
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html
      };

      const info = await transporter.sendMail(mailOptions);
      
      console.log(`📧 Email enviado para ${to}: ${subject}`);
      
      // Em desenvolvimento, mostrar URL de preview (se usando Ethereal)
      if (process.env.NODE_ENV !== 'production' && info.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`🔗 Preview: ${previewUrl}`);
        }
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email de boas-vindas
   */
  async sendWelcomeEmail(user) {
    const subject = `Bem-vindo ao Aprendiz+, ${user.name}!`;
    const html = emailTemplates.welcome(user.name, user.role);
    
    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Email de confirmação de cadastro
   */
  async sendConfirmationEmail(user, confirmationToken) {
    const subject = 'Confirme seu email - Aprendiz+';
    const html = emailTemplates.confirmEmail(user.name, confirmationToken);
    
    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Email de recuperação de senha
   */
  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Recuperação de senha - Aprendiz+';
    const html = emailTemplates.resetPassword(user.name, resetToken);
    
    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Email de confirmação de publicação de vaga
   */
  async sendJobPublishedEmail(company, job) {
    const subject = `Vaga "${job.title}" publicada com sucesso!`;
    const html = emailTemplates.jobPublished(company.name, job.title, job._id);
    
    return await this.sendEmail(company.email, subject, html);
  }

  /**
   * Email de notificação de nova candidatura (para empresa)
   */
  async sendNewApplicationEmail(company, candidate, job, application) {
    const subject = `Nova candidatura para "${job.title}"`;
    const html = emailTemplates.newApplication(
      company.name,
      candidate.name,
      job.title,
      application._id,
      job._id
    );
    
    return await this.sendEmail(company.email, subject, html);
  }

  /**
   * Email de confirmação de candidatura (para candidato)
   */
  async sendApplicationConfirmationEmail(candidate, job, company) {
    const subject = 'Candidatura enviada com sucesso!';
    const html = emailTemplates.applicationConfirmation(
      candidate.name,
      job.title,
      company.name
    );
    
    return await this.sendEmail(candidate.email, subject, html);
  }

  /**
   * Email de alerta de vagas compatíveis
   */
  async sendJobAlertEmail(candidate, jobs) {
    if (!jobs || jobs.length === 0) {
      return { success: false, error: 'Nenhuma vaga para enviar' };
    }

    const subject = `${jobs.length} nova${jobs.length > 1 ? 's' : ''} vaga${jobs.length > 1 ? 's' : ''} compatível${jobs.length > 1 ? 'eis' : ''} com seu perfil!`;
    const html = emailTemplates.jobAlert(candidate.name, jobs);
    
    return await this.sendEmail(candidate.email, subject, html);
  }

  /**
   * Envia alertas em lote (útil para jobs agendados)
   */
  async sendBulkJobAlerts(candidatesWithJobs) {
    const results = [];
    
    for (const item of candidatesWithJobs) {
      const result = await this.sendJobAlertEmail(item.candidate, item.jobs);
      results.push({
        candidateId: item.candidate._id,
        email: item.candidate.email,
        ...result
      });
      
      // Pequeno delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Email de formulário de contato para admin
   */
  async sendContactFormEmail(formData) {
    const { name, email, subject, message, phone } = formData;
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    
    const emailSubject = `[Contato] ${subject}`;
    const html = emailTemplates.contactForm(name, email, subject, message, phone);
    
    return await this.sendEmail(adminEmail, emailSubject, html);
  }

  /**
   * Email de confirmação de contato para usuário
   */
  async sendContactConfirmationEmail(name, email) {
    const subject = 'Mensagem recebida - Aprendiz+';
    const html = emailTemplates.contactConfirmation(name);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * Email de nova notícia publicada (newsletter)
   */
  async sendNewsPublishedEmail(user, news) {
    const subject = `📰 Nova notícia: ${news.title}`;
    const html = emailTemplates.newsPublished(user.name, news);
    
    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Envia newsletter de notícia para todos os usuários
   */
  async sendNewsletterToAll(news, userType = null) {
    const User = require('../models/User');
    
    const query = {
      status: 'active',
      emailNotifications: { $ne: false }
    };
    
    if (userType) {
      query.type = userType;
    }
    
    const users = await User.find(query);
    const results = [];
    
    for (const user of users) {
      const result = await this.sendNewsPublishedEmail(user, news);
      results.push({
        userId: user._id,
        email: user.email,
        ...result
      });
      
      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    return results;
  }

  /**
   * Email de atualização de status de candidatura
   */
  async sendApplicationStatusUpdateEmail(candidate, job, company, status, feedback = null) {
    const subject = `Atualização de candidatura - ${job.title}`;
    const html = emailTemplates.applicationStatusUpdate(
      candidate.name,
      job.title,
      company.name,
      status,
      feedback
    );
    
    return await this.sendEmail(candidate.email, subject, html);
  }

  /**
   * Email de lembrete de perfil incompleto
   */
  async sendProfileIncompleteReminderEmail(user, missingFields) {
    const subject = 'Complete seu perfil no Aprendiz+';
    const html = emailTemplates.profileIncompleteReminder(
      user.name,
      user.type,
      missingFields
    );
    
    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Email de notificação para admin
   */
  async sendAdminNotification(title, message, actionUrl = null, actionText = null) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const subject = `[Admin] ${title}`;
    const html = emailTemplates.adminNotification(title, message, actionUrl, actionText);
    
    return await this.sendEmail(adminEmail, subject, html);
  }

  /**
   * Email de promoção a administrador
   */
  async sendAdminPromotionEmail(user) {
    const subject = '🎉 Você foi promovido a Administrador - Aprendiz+';
    const html = emailTemplates.adminPromotion(user.name);
    
    return await this.sendEmail(user.email, subject, html);
  }
}

// Exportar instância singleton
module.exports = new EmailService();
