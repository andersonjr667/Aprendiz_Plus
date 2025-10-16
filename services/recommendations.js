const Job = require('../models/Job');
const User = require('../models/User');

// Função para calcular a pontuação de compatibilidade entre um candidato e uma vaga
function calculateJobMatch(job, candidate) {
    let score = 0;
    const weights = {
        skills: 0.4,
        interests: 0.2,
        location: 0.2,
        education: 0.2
    };

    // Comparar habilidades
    const candidateSkills = new Set(candidate.candidateProfile.skills.map(s => s.toLowerCase()));
    const jobSkills = new Set(job.skills.map(s => s.toLowerCase()));
    const matchingSkills = [...candidateSkills].filter(skill => jobSkills.has(skill));
    score += weights.skills * (matchingSkills.length / jobSkills.size);

    // Comparar interesses
    const candidateInterests = new Set(candidate.candidateProfile.interests.map(i => i.toLowerCase()));
    if (candidateInterests.has(job.category.toLowerCase())) {
        score += weights.interests;
    }

    // Comparar localização
    if (candidate.candidateProfile.address.city.toLowerCase() === job.location.toLowerCase()) {
        score += weights.location;
    }

    // Avaliar educação
    const relevantEducation = candidate.candidateProfile.education.some(edu => 
        edu.course.toLowerCase().includes(job.category.toLowerCase()) ||
        job.description.toLowerCase().includes(edu.course.toLowerCase())
    );
    if (relevantEducation) {
        score += weights.education;
    }

    return score;
}

// Função principal de recomendação
async function getJobRecommendations(userId, limit = 10) {
    try {
        const candidate = await User.findById(userId);
        if (!candidate || candidate.type !== 'candidato') {
            throw new Error('Usuário não encontrado ou não é candidato');
        }

        // Buscar vagas abertas
        const openJobs = await Job.find({ 
            status: 'aberta',
            expiresAt: { $gt: new Date() }
        }).populate('company', 'name companyProfile');

        // Calcular pontuação para cada vaga
        const scoredJobs = openJobs.map(job => ({
            job,
            score: calculateJobMatch(job, candidate)
        }));

        // Ordenar por pontuação e retornar os melhores matches
        return scoredJobs
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ job, score }) => ({
                ...job.toObject(),
                matchScore: Math.round(score * 100)
            }));

    } catch (error) {
        throw error;
    }
}

// Função para recomendação de candidatos para uma vaga
async function getJobCandidateRecommendations(jobId, limit = 10) {
    try {
        const job = await Job.findById(jobId);
        if (!job) {
            throw new Error('Vaga não encontrada');
        }

        // Buscar candidatos
        const candidates = await User.find({ 
            type: 'candidato',
            'candidateProfile.skills': { $exists: true }
        });

        // Calcular pontuação para cada candidato
        const scoredCandidates = candidates.map(candidate => ({
            candidate,
            score: calculateJobMatch(job, candidate)
        }));

        // Ordenar por pontuação e retornar os melhores matches
        return scoredCandidates
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ candidate, score }) => ({
                ...candidate.toObject(),
                matchScore: Math.round(score * 100)
            }));

    } catch (error) {
        throw error;
    }
}

module.exports = {
    getJobRecommendations,
    getJobCandidateRecommendations
};