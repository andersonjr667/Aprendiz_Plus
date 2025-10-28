const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const News = require('../models/News');
const { logAction } = require('../middleware/audit');

const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// ----- AUTH -----
router.post('/auth/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    console.log('Registration request body:', req.body); // Log request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Registration validation failed:', errors.array()); // Log validation errors
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, email, password, type } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Email already in use' });
      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, passwordHash: hash, type: type || 'candidato' });
      await logAction({ action: 'register', userId: user._id, resourceType: 'User', resourceId: user._id, details: { type: user.type } });
      res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, type: user.type } });
    } catch (err) { console.error('Error during registration:', err); res.status(500).json({ error: 'Internal server error during registration.' }); }
  });

router.post('/auth/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body); // Debug
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    console.log('User found:', user ? 'yes' : 'no'); // Debug
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.passwordHash);
    console.log('Password match:', match ? 'yes' : 'no'); // Debug
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, type: user.type }, JWT_SECRET, { expiresIn: '7d' });
  // Set httpOnly cookie for server-side auth and also return token in response for client convenience
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true, token, user: { id: user._id, name: user.name, email: user.email, type: user.type } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.post('/auth/forgot', body('email').isEmail(), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
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
    // req.user is populated by authMiddleware (already selected without passwordHash)
    res.json(req.user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// applications of current candidate
router.get('/users/me/applications', authMiddleware, roleCheck(['candidato']), async (req, res) => {
  try {
    const apps = await Application.find({ candidate: req.user._id }).populate('job', 'title');
    const out = apps.map(a => ({ id: a._id, job_id: a.job ? a.job._id : null, job_title: a.job ? a.job.title : '', status: a.status, appliedAt: a.appliedAt }));
    res.json(out);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    if (req.file) updates.resumeUrl = path.join('/uploads', req.file.filename);
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    const jobs = await Job.find({ status: 'aberta' }).populate('company', 'name companyProfile');
    res.json(jobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/jobs/:id', async (req, res) => {
  try { const job = await Job.findById(req.params.id).populate('company', 'name'); if (!job) return res.status(404).json({ error: 'Not found' }); res.json(job); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/jobs', authMiddleware, roleCheck(['empresa']), async (req, res) => {
  try {
    const data = req.body;
    data.company = req.user._id;
    const job = await Job.create(data);
    await logAction({ action: 'create_job', userId: req.user._id, resourceType: 'Job', resourceId: job._id, details: { title: job.title } });
    res.json(job);
  } catch (err) { res.status(500).json({ error: err.message }); }
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

router.delete('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    if (job.company.toString() !== req.user._id.toString() && req.user.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await job.remove();
    await logAction({ action: 'delete_job', userId: req.user._id, resourceType: 'Job', resourceId: job._id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const app = await Application.create({ candidate: req.user._id, job: job._id, resumeUrl: req.file ? path.join('/uploads', req.file.filename) : req.user.resumeUrl });
    job.applications.push(app._id);
    await job.save();
    await logAction({ action: 'apply_job', userId: req.user._id, resourceType: 'Application', resourceId: app._id, details: { jobId: job._id } });
    res.json(app);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  try { const news = await News.find().sort({ createdAt: -1 }); res.json(news); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/news', authMiddleware, roleCheck(['admin','empresa']), upload.single('image'), async (req, res) => {
  try {
    const data = req.body;
    if (req.file) data.imageUrl = path.join('/uploads', req.file.filename);
    data.author = req.user._id;
    const n = await News.create(data);
    res.json(n);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/news/:id', async (req, res) => { try { const n = await News.findById(req.params.id); if (!n) return res.status(404).json({ error: 'Not found' }); res.json(n); } catch (err) { res.status(500).json({ error: err.message }); } });

// ----- AUDIT LOGS -----
router.get('/logs', authMiddleware, roleCheck(['admin']), async (req, res) => {
  try {
    const logs = await require('../models/AuditLog').find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
