const express = require('express');
const path = require('path');
const router = express.Router();

const pagesDir = path.join(__dirname, '..', 'public', 'pages');

router.get('/', (req, res) => res.sendFile(path.join(pagesDir, 'index.html')));
router.get('/login', (req, res) => res.sendFile(path.join(pagesDir, 'login.html')));
router.get('/register', (req, res) => res.sendFile(path.join(pagesDir, 'register.html')));
router.get('/job/:id', (req, res) => res.sendFile(path.join(pagesDir, 'job-detail.html')));
router.get('/dashboard-candidato', (req, res) => res.sendFile(path.join(pagesDir, 'dashboard-candidato.html')));
router.get('/dashboard-empresa', (req, res) => res.sendFile(path.join(pagesDir, 'dashboard-empresa.html')));
router.get('/admin-panel', (req, res) => res.sendFile(path.join(pagesDir, 'admin-panel.html')));
router.get('/publish-job', (req, res) => res.sendFile(path.join(pagesDir, 'publish-job.html')));
router.get('/profile', (req, res) => res.sendFile(path.join(pagesDir, 'profile.html')));
router.get('/news', (req, res) => res.sendFile(path.join(pagesDir, 'news.html')));
router.get('/search', (req, res) => res.sendFile(path.join(pagesDir, 'search-results.html')));

module.exports = router;
