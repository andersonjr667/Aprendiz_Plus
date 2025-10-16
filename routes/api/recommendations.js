const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { getJobRecommendations, getJobCandidateRecommendations } = require('../../services/recommendations');

// Obter recomendações de vagas para um candidato
router.get('/jobs', auth, async (req, res) => {
    try {
        const recommendations = await getJobRecommendations(req.user.id, req.query.limit);
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter recomendações de candidatos para uma vaga (apenas empresas)
router.get('/candidates/:jobId', auth, async (req, res) => {
    try {
        const recommendations = await getJobCandidateRecommendations(req.params.jobId, req.query.limit);
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;