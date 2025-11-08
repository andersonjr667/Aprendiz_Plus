// ============================================
// AI-powered Job Recommendation Engine v2.0
// Sistema de Recomendação Inteligente para Jovens Aprendizes
// ============================================

class JobRecommendationAI {
  constructor() {
    this.userProfile = this.loadUserProfile();
    this.interactionHistory = this.loadInteractionHistory();
    
    // Pesos dos critérios de avaliação
    this.weights = {
      formacao: 0.20,        // 20% - Formação e estudo atual
      comportamental: 0.20,  // 20% - Perfil comportamental
      habilidades: 0.15,     // 15% - Habilidades e potencial
      localizacao: 0.20,     // 20% - Localização e disponibilidade
      interesses: 0.15,      // 15% - Interesses e afinidade
      contextoSocial: 0.10   // 10% - Contexto social
    };
  }

  // ============================================
  // PERFIL DO USUÁRIO
  // ============================================

  loadUserProfile() {
    const stored = localStorage.getItem('ai_user_profile_v2');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    }
    
    return {
      // 1. Formação e estudo
      formacao: {
        estudandoAtualmente: null,        // boolean
        serieAnoEscolar: null,            // string: "9º ano", "1º médio", etc
        tipoEnsino: null,                 // "fundamental", "médio", "técnico", "EJA"
        desempenhoEscolar: null,          // 1-5
        interesseContinuar: null,         // boolean
        cursoTecnico: null,               // string ou null
        cursosExtras: [],                 // array de strings
        alfabetizacaoDigital: null,       // 1-5
        conhecimentoBasico: null,         // 1-5 (matemática/português)
        horarioEstudo: null               // "manhã", "tarde", "noite"
      },
      
      // 2. Objetivos e motivação
      objetivos: {
        interesseProfissao: null,         // 1-5
        primeiroEmprego: null,            // boolean
        areasInteresse: [],               // ["administrativo", "vendas", "tecnologia"]
        nivelMotivacao: null,             // 1-5
        expectativaEmpresa: [],           // ["aprender", "crescer", "contribuir"]
        disciplina: null,                 // 1-5
        desenvolvimentoProfissional: null,// 1-5
        interesseCarreira: null,          // 1-5
        comprometimento: null             // 1-5
      },
      
      // 3. Perfil comportamental (inferido de interações)
      comportamental: {
        responsabilidade: 3,              // 1-5 (default médio)
        comunicacao: 3,                   // 1-5
        trabalhoEquipe: 3,                // 1-5
        vontadeAprender: 3,               // 1-5
        organizacao: 3,                   // 1-5
        disposicao: 3,                    // 1-5
        empatia: 3,                       // 1-5
        posturaPositiva: 3,               // 1-5
        etica: 3                          // 1-5
      },
      
      // 4. Habilidades e potencial (inferido)
      habilidades: {
        curiosidade: 3,                   // 1-5
        resolucaoProblemas: 3,            // 1-5
        atencaoDetalhes: 3,               // 1-5
        facilidadeAprender: 3,            // 1-5
        adaptabilidade: 3,                // 1-5
        criatividade: 3,                  // 1-5
        seguirInstrucoes: 3,              // 1-5
        foco: 3,                          // 1-5
        informaticaBasica: 3              // 1-5
      },
      
      // 5. Localização e mobilidade
      localizacao: {
        bairro: null,                     // string
        cidade: null,                     // string
        tempoDeslocamento: null,          // minutos
        acessoTransporte: null,           // 1-5
        custoTransporte: null,            // R$
        disposicaoMudar: false,           // boolean
        regiaoPreferida: null,            // string
        coordenadas: null                 // {lat, lng}
      },
      
      // 6. Disponibilidade
      disponibilidade: {
        turnoEstudo: null,                // "manhã", "tarde", "noite"
        horariosLivres: [],               // ["manhã", "tarde"]
        diasDisponiveis: [],              // [1,2,3,4,5] (seg-sex)
        flexibilidadeHorario: null,       // 1-5
        tempoMinimo: null,                // meses
        previsaoConclusao: null,          // data ou string
        responsabilidadesFamiliares: null,// 1-5 (quanto maior, menos disponível)
        comprometimentosExtras: [],       // array de strings
        periodoPreferido: null            // "manhã", "tarde"
      },
      
      // 7. Interesses e afinidade (aprendido com interações)
      interesses: {
        areasPreferidas: {},              // {area: peso}
        tiposEmpresa: {},                 // {tipo: peso}
        atividadesPreferidas: {},         // {atividade: peso}
        atendimentoPublico: null,         // 1-5
        tarefasOrganizacionais: null,     // 1-5
        afinidadeTecnologia: null,        // 1-5
        comunicacaoMarketing: null,       // 1-5
        atividadesManuais: null,          // 1-5
        funcoesAdministrativas: null,     // 1-5
        trabalhoEquipe: null              // 1-5
      },
      
      // 8. Contexto pessoal e social
      contextoSocial: {
        idade: null,                      // number
        documentacaoCompleta: null,       // boolean
        situacaoEscolarRegular: null,     // boolean
        apoioFamiliar: null,              // 1-5
        vulnerabilidadeSocial: null,      // 1-5 (maior = mais vulnerável)
        programasSociais: [],             // array de strings
        acessoRecursos: null,             // 1-5
        situacaoFinanceira: null,         // 1-5
        responsabilidadesDomesticas: null,// 1-5
        projetosSociais: []               // array de strings
      },
      
      // Dados de histórico de interações
      historico: {
        vagasVisualizadas: {},            // {jobId: count}
        vagasFavoritadas: [],             // [jobIds]
        buscasRealizadas: [],             // [searchTerms]
        categoriasAcessadas: {},          // {categoria: count}
        empresasInteressadas: {},         // {empresa: peso}
        ultimaAtualizacao: null
      }
    };
  }

  saveUserProfile() {
    this.userProfile.historico.ultimaAtualizacao = new Date().toISOString();
    localStorage.setItem('ai_user_profile_v2', JSON.stringify(this.userProfile));
  }

  loadInteractionHistory() {
    const stored = localStorage.getItem('ai_interaction_history_v2');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  saveInteractionHistory() {
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100);
    }
    localStorage.setItem('ai_interaction_history_v2', JSON.stringify(this.interactionHistory));
  }

  // ============================================
  // ATUALIZAÇÃO DE PERFIL BASEADO EM INTERAÇÕES
  // ============================================

  // Rastrear visualização de vaga
  trackJobView(job, timeSpent = 0) {
    const jobId = job._id || job.id;
    
    // Registrar no histórico
    this.userProfile.historico.vagasVisualizadas[jobId] = 
      (this.userProfile.historico.vagasVisualizadas[jobId] || 0) + 1;
    
    // Aprender preferências baseado na vaga visualizada
    this.learnFromJobInteraction(job, 'view', timeSpent);
    
    // Adicionar ao histórico de interações
    this.interactionHistory.push({
      type: 'view',
      jobId: jobId,
      timestamp: new Date().toISOString(),
      timeSpent: timeSpent,
      jobData: {
        title: job.title,
        company: typeof job.company === 'object' ? job.company.name : job.company,
        location: job.location,
        category: job.category,
        workModel: job.workModel
      }
    });
    
    this.saveUserProfile();
    this.saveInteractionHistory();
  }

  // Rastrear favoritar vaga
  trackJobFavorite(job, isFavorited = true) {
    const jobId = job._id || job.id;
    
    if (isFavorited) {
      if (!this.userProfile.historico.vagasFavoritadas.includes(jobId)) {
        this.userProfile.historico.vagasFavoritadas.push(jobId);
      }
      // Peso maior para favoritos
      this.learnFromJobInteraction(job, 'favorite', 0);
    } else {
      this.userProfile.historico.vagasFavoritadas = 
        this.userProfile.historico.vagasFavoritadas.filter(id => id !== jobId);
    }
    
    this.interactionHistory.push({
      type: isFavorited ? 'favorite' : 'unfavorite',
      jobId: jobId,
      timestamp: new Date().toISOString(),
      jobData: {
        title: job.title,
        category: job.category
      }
    });
    
    this.saveUserProfile();
    this.saveInteractionHistory();
  }

  // Rastrear busca
  trackSearch(query, location, workModel) {
    if (query) {
      this.userProfile.historico.buscasRealizadas.push({
        query: query,
        timestamp: new Date().toISOString()
      });
      
      // Aprender palavras-chave da busca
      this.learnKeywordsFromSearch(query);
    }
    
    if (location) {
      this.userProfile.localizacao.regiaoPreferida = location;
    }
    
    this.saveUserProfile();
  }

  // Aprender com interação de vaga
  learnFromJobInteraction(job, interactionType, timeSpent = 0) {
    // Peso baseado no tipo de interação
    let weight = 1.0;
    if (interactionType === 'favorite') weight = 3.0;
    else if (interactionType === 'apply') weight = 5.0;
    else if (interactionType === 'view' && timeSpent > 30) weight = 2.0;
    
    // Aprender área de interesse
    if (job.category) {
      const categoria = job.category.toLowerCase();
      this.userProfile.interesses.areasPreferidas[categoria] = 
        (this.userProfile.interesses.areasPreferidas[categoria] || 0) + weight;
      
      this.userProfile.historico.categoriasAcessadas[categoria] = 
        (this.userProfile.historico.categoriasAcessadas[categoria] || 0) + 1;
    }
    
    // Aprender tipo de empresa
    const company = typeof job.company === 'object' ? job.company.name : job.company;
    if (company) {
      this.userProfile.historico.empresasInteressadas[company] = 
        (this.userProfile.historico.empresasInteressadas[company] || 0) + weight;
    }
    
    // Aprender modelo de trabalho preferido
    if (job.workModel) {
      const model = job.workModel.toLowerCase();
      this.userProfile.interesses.tiposEmpresa[model] = 
        (this.userProfile.interesses.tiposEmpresa[model] || 0) + weight;
    }
    
    // Aprender localização preferida
    if (job.location && !this.userProfile.localizacao.regiaoPreferida) {
      this.userProfile.localizacao.regiaoPreferida = job.location;
    }
    
    // Inferir habilidades baseado em interesses repetidos
    this.inferSkillsFromInteractions();
    
    // Normalizar pesos para evitar crescimento infinito
    this.normalizeWeights();
  }

  // Aprender palavras-chave de busca
  learnKeywordsFromSearch(query) {
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    keywords.forEach(keyword => {
      if (!this.userProfile.interesses.areasPreferidas[keyword]) {
        this.userProfile.interesses.areasPreferidas[keyword] = 0.5;
      }
    });
  }

  // Inferir habilidades baseado em padrões de interação
  inferSkillsFromInteractions() {
    const totalInteractions = this.interactionHistory.length;
    
    if (totalInteractions > 5) {
      // Curiosidade: quantas categorias diferentes explorou
      const categorias = Object.keys(this.userProfile.historico.categoriasAcessadas).length;
      this.userProfile.habilidades.curiosidade = Math.min(5, Math.ceil(categorias / 2));
      
      // Foco: tempo médio em vagas
      const viewsComTempo = this.interactionHistory.filter(i => i.type === 'view' && i.timeSpent > 0);
      if (viewsComTempo.length > 0) {
        const avgTime = viewsComTempo.reduce((sum, i) => sum + i.timeSpent, 0) / viewsComTempo.length;
        this.userProfile.habilidades.foco = Math.min(5, Math.ceil(avgTime / 20));
      }
      
      // Organização: proporção de favoritos
      const favoriteRatio = this.userProfile.historico.vagasFavoritadas.length / totalInteractions;
      this.userProfile.habilidades.organizacao = Math.min(5, Math.ceil(favoriteRatio * 20));
    }
  }

  // Normalizar pesos para evitar valores muito altos
  normalizeWeights() {
    const decay = 0.95;
    
    // Normalizar áreas preferidas
    Object.keys(this.userProfile.interesses.areasPreferidas).forEach(key => {
      this.userProfile.interesses.areasPreferidas[key] *= decay;
      if (this.userProfile.interesses.areasPreferidas[key] < 0.1) {
        delete this.userProfile.interesses.areasPreferidas[key];
      }
    });
    
    // Normalizar tipos de empresa
    Object.keys(this.userProfile.interesses.tiposEmpresa).forEach(key => {
      this.userProfile.interesses.tiposEmpresa[key] *= decay;
      if (this.userProfile.interesses.tiposEmpresa[key] < 0.1) {
        delete this.userProfile.interesses.tiposEmpresa[key];
      }
    });
  }

  // ============================================
  // CÁLCULO DE SCORE DE COMPATIBILIDADE
  // ============================================

  calculateRelevanceScore(job) {
    let scores = {
      formacao: 0,
      comportamental: 0,
      habilidades: 0,
      localizacao: 0,
      interesses: 0,
      contextoSocial: 0
    };
    
    // 1. FORMAÇÃO E ESTUDO (20%)
    scores.formacao = this.scoreFormacao(job);
    
    // 2. PERFIL COMPORTAMENTAL (20%)
    scores.comportamental = this.scoreComportamental(job);
    
    // 3. HABILIDADES E POTENCIAL (15%)
    scores.habilidades = this.scoreHabilidades(job);
    
    // 4. LOCALIZAÇÃO E DISPONIBILIDADE (20%)
    scores.localizacao = this.scoreLocalizacao(job);
    
    // 5. INTERESSES E AFINIDADE (15%)
    scores.interesses = this.scoreInteresses(job);
    
    // 6. CONTEXTO SOCIAL (10%)
    scores.contextoSocial = this.scoreContextoSocial(job);
    
    // Calcular score final ponderado
    const finalScore = 
      scores.formacao * this.weights.formacao +
      scores.comportamental * this.weights.comportamental +
      scores.habilidades * this.weights.habilidades +
      scores.localizacao * this.weights.localizacao +
      scores.interesses * this.weights.interesses +
      scores.contextoSocial * this.weights.contextoSocial;
    
    return Math.round(finalScore);
  }

  // Score de Formação (0-100)
  scoreFormacao(job) {
    let score = 50; // Base neutro
    
    // Verificar escolaridade compatível
    if (this.userProfile.formacao.tipoEnsino && job.education) {
      const escolaridadeMatch = this.matchEscolaridade(
        this.userProfile.formacao.tipoEnsino, 
        job.education
      );
      score += escolaridadeMatch ? 30 : -20;
    }
    
    // Desempenho escolar
    if (this.userProfile.formacao.desempenhoEscolar) {
      score += (this.userProfile.formacao.desempenhoEscolar - 3) * 5;
    }
    
    // Curso técnico relevante
    if (this.userProfile.formacao.cursoTecnico && job.category) {
      if (job.category.toLowerCase().includes(this.userProfile.formacao.cursoTecnico.toLowerCase())) {
        score += 20;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Score de Comportamental (0-100)
  scoreComportamental(job) {
    const perfil = this.userProfile.comportamental;
    
    // Média das características comportamentais
    const valores = Object.values(perfil);
    const media = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    
    // Converter escala 1-5 para 0-100
    return (media / 5) * 100;
  }

  // Score de Habilidades (0-100)
  scoreHabilidades(job) {
    const habilidades = this.userProfile.habilidades;
    
    // Habilidades mais relevantes para jovem aprendiz
    const relevantes = [
      habilidades.facilidadeAprender,
      habilidades.adaptabilidade,
      habilidades.seguirInstrucoes,
      habilidades.foco
    ];
    
    const media = relevantes.reduce((sum, val) => sum + val, 0) / relevantes.length;
    return (media / 5) * 100;
  }

  // Score de Localização (0-100)
  scoreLocalizacao(job) {
    let score = 50;
    
    // Localização compatível
    if (this.userProfile.localizacao.regiaoPreferida && job.location) {
      const locUser = this.userProfile.localizacao.regiaoPreferida.toLowerCase();
      const locJob = job.location.toLowerCase();
      
      if (locUser === locJob || locUser.includes(locJob) || locJob.includes(locUser)) {
        score = 90;
      } else {
        score = 30;
      }
    }
    
    // Modelo de trabalho (remoto sempre compatível)
    if (job.workModel && job.workModel.toLowerCase() === 'remoto') {
      score = Math.max(score, 80);
    }
    
    // Disponibilidade de horário
    if (this.userProfile.disponibilidade.turnoEstudo && job.schedule) {
      // Verificar compatibilidade de turnos
      score += this.checkScheduleCompatibility(
        this.userProfile.disponibilidade.turnoEstudo,
        job.schedule
      );
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Score de Interesses (0-100)
  scoreInteresses(job) {
    let score = 50;
    
    // Match com categorias de interesse
    if (job.category) {
      const categoria = job.category.toLowerCase();
      const interesse = this.userProfile.interesses.areasPreferidas[categoria] || 0;
      
      if (interesse > 0) {
        // Normalizar interesse (assumindo max 10)
        score += Math.min(50, (interesse / 10) * 50);
      }
    }
    
    // Match com histórico de buscas
    if (job.title) {
      const titleLower = job.title.toLowerCase();
      const buscasRelevantes = this.userProfile.historico.buscasRealizadas.filter(busca => 
        titleLower.includes(busca.query.toLowerCase()) || 
        busca.query.toLowerCase().includes(titleLower)
      );
      
      if (buscasRelevantes.length > 0) {
        score += Math.min(30, buscasRelevantes.length * 10);
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Score de Contexto Social (0-100)
  scoreContextoSocial(job) {
    let score = 50;
    
    // Idade compatível (14-24 para jovem aprendiz)
    if (this.userProfile.contextoSocial.idade) {
      const idade = this.userProfile.contextoSocial.idade;
      if (idade >= 14 && idade <= 24) {
        score += 30;
      } else {
        score -= 30;
      }
    }
    
    // Documentação completa
    if (this.userProfile.contextoSocial.documentacaoCompleta === true) {
      score += 10;
    }
    
    // Situação escolar regular
    if (this.userProfile.contextoSocial.situacaoEscolarRegular === true) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  matchEscolaridade(userEdu, jobEdu) {
    const niveis = {
      'fundamental': 1,
      'médio': 2,
      'medio': 2,
      'técnico': 3,
      'tecnico': 3,
      'superior': 4
    };
    
    const userNivel = niveis[userEdu.toLowerCase()] || 1;
    const jobNivel = niveis[jobEdu.toLowerCase()] || 1;
    
    return userNivel >= jobNivel;
  }

  checkScheduleCompatibility(userTurno, jobSchedule) {
    const turnos = {
      'manhã': ['tarde', 'noite'],
      'manha': ['tarde', 'noite'],
      'tarde': ['manhã', 'manha', 'noite'],
      'noite': ['manhã', 'manha', 'tarde']
    };
    
    const compativel = turnos[userTurno.toLowerCase()] || [];
    const jobLower = jobSchedule.toLowerCase();
    
    return compativel.some(t => jobLower.includes(t)) ? 20 : -10;
  }

  // ============================================
  // RECOMENDAÇÕES
  // ============================================

  async getRecommendations(limit = 10) {
    try {
      const response = await fetch('/api/jobs');
      const allJobs = await response.json();
      
      // Calcular score para cada vaga
      const jobsWithScores = allJobs.map(job => ({
        ...job,
        aiScore: this.calculateRelevanceScore(job)
      }));
      
      // Ordenar por score e retornar top N
      return jobsWithScores
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  // Obter resumo do perfil
  getProfileSummary() {
    const totalInteractions = this.interactionHistory.length;
    const favorites = this.userProfile.historico.vagasFavoritadas.length;
    const searches = this.userProfile.historico.buscasRealizadas.length;
    const categorias = Object.keys(this.userProfile.historico.categoriasAcessadas).length;
    
    // Calcular força do perfil (0-100%)
    let profileStrength = 0;
    
    // Dados básicos (30%)
    if (this.userProfile.formacao.estudandoAtualmente !== null) profileStrength += 10;
    if (this.userProfile.localizacao.bairro) profileStrength += 10;
    if (this.userProfile.contextoSocial.idade) profileStrength += 10;
    
    // Interações (40%)
    if (totalInteractions > 0) profileStrength += 10;
    if (totalInteractions > 5) profileStrength += 10;
    if (favorites > 0) profileStrength += 10;
    if (searches > 0) profileStrength += 10;
    
    // Diversidade (30%)
    if (categorias > 0) profileStrength += 10;
    if (categorias > 2) profileStrength += 10;
    if (categorias > 5) profileStrength += 10;
    
    return {
      profileStrength: Math.min(100, profileStrength),
      totalInteractions,
      favorites,
      searches,
      topCategories: Object.entries(this.userProfile.historico.categoriasAcessadas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat),
      topInterests: Object.entries(this.userProfile.interesses.areasPreferidas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([area]) => area)
    };
  }

  // Resetar perfil
  resetProfile() {
    localStorage.removeItem('ai_user_profile_v2');
    localStorage.removeItem('ai_interaction_history_v2');
    this.userProfile = this.loadUserProfile();
    this.interactionHistory = [];
  }
}

// Inicializar IA globalmente
window.jobAI = new JobRecommendationAI();
console.log('🤖 AI Recommendation System v2.0 initialized');
