const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const pagesDir = path.join(__dirname, '..', 'public', 'pages');

function sendPage(res, filename) {
	try {
		const filePath = path.join(pagesDir, filename);
		let html = fs.readFileSync(filePath, 'utf8');
		// set CSP header to allow only our own scripts
		res.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests");
		res.send(html);
	} catch (err) {
		res.status(500).send('Error loading page');
	}
}

// Home / core
router.get('/', (req, res) => sendPage(res, 'index.html'));

// Auth
router.get('/login', (req, res) => sendPage(res, 'login.html'));
router.get('/register', (req, res) => sendPage(res, 'register.html'));
router.get('/forgot-password', (req, res) => sendPage(res, 'forgot-password.html'));
router.get('/recuperar-senha', (req, res) => sendPage(res, 'recuperar-senha.html'));
router.get('/reset-password', (req, res) => sendPage(res, 'reset-password.html'));

// Jobs / Vagas
router.get('/vagas', (req, res) => sendPage(res, 'vagas.html'));
router.get('/job/:id', (req, res) => sendPage(res, 'job-detail.html'));
router.get('/vaga/:id', (req, res) => sendPage(res, 'vaga-detalhes.html'));
router.get('/vaga-detalhes/:id', (req, res) => sendPage(res, 'vaga-detalhes.html'));
router.get('/publicar-vaga', (req, res) => sendPage(res, 'publicar-vaga.html'));
router.get('/publish-job', (req, res) => sendPage(res, 'publish-job.html'));

// Dashboards / profiles
router.get('/dashboard-candidato', (req, res) => sendPage(res, 'dashboard-candidato.html'));
router.get('/dashboard-empresa', (req, res) => sendPage(res, 'dashboard-empresa.html'));
router.get('/profile', (req, res) => sendPage(res, 'profile.html'));
router.get('/perfil-candidato', (req, res) => sendPage(res, 'perfil-candidato.html'));
router.get('/perfil-empresa', (req, res) => sendPage(res, 'perfil-empresa.html'));

// Admin
router.get('/admin-panel', (req, res) => sendPage(res, 'admin-panel.html'));
router.get('/admin', (req, res) => sendPage(res, 'admin.html'));
router.get('/admin-usuarios', (req, res) => sendPage(res, 'admin-usuarios.html'));
router.get('/admin-noticia', (req, res) => sendPage(res, 'admin-noticia.html'));

// News
router.get('/news', (req, res) => sendPage(res, 'news.html'));
router.get('/noticias', (req, res) => sendPage(res, 'noticias.html'));
router.get('/news/:id', (req, res) => sendPage(res, 'news.html'));
router.get('/noticia/:id', (req, res) => sendPage(res, 'news.html'));

// Listings
router.get('/empresas', (req, res) => sendPage(res, 'empresas.html'));
router.get('/candidatos', (req, res) => sendPage(res, 'candidatos.html'));

// Other pages
router.get('/contato', (req, res) => sendPage(res, 'contato.html'));
router.get('/search', (req, res) => sendPage(res, 'search-results.html'));
router.get('/not-found', (req, res) => sendPage(res, '404.html'));

// Fallback for unknown routes -> 404 page
router.get('*', (req, res) => { res.status(404); sendPage(res, '404.html'); });

module.exports = router;
