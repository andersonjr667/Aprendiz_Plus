const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../data/db.json');

// Modelo de Verificação
class Verification {
  static async createEmailVerification(userId, email) {
    const token = crypto.randomBytes(32).toString('hex');
    const verification = {
      id: Date.now().toString(),
      userId,
      type: 'email',
      email,
      token,
      verified: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      createdAt: new Date().toISOString()
    };

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.verifications) dbData.verifications = [];
    
    // Remover verificações antigas do mesmo usuário/tipo
    dbData.verifications = dbData.verifications.filter(v => 
      !(v.userId === userId && v.type === 'email')
    );
    
    dbData.verifications.push(verification);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return { token, verification };
  }

  static async verifyEmail(token) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const verification = dbData.verifications?.find(v => 
      v.token === token && v.type === 'email'
    );
    
    if (!verification) {
      return { success: false, error: 'Token inválido' };
    }

    if (new Date(verification.expiresAt) < new Date()) {
      return { success: false, error: 'Token expirado' };
    }

    if (verification.verified) {
      return { success: false, error: 'Email já verificado' };
    }

    // Marcar como verificado
    verification.verified = true;
    verification.verifiedAt = new Date().toISOString();

    // Atualizar usuário
    const userIndex = dbData.users?.findIndex(u => u.id === verification.userId);
    if (userIndex !== -1) {
      dbData.users[userIndex].emailVerified = true;
      dbData.users[userIndex].verifications = dbData.users[userIndex].verifications || {};
      dbData.users[userIndex].verifications.email = true;
      dbData.users[userIndex].verifications.emailVerifiedAt = new Date().toISOString();
    }

    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));

    // Adicionar pontos de gamificação
    const Gamification = require('./Gamification');
    await Gamification.addPoints(verification.userId, 'EMAIL_VERIFIED');

    return { success: true, userId: verification.userId };
  }

  static async createDocumentVerification(userId, documentType, documentData) {
    const verification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId,
      type: 'document',
      documentType, // 'cpf', 'cnpj', 'rg', 'cnh', etc
      documentNumber: documentData.number,
      documentImages: documentData.images || [],
      status: 'pending', // pending, approved, rejected
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      notes: ''
    };

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.documentVerifications) dbData.documentVerifications = [];
    
    dbData.documentVerifications.push(verification);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return verification;
  }

  static async reviewDocument(verificationId, status, reviewerId, notes = '') {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.documentVerifications?.findIndex(v => v.id === verificationId);
    
    if (index === -1) return null;

    const verification = dbData.documentVerifications[index];
    verification.status = status;
    verification.reviewedAt = new Date().toISOString();
    verification.reviewedBy = reviewerId;
    verification.notes = notes;

    // Se aprovado, atualizar usuário
    if (status === 'approved') {
      const userIndex = dbData.users?.findIndex(u => u.id === verification.userId);
      if (userIndex !== -1) {
        if (!dbData.users[userIndex].verifications) {
          dbData.users[userIndex].verifications = {};
        }
        
        if (verification.documentType === 'cnpj') {
          dbData.users[userIndex].cnpjVerified = true;
          dbData.users[userIndex].verifications.cnpj = true;
        } else {
          dbData.users[userIndex].documentVerified = true;
          dbData.users[userIndex].verifications.document = true;
        }
        
        dbData.users[userIndex].verifications[`${verification.documentType}VerifiedAt`] = new Date().toISOString();
      }

      // Adicionar pontos
      const Gamification = require('./Gamification');
      await Gamification.addPoints(verification.userId, 'DOCUMENT_VERIFIED');
    }

    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    // Notificar usuário
    const Notification = require('./Notification');
    await Notification.create({
      userId: verification.userId,
      type: 'verification',
      title: status === 'approved' ? '✓ Documento Verificado' : '✗ Verificação Rejeitada',
      message: status === 'approved' 
        ? 'Seu documento foi verificado com sucesso!'
        : `Seu documento foi rejeitado. Motivo: ${notes}`,
      metadata: { verificationId, status }
    });

    return verification;
  }

  static async getPendingVerifications(limit = 50) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.documentVerifications) return [];

    return dbData.documentVerifications
      .filter(v => v.status === 'pending')
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .slice(0, limit);
  }

  static async getUserVerifications(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const user = dbData.users?.find(u => u.id === userId);
    
    if (!user) return null;

    return {
      email: user.emailVerified || false,
      document: user.documentVerified || false,
      cnpj: user.cnpjVerified || false,
      verifications: user.verifications || {},
      pendingDocuments: dbData.documentVerifications?.filter(v => 
        v.userId === userId && v.status === 'pending'
      ) || []
    };
  }

  static async verifyCNPJ(cnpj) {
    // Remover formatação
    cnpj = cnpj.replace(/[^\d]/g, '');
    
    if (cnpj.length !== 14) return false;

    // Validação básica de CNPJ
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Cálculo dos dígitos verificadores
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result != digits.charAt(0)) return false;

    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result == digits.charAt(1);
  }
}

module.exports = Verification;
