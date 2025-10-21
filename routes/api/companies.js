const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { JobService, UserService } = require('../../services/database');

// GET /api/companies/me/dashboard
router.get('/me/dashboard', auth, async (req, res) => {
    try {
        const user = await UserService.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        if (user.type !== 'empresa' && user.type !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

        // Contar vagas ativas da empresa
        const allJobs = await JobService.findAll({ status: 'aberta' });
        const companyJobs = allJobs.filter(j => j.company === req.user.id);

        // Contar candidaturas nas vagas da empresa
        let applicationsCount = 0;
        companyJobs.forEach(j => {
            if (Array.isArray(j.applications)) applicationsCount += j.applications.length;
        });

        // Recent activity: últimas 5 eventos simples (vagas criadas)
        const recentActivity = (companyJobs || []).slice(-5).reverse().map(j => ({
            id: j.id,
            title: j.title || j.name || 'Vaga',
            createdAt: j.createdAt
        }));

        res.json({
            company: { id: user.id, name: user.companyProfile ? (user.companyProfile.nomeFantasia || user.name) : user.name },
            activeJobs: companyJobs.length,
            applicationsCount,
            recentActivity
        });
    } catch (e) {
        console.error('Companies dashboard error:', e && e.stack ? e.stack : e);
        res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
});

module.exports = router;
