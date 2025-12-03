const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { cpf, cnpj } = require('cpf-cnpj-validator');

const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const News = require('../models/News');
const Upload = require('../models/Upload');
const ProfileLike = require('../models/ProfileLike');
const ContactMessage = require('../models/ContactMessage');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { Favorite, FavoriteList } = require('../models/Favorite');
const Review = require('../models/Review');
const Gamification = require('../models/Gamification');
const Verification = require('../models/Verification');
const AntiSpam = require('../models/AntiSpam');
const GeoLocation = require('../models/GeoLocation');
const { logAction } = require('../middleware/audit');
const emailService = require('../services/emailService');
const jobAlertService = require('../services/jobAlertService');

// Novos modelos para funcionalidades avançadas
const SavedSearch = require('../models/SavedSearch');
const JobAlert = require('../models/JobAlert');
const Follow = require('../models/Follow');
const GitHubProfile = require('../models/GitHubProfile');
const PlatformAnalytics = require('../models/PlatformAnalytics');

const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (err) {
  console.warn('puppeteer not available; related features will be disabled', err && err.message ? err.message : err);
}

let Document, Packer, Paragraph, TextRun;
try {
  ({ Document, Packer, Paragraph, TextRun } = require('docx'));
} catch (err) {
  console.warn('docx not available; DOCX export will be disabled', err && err.message ? err.message : err);
}

// Initialize GridFS
let gfsBucket;
mongoose.connection.once('open', () => {
  gfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'resumes'
  });
  console.log('GridFS initialized for resumes');
});

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// DONO DO SISTEMA - Usuário com permissões irrestritas
const OWNER_ID = '691256819ab90a9899d0d05d';

// Função auxiliar para verificar se é o dono
// Aceita tanto um ID (string) quanto um objeto user completo
function isOwner(userOrId) {
  if (!userOrId) return false;
  
  // Se for um objeto user com a propriedade type
  if (typeof userOrId === 'object' && userOrId.type) {
    // Verifica se o type é 'owner' OU se o ID é o OWNER_ID fixo
    return userOrId.type === 'owner' || userOrId._id?.toString() === OWNER_ID;
  }
  
  // Se for apenas um ID (string)
  return userOrId.toString() === OWNER_ID;
}

// ----- AUTH -----
router.post('/auth/register',
  body('name').trim().notEmpty().withMessage('Nome eh obrigatorio'),
  body('email').isEmail().withMessage('Email invalido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter minimo 6 caracteres'),
  async (req, res) => {
    console.log('Registration request body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Registration validation failed:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, email, password, type, cpf: userCpf, cnpj: userCnpj } = req.body;
      
      // Validacao adicional
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios' });
      }
      
      // Validar CPF para candidatos
      if (type === 'candidato' && userCpf) {
        if (!cpf.isValid(userCpf)) {
          return res.status(400).json({ error: 'CPF inválido' });
        }
        // Verificar se CPF já está em uso
        const existingCpf = await User.findOne({ cpf: cpf.strip(userCpf) });
        if (existingCpf) {
          return res.status(400).json({ error: 'CPF já cadastrado' });
        }
      }
      
      // Validar CNPJ para empresas
      if (type === 'empresa' && userCnpj) {
        if (!cnpj.isValid(userCnpj)) {
          return res.status(400).json({ error: 'CNPJ inválido' });
        }
        // Verificar se CNPJ já está em uso
        const existingCnpj = await User.findOne({ cnpj: cnpj.strip(userCnpj) });
        if (existingCnpj) {
          return res.status(400).json({ error: 'CNPJ já cadastrado' });
        }
      }
      
      // Verifica se email ja existe (case-insensitive)
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        console.log('Email already exists:', email);
        return res.status(400).json({ error: 'Este email ja esta registrado' });
      }
      
      // Faz hash da senha
      const hash = await bcrypt.hash(password, 10);
      
      // Prepara dados do usuário
      const userData = { 
        name: name.trim(), 
        email: email.toLowerCase(), 
        passwordHash: hash, 
        type: type || 'candidato',
        status: 'active'
      };
      
      // Adiciona CPF ou CNPJ formatado (apenas números)
      if (type === 'candidato' && userCpf) {
        userData.cpf = cpf.strip(userCpf);
      }
      if (type === 'empresa' && userCnpj) {
        userData.cnpj = cnpj.strip(userCnpj);
      }
      
      // Processar candidateProfile se for candidato
      if (type === 'candidato' && req.body.candidateProfile) {
        userData.candidateProfile = req.body.candidateProfile;
      }
      
      // Processar companyProfile se for empresa
      if (type === 'empresa' && req.body.companyProfile) {
        userData.companyProfile = req.body.companyProfile;
      }
      
      // Adicionar skills se fornecido
      if (req.body.skills && Array.isArray(req.body.skills)) {
        userData.skills = req.body.skills;
      }
      
      // Cria novo usuario com status ativo por padrão
      const user = await User.create(userData);
      
      console.log('User created successfully:', user._id);
      
      // Log da acao
      await logAction({ 
        action: 'register', 
        userId: user._id, 
        resourceType: 'User', 
        resourceId: user._id, 
        details: { type: user.type } 
      });
      
      // Gera token de confirmação de email
      const emailToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationToken = emailToken;
      user.emailVerificationExpires = Date.now() + 24 * 3600000; // 24 horas
      await user.save();
      
      // Envia email de boas-vindas e confirmação
      try {
        await emailService.sendWelcomeEmail(user);
        await emailService.sendConfirmationEmail(user, emailToken);
      } catch (emailError) {
        console.error('Error sending welcome emails:', emailError);
        // Não bloqueia o registro se o email falhar
      }
      
      // Retorna resposta de sucesso
      res.json({ 
        ok: true,
        success: true,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          type: user.type 
        } 
      });
    } catch (err) { 
      console.error('Registration failed:', err.message); 
      res.status(500).json({ error: err.message || 'Erro ao criar conta' }); 
    }
  });

router.post('/auth/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', user ? 'yes' : 'no');
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const match = await bcrypt.compare(password, user.passwordHash);
    console.log('Password match:', match ? 'yes' : 'no');
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    
    // Check if user is banned
    if (user.status === 'banned') {
      return res.status(403).json({ 
        error: 'Sua conta foi banida e não pode fazer login',
        reason: user.banReason || 'Violação dos termos de uso',
        message: user.banMessage || '',
        banned: true
      });
    }
    
    // Check if user is suspended
    if (user.status === 'suspended') {
      // Check if suspension has expired
      if (user.suspendedUntil && new Date() > user.suspendedUntil) {
        // Suspension expired, reactivate user
        user.status = 'active';
        user.suspensionReason = undefined;
        user.suspensionMessage = undefined;
        user.suspendedAt = undefined;
        user.suspendedUntil = undefined;
        user.suspendedBy = undefined;
        await user.save();
        console.log('User suspension expired, reactivated');
      } else {
        // Still suspended
        const daysLeft = Math.ceil((new Date(user.suspendedUntil) - new Date()) / (1000 * 60 * 60 * 24));
        return res.status(403).json({ 
          error: 'Sua conta está suspensa',
          reason: user.suspensionReason || 'Comportamento inadequado',
          message: user.suspensionMessage || '',
          suspendedUntil: user.suspendedUntil,
          daysLeft: daysLeft,
          suspended: true
        });
      }
    }
    
    const token = jwt.sign({ id: user._id, type: user.type }, JWT_SECRET, { expiresIn: '7d' });
    // Set httpOnly cookie for server-side auth and also return token in response for client convenience
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, type: user.type } });
  } catch (err) { console.error('Login failed:', err.message); res.status(500).json({ error: err.message }); }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.post('/auth/forgot', body('email').isEmail(), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ ok: true }); // don't reveal if user exists
    
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetExpires = Date.now() + 3600000; // 1h
    await user.save();
    
    // Envia email de recuperação de senha
    try {
      await emailService.sendPasswordResetEmail(user, token);
      console.log('Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
    }
    
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/auth/reset', body('token').exists(), body('password').isLength({ min: 6 }), async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ resetToken: token, resetExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Confirmar email
router.get('/auth/confirm-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ 
      emailVerificationToken: token, 
      emailVerificationExpires: { $gt: Date.now() } 
    });
    
    if (!user) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Link Inválido</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Link Inválido ou Expirado</h1>
          <p>Este link de confirmação não é válido ou já expirou.</p>
          <a href="/pages/login.html">Voltar para Login</a>
        </body>
        </html>
      `);
    }
    
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Email Confirmado</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #27ae60; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1 class="success">✅ Email Confirmado com Sucesso!</h1>
        <p>Sua conta foi verificada. Agora você pode fazer login.</p>
        <a href="/pages/login.html" class="button">Fazer Login</a>
      </body>
      </html>
    `);
  } catch (err) { 
    res.status(500).send('Erro ao confirmar email'); 
  }
});

// Reenviar email de confirmação
router.post('/auth/resend-confirmation', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email já verificado' });
    }
    
    const emailToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailToken;
    user.emailVerificationExpires = Date.now() + 24 * 3600000; // 24 horas
    await user.save();
    
    await emailService.sendConfirmationEmail(user, emailToken);
    
    res.json({ ok: true, message: 'Email de confirmação reenviado' });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ----- USERS -----
// convenience endpoint for current user
router.get('/users/me', authMiddleware, async (req, res) => {
  try {
    console.log('GET /users/me - User ID:', req.user._id);
    console.log('User data:', JSON.stringify(req.user, null, 2));
    // req.user is populated by authMiddleware (already selected without passwordHash)
    res.json(req.user);
  } catch (err) { 
    console.error('GET /users/me error:', err);
    res.status(500).json({ error: err.message }); 
  }
});

// update current user profile
router.put('/users/me', authMiddleware, upload.single('profilePhoto'), async (req, res) => {
  try {
    console.log('=== PUT /users/me - Profile Update ===');
    console.log('User ID:', req.user._id);
    console.log('Request body:', req.body);
    console.log('File:', req.file ? { filename: req.file.filename, size: req.file.size } : 'No file');
    
    const updates = {};
    
    // Explicitly copy allowed fields
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.cpf) updates.cpf = req.body.cpf;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.bio !== undefined) updates.bio = req.body.bio; // Allow empty string
    
    // Company-specific fields
    if (req.body.cnpj) updates.cnpj = req.body.cnpj;
    if (req.body.website !== undefined) updates.website = req.body.website;
    if (req.body.description !== undefined) updates.description = req.body.description;
    
    // Handle profile photo upload
    if (req.file) {
      console.log('Uploading profile photo to Cloudinary...');
      
      // Upload to Cloudinary
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'aprendiz_plus/profile_photos',
            resource_type: 'image',
            public_id: `user_${req.user._id}_${Date.now()}`,
            transformation: [
              { width: 500, height: 500, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('Cloudinary upload success:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        uploadStream.end(req.file.buffer);
      });
      
      const cloudinaryResult = await uploadPromise;
      updates.profilePhotoUrl = cloudinaryResult.secure_url;
      updates.profilePhotoCloudinaryId = cloudinaryResult.public_id;
      console.log('Profile photo will be saved as:', updates.profilePhotoUrl);
    }
    
    // Parse skills if it's a JSON string
    if (req.body.skills) {
      try {
        const parsedSkills = JSON.parse(req.body.skills);
        updates.skills = Array.isArray(parsedSkills) ? parsedSkills : [];
        console.log('Parsed skills:', updates.skills);
      } catch (e) {
        // If it's not valid JSON, treat as comma-separated string
        updates.skills = req.body.skills.split(',').map(s => s.trim()).filter(s => s);
        console.log('Fallback skills parsing:', updates.skills);
      }
    }
    
    // Parse interests if it's a JSON string
    if (req.body.interests) {
      try {
        const parsedInterests = JSON.parse(req.body.interests);
        updates.interests = Array.isArray(parsedInterests) ? parsedInterests : [];
        console.log('Parsed interests:', updates.interests);
      } catch (e) {
        // If it's not valid JSON, treat as array
        updates.interests = Array.isArray(req.body.interests) ? req.body.interests : [];
        console.log('Fallback interests parsing:', updates.interests);
      }
    }
    
    console.log('Final updates to be applied:', updates);
    
    if (Object.keys(updates).length === 0) {
      console.log('No updates to apply');
      return res.json(req.user);
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { $set: updates }, 
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!user) {
      console.error('User not found after update');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User updated successfully');
    console.log('Updated user data:', JSON.stringify(user, null, 2));
    
    await logAction(req.user._id, 'profile_update', { updatedFields: Object.keys(updates) });
    
    res.json(user);
  } catch (err) { 
    console.error('PUT /users/me error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message }); 
  }
});

// applications of current candidate
router.get('/users/me/applications', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const apps = await Application.find({ candidate: req.user._id }).populate('job', 'title');
    const out = apps.map(a => ({ id: a._id, job_id: a.job ? a.job._id : null, job_title: a.job ? a.job.title : '', status: a.status, appliedAt: a.appliedAt }));
    res.json(out);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// get user resume info
router.get('/users/me/resume', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('resumeUrl updatedAt');
    res.json(user);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// upload user resume
router.post('/users/me/resume', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    if (!gfsBucket) {
      return res.status(500).json({ error: 'Sistema de armazenamento não inicializado' });
    }
    
    console.log('Uploading resume to MongoDB GridFS...');
    
    // Delete old resume if exists
    const oldUser = await User.findById(req.user._id).select('resumeFileId');
    if (oldUser && oldUser.resumeFileId) {
      try {
        await gfsBucket.delete(new mongoose.Types.ObjectId(oldUser.resumeFileId));
        console.log('Old resume deleted from GridFS');
      } catch (err) {
        console.error('Error deleting old resume:', err);
      }
    }
    
    // Upload to GridFS
    const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        userId: req.user._id,
        uploadedAt: new Date()
      }
    });
    
    // Write file buffer to GridFS
    uploadStream.end(req.file.buffer);
    
    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });
    
    const fileId = uploadStream.id;
    const resumeUrl = `/api/resumes/${fileId}`;
    
    console.log('Resume uploaded to GridFS:', fileId);
    
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { 
        resumeUrl: resumeUrl,
        resumeFileId: fileId.toString(),
        updatedAt: new Date()
      }, 
      { new: true }
    ).select('-passwordHash');
    
    await logAction(req.user._id, 'resume_upload', { 
      filename: req.file.originalname,
      gridFsFileId: fileId.toString()
    });
    
    res.json(user);
  } catch (err) { 
    console.error('Resume upload error:', err);
    res.status(500).json({ error: err.message }); 
  }
});

// Serve resume file from GridFS
router.get('/resumes/:fileId', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    
    if (!gfsBucket) {
      return res.status(500).json({ error: 'Sistema de armazenamento não inicializado' });
    }
    
    // Get file info
    const files = await gfsBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    const file = files[0];
    
    // Set headers for inline display
    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // Stream file from GridFS
    const downloadStream = gfsBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
    
  } catch (err) {
    console.error('Error serving resume:', err);
    res.status(500).json({ error: 'Erro ao carregar arquivo' });
  }
});

// Server-side PDF export: render a simple HTML resume and return PDF
router.get('/resume/pdf', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Build minimal HTML for PDF rendering
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 20px; }
          .header { display:flex; gap:16px; align-items:center; }
          .avatar { width:88px; height:88px; border-radius:50%; object-fit:cover; background:#f3f4f6; }
          h1 { margin:0; font-size:20px; }
          .muted { color:#6b7280; font-size:13px; }
          .section { margin-top:14px; }
          .skills { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
          .skill { background:#eef2ff; padding:6px 10px; border-radius:999px; font-size:12px; }
          .exp { margin-bottom:8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <img class="avatar" src="${user.profilePhotoUrl || ''}" onerror="this.style.display='none'" />
          </div>
          <div>
            <h1>${(user.name || user.email || '').replace(/</g,'&lt;')}</h1>
            <div class="muted">${(user.jobTitle || '')}</div>
            <div class="muted">${(user.location || '')}</div>
          </div>
        </div>
        ${user.summary ? `<div class="section"><strong>Resumo</strong><div>${user.summary.replace(/</g,'&lt;')}</div></div>` : ''}
        ${user.experience && user.experience.length ? `<div class="section"><strong>Experiência</strong>${user.experience.map(e=>`<div class="exp"><div><strong>${(e.title||'')}</strong> — ${(e.company||'')}</div><div class="muted">${(e.period||'')}</div><div>${(e.summary||'')}</div></div>`).join('')}</div>` : ''}
        ${user.education && user.education.length ? `<div class="section"><strong>Formação</strong>${user.education.map(ed=>`<div class="exp"><div><strong>${(ed.degree||ed.course||'')}</strong></div><div class="muted">${(ed.institution||'')}</div></div>`).join('')}</div>` : ''}
        ${user.skills && user.skills.length ? `<div class="section"><strong>Competências</strong><div class="skills">${user.skills.slice(0,40).map(s=>`<span class="skill">${s}</span>`).join('')}</div></div>` : ''}
      </body>
      </html>
    `;

    // If puppeteer is not available in this environment, return 501
    if (!puppeteer) {
      return res.status(501).json({ error: 'Geração de PDF não disponível neste ambiente (puppeteer ausente)' });
    }

    // Launch headless chrome (no sandbox flags for many environments)
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '12mm', right: '12mm' } });
    await browser.close();

    // Use user's name to create a safe filename
    const rawName = (user.name || user.email || 'Curriculo').toString();
    const safeBase = rawName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim().replace(/\s+/g, '_') || 'Curriculo';
    const pdfFilename = `Curriculo-${safeBase}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Erro gerando PDF do currículo:', err);
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

// Server-side DOCX export using docx
router.get('/resume/docx', authMiddleware, async (req, res) => {
  try {
    if (!Document || !Packer || !Paragraph || !TextRun) {
      return res.status(501).json({ error: 'Geração de DOCX não disponível neste ambiente (docx ausente)' });
    }
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const doc = new Document();
    const children = [];
    children.push(new Paragraph({ children: [ new TextRun({ text: user.name || '', bold: true, size: 32 }) ] }));
    if (user.summary) children.push(new Paragraph({ children: [ new TextRun({ text: user.summary, size: 22 }) ] }));
    if (user.experience && user.experience.length) {
      children.push(new Paragraph({ children: [ new TextRun({ text: 'Experiência', bold: true, size: 26 }) ] }));
      user.experience.slice(0,10).forEach(exp => {
        children.push(new Paragraph({ children: [ new TextRun({ text: `${exp.title || ''} — ${exp.company || ''}`, bold: false }) ] }));
        if (exp.period) children.push(new Paragraph({ children: [ new TextRun({ text: exp.period, italics: true, size: 20 }) ] }));
        if (exp.summary) children.push(new Paragraph({ children: [ new TextRun({ text: exp.summary, size: 20 }) ] }));
      });
    }
    if (user.education && user.education.length) {
      children.push(new Paragraph({ children: [ new TextRun({ text: 'Formação', bold: true, size: 26 }) ] }));
      user.education.slice(0,10).forEach(ed => {
        children.push(new Paragraph({ children: [ new TextRun({ text: `${ed.degree || ed.course || ''} — ${ed.institution || ''}`, size: 22 }) ] }));
      });
    }
    if (user.skills && user.skills.length) {
      children.push(new Paragraph({ children: [ new TextRun({ text: 'Competências', bold: true, size: 26 }) ] }));
      children.push(new Paragraph({ children: [ new TextRun({ text: (user.skills || []).slice(0,50).join(', '), size: 20 }) ] }));
    }

    doc.addSection({ children });

    const buffer = await Packer.toBuffer(doc);

    const rawName = (user.name || user.email || 'Curriculo').toString();
    const safeBase = rawName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim().replace(/\s+/g, '_') || 'Curriculo';
    const docxFilename = `Curriculo-${safeBase}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${docxFilename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Erro gerando DOCX do currículo:', err);
    res.status(500).json({ error: 'Erro ao gerar DOCX' });
  }
});

// delete user resume
router.delete('/users/me/resume', authMiddleware, async (req, res) => {
  try {
    // Get user to check if resume exists
    const user = await User.findById(req.user._id);
    
    // Delete from GridFS if fileId exists
    if (user.resumeFileId) {
      try {
        const fileId = new mongoose.Types.ObjectId(user.resumeFileId);
        await gfsBucket.delete(fileId);
        console.log('Resume deleted from GridFS:', user.resumeFileId);
      } catch (gridErr) {
        console.error('Error deleting from GridFS:', gridErr);
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { 
        $unset: { resumeUrl: 1, resumeFileId: 1 },
        updatedAt: new Date()
      }, 
      { new: true }
    ).select('-passwordHash');
    
    await logAction(req.user._id, 'resume_delete', {});
    
    res.json({ message: 'Currículo removido com sucesso' });
  } catch (err) { 
    console.error('Resume delete error:', err);
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // PROTEÇÃO: Impedir edição do dono por outros admins
    if (isOwner(id) && !isOwner(req.user._id)) {
      await logAction({
        action: 'edit_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        resourceId: id,
        details: { reason: 'Tentativa de editar o dono do sistema', blockedBy: 'system' }
      });
      return res.status(403).json({ error: 'Este usuário é o dono do sistema e não pode ser editado por outros' });
    }
    
    if (req.user._id.toString() !== id && req.user.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const updates = { ...req.body };
    
    // Upload resume to Cloudinary if file provided
    if (req.file) {
      console.log('Uploading resume to Cloudinary for user:', id);
      
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'aprendiz_plus/resumes',
            resource_type: 'raw',
            public_id: `resume_${id}_${Date.now()}`,
            format: path.extname(req.file.originalname).substring(1)
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('Cloudinary upload success:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        uploadStream.end(req.file.buffer);
      });
      
      const cloudinaryResult = await uploadPromise;
      updates.resumeUrl = cloudinaryResult.secure_url;
      updates.resumeCloudinaryId = cloudinaryResult.public_id;
    }
    
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (err) { 
    console.error('User update error:', err);
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/users', authMiddleware, roleCheck(['admin', 'empresa']), async (req, res) => {
  try {
    const q = {};
    if (req.query.type) q.type = req.query.type;
    const users = await User.find(q).select('-passwordHash');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verificar completude do perfil do candidato
router.get('/profile/completeness', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    // Campos obrigatórios e opcionais
    const requiredFields = ['name', 'email'];
    const optionalFields = ['cpf', 'phone', 'bio', 'skills', 'profilePhotoUrl', 'interests'];
    const allFields = [...requiredFields, ...optionalFields];
    const completedFields = allFields.filter(field => {
      if (field === 'skills') {
        return user.skills && user.skills.length > 0;
      }
      if (field === 'interests') {
        return user.interests && user.interests.length >= 3;
      }
      if (field === 'profilePhotoUrl') {
        return !!(user.profilePhotoUrl || user.avatarUrl);
      }
      return user[field] && user[field].toString().trim().length > 0;
    });
    const completeness = Math.round((completedFields.length / allFields.length) * 100);
    res.json({ completeness });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/responsibilities - Apenas owner pode editar responsabilidades de admins
router.patch('/users/:id/responsibilities', authMiddleware, async (req, res) => {
  try {
    // Só owner pode editar
    if (!req.user || req.user.type !== 'owner') {
      return res.status(403).json({ error: 'Apenas o proprietário pode editar responsabilidades.' });
    }
    const { id } = req.params;
    const { responsibilities } = req.body;
    if (!Array.isArray(responsibilities)) {
      return res.status(400).json({ error: 'Responsabilidades devem ser um array de strings.' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    user.responsibilities = responsibilities;
    await user.save();
    res.json({ ok: true, responsibilities: user.responsibilities });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar responsabilidades.' });
  }
});

// ----- JOBS -----
router.get('/jobs', async (req, res) => {
  try {
    const { search, location, model, page = 1, limit = 10 } = req.query;
    // Aceitar tanto 'aberta' quanto 'active' como vagas ativas
    const query = { status: { $in: ['aberta', 'active'] } };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requirements: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    if (model) {
      query.workModel = { $regex: model, $options: 'i' };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await Job.find(query)
      .populate({
        path: 'company',
        select: 'name companyProfile',
        match: excludeBannedSuspendedUsers()
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }); // Ordenar por mais recentes primeiro
    
    // Filtrar jobs onde a empresa foi excluída (banida/suspensa)
    const filteredJobs = jobs.filter(job => job.company !== null);
    
    const total = await Job.countDocuments(query);
    
    res.json({ items: jobs, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get jobs created by the logged-in company (MUST come before /jobs/:id)
router.get('/jobs/my-jobs', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    console.log('Fetching jobs for company:', req.user._id);
    
    const jobs = await Job.find({ company: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${jobs.length} jobs for company`);
    
    // Get application counts for each job
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const applicantsCount = await Application.countDocuments({ job: job._id });
        
        // Get applications with details
        const applications = await Application.find({ job: job._id })
          .populate('candidate', 'name email')
          .lean();
        
        // Format applications
        const formattedApplications = applications.map(app => ({
          ...app,
          user_name: app.candidate?.name,
          user_email: app.candidate?.email
        }));
        
        return {
          ...job,
          applicants_count: applicantsCount,
          applications: formattedApplications
        };
      })
    );
    
    res.json(jobsWithCounts);
  } catch (err) {
    console.error('Error fetching company jobs:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Job Recommendations using TensorFlow.js
// IMPORTANTE: Esta rota deve vir ANTES de /jobs/:id para evitar conflitos
// TEMPORARIAMENTE COMENTADO: Problema com TensorFlow no Windows
// const { getModel } = require('../models/JobRecommendationModel');

router.get('/jobs/ai-recommendations', authMiddleware, async (req, res) => {
  try {
    console.log('=== AI Recommendations Request (TensorFlow) ===');
    console.log('User ID:', req.user._id);
    console.log('User type:', req.user.type);
    
    // TEMPORÁRIO: Retornar aviso que o TensorFlow está desabilitado
    return res.json({
      hasRecommendations: false,
      completeness: 100,
      message: 'Recomendações de IA temporariamente indisponíveis. Configure o TensorFlow para habilitar.',
      recommendations: []
    });
    
    /* CÓDIGO ORIGINAL COMENTADO TEMPORARIAMENTE
    // Only candidates can get AI recommendations
    if (req.user.type !== 'candidato') {
      return res.status(400).json({ 
        error: 'AI recommendations are only available for candidates',
        hasRecommendations: false,
        completeness: 0,
        message: 'As recomendações de IA estão disponíveis apenas para candidatos.'
      });
    }
    
    // Get full user profile
    const user = await User.findById(req.user._id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    */
    
    /* CÓDIGO ORIGINAL COMENTADO - RESTO DA FUNÇÃO
    console.log('User profile:', {
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone,
      bio: user.bio ? 'yes' : 'no',
      skills: user.skills?.length || 0,
      interests: user.interests?.length || 0,
      profilePhotoUrl: user.profilePhotoUrl || user.avatarUrl ? 'yes' : 'no'
    });
    
    // Calculate profile completeness
    const requiredFields = ['name', 'email'];
    const optionalFields = ['cpf', 'phone', 'bio', 'skills', 'profilePhotoUrl', 'interests'];
    const allFields = [...requiredFields, ...optionalFields];
    
    const completedFields = allFields.filter(field => {
      if (field === 'skills') {
        return user.skills && user.skills.length > 0;
      }
      if (field === 'interests') {
        return user.interests && user.interests.length >= 3;
      }
      if (field === 'profilePhotoUrl') {
        return !!(user.profilePhotoUrl || user.avatarUrl);
      }
      return user[field] && user[field].toString().trim().length > 0;
    });
    
    const completeness = Math.round((completedFields.length / allFields.length) * 100);
    console.log('Profile completeness:', completeness + '%');
    
    // Only provide AI recommendations if profile is 100% complete
    if (completeness < 100) {
      return res.json({
        hasRecommendations: false,
        completeness,
        message: 'Complete seu perfil para receber recomendações personalizadas de vagas.',
        missingFields: allFields.filter(f => !completedFields.includes(f))
      });
    }
    
    // Get all active jobs
    const allJobs = await Job.find({ status: 'active' })
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(100); // Mais vagas para melhor seleção
    
    console.log('🤖 Total active jobs:', allJobs.length);
    
    if (allJobs.length === 0) {
      return res.json({
        hasRecommendations: false,
        completeness,
        message: 'Não há vagas disponíveis no momento.',
        recommendations: []
      });
    }
    
    // Get TensorFlow model and generate recommendations
    console.log('🧠 Inicializando modelo TensorFlow...');
    const model = await getModel();
    
    const userProfile = {
      bio: user.bio,
      skills: user.skills || [],
      interests: user.interests || [],
      address: user.address,
      profilePhotoUrl: user.profilePhotoUrl || user.avatarUrl
    };
    
    console.log('🔮 Gerando recomendações com Machine Learning...');
    const recommendations = await model.recommend(allJobs, userProfile, 6);
    
    console.log('✅ Recommendations found:', recommendations.length);
    
    res.json({
      hasRecommendations: true,
      completeness,
      usedTensorFlow: true,
      recommendations: recommendations.map(item => ({
        ...item.job,
        aiScore: Math.round(item.score),
        matchReasons: item.reasons
      })),
      userProfile: {
        skills: user.skills,
        interests: user.interests,
        bio: user.bio
      }
    });
    FIM DO CÓDIGO COMENTADO */
    
  } catch (err) {
    console.error('❌ AI Recommendations error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try { 
    const { id } = req.params;
    
    // Verificar se o ID é um ObjectId válido do MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID de vaga inválido' });
    }
    
    const job = await Job.findById(id).populate('company', 'name companyProfile'); 
    if (!job) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }
    
    res.json(job); 
  } catch (err) { 
    console.error('Error finding job:', err);
    res.status(500).json({ error: 'Erro interno do servidor: ' + err.message }); 
  }
});

router.post('/jobs', authMiddleware, roleCheck(['empresa']), upload.single('jobImage'), async (req, res) => {
  try {
    console.log('Creating new job...');
    const data = req.body;
    data.company = req.user._id;
    
    // Parse arrays if they come as JSON strings
    if (typeof data.requirements === 'string') {
      try {
        data.requirements = JSON.parse(data.requirements);
      } catch (e) {
        console.error('Error parsing requirements:', e);
      }
    }
    
    if (typeof data.benefits === 'string') {
      try {
        data.benefits = JSON.parse(data.benefits);
      } catch (e) {
        console.error('Error parsing benefits:', e);
      }
    }
    
    // Upload job image to Cloudinary if provided
    if (req.file) {
      console.log('Uploading job image to Cloudinary...');
      
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'aprendiz_plus/job_images',
            public_id: `job_${req.user._id}_${Date.now()}`,
            transformation: [
              { width: 1200, height: 630, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('Cloudinary upload success:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        uploadStream.end(req.file.buffer);
      });
      
      const cloudinaryResult = await uploadPromise;
      data.imageUrl = cloudinaryResult.secure_url;
      data.imageCloudinaryId = cloudinaryResult.public_id;
      console.log('Job image uploaded:', data.imageUrl);
    }
    
    const job = await Job.create(data);
    console.log('Job created successfully:', job._id);
    
    await logAction({ action: 'create_job', userId: req.user._id, resourceType: 'Job', resourceId: job._id, details: { title: job.title } });
    
    // Envia email de confirmação de publicação para a empresa
    try {
      const company = await User.findById(req.user._id);
      await emailService.sendJobPublishedEmail(company, job);
    } catch (emailError) {
      console.error('Error sending job published email:', emailError);
    }
    
    res.json(job);
  } catch (err) { 
    console.error('Error creating job:', err);
    res.status(500).json({ error: err.message }); 
  }
});

router.put('/jobs/:id', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    Object.assign(job, req.body);
    await job.save();
    res.json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update job status (active/inactive)
router.put('/jobs/:id/status', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    console.log('Updating job status:', req.params.id, req.body);
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    
    const { status } = req.body;
    if (!status || (status !== 'active' && status !== 'inactive')) {
      return res.status(400).json({ error: 'Status inválido. Use "active" ou "inactive"' });
    }
    
    job.status = status;
    await job.save();
    
    await logAction({ 
      action: 'update_job_status', 
      userId: req.user._id, 
      resourceType: 'Job', 
      resourceId: job._id, 
      details: { status: status } 
    });
    
    res.json({ ok: true, job });
  } catch (err) { 
    console.error('Error updating job status:', err);
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/jobs/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const jobs = await Job.find({ $text: { $search: q } }).limit(50);
    res.json(jobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Basic recommendations: match candidate skills with requirements
router.get('/jobs/recommendations', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const skills = (req.user.candidateProfile && req.user.candidateProfile.skills) || [];
    const jobs = await Job.find({ status: 'aberta' }).lean();
    const scored = jobs.map(j => {
      const match = j.requirements ? j.requirements.filter(r => skills.some(s => r.toLowerCase().includes(s.toLowerCase()))).length : 0;
      return { job: j, score: match };
    });
    scored.sort((a, b) => b.score - a.score);
    res.json(scored.slice(0, 20));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- APPLICATIONS -----
router.post('/jobs/:id/apply', authMiddleware, roleCheck(['candidato']), upload.single('resume'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
    
    // Check if job is active
    if (job.status !== 'active' && job.status !== 'aberta') {
      return res.status(400).json({ error: 'Esta vaga não está mais aceitando candidaturas' });
    }
    
    // Check application deadline
    if (job.applicationDeadline) {
      const deadline = new Date(job.applicationDeadline);
      const now = new Date();
      if (now > deadline) {
        return res.status(400).json({ error: 'O prazo para candidaturas desta vaga já encerrou' });
      }
    }
    
    // Check if user already applied
    const existingApplication = await Application.findOne({ 
      candidate: req.user._id, 
      job: job._id 
    });
    if (existingApplication) {
      return res.status(400).json({ error: 'Você já se candidatou a esta vaga' });
    }
    
    // Check maximum applicants limit
    if (job.maxApplicants) {
      const currentApplicants = await Application.countDocuments({ job: job._id });
      if (currentApplicants >= job.maxApplicants) {
        return res.status(400).json({ error: 'Esta vaga já atingiu o limite máximo de candidatos' });
      }
    }
    
    const app = await Application.create({ 
      candidate: req.user._id, 
      job: job._id, 
      resumeUrl: req.file ? path.join('/uploads', req.file.filename) : req.user.resumeUrl 
    });
    
    job.applications.push(app._id);
    await job.save();
    
    await logAction({ 
      action: 'apply_job', 
      userId: req.user._id, 
      resourceType: 'Application', 
      resourceId: app._id, 
      details: { jobId: job._id } 
    });
    
    // Envia emails de notificação
    try {
      const candidate = await User.findById(req.user._id);
      const company = await User.findById(job.company);
      
      // Email de confirmação para o candidato
      await emailService.sendApplicationConfirmationEmail(candidate, job, company);
      
      // Email de notificação para a empresa
      if (company && company.emailNotifications !== false) {
        await emailService.sendNewApplicationEmail(company, candidate, job, app);
      }
    } catch (emailError) {
      console.error('Error sending application emails:', emailError);
    }
    
    res.json(app);
  } catch (err) { 
    console.error('Error applying to job:', err);
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/jobs/:id/applications', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const applications = await Application.find({ job: req.params.id })
      .populate('candidate', 'name email candidateProfile resumeUrl')
      .lean();
    
    // Format applications with candidate info
    const formattedApplications = applications.map(app => ({
      ...app,
      user_name: app.candidate?.name,
      user_email: app.candidate?.email,
      candidate_name: app.candidate?.name,
      candidate_email: app.candidate?.email,
      resume_url: app.resumeUrl || app.candidate?.resumeUrl
    }));
    
    res.json(formattedApplications);
  } catch (err) { 
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: err.message }); 
  }
});

// Empresa: criar conversas para todos os candidatos aceitos em uma vaga
router.post('/jobs/:id/create-chats', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Só o dono da vaga (empresa) ou admin pode executar
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Buscar candidaturas aceitas (aceito/accepted)
    const acceptedStatuses = ['aceito', 'accepted'];
    const applications = await Application.find({ job: jobId, status: { $in: acceptedStatuses } }).lean();

    let created = 0;
    let skipped = 0;
    const details = [];

    for (const app of applications) {
      try {
        const candidateId = app.candidate;

        // Verificar se já existe chat
        const exists = await Chat.findOne({ candidateId, companyId: job.company, jobId: job._id });
        if (exists) {
          skipped += 1;
          details.push({ applicationId: app._id, status: 'skipped', reason: 'chat_exists' });
          continue;
        }

        // Criar chat
        const chat = await Chat.create({
          candidateId,
          companyId: job.company,
          jobId: job._id,
          applicationId: app._id
        });

        // Notificar candidato sobre o chat criado
        await Notification.create({
          userId: candidateId,
          type: 'chat',
          title: 'Chat disponível',
          message: `A empresa ${req.user.name} criou um chat sobre a vaga ${job.title}`,
          link: `/chat?chatId=${chat._id}`,
          metadata: { chatId: chat._id, jobId: job._id, applicationId: app._id }
        });

        created += 1;
        details.push({ applicationId: app._id, status: 'created', chatId: chat._id });
      } catch (innerErr) {
        console.error('Error creating chat for application', app._id, innerErr);
        details.push({ applicationId: app._1d, status: 'error', error: innerErr.message });
      }
    }

    res.json({ success: true, jobId: job._id, totalApplications: applications.length, created, skipped, details });
  } catch (err) {
    console.error('Error in create-chats endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/jobs/:id/applications/:appId', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const { id, appId } = req.params;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    
    const oldStatus = app.status;
    
    if (req.body.status) app.status = req.body.status;
    if (req.body.feedback) app.feedback = req.body.feedback;
    await app.save();
    
    await logAction({ action: 'update_application', userId: req.user._id, resourceType: 'Application', resourceId: app._id, details: { status: app.status } });
    
    // Envia email de atualização de status para o candidato
    if (req.body.status && req.body.status !== oldStatus) {
      try {
        const candidate = await User.findById(app.candidate);
        const company = await User.findById(job.company);
        
        if (candidate && candidate.emailNotifications !== false) {
          await emailService.sendApplicationStatusUpdateEmail(
            candidate,
            job,
            company,
            app.status,
            app.feedback
          );
        }
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }
    }
    
    res.json(app);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update application status (simplified route for frontend)
router.put('/applications/:appId/status', authMiddleware, roleCheck(['empresa', 'admin']), async (req, res) => {
  try {
    const { appId } = req.params;
    const { status, feedback } = req.body;
    
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    
    // Get the job to verify ownership
    const job = await Job.findById(app.job);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // Check if user is the job owner or admin
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const oldStatus = app.status;
    
    // Update application
    if (status) app.status = status;
    if (feedback) app.feedback = feedback;
    
    // Set responseAt when status changes to accepted or rejected
    if (status && (status === 'accepted' || status === 'rejected') && oldStatus !== status) {
      app.responseAt = new Date();
    }
    
    await app.save();
    
    await logAction({ 
      action: 'update_application', 
      userId: req.user._id, 
      resourceType: 'Application', 
      resourceId: app._id, 
      details: { status: app.status } 
    });
    
    // Send email notification to candidate
    if (status && status !== oldStatus) {
      try {
        const candidate = await User.findById(app.candidate);
        const company = await User.findById(job.company);
        
        if (candidate && candidate.emailNotifications !== false) {
          await emailService.sendApplicationStatusUpdateEmail(
            candidate,
            job,
            company,
            app.status,
            app.feedback
          );
        }
        
        // Se a candidatura foi aceita, criar chat automaticamente
        if (status === 'aceito' || status === 'accepted') {
          try {
            await Chat.findOrCreate(
              app.candidate,
              job.company,
              app.job,
              app._id
            );
            
            // Notificar ambos sobre o chat disponível
            await Notification.create({
              userId: app.candidate,
              type: 'chat',
              title: 'Chat disponível',
              message: `Você agora pode conversar com ${company.name} sobre a vaga ${job.title}`,
              link: `/chat`,
              metadata: { applicationId: app._id, jobId: app.job }
            });
            
            await Notification.create({
              userId: job.company,
              type: 'chat',
              title: 'Chat disponível',
              message: `Você agora pode conversar com ${candidate.name} sobre a vaga ${job.title}`,
              link: `/chat`,
              metadata: { applicationId: app._id, jobId: app.job }
            });
            
            console.log('Chat criado automaticamente para candidatura aceita:', appId);
          } catch (chatError) {
            console.error('Erro ao criar chat automaticamente:', chatError);
            // Não interromper o fluxo se houver erro ao criar chat
          }
        }
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }
    }
    
    res.json(app);
  } catch (err) { 
    console.error('Error updating application status:', err);
    res.status(500).json({ error: err.message }); 
  }
});

// ----- COMPANIES (convenience endpoints) -----
router.get('/companies', async (req, res) => {
  try {
    const companies = await User.find({ type: 'empresa' }).select('-passwordHash');
    res.json(companies);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/companies/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('-passwordHash');
    if (!u || u.type !== 'empresa') return res.status(404).json({ error: 'Not found' });
    res.json(u);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/companies/me', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try { res.json(req.user); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/companies/me/jobs', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const jobs = await Job.find({ company: req.user._id });
    res.json(jobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- NEWS -----
router.get('/news', async (req, res) => {
  try { 
    const news = await News.find()
      .populate({
        path: 'author',
        select: 'name',
        match: excludeBannedSuspendedUsers()
      })
      .sort({ createdAt: -1 }); 
    
    // Filtrar notícias onde o autor foi banido/suspenso
    const filteredNews = news.filter(n => n.author !== null);
    
    res.json(filteredNews); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

router.post('/news', authMiddleware, roleCheck(['admin','empresa']), upload.single('image'), async (req, res) => {
  try {
    const data = req.body;
    
    // Upload image to Cloudinary if provided
    if (req.file) {
      console.log('Uploading news image to Cloudinary...');
      
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'aprendiz_plus/news',
            resource_type: 'image',
            public_id: `news_${Date.now()}`,
            transformation: [
              { width: 1200, height: 630, crop: 'fill' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('Cloudinary upload success:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        uploadStream.end(req.file.buffer);
      });
      
      const cloudinaryResult = await uploadPromise;
      data.imageUrl = cloudinaryResult.secure_url;
      data.imageCloudinaryId = cloudinaryResult.public_id;
    }
    
    data.author = req.user._id;
    const n = await News.create(data);
    const populatedNews = await News.findById(n._id).populate('author', 'name');
    
    // Envia newsletter para usuários interessados (opcional, pode ser feito via job agendado)
    // Para não bloquear a resposta, fazemos isso em background
    if (data.sendNewsletter === 'true' || data.sendNewsletter === true) {
      setImmediate(async () => {
        try {
          await emailService.sendNewsletterToAll(populatedNews, data.targetAudience);
          console.log('Newsletter enviada para notícia:', populatedNews.title);
        } catch (emailError) {
          console.error('Erro ao enviar newsletter:', emailError);
        }
      });
    }
    
    res.json(populatedNews);
  } catch (err) { 
    console.error('News creation error:', err);
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/news/:id', async (req, res) => { 
  try { 
    const n = await News.findById(req.params.id).populate('author', 'name'); 
    if (!n) return res.status(404).json({ error: 'Not found' }); 
    res.json(n); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } 
});

// ----- COMMENTS -----
const Comment = require('../models/Comment');

// Get comments for a target (news or job)
router.get('/comments/:targetType/:targetId', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    
    if (!['news', 'job'].includes(targetType)) {
      return res.status(400).json({ error: 'Tipo de alvo inválido. Use "news" ou "job"' });
    }
    
    const query = { 
      targetType, 
      targetId, 
      status: 'approved',
      parentComment: null // Only top-level comments
    };
    
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      mostLiked: { likesCount: -1, createdAt: -1 }
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const comments = await Comment.find(query)
      .populate('author', 'name profilePhotoUrl type')
      .populate({
        path: 'replies',
        populate: { path: 'author', select: 'name profilePhotoUrl type' },
        options: { sort: { createdAt: 1 } }
      })
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Comment.countDocuments(query);
    
    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new comment
router.post('/comments', authMiddleware, async (req, res) => {
  try {
    const { targetType, targetId, content, parentComment } = req.body;
    const userId = req.user._id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }
    
    if (!['news', 'job'].includes(targetType)) {
      return res.status(400).json({ error: 'Tipo de alvo inválido. Use "news" ou "job"' });
    }
    
    // Check if target exists
    let targetModel;
    if (targetType === 'news') {
      targetModel = News;
    } else if (targetType === 'job') {
      targetModel = Job;
    }
    
    const target = await targetModel.findById(targetId);
    if (!target) {
      return res.status(404).json({ error: 'Alvo não encontrado' });
    }
    
    // Check anti-spam
    const spamCheck = await AntiSpam.checkRateLimit(userId.toString(), 'comment');
    if (!spamCheck.allowed) {
      return res.status(429).json({ error: spamCheck.reason });
    }
    
    const contentCheck = await AntiSpam.checkContentSpam(content, userId.toString());
    if (contentCheck.isSpam) {
      return res.status(400).json({ 
        error: 'Conteúdo identificado como spam', 
        reasons: contentCheck.reasons 
      });
    }
    
    // Check if replying to a valid comment
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({ error: 'Comentário pai não encontrado' });
      }
      if (parent.targetType !== targetType || parent.targetId.toString() !== targetId) {
        return res.status(400).json({ error: 'Comentário pai não pertence ao mesmo alvo' });
      }
    }
    
    // Create comment
    const comment = await Comment.create({
      author: userId,
      targetType,
      targetId,
      content: content.trim(),
      parentComment: parentComment || null,
      status: 'approved' // Auto-approve for now, could be moderated later
    });
    
    // Populate author info
    await comment.populate('author', 'name profilePhotoUrl type');
    
    // Log action
    await logAction({
      action: 'create_comment',
      userId: userId,
      resourceType: 'Comment',
      resourceId: comment._id,
      details: { targetType, targetId, contentLength: content.length }
    });
    
    res.json(comment);
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a comment (only by author)
router.put('/comments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }
    
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    
    // Check ownership
    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Você só pode editar seus próprios comentários' });
    }
    
    // Check if comment is too old (e.g., 24 hours)
    const hoursSinceCreation = (Date.now() - comment.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({ error: 'Comentários só podem ser editados nas primeiras 24 horas' });
    }
    
    // Check anti-spam for edit
    const contentCheck = await AntiSpam.checkContentSpam(content, userId.toString());
    if (contentCheck.isSpam) {
      return res.status(400).json({ 
        error: 'Conteúdo identificado como spam', 
        reasons: contentCheck.reasons 
      });
    }
    
    comment.content = content.trim();
    comment.editedAt = new Date();
    await comment.save();
    
    await comment.populate('author', 'name profilePhotoUrl type');
    
    await logAction({
      action: 'update_comment',
      userId: userId,
      resourceType: 'Comment',
      resourceId: comment._id,
      details: { contentLength: content.length }
    });
    
    res.json(comment);
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment (only by author or admin)
router.delete('/comments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userType = req.user.type;
    
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    
    // Check ownership or admin permissions
    const isAuthor = comment.author.toString() === userId.toString();
    const isAdmin = userType === 'admin';
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Você só pode excluir seus próprios comentários' });
    }
    
    // Soft delete by marking as deleted
    comment.status = 'deleted';
    comment.deletedAt = new Date();
    comment.deletedBy = userId;
    await comment.save();
    
    await logAction({
      action: 'delete_comment',
      userId: userId,
      resourceType: 'Comment',
      userId: userId,
      resourceType: 'Comment',
      resourceId: comment._id,
      details: { reason: 'user_deleted' }
    });
    
    res.json({ message: 'Comentário excluído com sucesso' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Like/Unlike a comment
router.post('/comments/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    
    if (comment.status !== 'approved') {
      return res.status(400).json({ error: 'Não é possível curtir este comentário' });
    }
    
    // Check if already liked
    const existingLike = comment.likes.find(like => like.user.toString() === userId.toString());
    
    if (existingLike) {
      // Unlike: remove the like
      comment.likes = comment.likes.filter(like => like.user.toString() !== userId.toString());
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();
      
      res.json({ 
        liked: false, 
        likesCount: comment.likesCount,
        message: 'Curtida removida' 
      });
    } else {
      // Like: add the like
      comment.likes.push({ user: userId, likedAt: new Date() });
      comment.likesCount += 1;
      await comment.save();
      
      res.json({ 
        liked: true, 
        likesCount: comment.likesCount,
        message: 'Comentário curtido' 
      });
    }
  } catch (err) {
    console.error('Error liking comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Report a comment (for moderation)
router.post('/comments/:id/report', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    
    // Check if already reported by this user
    const existingReport = comment.reports.find(report => report.reportedBy.toString() === userId.toString());
    if (existingReport) {
      return res.status(400).json({ error: 'Você já denunciou este comentário' });
    }
    
    // Add report
    comment.reports.push({
      reportedBy: userId,
      reason: reason || 'Conteúdo inadequado',
      reportedAt: new Date()
    });
    
    // If too many reports, mark for moderation
    if (comment.reports.length >= 3) {
      comment.status = 'pending_moderation';
    }
    
    await comment.save();
    
    await logAction({
      action: 'report_comment',
      userId: userId,
      resourceType: 'Comment',
      resourceId: comment._id,
      details: { reason: reason || 'Conteúdo inadequado' }
    });
    
    res.json({ message: 'Comentário denunciado para moderação' });
  } catch (err) {
    console.error('Error reporting comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get pending comments for moderation (admin only)
router.get('/comments/pending/moderation', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const comments = await Comment.find({ status: 'pending_moderation' })
      .populate('author', 'name email type')
      .populate('targetId', 'title', 'News') // Try to populate title from News
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(comments);
  } catch (err) {
    console.error('Error fetching pending comments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Moderate a comment (admin only)
router.put('/comments/:id/moderate', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, moderatorNotes } = req.body;
    
    if (!['approved', 'rejected', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    
    comment.status = status;
    comment.moderatedAt = new Date();
    comment.moderatedBy = req.user._id;
    comment.moderatorNotes = moderatorNotes;
    
    await comment.save();
    
    await logAction({
      action: 'moderate_comment',
      userId: req.user._id,
      resourceType: 'Comment',
      resourceId: comment._id,
      details: { status, moderatorNotes }
    });
    
    res.json(comment);
  } catch (err) {
    console.error('Error moderating comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- AUDIT LOGS -----
router.get('/logs', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name email type')
      .lean();
    
    // Add user info to logs
    const logsWithUserInfo = logs.map(log => ({
      ...log,
      userName: log.userId?.name || 'Sistema',
      userEmail: log.userId?.email || '',
      userType: log.userId?.type || 'system',
      createdAt: log.timestamp
    }));
    
    res.json(logsWithUserInfo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- FILE UPLOAD WITH CLOUDINARY -----
// Configure multer for memory storage
const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedDocs = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedTypes = [...allowedImages, ...allowedDocs];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use: jpg, jpeg, png, webp, pdf, docx, txt'));
    }
  }
});

// Upload endpoint
router.post('/upload', authMiddleware, uploadMiddleware.single('file'), async (req, res) => {
  try {
    console.log('=== File Upload Request ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    console.log('File received:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // Determine file type
    const isImage = req.file.mimetype.startsWith('image/');
    const fileType = isImage ? 'image' : 'document';
    
    // Upload to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `aprendiz_plus/${fileType}s`,
          resource_type: isImage ? 'image' : 'raw',
          public_id: `${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, '')}`,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload success:', result.secure_url);
            resolve(result);
          }
        }
      );
      
      uploadStream.end(req.file.buffer);
    });
    
    const cloudinaryResult = await uploadPromise;
    
    // Save upload info to MongoDB
    const uploadDoc = await Upload.create({
      userId: req.user._id,
      fileName: cloudinaryResult.public_id,
      originalName: req.file.originalname,
      fileUrl: cloudinaryResult.secure_url,
      fileType: fileType,
      mimeType: req.file.mimetype,
      size: req.file.size,
      cloudinaryId: cloudinaryResult.public_id
    });
    
    console.log('Upload saved to MongoDB:', uploadDoc._id);
    
    // Log action
    await logAction(req.user._id, 'file_upload', {
      uploadId: uploadDoc._id,
      fileName: req.file.originalname,
      fileType: fileType
    });
    
    res.json({
      success: true,
      message: 'Arquivo enviado com sucesso!',
      data: {
        id: uploadDoc._id,
        fileName: uploadDoc.originalName,
        fileUrl: uploadDoc.fileUrl,
        fileType: uploadDoc.fileType,
        size: uploadDoc.size,
        uploadedAt: uploadDoc.uploadedAt
      }
    });
    
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: err.message || 'Erro ao fazer upload do arquivo' 
    });
  }
});

// Get user uploads
router.get('/uploads', authMiddleware, async (req, res) => {
  try {
    const uploads = await Upload.find({ userId: req.user._id })
      .sort({ uploadedAt: -1 })
      .limit(50);
    
    res.json(uploads);
  } catch (err) {
    console.error('Error fetching uploads:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete upload
router.delete('/uploads/:id', authMiddleware, async (req, res) => {
  try {
    const upload = await Upload.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!upload) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Delete from Cloudinary
    await cloudinary.uploader.destroy(upload.cloudinaryId, {
      resource_type: upload.fileType === 'image' ? 'image' : 'raw'
    });
    
    // Delete from MongoDB
    await Upload.deleteOne({ _id: req.params.id });
    
    await logAction(req.user._id, 'file_delete', {
      fileName: upload.originalName
    });
    
    res.json({ success: true, message: 'Arquivo excluído com sucesso' });
  } catch (err) {
    console.error('Error deleting upload:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- PUBLIC PROFILES -----
// Get public profile (candidato) - WITHOUT sensitive data
router.get('/profiles/candidato/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -cpf -resetToken -resetExpires');
    
    if (!user) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }
    
    if (user.type !== 'candidato') {
      return res.status(400).json({ error: 'Este não é um perfil de candidato' });
    }
    
    // Verificar se usuário está banido ou suspenso
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }
    
    // Get likes count
    const likesCount = await ProfileLike.countDocuments({ profileUser: user._id });
    
    // Return public data only (no CPF, no sensitive info)
    const publicProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      skills: user.skills,
      interests: user.interests,
      profilePhotoUrl: user.profilePhotoUrl || user.avatarUrl,
      createdAt: user.createdAt,
      likesCount: likesCount
    };
    
    res.json(publicProfile);
  } catch (err) {
    console.error('Error fetching public profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get public profile (empresa) - WITHOUT sensitive data
router.get('/profiles/empresa/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -cnpj -resetToken -resetExpires');
    
    if (!user) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }
    
    if (user.type !== 'empresa') {
      return res.status(400).json({ error: 'Este não é um perfil de empresa' });
    }
    
    // Verificar se usuário está banido ou suspenso
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }
    
    // Get likes count
    const likesCount = await ProfileLike.countDocuments({ profileUser: user._id });
    
    // Get active jobs count
    const jobsCount = await Job.countDocuments({ company: user._id, status: 'active' });
    
    // Return public data only (no CNPJ, no sensitive info)
    const publicProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      description: user.description,
      website: user.website,
      profilePhotoUrl: user.profilePhotoUrl || user.avatarUrl,
      createdAt: user.createdAt,
      likesCount: likesCount,
      activeJobsCount: jobsCount
    };
    
    res.json(publicProfile);
  } catch (err) {
    console.error('Error fetching public profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- PROFILE LIKES -----
// Like a profile
router.post('/profiles/:id/like', authMiddleware, async (req, res) => {
  try {
    const profileUserId = req.params.id;
    const likerId = req.user._id;
    
    // Check if user is trying to like their own profile
    if (profileUserId === likerId.toString()) {
      return res.status(400).json({ error: 'Você não pode curtir seu próprio perfil' });
    }
    
    // Check if profile exists
    const profileUser = await User.findById(profileUserId);
    if (!profileUser) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }
    
    // Check if already liked
    const existingLike = await ProfileLike.findOne({ 
      liker: likerId, 
      profileUser: profileUserId 
    });
    
    if (existingLike) {
      return res.status(400).json({ error: 'Você já curtiu este perfil' });
    }
    
    // Create like
    const like = await ProfileLike.create({
      liker: likerId,
      profileUser: profileUserId
    });
    
    // Get updated likes count
    const likesCount = await ProfileLike.countDocuments({ profileUser: profileUserId });
    
    await logAction(likerId, 'profile_like', { 
      profileUserId: profileUserId,
      profileUserName: profileUser.name
    });
    
    res.json({ 
      success: true, 
      message: 'Perfil curtido com sucesso',
      likesCount: likesCount
    });
  } catch (err) {
    console.error('Error liking profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Unlike a profile
router.delete('/profiles/:id/unlike', authMiddleware, async (req, res) => {
  try {
    const profileUserId = req.params.id;
    const likerId = req.user._id;
    
    // Find and delete like
    const result = await ProfileLike.findOneAndDelete({ 
      liker: likerId, 
      profileUser: profileUserId 
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Curtida não encontrada' });
    }
    
    // Get updated likes count
    const likesCount = await ProfileLike.countDocuments({ profileUser: profileUserId });
    
    await logAction(likerId, 'profile_unlike', { 
      profileUserId: profileUserId
    });
    
    res.json({ 
      success: true, 
      message: 'Curtida removida com sucesso',
      likesCount: likesCount
    });
  } catch (err) {
    console.error('Error unliking profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check if current user liked a profile
router.get('/profiles/:id/liked', authMiddleware, async (req, res) => {
  try {
    const profileUserId = req.params.id;
    const likerId = req.user._id;
    
    const like = await ProfileLike.findOne({ 
      liker: likerId, 
      profileUser: profileUserId 
    });
    
    const likesCount = await ProfileLike.countDocuments({ profileUser: profileUserId });
    
    res.json({ 
      liked: !!like,
      likesCount: likesCount
    });
  } catch (err) {
    console.error('Error checking like status:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- ADMIN ROUTES -----

// Get user by ID for public profile
router.get('/users/:id/public', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -resetToken -resetExpires');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user status (activate/deactivate)
router.put('/users/:id/status', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    // PROTEÇÃO: Impedir mudança de status do dono
    if (isOwner(userId) && !isOwner(req.user._id)) {
      await logAction({
        action: 'status_change_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        resourceId: userId,
        details: { reason: 'Tentativa de alterar status do dono do sistema', blockedBy: 'system' }
      });
      return res.status(403).json({ error: 'Este usuário é o dono do sistema e não pode ter seu status alterado' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    await logAction({
      action: 'update',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: user._id,
      details: { status }
    });
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason, message } = req.body;
    
    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }
    
    // PROTEÇÃO: Impedir exclusão do dono
    if (isOwner(userId)) {
      await logAction({
        action: 'delete_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        resourceId: userId,
        details: { reason: 'Tentativa de excluir o dono do sistema', blockedBy: 'system' }
      });
      return res.status(403).json({ error: 'Este usuário é o dono do sistema e não pode ser excluído' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Prevent deleting other admins (unless you are owner)
    if (user.type === 'admin' && !isOwner(req.user._id)) {
      return res.status(403).json({ error: 'Não é possível excluir outros administradores' });
    }
    
    // Delete user's applications
    await Application.deleteMany({ user: userId });
    
    // Delete user's jobs if company
    if (user.type === 'empresa') {
      await Job.deleteMany({ company: userId });
    }
    
    // Delete user's profile likes
    await ProfileLike.deleteMany({ $or: [{ liker: userId }, { profileUser: userId }] });
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    await logAction({
      action: 'delete',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: userId,
      details: { 
        userName: user.name, 
        userType: user.type,
        reason: reason || 'Não especificado',
        message: message || ''
      }
    });
    
    res.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete job (admin only)
router.delete('/jobs/:id', authMiddleware, roleCheck(['admin', 'empresa']), async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }
    
    // Companies can only delete their own jobs
    if (req.user.type === 'empresa' && job.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir esta vaga' });
    }
    
    // Delete related comments (cascade delete)
    await Comment.deleteMany({ targetType: 'job', targetId: jobId });
    
    // Delete job applications
    await Application.deleteMany({ job: jobId });
    
    // Delete job
    await Job.findByIdAndDelete(jobId);
    
    await logAction({
      action: 'delete',
      userId: req.user._id,
      resourceType: 'Job',
      resourceId: jobId,
      details: { jobTitle: job.title }
    });
    
    res.json({ success: true, message: 'Vaga, candidaturas e comentários relacionados excluídos com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete news (admin only)
router.delete('/news/:id', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const newsId = req.params.id;
    const news = await News.findById(newsId);
    
    if (!news) {
      return res.status(404).json({ error: 'Notícia não encontrada' });
    }
    
    // Delete related comments (cascade delete)
    await Comment.deleteMany({ targetType: 'news', targetId: newsId });
    
    // Delete news
    await News.findByIdAndDelete(newsId);
    
    await logAction({
      action: 'delete',
      userId: req.user._id,
      resourceType: 'News',
      resourceId: newsId,
      details: { newsTitle: news.title }
    });
    
    res.json({ success: true, message: 'Notícia e comentários relacionados excluídos com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my applications (candidate)
router.get('/applications/me', authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user._id })
      .populate({
        path: 'job',
        select: 'title company location salary type',
        populate: {
          path: 'company',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // Format applications
    const formattedApplications = applications.map(app => ({
      ...app,
      jobTitle: app.job?.title,
      companyName: app.job?.company?.name,
      jobId: app.job?._id
    }));
    
    res.json(formattedApplications);
  } catch (err) {
    console.error('Error fetching candidate applications:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all applications (admin only)
router.get('/applications/all', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const applications = await Application.find()
      .populate({
        path: 'candidate',
        select: 'name email',
        match: excludeBannedSuspendedUsers()
      })
      .populate({
        path: 'job',
        select: 'title',
        populate: {
          path: 'company',
          select: 'name',
          match: excludeBannedSuspendedUsers()
        }
      })
      .sort({ createdAt: -1 });
    
    // Filtrar aplicações onde candidato ou empresa foi banido/suspenso
    const filteredApplications = applications.filter(app => 
      app.candidate !== null && app.job.company !== null
    );
    
    res.json(filteredApplications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get applications for the logged-in company (company dashboard)
router.get('/applications/company', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    // Find jobs owned by this company
    const jobs = await Job.find({ company: req.user._id }).select('_id title');
    const jobIds = jobs.map(j => j._id);

    if (jobIds.length === 0) return res.json([]);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate('candidate', 'name email')
      .populate('job', 'title')
      .sort({ appliedAt: -1 })
      .lean();

    const formatted = applications.map(app => ({
      ...app,
      user_name: app.candidate?.name,
      user_email: app.candidate?.email,
      job_title: app.job?.title,
      job_id: app.job?._id
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching company applications:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- ANALYTICS & REPORTS -----

// Get analytics for company applications
router.get('/analytics/applications/:companyId', authMiddleware, roleCheck(['empresa', 'admin']), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { period = '30' } = req.query; // days
    
    // Check permissions
    if (req.user.type === 'empresa' && req.user._id.toString() !== companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get jobs for this company
    const jobs = await Job.find({ company: companyId });
    const jobIds = jobs.map(job => job._id);
    
    // Get applications for these jobs
    const applications = await Application.find({
      job: { $in: jobIds },
      appliedAt: { $gte: new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000) }
    }).populate('job', 'title').populate('candidate', 'name');
    
    // Calculate metrics
    const totalApplications = applications.length;
    const pendingApplications = applications.filter(app => app.status === 'pending').length;
    const acceptedApplications = applications.filter(app => app.status === 'accepted').length;
    const rejectedApplications = applications.filter(app => app.status === 'rejected').length;
    
    // Conversion rate
    const conversionRate = totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0;
    
    // Average response time
    const respondedApplications = applications.filter(app => app.responseAt);
    const avgResponseTime = respondedApplications.length > 0 
      ? respondedApplications.reduce((sum, app) => {
          return sum + (app.responseAt - app.appliedAt);
        }, 0) / respondedApplications.length / (1000 * 60 * 60) // in hours
      : null;
    
    // Applications by job
    const applicationsByJob = jobs.map(job => {
      const jobApps = applications.filter(app => app.job._id.toString() === job._id.toString());
      return {
        jobId: job._id,
        jobTitle: job.title,
        total: jobApps.length,
        pending: jobApps.filter(app => app.status === 'pending').length,
        accepted: jobApps.filter(app => app.status === 'accepted').length,
        rejected: jobApps.filter(app => app.status === 'rejected').length
      };
    });
    
    // Daily applications trend (last 30 days)
    const dailyTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayApplications = applications.filter(app => 
        app.appliedAt >= dayStart && app.appliedAt <= dayEnd
      );
      
      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayApplications.length
      });
    }
    
    res.json({
      summary: {
        totalApplications,
        pendingApplications,
        acceptedApplications,
        rejectedApplications,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgResponseTime: avgResponseTime ? Math.round(avgResponseTime * 100) / 100 : null
      },
      applicationsByJob,
      dailyTrend,
      period: `${period} days`
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export applications data as CSV
router.get('/analytics/export/:companyId', authMiddleware, roleCheck(['empresa', 'admin']), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { format = 'csv', period = '30' } = req.query;
    
    // Check permissions
    if (req.user.type === 'empresa' && req.user._id.toString() !== companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get jobs for this company
    const jobs = await Job.find({ company: companyId });
    const jobIds = jobs.map(job => job._id);
    
    // Get applications
    const applications = await Application.find({
      job: { $in: jobIds },
      appliedAt: { $gte: new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000) }
    })
    .populate('job', 'title')
    .populate('candidate', 'name email phone')
    .sort({ appliedAt: -1 });
    
    // Prepare data for export
    const exportData = applications.map(app => ({
      'Data da Candidatura': app.appliedAt.toLocaleDateString('pt-BR'),
      'Nome do Candidato': app.candidate?.name || 'N/A',
      'Email do Candidato': app.candidate?.email || 'N/A',
      'Telefone do Candidato': app.candidate?.phone || 'N/A',
      'Vaga': app.job?.title || 'N/A',
      'Status': app.status === 'pending' ? 'Pendente' : 
                app.status === 'accepted' ? 'Aceita' : 
                app.status === 'rejected' ? 'Rejeitada' : app.status,
      'Data da Resposta': app.responseAt ? app.responseAt.toLocaleDateString('pt-BR') : 'N/A',
      'Feedback': app.feedback || 'N/A'
    }));
    
    if (format === 'csv') {
      const { Parser } = require('json2csv');
      const parser = new Parser();
      const csv = parser.parse(exportData);
      
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename=candidaturas_${companyId}_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({ error: 'Formato não suportado. Use csv.' });
    }
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user password
router.put('/users/me/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }
    
    // Get user with password hash
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    
    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.passwordHash = hash;
    await user.save();
    
    await logAction({
      action: 'update',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: req.user._id,
      details: { field: 'password' }
    });
    
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ban user (admin only)
router.post('/users/:id/ban', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { reason, message } = req.body;
    const userId = req.params.id;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Você não pode banir sua própria conta' });
    }
    
    // PROTEÇÃO: Impedir banimento do dono
    if (isOwner(userId)) {
      await logAction({
        action: 'ban_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        resourceId: userId,
        details: { reason: 'Tentativa de banir o dono do sistema', blockedBy: 'system' }
      });
      return res.status(403).json({ error: 'Este usuário é o dono do sistema e não pode ser banido' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Prevent banning other admins (unless you are owner)
    if (user.type === 'admin' && !isOwner(req.user._id)) {
      return res.status(403).json({ error: 'Não é possível banir outros administradores' });
    }
    
    user.status = 'banned';
    user.banReason = reason || 'Violação dos termos de uso';
    user.banMessage = message || '';
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    
    await user.save();
    
    await logAction({
      action: 'ban',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: userId,
      details: { reason, message, userName: user.name }
    });
    
    res.json({ success: true, message: 'Usuário banido com sucesso', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kick user (admin only) - temporary suspension
router.post('/users/:id/kick', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { reason, message, duration } = req.body; // duration in days
    const userId = req.params.id;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Você não pode expulsar sua própria conta' });
    }
    
    // PROTEÇÃO: Impedir suspensão do dono
    if (isOwner(userId)) {
      await logAction({
        action: 'kick_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        resourceId: userId,
        details: { reason: 'Tentativa de suspender o dono do sistema', blockedBy: 'system' }
      });
      return res.status(403).json({ error: 'Este usuário é o dono do sistema e não pode ser suspenso' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Prevent kicking other admins (unless you are owner)
    if (user.type === 'admin' && !isOwner(req.user._id)) {
      return res.status(403).json({ error: 'Não é possível expulsar outros administradores' });
    }
    
    const kickDuration = parseInt(duration) || 7; // default 7 days
    const kickUntil = new Date();
    kickUntil.setDate(kickUntil.getDate() + kickDuration);
    
    user.status = 'suspended';
    user.suspensionReason = reason || 'Comportamento inadequado';
    user.suspensionMessage = message || '';
    user.suspendedAt = new Date();
    user.suspendedUntil = kickUntil;
    user.suspendedBy = req.user._id;
    
    await user.save();
    
    await logAction({
      action: 'kick',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: userId,
      details: { reason, message, duration: kickDuration, userName: user.name }
    });
    
    res.json({ success: true, message: `Usuário suspenso por ${kickDuration} dias`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unban/Unsuspend user (admin only)
router.post('/users/:id/unban', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    user.status = 'active';
    user.banReason = undefined;
    user.banMessage = undefined;
    user.bannedAt = undefined;
    user.bannedBy = undefined;
    user.suspensionReason = undefined;
    user.suspensionMessage = undefined;
    user.suspendedAt = undefined;
    user.suspendedUntil = undefined;
    user.suspendedBy = undefined;
    
    await user.save();
    
    await logAction({
      action: 'unban',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: userId,
      details: { userName: user.name }
    });
    
    res.json({ success: true, message: 'Restrições removidas com sucesso', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- EMAIL & JOB ALERTS -----

// Formulário de contato
router.post('/contact', 
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('subject').trim().notEmpty().withMessage('Assunto é obrigatório'),
  body('message').trim().notEmpty().withMessage('Mensagem é obrigatória'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, subject, message, phone } = req.body;
      
      // Salva mensagem no banco de dados
      const contactMessage = await ContactMessage.create({
        name,
        email,
        subject,
        message,
        phone
      });
      
      // Envia email para o admin
      await emailService.sendContactFormEmail({
        name,
        email,
        subject,
        message,
        phone
      });
      
      // Envia confirmação para o usuário
      await emailService.sendContactConfirmationEmail(name, email);
      
      // Log da ação
      await logAction({
        action: 'contact_form',
        resourceType: 'ContactMessage',
        resourceId: contactMessage._id,
        details: { email, subject }
      });
      
      res.json({ 
        success: true, 
        message: 'Mensagem enviada com sucesso! Retornaremos em breve.' 
      });
    } catch (err) {
      console.error('Contact form error:', err);
      res.status(500).json({ error: 'Erro ao enviar mensagem. Tente novamente.' });
    }
  }
);

// Listar mensagens de contato (admin)
router.get('/contact-messages', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('respondedBy', 'name email');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar status de mensagem de contato (admin)
router.put('/contact-messages/:id', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { status, response } = req.body;
    
    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }
    
    if (status) {
      message.status = status;
    }
    
    if (response) {
      message.response = response;
      message.respondedAt = new Date();
      message.respondedBy = req.user._id;
      
      // TODO: Opcionalmente enviar email de resposta para o usuário
    }
    
    await message.save();
    
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar newsletter manualmente (admin)
router.post('/news/:id/send-newsletter', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const news = await News.findById(req.params.id).populate('author', 'name');
    if (!news) {
      return res.status(404).json({ error: 'Notícia não encontrada' });
    }
    
    const { targetAudience } = req.body; // 'candidato', 'empresa', ou null para todos
    
    const results = await emailService.sendNewsletterToAll(news, targetAudience);
    
    res.json({
      success: true,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar perfil e enviar lembrete se incompleto (admin ou self-check)
router.post('/users/:id/check-profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verifica se é admin ou o próprio usuário
    if (req.user.type !== 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'Não autorizado' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const missingFields = [];
    
    // Campos essenciais para todos
    if (!user.phone) missingFields.push('Telefone');
    if (!user.bio) missingFields.push('Bio/Descrição');
    
    if (user.type === 'candidato') {
      if (!user.skills || user.skills.length === 0) missingFields.push('Habilidades');
      if (!user.education) missingFields.push('Escolaridade');
      if (!user.resumeUrl) missingFields.push('Currículo');
      if (!user.profilePhotoUrl) missingFields.push('Foto de perfil');
    } else if (user.type === 'empresa') {
      if (!user.cnpj) missingFields.push('CNPJ');
      if (!user.website) missingFields.push('Site da empresa');
      if (!user.description) missingFields.push('Descrição da empresa');
    }
    
    const isComplete = missingFields.length === 0;
    
    // Se não está completo e foi solicitado envio de email
    if (!isComplete && req.body.sendReminder) {
      await emailService.sendProfileIncompleteReminderEmail(user, missingFields);
    }
    
    res.json({
      isComplete,
      missingFields,
      completionPercentage: Math.round(((10 - missingFields.length) / 10) * 100)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar preferências de email
router.put('/users/me/email-preferences', authMiddleware, async (req, res) => {
  try {
    const { emailNotifications, jobAlerts } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (emailNotifications !== undefined) {
      user.emailNotifications = emailNotifications;
    }
    
    if (jobAlerts !== undefined) {
      user.jobAlerts = jobAlerts;
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      preferences: {
        emailNotifications: user.emailNotifications,
        jobAlerts: user.jobAlerts
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter vagas compatíveis para o candidato atual
router.get('/job-alerts/matching-jobs', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const matchingJobs = await jobAlertService.findMatchingJobsForCandidate(req.user._id);
    res.json({ jobs: matchingJobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar alertas de vagas manualmente (admin)
router.post('/job-alerts/send-all', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const results = await jobAlertService.sendJobAlertsToActiveCandidates();
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Testar email (admin ou para si mesmo)
router.post('/email/test', authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    const user = await User.findById(req.user._id);
    
    let result;
    
    switch (type) {
      case 'welcome':
        result = await emailService.sendWelcomeEmail(user);
        break;
      case 'confirmation':
        const token = 'test-token-123';
        result = await emailService.sendConfirmationEmail(user, token);
        break;
      case 'job-alert':
        const jobs = await jobAlertService.findMatchingJobsForCandidate(user._id, 3);
        if (jobs.length === 0) {
          return res.status(400).json({ error: 'Nenhuma vaga compatível encontrada' });
        }
        result = await emailService.sendJobAlertEmail(user, jobs);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de email inválido' });
    }
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SISTEMA DE CHAT E MENSAGENS =====

// Função helper para filtrar conteúdo de usuários banidos/suspensos
function excludeBannedSuspendedUsers() {
  return {
    $nor: [
      { status: 'banned' },
      { status: 'suspended' }
    ]
  };
}

// Listar conversas do usuário
router.get('/chats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.type;
    
    // Buscar chats onde o usuário participa
    const query = userType === 'candidato' 
      ? { candidateId: userId, status: 'active' }
      : { companyId: userId, status: 'active' };
    
    const chats = await Chat.find(query)
      .populate('candidateId', 'name email profilePhotoUrl type')
      .populate('companyId', 'name email profilePhotoUrl type')
      .populate('jobId', 'title company')
      .sort({ lastMessageAt: -1 });
    
    // Formatar resposta com informações do outro participante
    const formattedChats = chats.map(chat => {
      const otherUser = userType === 'candidato' ? chat.companyId : chat.candidateId;
      return {
        _id: chat._id,
        otherUser: {
          _id: otherUser._id,
          name: otherUser.name,
          profilePhoto: otherUser.profilePhotoUrl,
          type: otherUser.type
        },
        job: chat.jobId,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: userType === 'candidato' ? chat.unreadCount.candidate : chat.unreadCount.company,
        createdAt: chat.createdAt
      };
    });
    
    res.json(formattedChats);
  } catch (err) {
    console.error('Error fetching chats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Criar ou obter chat entre candidato e empresa (após aprovação de candidatura)
router.post('/chats', authMiddleware, async (req, res) => {
  try {
    const { applicationId } = req.body;
    const user = req.user;
    
    if (!applicationId) {
      return res.status(400).json({ error: 'ID da candidatura é obrigatório' });
    }
    
    // Buscar a candidatura
    const application = await Application.findById(applicationId)
      .populate('job')
      .populate('candidate');
    
    if (!application) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }
    
    // Verificar se a candidatura foi aceita
    if (application.status !== 'accepted') {
      return res.status(403).json({ error: 'Chat disponível apenas para candidaturas aceitas' });
    }
    
    const candidateId = application.candidate._id;
    const companyId = application.job.company;
    const jobId = application.job._id;
    
    // Verificar se o usuário tem permissão (é o candidato ou a empresa)
    const isCandidate = user._id.toString() === candidateId.toString();
    const isCompany = user._id.toString() === companyId.toString();
    
    if (!isCandidate && !isCompany) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Buscar ou criar chat
    let chat = await Chat.findOrCreate(candidateId, companyId, jobId, applicationId);
    
    // Popular com informações
    chat = await Chat.findById(chat._id)
      .populate('candidateId', 'name email profilePhotoUrl type')
      .populate('companyId', 'name email profilePhotoUrl type')
      .populate('jobId', 'title company');
    
    // Notificar o outro usuário sobre o novo chat
    const otherUserId = user._id.toString() === candidateId.toString() ? companyId : candidateId;
    const otherUserType = user._id.toString() === candidateId.toString() ? 'empresa' : 'candidato';
    
    await Notification.create({
      userId: otherUserId,
      type: 'message',
      title: 'Novo chat iniciado',
      message: `${req.user.name} iniciou uma conversa sobre a vaga "${application.job.title}"`,
      link: `/chat?chatId=${chat._id}`,
      metadata: { chatId: chat._id, jobId: jobId, applicationId: applicationId }
    });
    
    res.json(chat);
  } catch (err) {
    console.error('Error creating/fetching chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obter mensagens de um chat
router.get('/chats/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const userId = req.user._id;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    
    // Verificar se usuário participa do chat
    const isParticipant = chat.candidateId.toString() === userId.toString() || 
                         chat.companyId.toString() === userId.toString();
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Buscar mensagens
    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('senderId', 'name profilePhotoUrl');
    
    // Marcar mensagens não lidas como lidas
    const userType = req.user.type;
    await Message.updateMany(
      { 
        chatId, 
        senderId: { $ne: userId },
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
    
    // Resetar contador de não lidas no chat
    if (userType === 'candidato') {
      chat.unreadCount.candidate = 0;
    } else {
      chat.unreadCount.company = 0;
    }
    await chat.save();
    
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Enviar mensagem
router.post('/chats/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user._id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    }
    
    // Verificar anti-spam
    const spamCheck = await AntiSpam.checkRateLimit(userId.toString(), 'message');
    if (!spamCheck.allowed) {
      return res.status(429).json({ error: spamCheck.reason });
    }
    
    const contentCheck = await AntiSpam.checkContentSpam(content, userId.toString());
    if (contentCheck.isSpam) {
      return res.status(400).json({ 
        error: 'Conteúdo identificado como spam', 
        reasons: contentCheck.reasons 
      });
    }
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    
    // Verificar se usuário participa do chat
    const isParticipant = chat.candidateId.toString() === userId.toString() || 
                         chat.companyId.toString() === userId.toString();
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const senderType = req.user.type;
    
    // Criar mensagem
    const message = await Message.create({
      chatId,
      senderId: userId,
      senderType,
      content: content.trim(),
      attachments: attachments || []
    });
    
    // Popular informações do remetente
    await message.populate('senderId', 'name profilePhotoUrl');
    
    // Notificar outro usuário
    const otherUserId = chat.candidateId.toString() === userId.toString() 
      ? chat.companyId 
      : chat.candidateId;
    
    await Notification.create({
      userId: otherUserId,
      type: 'message',
      title: 'Nova mensagem',
      message: `${req.user.name} enviou uma mensagem`,
      link: `/chat?chatId=${chatId}`,
      metadata: { chatId, messageId: message._id }
    });
    
    // Log da ação
    await logAction({
      action: 'send_message',
      userId: userId,
      resourceType: 'Message',
      resourceId: message._id,
      details: { chatId, contentLength: content.length }
    });
    
    res.json(message);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Marcar chat como lido
router.put('/chats/:chatId/read', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const userType = req.user.type;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    
    // Verificar participação
    const isParticipant = chat.candidateId.toString() === userId.toString() || 
                         chat.companyId.toString() === userId.toString();
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Marcar mensagens como lidas
    await Message.updateMany(
      { chatId, senderId: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    // Resetar contador
    await chat.markAsRead(userType);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking chat as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// Arquivar chat
router.put('/chats/:chatId/archive', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    
    // Verificar participação
    const isParticipant = chat.candidateId.toString() === userId.toString() || 
                         chat.companyId.toString() === userId.toString();
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Adicionar usuário à lista de arquivados
    if (!chat.archivedBy.includes(userId)) {
      chat.archivedBy.push(userId);
      await chat.save();
    }
    
    res.json({ message: 'Chat arquivado' });
  } catch (err) {
    console.error('Error archiving chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== NOTIFICAÇÕES =====

// Listar notificações
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, unreadOnly } = req.query;
    const userId = req.user._id.toString();
    
    const notifications = await Notification.findByUserId(
      userId, 
      parseInt(limit), 
      unreadOnly === 'true'
    );
    
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar notificação como lida
router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar todas como lidas
router.put('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.markAllAsRead(req.user._id.toString());
    res.json({ message: `${count} notificações marcadas como lidas` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contar não lidas
router.get('/notifications/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id.toString());
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backwards-compatible alias used by some client code
router.get('/notifications/count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id.toString());
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SISTEMA DE FAVORITOS =====

// Adicionar favorito
router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const { targetId, targetType, listId, notes } = req.body;
    const userId = req.user._id.toString();
    
    // Verificar anti-spam
    const spamCheck = await AntiSpam.checkRateLimit(userId, 'favorite');
    if (!spamCheck.allowed) {
      return res.status(429).json({ error: spamCheck.reason });
    }
    
    const favorite = await Favorite.create({
      userId,
      targetId,
      targetType,
      listId,
      notes
    });
    
    res.json(favorite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar favoritos
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const { targetType } = req.query;
    const userId = req.user._id.toString();
    
    const favorites = await Favorite.findByUserId(userId, targetType);
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar se é favorito
router.get('/favorites/check/:targetId', authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { targetType } = req.query;
    const userId = req.user._id.toString();
    
    const isFavorite = await Favorite.isFavorite(userId, targetId, targetType);
    res.json({ isFavorite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remover favorito
router.delete('/favorites/:targetId', authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { targetType } = req.query;
    const userId = req.user._id.toString();
    
    const deleted = await Favorite.delete(userId, targetId, targetType);
    if (!deleted) {
      return res.status(404).json({ error: 'Favorito não encontrado' });
    }
    
    res.json({ message: 'Favorito removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar lista de favoritos
router.post('/favorite-lists', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, isPublic } = req.body;
    const userId = req.user._id.toString();
    
    const list = await FavoriteList.create({
      userId,
      name,
      description,
      type,
      isPublic
    });
    
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar listas de favoritos
router.get('/favorite-lists', authMiddleware, async (req, res) => {
  try {
    const lists = await FavoriteList.findByUserId(req.user._id.toString());
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SISTEMA DE AVALIAÇÕES =====

// Criar avaliação
router.post('/reviews', authMiddleware, async (req, res) => {
  try {
    const { targetId, targetType, jobId, rating, comment, pros, cons, anonymous } = req.body;
    const userId = req.user._id.toString();
    
    // Verificar anti-spam
    const spamCheck = await AntiSpam.checkRateLimit(userId, 'review');
    if (!spamCheck.allowed) {
      return res.status(429).json({ error: spamCheck.reason });
    }
    
    if (comment) {
      const contentCheck = await AntiSpam.checkContentSpam(comment, userId);
      if (contentCheck.isSpam) {
        return res.status(400).json({ 
          error: 'Comentário identificado como spam', 
          reasons: contentCheck.reasons 
        });
      }
    }
    
    const reviewerType = req.user.type === 'candidato' ? 'candidate' : 'company';
    
    const review = await Review.create({
      reviewerId: userId,
      reviewerType,
      targetId,
      targetType,
      jobId,
      rating,
      comment,
      pros,
      cons,
      anonymous
    });
    
    // Notificar usuário avaliado
    await Notification.create({
      userId: targetId,
      type: 'review',
      title: 'Nova avaliação recebida',
      message: `Você recebeu uma nova avaliação de ${rating} estrelas`,
      metadata: { reviewId: review.id, rating }
    });
    
    // Adicionar pontos
    await Gamification.addPoints(userId, 'REVIEW_GIVEN');
    await Gamification.addPoints(targetId, 'REVIEW_RECEIVED');
    
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar avaliações de um usuário/empresa
router.get('/reviews/:targetId', async (req, res) => {
  try {
    const { targetId } = req.params;
    const { status = 'approved' } = req.query;
    
    const reviews = await Review.findByTargetId(targetId, status);
    const stats = await Review.getAverageRating(targetId);
    
    res.json({ reviews, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Denunciar avaliação
router.post('/reviews/:reviewId/report', authMiddleware, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id.toString();
    
    const review = await Review.reportReview(reviewId, userId, reason);
    if (!review) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }
    
    res.json({ message: 'Avaliação denunciada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderar avaliações (admin)
router.get('/reviews/pending/moderation', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const reviews = await Review.findPending();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/reviews/:reviewId/moderate', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, notes } = req.body;
    
    const review = await Review.updateStatus(reviewId, status, notes);
    if (!review) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }
    
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SISTEMA DE GAMIFICAÇÃO =====

// Obter estatísticas do usuário
router.get('/gamification/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await Gamification.getUserStats(req.user._id.toString());
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ranking/Leaderboard
router.get('/gamification/leaderboard', async (req, res) => {
  try {
    const { limit = 100, userType } = req.query;
    const leaderboard = await Gamification.getLeaderboard(parseInt(limit), userType);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter conquistas do usuário com progresso
router.get('/gamification/achievements', authMiddleware, async (req, res) => {
  try {
    const achievements = await Gamification.getUserAchievementsWithProgress(req.user._id.toString());
    const bannerAchievements = await Gamification.getBannerAchievements(req.user._id.toString());
    res.json({
      achievements: achievements,
      bannerAchievements: bannerAchievements
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salvar conquistas do banner
router.put('/gamification/banner-achievements', authMiddleware, async (req, res) => {
  try {
    const { bannerAchievements } = req.body;
    
    if (!Array.isArray(bannerAchievements) || bannerAchievements.length > 3) {
      return res.status(400).json({ error: 'Deve ser um array com no máximo 3 conquistas' });
    }
    
    await Gamification.setBannerAchievements(req.user._id.toString(), bannerAchievements);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SISTEMA DE VERIFICAÇÃO =====

// Solicitar verificação de email
router.post('/verification/email/request', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email já verificado' });
    }
    
    const { token } = await Verification.createEmailVerification(
      user._id.toString(), 
      user.email
    );
    
    // Enviar email
    await emailService.sendConfirmationEmail(user, token);
    
    res.json({ message: 'Email de verificação enviado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar email
router.get('/verification/email/:token', async (req, res) => {
  try {
    const result = await Verification.verifyEmail(req.params.token);
    
    if (result.success) {
      res.json({ message: 'Email verificado com sucesso!' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar documento para verificação
router.post('/verification/document', authMiddleware, upload.array('documents', 5), async (req, res) => {
  try {
    const { documentType, documentNumber } = req.body;
    const userId = req.user._id.toString();
    
    const documentImages = req.files ? req.files.map(f => f.path) : [];
    
    const verification = await Verification.createDocumentVerification(userId, documentType, {
      number: documentNumber,
      images: documentImages
    });
    
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar verificações pendentes (admin)
router.get('/verification/pending', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const verifications = await Verification.getPendingVerifications();
    res.json(verifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revisar documento (admin)
router.put('/verification/:verificationId', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { status, notes } = req.body;
    
    const verification = await Verification.reviewDocument(
      verificationId, 
      status, 
      req.user._id.toString(), 
      notes
    );
    
    if (!verification) {
      return res.status(404).json({ error: 'Verificação não encontrada' });
    }
    
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validar CNPJ
router.post('/verification/cnpj/validate', async (req, res) => {
  try {
    const { cnpj } = req.body;
    const isValid = await Verification.verifyCNPJ(cnpj);
    res.json({ valid: isValid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status de verificações do usuário
router.get('/verification/status', authMiddleware, async (req, res) => {
  try {
    const status = await Verification.getUserVerifications(req.user._id.toString());
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DASHBOARDS =====

// Dashboard do candidato
router.get('/dashboard/candidate', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Estatísticas de candidaturas
    const applications = await Application.find({ candidateId: userId });
    const applicationStats = {
      total: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      reviewing: applications.filter(a => a.status === 'reviewing').length,
      accepted: applications.filter(a => a.status === 'accepted').length,
      rejected: applications.filter(a => a.status === 'rejected').length
    };
    
    // Visualizações do perfil (últimos 30 dias)
    const profileLikes = await ProfileLike.find({ 
      profileId: userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Gamificação
    const gamificationStats = await Gamification.getUserStats(userId.toString());
    
    // Mensagens não lidas
    const unreadMessages = await Message.getUnreadCount(userId.toString());
    
    // Avaliações
    const reviewStats = await Review.getAverageRating(userId.toString());
    
    res.json({
      applications: applicationStats,
      profileViews: profileLikes.length,
      gamification: gamificationStats,
      unreadMessages,
      rating: reviewStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard da empresa
router.get('/dashboard/company', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Vagas publicadas
    const jobs = await Job.find({ companyId: userId });
    const jobStats = {
      total: jobs.length,
      active: jobs.filter(j => j.status === 'active').length,
      closed: jobs.filter(j => j.status === 'closed').length
    };
    
    // Candidaturas recebidas
    const jobIds = jobs.map(j => j._id);
    const applications = await Application.find({ jobId: { $in: jobIds } });
    const applicationStats = {
      total: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      reviewing: applications.filter(a => a.status === 'reviewing').length,
      accepted: applications.filter(a => a.status === 'accepted').length,
      rejected: applications.filter(a => a.status === 'rejected').length
    };
    
    // Visualizações do perfil
    const profileViews = await ProfileLike.find({ 
      profileId: userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Mensagens não lidas
    const unreadMessages = await Message.getUnreadCount(userId.toString());
    
    // Avaliações
    const reviewStats = await Review.getAverageRating(userId.toString());
    
    res.json({
      jobs: jobStats,
      applications: applicationStats,
      profileViews: profileViews.length,
      unreadMessages,
      rating: reviewStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== RELATÓRIOS ANTI-SPAM (ADMIN) =====

router.get('/admin/spam-reports', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const reports = await AntiSpam.getSpamReports();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== BUSCA POR LOCALIZAÇÃO E MAPA =====

// Buscar vagas próximas
router.get('/geo/jobs/nearby', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50, title, category, type } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude e longitude são obrigatórias' });
    }

    const filters = {};
    if (title) filters.title = title;
    if (category) filters.category = category;
    if (type) filters.type = type;

    const jobs = await GeoLocation.findNearbyJobs(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(maxDistance),
      filters
    );

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar candidatos próximos (para empresas)
router.get('/geo/candidates/nearby', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50, skills, experience } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude e longitude são obrigatórias' });
    }

    const filters = {};
    if (skills) filters.skills = skills.split(',');
    if (experience) filters.experience = experience;

    const candidates = await GeoLocation.findNearbyCandidates(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(maxDistance),
      filters
    );

    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter clusters de vagas para o mapa
router.get('/geo/jobs/clusters', async (req, res) => {
  try {
    const { north, south, east, west, zoom } = req.query;
    
    let bounds = null;
    if (north && south && east && west) {
      bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      };
    }

    const clusters = await GeoLocation.getJobClusters(bounds, parseInt(zoom) || 10);
    res.json(clusters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Geocodificar endereço
router.post('/geo/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Endereço é obrigatório' });
    }

    const coords = await GeoLocation.geocodeAddress(address);
    res.json(coords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar localização de vaga
router.put('/geo/jobs/:jobId/location', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude e longitude são obrigatórias' });
    }

    // Verificar se a vaga pertence ao usuário
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }

    if (job.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updated = await GeoLocation.updateJobLocation(jobId, latitude, longitude);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar localização do usuário
router.put('/geo/users/me/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude e longitude são obrigatórias' });
    }

    const updated = await GeoLocation.updateUserLocation(
      req.user._id.toString(), 
      latitude, 
      longitude
    );
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== PROMOÇÃO DE ADMINISTRADORES (APENAS DONO) =====

// Promover usuário a administrador (apenas dono do sistema)
router.post('/users/:id/promote-admin', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // PROTEÇÃO: Verificar se é o dono do sistema
    if (!isOwner(req.user._id)) {
      await logAction({
        action: 'promote_admin_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        resourceId: userId,
        details: { 
          reason: 'Tentativa de promover administrador sem ser o dono', 
          blockedBy: 'system' 
        }
      });
      return res.status(403).json({ 
        error: 'Apenas o dono do sistema pode promover usuários a administrador' 
      });
    }
    
    // Verificar se não está tentando promover a si mesmo
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Você já é o dono do sistema' });
    }
    
    // Buscar usuário
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se já é admin ou owner
    if (user.type === 'admin' || user.type === 'owner') {
      return res.status(400).json({ error: 'Este usuário já é um administrador' });
    }
    
    // Promover a admin
    const oldType = user.type;
    user.type = 'admin';
    await user.save();
    
    await logAction({
      action: 'promote_to_admin',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: userId,
      details: { 
        userName: user.name,
        userEmail: user.email,
        oldType: oldType,
        newType: 'admin',
        promotedBy: req.user.name
      }
    });
    
    // Enviar email de notificação ao usuário promovido
    try {
      await emailService.sendAdminPromotionEmail(user);
    } catch (emailError) {
      console.error('Erro ao enviar email de promoção:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: `${user.name} foi promovido(a) a administrador com sucesso`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type
      }
    });
  } catch (err) {
    console.error('Erro ao promover administrador:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remover permissões de administrador (apenas dono do sistema)
router.post('/users/:id/demote-admin', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { newType } = req.body; // 'candidato' ou 'empresa'
    
    // PROTEÇÃO: Verificar se é o dono do sistema
    if (!isOwner(req.user._id)) {
      await logAction({
        action: 'demote_admin_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        resourceId: userId,
        details: { 
          reason: 'Tentativa de remover administrador sem ser o dono', 
          blockedBy: 'system' 
        }
      });
      return res.status(403).json({ 
        error: 'Apenas o dono do sistema pode remover permissões de administrador' 
      });
    }
    
    // Impedir que remova a si mesmo
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Você não pode remover suas próprias permissões de dono' });
    }
    
    // Buscar usuário
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se é admin
    if (user.type !== 'admin') {
      return res.status(400).json({ error: 'Este usuário não é um administrador' });
    }
    
    // Validar novo tipo
    if (!newType || !['candidato', 'empresa'].includes(newType)) {
      return res.status(400).json({ 
        error: 'Tipo de usuário inválido. Use "candidato" ou "empresa"' 
      });
    }
    
    // Rebaixar de admin
    const oldType = user.type;
    user.type = newType;
    await user.save();
    
    await logAction({
      action: 'demote_from_admin',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: userId,
      details: { 
        userName: user.name,
        userEmail: user.email,
        oldType: oldType,
        newType: newType,
        demotedBy: req.user.name
      }
    });
    
    res.json({ 
      success: true, 
      message: `${user.name} foi rebaixado(a) de administrador para ${newType}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type
      }
    });
  } catch (err) {
    console.error('Erro ao remover administrador:', err);
    res.status(500).json({ error: err.message });
  }
});

// Listar todos os administradores (apenas admin ou dono)
router.get('/admin/administrators', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const admins = await User.find({ type: 'admin' })
      .select('-passwordHash -resetToken -resetExpires')
      .sort({ createdAt: -1 });
    
    // Marcar qual é o dono
    const adminsWithOwnerFlag = admins.map(admin => ({
      ...admin.toObject(),
      isOwner: isOwner(admin._id),
      canBeModified: !isOwner(admin._id) // Apenas o dono não pode ser modificado
    }));
    
    res.json(adminsWithOwnerFlag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Promover usuário por email a administrador (apenas dono do sistema)
router.post('/admin/promote-by-email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    
    // PROTEÇÃO: Verificar se é o dono do sistema
    if (!isOwner(req.user._id)) {
      await logAction({
        action: 'promote_admin_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        details: { 
          reason: 'Tentativa de promover administrador por email sem ser o dono', 
          blockedBy: 'system',
          attemptedEmail: email
        }
      });
      return res.status(403).json({ 
        error: 'Apenas o dono do sistema pode promover usuários a administrador' 
      });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }
    
    // Buscar usuário por email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado com este email' });
    }
    
    // Verificar se não está tentando promover a si mesmo
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Você já é o dono do sistema' });
    }
    
    // Verificar se já é admin ou owner
    if (user.type === 'admin' || user.type === 'owner') {
      return res.status(400).json({ 
        error: 'Este usuário já é um administrador',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          type: user.type
        }
      });
    }
    
    // Promover a admin
    const oldType = user.type;
    user.type = 'admin';
    await user.save();
    
    await logAction({
      action: 'promote_to_admin',
      userId: req.user._id,
      resourceType: 'User',
      resourceId: user._id,
      details: { 
        userName: user.name,
        userEmail: user.email,
        oldType: oldType,
        newType: 'admin',
        promotedBy: req.user.name,
        method: 'email'
      }
    });
    
    // Enviar email de notificação ao usuário promovido
    try {
      await emailService.sendAdminPromotionEmail(user);
    } catch (emailError) {
      console.error('Erro ao enviar email de promoção:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: `${user.name} foi promovido(a) a administrador com sucesso`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type
      }
    });
  } catch (err) {
    console.error('Erro ao promover administrador por email:', err);
    res.status(500).json({ error: err.message });
  }
});

// Buscar usuários para promoção (apenas dono do sistema)
router.get('/admin/search-users-for-promotion', authMiddleware, async (req, res) => {
  try {
    // PROTEÇÃO: Verificar se é o dono do sistema
    if (!isOwner(req.user._id)) {
      return res.status(403).json({ 
        error: 'Apenas o dono do sistema pode acessar esta funcionalidade' 
      });
    }
    
    const { search, type, limit = 20 } = req.query;
    
    const query = {
      type: { $ne: 'admin' }, // Excluir usuários que já são admin
      _id: { $ne: req.user._id } // Excluir o próprio dono
    };
    
    // Filtro de busca por nome ou email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filtro por tipo de usuário
    if (type && ['candidato', 'empresa'].includes(type)) {
      query.type = type;
    }
    
    const users = await User.find(query)
      .select('name email type status createdAt profilePhotoUrl')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Adicionar informação útil sobre cada usuário
    const usersWithInfo = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      type: user.type,
      status: user.status,
      profilePhotoUrl: user.profilePhotoUrl,
      createdAt: user.createdAt,
      canBePromoted: true
    }));
    
    res.json({
      total: users.length,
      users: usersWithInfo
    });
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({ error: err.message });
  }
});

// Promover múltiplos usuários de uma vez (apenas dono do sistema)
router.post('/admin/promote-multiple', authMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body; // Array de IDs ou emails
    
    // PROTEÇÃO: Verificar se é o dono do sistema
    if (!isOwner(req.user._id)) {
      await logAction({
        action: 'promote_admin_attempt_blocked',
        userId: req.user._id,
        resourceType: 'User',
        details: { 
          reason: 'Tentativa de promover múltiplos administradores sem ser o dono', 
          blockedBy: 'system'
        }
      });
      return res.status(403).json({ 
        error: 'Apenas o dono do sistema pode promover usuários a administrador' 
      });
    }
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Lista de usuários é obrigatória' });
    }
    
    if (userIds.length > 20) {
      return res.status(400).json({ error: 'Máximo de 20 usuários por vez' });
    }
    
    const results = {
      success: [],
      failed: [],
      alreadyAdmin: []
    };
    
    for (const identifier of userIds) {
      try {
        let user;
        
        // Tentar buscar por ID primeiro, depois por email
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
          user = await User.findById(identifier);
        } else {
          user = await User.findOne({ email: identifier.toLowerCase() });
        }
        
        if (!user) {
          results.failed.push({
            identifier,
            reason: 'Usuário não encontrado'
          });
          continue;
        }
        
        // Verificar se é o próprio dono
        if (user._id.toString() === req.user._id.toString()) {
          results.failed.push({
            identifier,
            user: { id: user._id, name: user.name, email: user.email },
            reason: 'Não pode promover a si mesmo'
          });
          continue;
        }
        
        // Verificar se já é admin ou owner
        if (user.type === 'admin' || user.type === 'owner') {
          results.alreadyAdmin.push({
            id: user._id,
            name: user.name,
            email: user.email
          });
          continue;
        }
        
        // Promover a admin
        const oldType = user.type;
        user.type = 'admin';
        await user.save();
        
        await logAction({
          action: 'promote_to_admin',
          userId: req.user._id,
          resourceType: 'User',
          resourceId: user._id,
          details: { 
            userName: user.name,
            userEmail: user.email,
            oldType: oldType,
            newType: 'admin',
            promotedBy: req.user.name,
            method: 'batch'
          }
        });
        
        // Enviar email de notificação
        try {
          await emailService.sendAdminPromotionEmail(user);
        } catch (emailError) {
          console.error('Erro ao enviar email de promoção:', emailError);
        }
        
        results.success.push({
          id: user._id,
          name: user.name,
          email: user.email,
          oldType: oldType
        });
        
      } catch (error) {
        results.failed.push({
          identifier,
          reason: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `${results.success.length} usuário(s) promovido(s) com sucesso`,
      results: {
        promoted: results.success.length,
        failed: results.failed.length,
        alreadyAdmin: results.alreadyAdmin.length,
        details: results
      }
    });
  } catch (err) {
    console.error('Erro ao promover múltiplos administradores:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obter informações de um usuário específico (para verificação antes de promover)
router.get('/admin/user-info/:identifier', authMiddleware, async (req, res) => {
  try {
    // PROTEÇÃO: Verificar se é o dono do sistema
    if (!isOwner(req.user._id)) {
      return res.status(403).json({ 
        error: 'Apenas o dono do sistema pode acessar esta funcionalidade' 
      });
    }
    
    const { identifier } = req.params;
    let user;
    
    // Tentar buscar por ID primeiro, depois por email
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(identifier).select('-passwordHash -resetToken -resetExpires');
    } else {
      user = await User.findOne({ email: identifier.toLowerCase() })
        .select('-passwordHash -resetToken -resetExpires');
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Informações adicionais
    const canBePromoted = user.type !== 'admin' && user.type !== 'owner' && user._id.toString() !== req.user._id.toString();
    const isCurrentAdmin = user.type === 'admin' || user.type === 'owner';
    const isSelf = user._id.toString() === req.user._id.toString();
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        status: user.status,
        profilePhotoUrl: user.profilePhotoUrl,
        createdAt: user.createdAt,
        phone: user.phone,
        bio: user.bio
      },
      permissions: {
        canBePromoted,
        isCurrentAdmin,
        isSelf,
        isOwner: isOwner(user._id)
      }
    });
  } catch (err) {
    console.error('Erro ao buscar informações do usuário:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== FUNCIONALIDADES AVANÇADAS =====

// ----- SAVED SEARCHES (Pesquisas Salvas) -----
router.post('/saved-searches', authMiddleware, async (req, res) => {
  try {
    const { name, filters } = req.body;
    
    if (!name || !filters) {
      return res.status(400).json({ error: 'Nome e filtros são obrigatórios' });
    }
    
    const savedSearch = await SavedSearch.create({
      userId: req.user._id,
      name: name.trim(),
      filters
    });
    
    await logAction({
      action: 'create_saved_search',
      userId: req.user._id,
      resourceType: 'SavedSearch',
      resourceId: savedSearch._id,
      details: { name: savedSearch.name }
    });
    
    res.json(savedSearch);
  } catch (err) {
    console.error('Error creating saved search:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/saved-searches', authMiddleware, async (req, res) => {
  try {
    const savedSearches = await SavedSearch.find({ 
      userId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.json(savedSearches);
  } catch (err) {
    console.error('Error fetching saved searches:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/saved-searches/:id', authMiddleware, async (req, res) => {
  try {
    const { name, filters } = req.body;
    
    const savedSearch = await SavedSearch.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!savedSearch) {
      return res.status(404).json({ error: 'Pesquisa salva não encontrada' });
    }
    
    if (name) savedSearch.name = name.trim();
    if (filters) savedSearch.filters = filters;
    savedSearch.updatedAt = new Date();
    
    await savedSearch.save();
    
    res.json(savedSearch);
  } catch (err) {
    console.error('Error updating saved search:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/saved-searches/:id', authMiddleware, async (req, res) => {
  try {
    const savedSearch = await SavedSearch.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false },
      { new: true }
    );
    
    if (!savedSearch) {
      return res.status(404).json({ error: 'Pesquisa salva não encontrada' });
    }
    
    res.json({ message: 'Pesquisa salva removida com sucesso' });
  } catch (err) {
    console.error('Error deleting saved search:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- JOB ALERTS (Alertas de Vagas) -----
router.post('/job-alerts', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const { name, filters, frequency } = req.body;
    
    if (!name || !filters) {
      return res.status(400).json({ error: 'Nome e filtros são obrigatórios' });
    }
    
    const jobAlert = await JobAlert.create({
      userId: req.user._id,
      name: name.trim(),
      filters,
      frequency: frequency || 'daily'
    });
    
    await logAction({
      action: 'create_job_alert',
      userId: req.user._id,
      resourceType: 'JobAlert',
      resourceId: jobAlert._id,
      details: { name: jobAlert.name, frequency: jobAlert.frequency }
    });
    
    res.json(jobAlert);
  } catch (err) {
    console.error('Error creating job alert:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/job-alerts', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const jobAlerts = await JobAlert.find({ 
      userId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.json(jobAlerts);
  } catch (err) {
    console.error('Error fetching job alerts:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/job-alerts/:id', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const { name, filters, frequency, isActive } = req.body;
    
    const jobAlert = await JobAlert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!jobAlert) {
      return res.status(404).json({ error: 'Alerta de vaga não encontrado' });
    }
    
    if (name) jobAlert.name = name.trim();
    if (filters) jobAlert.filters = filters;
    if (frequency) jobAlert.frequency = frequency;
    if (typeof isActive === 'boolean') jobAlert.isActive = isActive;
    jobAlert.updatedAt = new Date();
    
    await jobAlert.save();
    
    res.json(jobAlert);
  } catch (err) {
    console.error('Error updating job alert:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/job-alerts/:id', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const jobAlert = await JobAlert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false },
      { new: true }
    );
    
    if (!jobAlert) {
      return res.status(404).json({ error: 'Alerta de vaga não encontrado' });
    }
    
    res.json({ message: 'Alerta de vaga removido com sucesso' });
  } catch (err) {
    console.error('Error deleting job alert:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- FOLLOW SYSTEM (Sistema de Seguidores) -----
router.post('/follow/:userId', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Verificar se o usuário alvo existe e é uma empresa
    const targetUser = await User.findById(targetUserId);
    if (!targetUser || targetUser.type !== 'empresa') {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    
    // Verificar se já está seguindo
    const existingFollow = await Follow.findOne({
      followerId: req.user._id,
      followingId: targetUserId
    });
    
    if (existingFollow) {
      return res.status(400).json({ error: 'Você já segue esta empresa' });
    }
    
    const follow = await Follow.create({
      followerId: req.user._id,
      followingId: targetUserId
    });
    
    // Atualizar contadores
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followerCount: 1 } });
    
    await logAction({
      action: 'follow_company',
      userId: req.user._id,
      resourceType: 'Follow',
      resourceId: follow._id,
      details: { followingId: targetUserId }
    });
    
    res.json({ message: 'Empresa seguida com sucesso', follow });
  } catch (err) {
    console.error('Error following company:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/follow/:userId', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    const follow = await Follow.findOneAndDelete({
      followerId: req.user._id,
      followingId: targetUserId
    });
    
    if (!follow) {
      return res.status(404).json({ error: 'Você não segue esta empresa' });
    }
    
    // Atualizar contadores
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: -1 } });
    await User.findByIdAndUpdate(targetUserId, { $inc: { followerCount: -1 } });
    
    res.json({ message: 'Deixou de seguir a empresa com sucesso' });
  } catch (err) {
    console.error('Error unfollowing company:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/follow/status/:userId', authMiddleware, async (req, res) => {
  try {
    const follow = await Follow.findOne({
      followerId: req.user._id,
      followingId: req.params.userId
    });
    
    res.json({ isFollowing: !!follow });
  } catch (err) {
    console.error('Error checking follow status:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/followers', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const followers = await Follow.find({ followingId: req.user._id })
      .populate('followerId', 'name email profilePhotoUrl candidateProfile')
      .sort({ createdAt: -1 });
    
    res.json(followers.map(f => f.followerId));
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/following', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const following = await Follow.find({ followerId: req.user._id })
      .populate('followingId', 'name email companyProfile profilePhotoUrl')
      .sort({ createdAt: -1 });
    
    res.json(following.map(f => f.followingId));
  } catch (err) {
    console.error('Error fetching following:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- GITHUB INTEGRATION -----
router.post('/github/profile', authMiddleware, async (req, res) => {
  try {
    const { githubUsername, accessToken } = req.body;
    
    if (!githubUsername) {
      return res.status(400).json({ error: 'Nome de usuário do GitHub é obrigatório' });
    }
    
    // Buscar dados do GitHub (simulado - em produção usaria GitHub API)
    const profileData = {
      username: githubUsername,
      name: githubUsername, // Em produção, buscar da API
      avatar_url: `https://github.com/${githubUsername}.png`,
      bio: '',
      location: '',
      company: '',
      blog: '',
      public_repos: 0,
      followers: 0,
      following: 0
    };
    
    const repositories = []; // Em produção, buscar da API
    
    let githubProfile = await GitHubProfile.findOne({ userId: req.user._id });
    
    if (githubProfile) {
      githubProfile.profileData = profileData;
      githubProfile.repositories = repositories;
      githubProfile.lastUpdated = new Date();
      await githubProfile.save();
    } else {
      githubProfile = await GitHubProfile.create({
        userId: req.user._id,
        githubUsername,
        profileData,
        repositories,
        accessToken: accessToken ? Buffer.from(accessToken).toString('base64') : undefined
      });
    }
    
    await logAction({
      action: 'update_github_profile',
      userId: req.user._id,
      resourceType: 'GitHubProfile',
      resourceId: githubProfile._id,
      details: { githubUsername }
    });
    
    res.json(githubProfile);
  } catch (err) {
    console.error('Error updating GitHub profile:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/github/profile', authMiddleware, async (req, res) => {
  try {
    const githubProfile = await GitHubProfile.findOne({ userId: req.user._id });
    
    if (!githubProfile) {
      return res.json(null);
    }
    
    res.json(githubProfile);
  } catch (err) {
    console.error('Error fetching GitHub profile:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/github/profile', authMiddleware, async (req, res) => {
  try {
    await GitHubProfile.findOneAndDelete({ userId: req.user._id });
    
    res.json({ message: 'Perfil do GitHub removido com sucesso' });
  } catch (err) {
    console.error('Error deleting GitHub profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- CONTENT MODERATION -----
router.put('/jobs/:id/moderate', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { moderationStatus, moderationReason } = req.body;
    
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }
    
    job.moderationStatus = moderationStatus || 'approved';
    job.moderatedBy = req.user._id;
    job.moderatedAt = new Date();
    
    if (moderationReason) {
      job.moderationReason = moderationReason;
    }
    
    await job.save();
    
    await logAction({
      action: 'moderate_job',
      userId: req.user._id,
      resourceType: 'Job',
      resourceId: job._id,
      details: { moderationStatus: job.moderationStatus }
    });
    
    res.json(job);
  } catch (err) {
    console.error('Error moderating job:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/news/:id/moderate', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { moderationStatus, moderationReason } = req.body;
    
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ error: 'Notícia não encontrada' });
    }
    
    news.moderationStatus = moderationStatus || 'approved';
    news.moderatedBy = req.user._id;
    news.moderatedAt = new Date();
    
    if (moderationReason) {
      news.moderationReason = moderationReason;
    }
    
    await news.save();
    
    await logAction({
      action: 'moderate_news',
      userId: req.user._id,
      resourceType: 'News',
      resourceId: news._id,
      details: { moderationStatus: news.moderationStatus }
    });
    
    res.json(news);
  } catch (err) {
    console.error('Error moderating news:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/moderation/pending', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    
    let query = { moderationStatus: 'pending' };
    let Model;
    
    if (type === 'jobs') {
      Model = Job;
    } else if (type === 'news') {
      Model = News;
    } else {
      // Buscar ambos
      const [jobs, news] = await Promise.all([
        Job.find({ moderationStatus: 'pending' })
          .populate('company', 'name')
          .sort({ createdAt: -1 })
          .limit(limit),
        News.find({ moderationStatus: 'pending' })
          .populate('author', 'name')
          .sort({ createdAt: -1 })
          .limit(limit)
      ]);
      
      return res.json({
        jobs: jobs.map(j => ({ ...j.toObject(), contentType: 'job' })),
        news: news.map(n => ({ ...n.toObject(), contentType: 'news' }))
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await Model.find(query)
      .populate(type === 'jobs' ? 'company' : 'author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Model.countDocuments(query);
    
    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching pending moderation:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- PLATFORM ANALYTICS -----
router.get('/analytics/overview', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular data de início baseada no período
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Buscar dados mais recentes
    const latestAnalytics = await PlatformAnalytics.findOne()
      .sort({ date: -1 });
    
    if (!latestAnalytics) {
      return res.json({
        period,
        startDate,
        endDate: new Date(),
        data: {
          users: { total: 0, new: 0, active: 0 },
          jobs: { total: 0, new: 0, active: 0 },
          applications: { total: 0, new: 0 },
          engagement: { views: 0, interactions: 0 }
        }
      });
    }
    
    res.json({
      period,
      startDate,
      endDate: latestAnalytics.date,
      data: latestAnalytics.data
    });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/chart', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const { metric, days = 30 } = req.query;
    
    const analytics = await PlatformAnalytics.find()
      .sort({ date: -1 })
      .limit(parseInt(days));
    
    const chartData = analytics.reverse().map(a => ({
      date: a.date,
      value: a.data[metric] || 0
    }));
    
    res.json(chartData);
  } catch (err) {
    console.error('Error fetching analytics chart:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para atualizar analytics (chamado por cron job)
router.post('/analytics/update', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Verificar se já existe analytics para hoje
    let analytics = await PlatformAnalytics.findOne({ date: today });
    
    if (!analytics) {
      // Calcular métricas
      const [
        totalUsers,
        newUsers,
        activeUsers,
        totalJobs,
        newJobs,
        activeJobs,
        totalApplications,
        newApplications,
        jobViews,
        newsViews
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ createdAt: { $gte: today } }),
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Job.countDocuments(),
        Job.countDocuments({ createdAt: { $gte: today } }),
        Job.countDocuments({ status: { $in: ['active', 'aberta'] } }),
        Application.countDocuments(),
        Application.countDocuments({ appliedAt: { $gte: today } }),
        Job.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
        News.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }])
      ]);
      
      analytics = await PlatformAnalytics.create({
        date: today,
        data: {
          users: {
            total: totalUsers,
            new: newUsers,
            active: activeUsers
          },
          jobs: {
            total: totalJobs,
            new: newJobs,
            active: activeJobs
          },
          applications: {
            total: totalApplications,
            new: newApplications
          },
          engagement: {
            jobViews: jobViews[0]?.total || 0,
            newsViews: newsViews[0]?.total || 0,
            totalViews: (jobViews[0]?.total || 0) + (newsViews[0]?.total || 0)
          }
        }
      });
    }
    
    res.json(analytics);
  } catch (err) {
    console.error('Error updating analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- UTILITY ENDPOINTS -----
router.post('/jobs/:id/view', async (req, res) => {
  try {
    await Job.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error incrementing job view:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/news/:id/view', async (req, res) => {
  try {
    await News.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error incrementing news view:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/view', authMiddleware, async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      await User.findByIdAndUpdate(req.params.id, { $inc: { profileViewCount: 1 } });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error incrementing profile view:', err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy para consulta de CEP (ViaCEP) para evitar bloqueio por CSP no cliente
router.get('/cep/:cep', async (req, res) => {
  try {
    const raw = req.params.cep || '';
    const cep = raw.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return res.status(400).json({ error: 'CEP inválido' });

    const url = `https://viacep.com.br/ws/${cep}/json/`;
    // Usa fetch nativo do Node (Node 18+). Se necessário, podemos trocar para axios.
    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ error: 'Erro ao consultar serviço externo' });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('CEP proxy error', err);
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

module.exports = router;
