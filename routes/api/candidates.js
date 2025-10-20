const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { UserService, JobService } = require('../../services/database');

// Obter candidaturas do usuário
router.get('/me/applications', auth, async (req, res) => {
    try {
        const user = await UserService.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        // Buscar todas as vagas
        const jobs = await JobService.findAll();
        
        // Filtrar as vagas que o usuário se candidatou
        const applications = jobs.reduce((acc, job) => {
            const application = (job.applications || []).find(app => app.candidate === req.user.id);
            if (application) {
                acc.push({
                    id: job.id,
                    job: {
                        id: job.id,
                        title: job.title,
                        company_name: job.company_name,
                        city: job.city,
                        state: job.state
                    },
                    status: application.status || 'pending',
                    appliedAt: application.appliedAt || new Date().toISOString()
                });
            }
            return acc;
        }, []);

        res.json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter cursos do usuário
router.get('/me/courses', auth, async (req, res) => {
    try {
        const user = await UserService.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const courses = user.courses || [
            {
                id: 1,
                title: "Introdução à Informática",
                description: "Aprenda os fundamentos da computação",
                progress: 75,
                status: "in_progress"
            }
        ];

        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar perfil do candidato
router.patch('/me', auth, async (req, res) => {
    try {
        const user = await UserService.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        // Atualizar apenas os campos permitidos
        const allowedFields = ['aboutMe', 'education', 'courses', 'skills'];
        const updates = {};
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        Object.assign(user, updates);

        // Salvar no arquivo JSON
        await UserService.update(user.id, updates);

        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;