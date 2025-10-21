const Job = require('../models/Job');
const User = require('../models/User');

// Função para calcular TF (Term Frequency)
function calculateTF(text) {
    const words = text.toLowerCase().split(/\W+/);
    const tf = {};
    words.forEach(word => {
        tf[word] = (tf[word] || 0) + 1;
    });
    // Normalizar
    const wordCount = words.length;
    Object.keys(tf).forEach(word => {
        tf[word] = tf[word] / wordCount;
    });
    return tf;
}

// Função para calcular similaridade de cosseno
function cosineSimilarity(vec1, vec2) {
    const intersection = Object.keys(vec1).filter(key => vec2[key] !== undefined);
    
    const dotProduct = intersection.reduce((sum, key) => sum + vec1[key] * vec2[key], 0);
    
    const norm1 = Math.sqrt(Object.values(vec1).reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(Object.values(vec2).reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (norm1 * norm2) || 0;
}

// Função para calcular a pontuação de compatibilidade entre um candidato e uma vaga
function calculateJobMatch(job, candidate) {
    let score = 0;
    const weights = {
        skills: 0.3,
        interests: 0.15,
        location: 0.15,
        education: 0.15,
        description: 0.15,
        experience: 0.1
    };

    // 1. Comparar habilidades usando similaridade de cosseno
    const candidateSkillsVec = {};
    candidate.candidateProfile.skills.forEach(skill => {
        candidateSkillsVec[skill.toLowerCase()] = 1;
    });
    const jobSkillsVec = {};
    job.skills.forEach(skill => {
        jobSkillsVec[skill.toLowerCase()] = 1;
    });
    const skillSimilarity = cosineSimilarity(candidateSkillsVec, jobSkillsVec);
    score += weights.skills * skillSimilarity;

    // 2. Comparar interesses
    const candidateInterests = new Set(candidate.candidateProfile.interests.map(i => i.toLowerCase()));
    if (candidateInterests.has(job.category.toLowerCase())) {
        score += weights.interests;
    }

    // 3. Comparar localização com flexibilidade para cidades próximas
    if (candidate.candidateProfile.address.city.toLowerCase() === job.location.toLowerCase()) {
        score += weights.location;
    } else if (candidate.candidateProfile.address.state.toLowerCase() === job.state.toLowerCase()) {
        score += weights.location * 0.5; // Meio peso se estiver no mesmo estado
    }

    // 4. Avaliar educação com análise mais detalhada
    const relevantEducation = candidate.candidateProfile.education.some(edu => {
        // Verifica o curso
        const courseRelevant = edu.course.toLowerCase().includes(job.category.toLowerCase()) ||
                             job.description.toLowerCase().includes(edu.course.toLowerCase());
        
        // Verifica o nível de educação necessário
        const levelMatch = job.educationLevel ? 
                         edu.level.toLowerCase() === job.educationLevel.toLowerCase() :
                         true;
        
        return courseRelevant && levelMatch;
    });
    if (relevantEducation) {
        score += weights.education;
    }

    // 5. Análise de descrição usando TF
    const jobDescriptionTF = calculateTF(job.description);
    const candidateDescriptionTF = calculateTF(candidate.candidateProfile.about || '');
    const descriptionSimilarity = cosineSimilarity(jobDescriptionTF, candidateDescriptionTF);
    score += weights.description * descriptionSimilarity;

    // 6. Análise de experiência/senioridade
    const candidateExperience = candidate.candidateProfile.experience || [];
    const totalExperience = candidateExperience.reduce((sum, exp) => {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        return sum + (end - start) / (1000 * 60 * 60 * 24 * 365); // Anos
    }, 0);

    // Mapear requisitos de experiência da vaga
    const requiredExperience = job.experienceRequired || 0;
    if (totalExperience >= requiredExperience) {
        score += weights.experience;
    } else if (totalExperience >= requiredExperience * 0.7) {
        score += weights.experience * 0.7; // Pontuação parcial se próximo do requisito
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

        // Filtrar vagas que o candidato já se candidatou
        const appliedJobs = new Set(candidate.candidateProfile.applications?.map(app => app.jobId.toString()));
        const availableJobs = openJobs.filter(job => !appliedJobs.has(job._id.toString()));

        // Calcular pontuação para cada vaga
        const scoredJobs = availableJobs.map(job => ({
            job,
            score: calculateJobMatch(job, candidate)
        }));

        // Ordenar por pontuação e retornar os melhores matches
        return scoredJobs
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ job, score }) => ({
                ...job.toObject(),
                matchScore: Math.round(score * 100),
                matchDetails: {
                    skillsMatch: Math.round(cosineSimilarity(
                        Object.fromEntries(job.skills.map(s => [s.toLowerCase(), 1])),
                        Object.fromEntries(candidate.candidateProfile.skills.map(s => [s.toLowerCase(), 1]))
                    ) * 100),
                    locationMatch: candidate.candidateProfile.address.city.toLowerCase() === job.location.toLowerCase(),
                    educationMatch: candidate.candidateProfile.education.some(edu => 
                        edu.course.toLowerCase().includes(job.category.toLowerCase())
                    )
                }
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

        // Filtrar candidatos que já se candidataram
        const appliedCandidates = new Set((await Job.findById(jobId).populate('applications.candidate')).applications.map(app => 
            app.candidate._id.toString()
        ));
        
        const availableCandidates = candidates.filter(candidate => 
            !appliedCandidates.has(candidate._id.toString())
        );

        // Calcular pontuação para cada candidato
        const scoredCandidates = availableCandidates.map(candidate => ({
            candidate,
            score: calculateJobMatch(job, candidate)
        }));

        // Ordenar por pontuação e retornar os melhores matches
        return scoredCandidates
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ candidate, score }) => ({
                ...candidate.toObject(),
                matchScore: Math.round(score * 100),
                matchDetails: {
                    skillsMatch: Math.round(cosineSimilarity(
                        Object.fromEntries(job.skills.map(s => [s.toLowerCase(), 1])),
                        Object.fromEntries(candidate.candidateProfile.skills.map(s => [s.toLowerCase(), 1]))
                    ) * 100),
                    locationMatch: candidate.candidateProfile.address.city.toLowerCase() === job.location.toLowerCase(),
                    educationMatch: candidate.candidateProfile.education.some(edu => 
                        edu.course.toLowerCase().includes(job.category.toLowerCase())
                    )
                }
            }));

    } catch (error) {
        throw error;
    }
}

module.exports = {
    getJobRecommendations,
    getJobCandidateRecommendations
};