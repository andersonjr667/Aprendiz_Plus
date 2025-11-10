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
const { logAction } = require('../middleware/audit');

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
      
      // Cria novo usuario
      const user = await User.create({ 
        name: name.trim(), 
        email: email.toLowerCase(), 
        passwordHash: hash, 
        type: type || 'candidato' 
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
    if (!user) return res.json({ ok: true }); // don't reveal
    const token = crypto.randomBytes(20).toString('hex');
    user.resetToken = token;
    user.resetExpires = Date.now() + 3600000; // 1h
    await user.save();
    // Ideally send email. For MVP return token in response for development
    res.json({ ok: true, resetToken: token });
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
          .populate('user', 'name email')
          .lean();
        
        // Format applications
        const formattedApplications = applications.map(app => ({
          ...app,
          user_name: app.user?.name,
          user_email: app.user?.email
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
    
    res.json(app);
  } catch (err) { 
    console.error('Error applying to job:', err);
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/jobs/:id/applications', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate({ path: 'applications', populate: { path: 'candidate', select: 'name email candidateProfile resumeUrl' } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json(job.applications);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/jobs/:id/applications/:appId', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const { id, appId } = req.params;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (req.body.status) app.status = req.body.status;
    if (req.body.feedback) app.feedback = req.body.feedback;
    await app.save();
    await logAction({ action: 'update_application', userId: req.user._id, resourceType: 'Application', resourceId: app._id, details: { status: app.status } });
    res.json(app);
  } catch (err) { res.status(500).json({ error: err.message }); }
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

// AI Job Recommendations based on user profile
router.get('/jobs/ai-recommendations', authMiddleware, async (req, res) => {
  try {
    console.log('=== AI Recommendations Request ===');
    console.log('User ID:', req.user._id);
    
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
    
    // Calculate profile completeness - SAME as frontend
    const requiredFields = ['name', 'email'];
    const optionalFields = ['cpf', 'phone', 'bio', 'skills', 'profilePhotoUrl', 'interests'];
    const allFields = [...requiredFields, ...optionalFields];
    
    const completedFields = allFields.filter(field => {
      if (field === 'skills') {
        const completed = user.skills && user.skills.length > 0;
        console.log('  skills check:', completed, user.skills);
        return completed;
      }
      if (field === 'interests') {
        const completed = user.interests && user.interests.length >= 3;
        console.log('  interests check:', completed, user.interests);
        return completed;
      }
      if (field === 'profilePhotoUrl') {
        const completed = !!(user.profilePhotoUrl || user.avatarUrl);
        console.log('  photo check:', completed);
        return completed;
      }
      const completed = user[field] && user[field].toString().trim().length > 0;
      console.log(`  ${field} check:`, completed);
      return completed;
    });
    
    console.log('Completed fields:', completedFields);
    console.log('Total fields:', allFields.length);
    
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
      .limit(50);
    
    console.log('Total active jobs:', allJobs.length);
    
    // Score each job based on user profile
    const scoredJobs = allJobs.map(job => {
      let score = 0;
      const reasons = [];
      
      // 1. Skills match (30%)
      if (user.skills && user.skills.length > 0 && job.requirements) {
        const userSkillsLower = user.skills.map(s => s.toLowerCase());
        const jobReqLower = job.requirements.toLowerCase();
        const matchingSkills = userSkillsLower.filter(skill => 
          jobReqLower.includes(skill.toLowerCase())
        );
        
        if (matchingSkills.length > 0) {
          const skillScore = (matchingSkills.length / user.skills.length) * 30;
          score += skillScore;
          reasons.push(`${matchingSkills.length} habilidade(s) compatível(is): ${matchingSkills.join(', ')}`);
        }
      }
      
      // 2. Interests match (30%)
      if (user.interests && user.interests.length > 0) {
        const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
        const matchingInterests = user.interests.filter(interest => {
          const interestLower = interest.toLowerCase();
          return jobText.includes(interestLower) || 
                 jobText.includes(interestLower.replace('-', ' '));
        });
        
        if (matchingInterests.length > 0) {
          const interestScore = (matchingInterests.length / user.interests.length) * 30;
          score += interestScore;
          reasons.push(`Área de interesse: ${matchingInterests.join(', ')}`);
        }
      }
      
      // 3. Bio keywords match (20%)
      if (user.bio) {
        const bioWords = user.bio.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const jobText = `${job.title} ${job.description}`.toLowerCase();
        const matchingWords = bioWords.filter(word => jobText.includes(word));
        
        if (matchingWords.length > 0) {
          score += Math.min(20, matchingWords.length * 2);
          reasons.push('Compatível com seu perfil profissional');
        }
      }
      
      // 4. Recent job bonus (10%)
      const daysSincePosted = (Date.now() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 7) {
        score += 10;
        reasons.push('Vaga recente');
      } else if (daysSincePosted < 14) {
        score += 5;
      }
      
      // 5. Location match (10%)
      if (user.address && job.location) {
        if (user.address.toLowerCase().includes(job.location.toLowerCase()) ||
            job.location.toLowerCase().includes(user.address.toLowerCase())) {
          score += 10;
          reasons.push('Localização próxima');
        }
      }
      
      return {
        job: job.toObject(),
        score,
        reasons
      };
    });
    
    // Sort by score and get top recommendations
    const recommendations = scoredJobs
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    
    console.log('Recommendations found:', recommendations.length);
    
    res.json({
      hasRecommendations: true,
      completeness,
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
    console.error('AI Recommendations error:', err);
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
    const logs = await require('../models/AuditLog').find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
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

module.exports = router;
