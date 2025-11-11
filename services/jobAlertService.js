const User = require('../models/User');
const Job = require('../models/Job');
const emailService = require('./emailService');

/**
 * Serviço para detectar e notificar candidatos sobre vagas compatíveis
 */
class JobAlertService {
  
  /**
   * Verifica se uma vaga é compatível com o perfil do candidato
   */
  calculateJobMatch(candidate, job) {
    let score = 0;
    const reasons = [];
    
    // Verifica skills do candidato
    if (candidate.skills && candidate.skills.length > 0 && job.requirements) {
      const matchedSkills = candidate.skills.filter(skill => 
        job.requirements.some(req => 
          req.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(req.toLowerCase())
        )
      );
      
      if (matchedSkills.length > 0) {
        score += matchedSkills.length * 10;
        reasons.push(`${matchedSkills.length} habilidade(s) compatível(is)`);
      }
    }
    
    // Verifica áreas de interesse
    if (candidate.interests && candidate.interests.length > 0 && job.area) {
      const matchesInterest = candidate.interests.some(interest => 
        job.area.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(job.area.toLowerCase())
      );
      
      if (matchesInterest) {
        score += 20;
        reasons.push('Área de interesse');
      }
    }
    
    // Verifica localização (se disponível)
    if (candidate.address && job.location) {
      const candidateCity = candidate.address.toLowerCase();
      const jobLocation = job.location.toLowerCase();
      
      if (candidateCity.includes(jobLocation) || jobLocation.includes(candidateCity)) {
        score += 15;
        reasons.push('Localização compatível');
      }
    }
    
    // Se tem educação compatível
    if (candidate.education && job.description) {
      const education = candidate.education.toLowerCase();
      const description = job.description.toLowerCase();
      
      if (description.includes(education) || education.includes('ensino médio') || education.includes('em andamento')) {
        score += 5;
      }
    }
    
    return { score, reasons, isMatch: score >= 15 };
  }
  
  /**
   * Encontra vagas compatíveis para um candidato específico
   */
  async findMatchingJobsForCandidate(candidateId, limit = 5) {
    try {
      const candidate = await User.findById(candidateId);
      if (!candidate || candidate.type !== 'candidato') {
        return [];
      }
      
      // Busca vagas ativas criadas nos últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const jobs = await Job.find({
        status: { $in: ['active', 'aberta'] },
        createdAt: { $gte: sevenDaysAgo }
      }).populate('company', 'name');
      
      // Calcula score de compatibilidade para cada vaga
      const matchedJobs = jobs.map(job => {
        const match = this.calculateJobMatch(candidate, job);
        return {
          job,
          ...match
        };
      }).filter(item => item.isMatch)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // Formata jobs para o template de email
      return matchedJobs.map(item => ({
        id: item.job._id,
        title: item.job.title,
        company: item.job.company.name,
        location: item.job.location,
        area: item.job.area,
        score: item.score,
        reasons: item.reasons
      }));
    } catch (error) {
      console.error('Error finding matching jobs:', error);
      return [];
    }
  }
  
  /**
   * Envia alertas de vagas para candidatos ativos
   */
  async sendJobAlertsToActiveCandidates() {
    try {
      // Busca candidatos ativos com alertas habilitados
      const candidates = await User.find({
        type: 'candidato',
        status: 'active',
        jobAlerts: { $ne: false },
        emailNotifications: { $ne: false }
      });
      
      console.log(`🔍 Checking job alerts for ${candidates.length} candidates...`);
      
      const results = [];
      let emailsSent = 0;
      
      for (const candidate of candidates) {
        const matchingJobs = await this.findMatchingJobsForCandidate(candidate._id);
        
        if (matchingJobs.length > 0) {
          console.log(`✅ Found ${matchingJobs.length} matching jobs for ${candidate.name}`);
          
          const result = await emailService.sendJobAlertEmail(candidate, matchingJobs);
          results.push({
            candidateId: candidate._id,
            candidateName: candidate.name,
            email: candidate.email,
            jobsFound: matchingJobs.length,
            ...result
          });
          
          if (result.success) {
            emailsSent++;
          }
          
          // Delay para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`📧 Job alerts sent: ${emailsSent}/${candidates.length} candidates`);
      
      return {
        totalCandidates: candidates.length,
        emailsSent,
        results
      };
    } catch (error) {
      console.error('Error sending job alerts:', error);
      throw error;
    }
  }
  
  /**
   * Envia alerta de vaga específica para candidatos compatíveis
   * Útil quando uma nova vaga é publicada
   */
  async notifyCandidatesAboutNewJob(jobId) {
    try {
      const job = await Job.findById(jobId).populate('company', 'name');
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Busca candidatos ativos com alertas habilitados
      const candidates = await User.find({
        type: 'candidato',
        status: 'active',
        jobAlerts: { $ne: false },
        emailNotifications: { $ne: false }
      });
      
      const results = [];
      let emailsSent = 0;
      
      for (const candidate of candidates) {
        const match = this.calculateJobMatch(candidate, job);
        
        // Só envia se houver match significativo (score >= 20)
        if (match.score >= 20) {
          const jobForEmail = {
            id: job._id,
            title: job.title,
            company: job.company.name,
            location: job.location,
            area: job.area
          };
          
          const result = await emailService.sendJobAlertEmail(candidate, [jobForEmail]);
          
          if (result.success) {
            emailsSent++;
          }
          
          results.push({
            candidateId: candidate._id,
            candidateName: candidate.name,
            matchScore: match.score,
            ...result
          });
          
          // Delay para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`📧 Notified ${emailsSent} candidates about new job: ${job.title}`);
      
      return {
        jobTitle: job.title,
        candidatesNotified: emailsSent,
        results
      };
    } catch (error) {
      console.error('Error notifying candidates about new job:', error);
      throw error;
    }
  }
}

module.exports = new JobAlertService();
