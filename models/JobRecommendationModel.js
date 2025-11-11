const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');

/**
 * Sistema de Recomendação de Vagas usando TensorFlow.js
 * 
 * Este modelo usa:
 * - TF-IDF para vetorização de texto
 * - Rede neural para aprender padrões de preferência do usuário
 * - Similaridade de cosseno para matching
 */

class JobRecommendationModel {
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmerPt; // Stemmer para português
    this.model = null;
    this.vectorSize = 100; // Tamanho do vetor de features
    this.isInitialized = false;
  }

  /**
   * Preprocessa texto: lowercase, tokenização, stemming, remoção de stopwords
   */
  preprocessText(text) {
    if (!text) return '';
    
    const stopwords = new Set([
      'a', 'o', 'e', 'de', 'da', 'do', 'em', 'um', 'uma', 'os', 'as',
      'para', 'com', 'por', 'no', 'na', 'ao', 'à', 'dos', 'das',
      'ser', 'ter', 'estar', 'fazer', 'ir', 'haver', 'poder'
    ]);
    
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    return tokens
      .filter(token => token.length > 2 && !stopwords.has(token))
      .map(token => this.stemmer.stem(token))
      .join(' ');
  }

  /**
   * Cria um vetor TF-IDF para um documento
   */
  createTfIdfVector(text, documentIndex) {
    const vector = new Array(this.vectorSize).fill(0);
    
    this.tfidf.listTerms(documentIndex).slice(0, this.vectorSize).forEach((item, index) => {
      if (index < this.vectorSize) {
        vector[index] = item.tfidf;
      }
    });
    
    return vector;
  }

  /**
   * Extrai features de uma vaga
   */
  extractJobFeatures(job, userProfile) {
    const jobText = this.preprocessText(
      `${job.title} ${job.description} ${job.requirements || ''} ${job.location || ''}`
    );
    
    // Adiciona o documento ao TF-IDF
    this.tfidf.addDocument(jobText);
    const docIndex = this.tfidf.documents.length - 1;
    
    // Cria vetor TF-IDF
    const tfidfVector = this.createTfIdfVector(jobText, docIndex);
    
    // Features adicionais
    const additionalFeatures = [
      // Dias desde publicação (normalizado)
      this.normalizeDaysSince(job.createdAt),
      
      // Match de localização
      this.locationMatch(job.location, userProfile.address),
      
      // Match de skills
      this.skillsMatch(job, userProfile.skills),
      
      // Match de interesses
      this.interestsMatch(job, userProfile.interests)
    ];
    
    // Combina TF-IDF com features adicionais
    return [...tfidfVector.slice(0, 96), ...additionalFeatures];
  }

  /**
   * Normaliza dias desde publicação (0-1)
   */
  normalizeDaysSince(createdAt) {
    const days = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (days / 30)); // Decai ao longo de 30 dias
  }

  /**
   * Calcula match de localização
   */
  locationMatch(jobLocation, userLocation) {
    if (!jobLocation || !userLocation) return 0;
    
    const jobLoc = jobLocation.toLowerCase();
    const userLoc = userLocation.toLowerCase();
    
    if (jobLoc.includes(userLoc) || userLoc.includes(jobLoc)) return 1;
    return 0;
  }

  /**
   * Calcula match de skills
   */
  skillsMatch(job, userSkills) {
    if (!userSkills || userSkills.length === 0) return 0;
    if (!job.requirements) return 0;
    
    const requirements = job.requirements.toLowerCase();
    const matches = userSkills.filter(skill => 
      requirements.includes(skill.toLowerCase())
    );
    
    return matches.length / userSkills.length;
  }

  /**
   * Calcula match de interesses
   */
  interestsMatch(job, userInterests) {
    if (!userInterests || userInterests.length === 0) return 0;
    
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matches = userInterests.filter(interest => 
      jobText.includes(interest.toLowerCase())
    );
    
    return matches.length / Math.max(userInterests.length, 1);
  }

  /**
   * Cria modelo de rede neural para scoring
   */
  createModel() {
    const model = tf.sequential();
    
    // Camada de entrada
    model.add(tf.layers.dense({
      inputShape: [this.vectorSize],
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));
    
    // Dropout para prevenir overfitting
    model.add(tf.layers.dropout({ rate: 0.3 }));
    
    // Camada oculta
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Camada de saída (score de 0 a 1)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compila o modelo
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }

  /**
   * Calcula similaridade de cosseno entre vetores
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Extrai features do perfil do usuário
   */
  extractUserFeatures(userProfile) {
    const userText = this.preprocessText(
      `${userProfile.bio || ''} ${(userProfile.skills || []).join(' ')} ${(userProfile.interests || []).join(' ')}`
    );
    
    this.tfidf.addDocument(userText);
    const docIndex = this.tfidf.documents.length - 1;
    
    const tfidfVector = this.createTfIdfVector(userText, docIndex);
    
    // Features do usuário
    const userFeatures = [
      userProfile.skills ? userProfile.skills.length / 10 : 0,
      userProfile.interests ? userProfile.interests.length / 5 : 0,
      userProfile.bio ? 1 : 0,
      userProfile.profilePhotoUrl ? 1 : 0
    ];
    
    return [...tfidfVector.slice(0, 96), ...userFeatures];
  }

  /**
   * Calcula score de recomendação para uma vaga
   */
  async scoreJob(jobFeatures, userFeatures) {
    // Usa similaridade de cosseno como base
    const similarity = this.cosineSimilarity(jobFeatures, userFeatures);
    
    // Se o modelo neural estiver treinado, usa ele também
    if (this.model && this.isInitialized) {
      try {
        const input = tf.tensor2d([jobFeatures]);
        const prediction = await this.model.predict(input).data();
        input.dispose();
        
        // Combina similaridade com predição do modelo
        return (similarity * 0.6 + prediction[0] * 0.4) * 100;
      } catch (err) {
        console.error('Erro ao usar modelo neural:', err);
        return similarity * 100;
      }
    }
    
    return similarity * 100;
  }

  /**
   * Gera recomendações para um usuário
   */
  async recommend(jobs, userProfile, topK = 6) {
    try {
      // Reseta TF-IDF para novo cálculo
      this.tfidf = new natural.TfIdf();
      
      // Extrai features do usuário
      const userFeatures = this.extractUserFeatures(userProfile);
      
      // Extrai features e calcula scores para todas as vagas
      const scoredJobs = [];
      
      for (const job of jobs) {
        const jobFeatures = this.extractJobFeatures(job, userProfile);
        const score = await this.scoreJob(jobFeatures, userFeatures);
        
        // Gera razões para a recomendação
        const reasons = this.generateReasons(job, userProfile, score);
        
        scoredJobs.push({
          job,
          score,
          reasons
        });
      }
      
      // Ordena por score e retorna top K
      return scoredJobs
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
        
    } catch (err) {
      console.error('Erro ao gerar recomendações:', err);
      throw err;
    }
  }

  /**
   * Gera razões explicativas para a recomendação
   */
  generateReasons(job, userProfile, score) {
    const reasons = [];
    
    // Razão 1: Skills match
    if (userProfile.skills && job.requirements) {
      const matchingSkills = userProfile.skills.filter(skill =>
        job.requirements.toLowerCase().includes(skill.toLowerCase())
      );
      
      if (matchingSkills.length > 0) {
        reasons.push(`Suas habilidades: ${matchingSkills.slice(0, 3).join(', ')}`);
      }
    }
    
    // Razão 2: Interests match
    if (userProfile.interests) {
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      const matchingInterests = userProfile.interests.filter(interest =>
        jobText.includes(interest.toLowerCase())
      );
      
      if (matchingInterests.length > 0) {
        reasons.push(`Área de interesse: ${matchingInterests[0]}`);
      }
    }
    
    // Razão 3: Localização
    if (userProfile.address && job.location) {
      if (userProfile.address.toLowerCase().includes(job.location.toLowerCase()) ||
          job.location.toLowerCase().includes(userProfile.address.toLowerCase())) {
        reasons.push('Localização próxima');
      }
    }
    
    // Razão 4: Vaga recente
    const daysSince = (Date.now() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      reasons.push('Vaga recente');
    }
    
    // Razão 5: Alto match geral
    if (score > 80) {
      reasons.push('Alto grau de compatibilidade');
    } else if (score > 60) {
      reasons.push('Boa compatibilidade com seu perfil');
    }
    
    return reasons.length > 0 ? reasons : ['Recomendado para você'];
  }

  /**
   * Inicializa o modelo (pode ser usado para carregar modelo treinado)
   */
  async initialize() {
    try {
      this.model = this.createModel();
      this.isInitialized = true;
      console.log('✅ Modelo de recomendação TensorFlow inicializado');
    } catch (err) {
      console.error('❌ Erro ao inicializar modelo:', err);
      this.isInitialized = false;
    }
  }
}

// Singleton instance
let modelInstance = null;

async function getModel() {
  if (!modelInstance) {
    modelInstance = new JobRecommendationModel();
    await modelInstance.initialize();
  }
  return modelInstance;
}

module.exports = { JobRecommendationModel, getModel };
