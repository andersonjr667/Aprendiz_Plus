const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { JobService, UserService } = require('../../services/database');

// Listar vagas com filtros e paginação
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let query = { status: 'aberta' };

        // Filtros
        if (req.query.type) query.type = req.query.type;
        if (req.query.category) query.category = req.query.category;
        if (req.query.location) query.location = new RegExp(req.query.location, 'i');
        if (req.query.search) {
            query.$text = { $search: req.query.search };
        }
        if (req.query.salary) {
            query.salary = { $gte: parseInt(req.query.salary) };
        }

        // Buscar vagas via JobService (simples filtro)
        const jobs = await JobService.findAll({ status: query.status, type: query.type, category: query.category });
        res.json({ jobs, currentPage: page, totalPages: 1, total: jobs.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar nova vaga (apenas empresas)
router.post('/', auth, async (req, res) => {
    try {
        const user = await UserService.findById(req.user.id);
        if (user.type !== 'empresa') {
            return res.status(403).json({ error: 'Apenas empresas podem publicar vagas' });
        }

        const created = await JobService.create({ ...req.body, company: req.user.id });
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Obter detalhes de uma vaga
router.get('/:id', async (req, res) => {
    try {
        const job = await JobService.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Candidatar-se a uma vaga
router.post('/:id/apply', auth, upload.single('resume'), async (req, res) => {
    try {
        const user = await UserService.findById(req.user.id);
        if (user.type !== 'candidato') return res.status(403).json({ error: 'Apenas candidatos podem se candidatar' });

        const job = await JobService.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Vaga não encontrada' });

        // Verificar se já se candidatou
        const alreadyApplied = job.applications && job.applications.some(app => app.candidate === req.user.id);
        if (alreadyApplied) return res.status(400).json({ error: 'Você já se candidatou a esta vaga' });

        // Adicionar candidatura
        job.applications = job.applications || [];
        job.applications.push({ candidate: req.user.id, resumeUrl: req.file ? req.file.path : (user.candidateProfile && user.candidateProfile.resumeUrl) });

        // Salvar alteração no JSON
        const fs = require('fs').promises;
        const path = require('path');
        const dbPath = path.join(__dirname, '../../data/db.json');
        const content = await fs.readFile(dbPath, 'utf8');
        const parsed = JSON.parse(content);
        const idx = parsed.jobs.findIndex(j => j.id === job.id);
        if (idx !== -1) {
            parsed.jobs[idx] = job;
            await fs.writeFile(dbPath, JSON.stringify(parsed, null, 2));
        }

        res.status(201).json({ message: 'Candidatura realizada com sucesso' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Atualizar status de uma vaga (empresa)
router.patch('/:id', auth, async (req, res) => {
    try {
        const job = await JobService.findById(req.params.id);
        if (!job || job.company !== req.user.id) return res.status(404).json({ error: 'Vaga não encontrada ou sem permissão' });
        Object.assign(job, req.body);
        // Salvar no JSON
        const fs = require('fs').promises;
        const path = require('path');
        const dbPath = path.join(__dirname, '../../data/db.json');
        const content = await fs.readFile(dbPath, 'utf8');
        const parsed = JSON.parse(content);
        const idx = parsed.jobs.findIndex(j => j.id === job.id);
        if (idx !== -1) {
            parsed.jobs[idx] = job;
            await fs.writeFile(dbPath, JSON.stringify(parsed, null, 2));
        }
        res.json(job);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Atualizar status de uma candidatura (empresa)
router.patch('/:id/applications/:applicationId', auth, async (req, res) => {
    try {
        const job = await JobService.findById(req.params.id);
        if (!job || job.company !== req.user.id) return res.status(404).json({ error: 'Vaga não encontrada ou sem permissão' });
        const application = (job.applications || []).find(a => a.candidate === req.params.applicationId || a.id === req.params.applicationId);
        if (!application) return res.status(404).json({ error: 'Candidatura não encontrada' });
        application.status = req.body.status;
        // salvar
        const fs = require('fs').promises;
        const path = require('path');
        const dbPath = path.join(__dirname, '../../data/db.json');
        const content = await fs.readFile(dbPath, 'utf8');
        const parsed = JSON.parse(content);
        const idx = parsed.jobs.findIndex(j => j.id === job.id);
        if (idx !== -1) {
            parsed.jobs[idx] = job;
            await fs.writeFile(dbPath, JSON.stringify(parsed, null, 2));
        }
        res.json(application);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;