const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

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

const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

const router = express.Router();

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
function isOwner(userId) {
  return userId && userId.toString() === OWNER_ID;
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
      const { name, email, password, type } = req.body;
      
      // Validacao adicional
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios' });
      }
      
      // Verifica se email ja existe (case-insensitive)
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        console.log('Email already exists:', email);
        return res.status(400).json({ error: 'Este email ja esta registrado' });
      }
      
      // Faz hash da senha
      const hash = await bcrypt.hash(password, 10);
      
      // Cria novo usuario com status ativo por padrão
      const user = await User.create({ 
        name: name.trim(), 
        email: email.toLowerCase(), 
        passwordHash: hash, 
        type: type || 'candidato',
        status: 'active'
      });
      
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
      .populate('company', 'name companyProfile')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }); // Ordenar por mais recentes primeiro
    
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
const { getModel } = require('../models/JobRecommendationModel');

router.get('/jobs/ai-recommendations', authMiddleware, async (req, res) => {
  try {
    console.log('=== AI Recommendations Request (TensorFlow) ===');
    console.log('User ID:', req.user._id);
    console.log('User type:', req.user.type);
    
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

router.delete('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Deleting job:', req.params.id);
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    
    // Delete all applications for this job
    await Application.deleteMany({ job: job._id });
    
    // Delete the job
    await Job.findByIdAndDelete(req.params.id);
    
    await logAction({ 
      action: 'delete_job', 
      userId: req.user._id, 
      resourceType: 'Job', 
      resourceId: job._id,
      details: { title: job.title }
    });
    
    res.json({ ok: true, message: 'Vaga excluída com sucesso' });
  } catch (err) { 
    console.error('Error deleting job:', err);
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
      .populate('author', 'name')
      .sort({ createdAt: -1 }); 
    res.json(news); 
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
    
    res.json({ success: true, message: 'Vaga excluída com sucesso' });
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
    
    // Delete news
    await News.findByIdAndDelete(newsId);
    
    await logAction({
      action: 'delete',
      userId: req.user._id,
      resourceType: 'News',
      resourceId: newsId,
      details: { newsTitle: news.title }
    });
    
    res.json({ success: true, message: 'Notícia excluída com sucesso' });
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
      .populate('candidate', 'name email')
      .populate('job', 'title')
      .sort({ createdAt: -1 });
    
    res.json(applications);
  } catch (err) {
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

// Listar conversas do usuário
router.get('/chats', authMiddleware, async (req, res) => {
  try {
    const userType = req.user.type === 'candidato' ? 'candidate' : 'company';
    const chats = await Chat.findByUserId(req.user._id.toString(), userType);
    
    // Enriquecer com informações do outro participante e última mensagem
    const enrichedChats = await Promise.all(chats.map(async (chat) => {
      const otherUserId = userType === 'candidate' ? chat.companyId : chat.candidateId;
      const otherUser = await User.findById(otherUserId);
      
      const messages = await Message.findByChatId(chat.id, 1);
      const lastMessage = messages[0];
      
      const unreadCount = await Message.getUnreadCount(req.user._id.toString(), chat.id);
      
      return {
        ...chat,
        otherUser: otherUser ? {
          id: otherUser._id,
          name: otherUser.name,
          profilePhoto: otherUser.profilePhoto,
          type: otherUser.type
        } : null,
        lastMessage,
        unreadCount
      };
    }));
    
    res.json(enrichedChats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar ou obter chat
router.post('/chats', authMiddleware, async (req, res) => {
  try {
    const { otherUserId, jobId } = req.body;
    const user = req.user;
    
    let candidateId, companyId;
    if (user.type === 'candidato') {
      candidateId = user._id.toString();
      companyId = otherUserId;
    } else {
      candidateId = otherUserId;
      companyId = user._id.toString();
    }
    
    // Verificar se já existe chat
    let chat = await Chat.findByParticipants(candidateId, companyId, jobId);
    
    if (!chat) {
      chat = await Chat.create({ candidateId, companyId, jobId });
    }
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter mensagens de um chat
router.get('/chats/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    
    // Verificar se usuário participa do chat
    const userId = req.user._id.toString();
    if (chat.candidateId !== userId && chat.companyId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const messages = await Message.findByChatId(chatId, parseInt(limit), parseInt(offset));
    
    // Marcar mensagens como lidas
    await Message.markChatAsRead(chatId, userId);
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mensagem
router.post('/chats/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user._id.toString();
    
    // Verificar anti-spam
    const spamCheck = await AntiSpam.checkRateLimit(userId, 'message');
    if (!spamCheck.allowed) {
      return res.status(429).json({ error: spamCheck.reason });
    }
    
    const contentCheck = await AntiSpam.checkContentSpam(content, userId);
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
    if (chat.candidateId !== userId && chat.companyId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const senderType = req.user.type === 'candidato' ? 'candidate' : 'company';
    
    const message = await Message.create({
      chatId,
      senderId: userId,
      senderType,
      content,
      attachments: attachments || []
    });
    
    // Notificar outro usuário
    const otherUserId = chat.candidateId === userId ? chat.companyId : chat.candidateId;
    await Notification.create({
      userId: otherUserId,
      type: 'message',
      title: 'Nova mensagem',
      message: `${req.user.name} enviou uma mensagem`,
      link: `/chat/${chatId}`,
      metadata: { chatId, messageId: message.id }
    });
    
    // Adicionar pontos de gamificação (primeira mensagem)
    const userMessages = await Message.findByChatId(chatId);
    if (userMessages.filter(m => m.senderId === userId).length === 1) {
      await Gamification.addPoints(userId, 'FIRST_MESSAGE');
    }
    
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Arquivar chat
router.put('/chats/:chatId/archive', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id.toString();
    
    const chat = await Chat.archive(chatId, userId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }
    
    res.json({ message: 'Chat arquivado' });
  } catch (err) {
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

module.exports = router;


