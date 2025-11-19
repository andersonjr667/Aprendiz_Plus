 // AI Recommendations for Jobs Page - TensorFlow.js Powered
console.log('🤖 vagas-recommendations.js loaded - TensorFlow.js System');
console.log('📍 Current page:', window.location.pathname);
console.log('📦 Auth available:', typeof window.Auth);

let currentUserProfile = null;

// Override the old loadAIRecommendations function
window.loadAIRecommendationsNew = async function() {
  try {
    console.log('🧠 Loading AI recommendations with TensorFlow.js...');
    
    const aiSection = document.getElementById('aiRecommendations');
    
    if (!aiSection) {
      console.warn('⚠️ AI section not found in HTML');
      return;
    }
    
    // Get token directly from localStorage (mais confiável)
    const token = localStorage.getItem('aprendizplus_token');
    
    console.log('🔑 Token check:', token ? `Token found (${token.substring(0, 20)}...)` : 'No token');
    console.log('📦 localStorage keys:', Object.keys(localStorage));
    
    if (!token) {
      console.log('❌ No token found, user not authenticated');
      console.log('💡 User needs to login at /login');
      console.log('🔍 Checking all storage...');
      console.log('  - localStorage.aprendizplus_token:', localStorage.getItem('aprendizplus_token'));
      console.log('  - sessionStorage.aprendizplus_token:', sessionStorage.getItem('aprendizplus_token'));
      
      // Show login prompt
      aiSection.style.display = 'block';
      const aiJobsGrid = document.getElementById('aiJobsGrid');
      if (aiJobsGrid) {
        aiJobsGrid.innerHTML = `
          <div class="ai-incomplete-message">
            <i class="fas fa-robot" style="font-size: 4rem; color: #ffd700; margin-bottom: 1rem;"></i>
            <h3>Faça login para recomendações com IA</h3>
            <p>Nosso sistema de Machine Learning com <strong>TensorFlow.js</strong> analisa seu perfil e recomenda as melhores vagas para você!</p>
            <div style="margin-top: 1rem;">
              <a href="/login" class="btn btn-primary" style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
                <i class="fas fa-sign-in-alt"></i> Fazer Login
              </a>
            </div>
          </div>
        `;
      }
      return;
    }
    
    console.log('📡 Fetching AI recommendations with TensorFlow...');
    console.log('🌐 Endpoint: /api/jobs/ai-recommendations');
    
    const res = await fetch('/api/jobs/ai-recommendations', {
      credentials: 'include',
      // Removido: headers
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', res.status);
    console.log('📡 Response ok:', res.ok);
    // Removido: log de response headers
    
    if (!res.ok) {
      // Try to get error details
      let errorData;
      try {
        errorData = await res.json();
        console.log('❌ Error JSON response:', errorData);
      } catch (e) {
        const errorText = await res.text();
        console.log('❌ Error text response:', errorText);
        errorData = { error: errorText };
      }
      
      // If 401/403, token is invalid - show login
      if (res.status === 401 || res.status === 403) {
        console.log('🔒 Authentication failed - token may be expired');
        localStorage.removeItem('aprendizplus_token');
        if (window.Auth && window.Auth.removeToken) {
          window.Auth.removeToken();
        }
      }
      
      // Show login prompt
      aiSection.style.display = 'block';
      const aiJobsGrid = document.getElementById('aiJobsGrid');
      if (aiJobsGrid) {
        aiJobsGrid.innerHTML = `
          <div class="ai-incomplete-message">
            <i class="fas fa-robot" style="font-size: 4rem; color: #ffd700; margin-bottom: 1rem;"></i>
            <h3>Faça login para recomendações com IA</h3>
            <p>Nosso sistema de Machine Learning com <strong>TensorFlow.js</strong> analisa seu perfil e recomenda as melhores vagas para você!</p>
            <a href="/login" class="btn btn-primary" style="margin-top: 1rem;">
              <i class="fas fa-sign-in-alt"></i> Fazer Login
            </a>
          </div>
        `;
      }
      return;
    }
    
    const data = await res.json();
    console.log('✅ AI recommendations response:', data);
    console.log('📊 Completeness received:', data.completeness);
    console.log('🎯 Has recommendations:', data.hasRecommendations);
    console.log('🤖 Using TensorFlow:', data.usedTensorFlow);
    
    if (data.missingFields) {
      console.log('⚠️ Missing fields:', data.missingFields);
    }
    
    currentUserProfile = data.userProfile;
    
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    // Update profile strength bar
    if (strengthFill && strengthText) {
      strengthFill.style.width = data.completeness + '%';
      strengthText.textContent = data.completeness + '% completo';
      
      // Color based on completeness
      if (data.completeness === 100) {
        strengthFill.style.background = 'linear-gradient(90deg, #2ECC71 0%, #27AE60 100%)';
      } else if (data.completeness >= 70) {
        strengthFill.style.background = 'linear-gradient(90deg, #3498DB 0%, #2980B9 100%)';
      } else {
        strengthFill.style.background = 'linear-gradient(90deg, #F39C12 0%, #E67E22 100%)';
      }
    }
    
    // Show AI section
    aiSection.style.display = 'block';
    
    if (!data.hasRecommendations || data.completeness < 100) {
      // Show message to complete profile
      const aiJobsGrid = document.getElementById('aiJobsGrid');
      if (aiJobsGrid) {
        aiJobsGrid.innerHTML = `
          <div class="ai-incomplete-message">
            <i class="fas fa-robot" style="font-size: 4rem; color: #3498DB; margin-bottom: 1rem;"></i>
            <h3>Complete seu perfil para recomendações com Machine Learning</h3>
            <p>${data.message || 'Preencha 100% do seu perfil para receber vagas selecionadas com TensorFlow.js especialmente para você.'}</p>
            <p style="font-size: 0.9rem; color: #7f8c8d; margin-top: 1rem;">
              <strong>Faltam apenas ${100 - data.completeness}% para desbloquear!</strong>
            </p>
            <a href="/perfil-candidato" class="btn btn-primary" style="margin-top: 1rem;">
              <i class="fas fa-user-edit"></i> Completar Perfil
            </a>
          </div>
        `;
      }
      return;
    }
    
    // Display recommendations
    displayRecommendations(data.recommendations);
    
  } catch (error) {
    console.error('Error loading AI recommendations:', error);
  }
}

// Display job recommendations
function displayRecommendations(recommendations) {
  const aiJobsGrid = document.getElementById('aiJobsGrid');
  if (!aiJobsGrid) return;
  
  if (!recommendations || recommendations.length === 0) {
    aiJobsGrid.innerHTML = `
      <div class="ai-no-matches">
        <i class="fas fa-search" style="font-size: 3rem; color: #95a5a6; margin-bottom: 1rem;"></i>
        <h3>Nenhuma vaga encontrada no momento</h3>
        <p>Continue navegando pelas vagas disponíveis abaixo ou ajuste seus filtros de busca.</p>
      </div>
    `;
    return;
  }
  
  aiJobsGrid.innerHTML = recommendations.map(job => `
    <div class="job-card ai-recommended" data-job-id="${job._id}">
      <div class="ai-badge">
        <i class="fas fa-brain"></i>
        <span>${job.aiScore}% Match</span>
      </div>
      
      <!-- Removido: job-header -->
        <h3 class="job-title">
          <a href="/vaga/${job._id}">${job.title}</a>
        </h3>
        <div class="company-name">
          <i class="fas fa-building"></i>
          ${job.company?.name || 'Empresa'}
        </div>
      </div>
      
      <div class="job-meta">
        <span class="job-location">
          <i class="fas fa-map-marker-alt"></i>
          ${job.location || 'Não informado'}
        </span>
        <span class="job-type">
          <i class="fas fa-briefcase"></i>
          ${job.type || 'Estágio'}
        </span>
        ${job.salary ? `
          <span class="job-salary">
            <i class="fas fa-dollar-sign"></i>
            ${job.salary}
          </span>
        ` : ''}
      </div>
      
      <div class="job-description">
        ${job.description ? job.description.substring(0, 150) + '...' : ''}
      </div>
      
      ${job.matchReasons && job.matchReasons.length > 0 ? `
        <div class="ai-match-reasons">
          <strong><i class="fas fa-check-circle"></i> Por que recomendamos:</strong>
          <ul>
            ${job.matchReasons.slice(0, 3).map(reason => `<li>${reason}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="job-footer">
        <div class="job-date">
          <i class="fas fa-clock"></i>
          Publicada ${formatDate(job.createdAt)}
        </div>
        <a href="/vaga/${job._id}" class="btn btn-primary btn-sm">
          Ver Detalhes
          <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </div>
  `).join('');
}

// Format date helper
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString('pt-BR');
}

// Info button handler
function setupInfoButton() {
  const infoBtn = document.getElementById('aiInfoBtn');
  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      alert(
        '� Como funciona a IA com TensorFlow.js?\n\n' +
        'Nossa Inteligência Artificial usa Machine Learning para analisar:\n\n' +
        '✓ TF-IDF: Vetorização de texto avançada\n' +
        '✓ Similaridade de Cosseno: Matching semântico\n' +
        '✓ Redes Neurais: Aprendizado de padrões\n' +
        '✓ Processamento de Linguagem Natural (NLP)\n\n' +
        'O modelo analisa:\n' +
        '• Suas habilidades e competências\n' +
        '• Suas áreas de interesse\n' +
        '• Seu perfil profissional\n' +
        '• Sua localização\n\n' +
        'Com base nisso, selecionamos as vagas mais compatíveis com você usando algoritmos de Machine Learning!'
      );
    });
  }
}

// Initialize on page load - TensorFlow.js System
function initAIRecommendations() {
  console.log('🚀 Initializing TensorFlow.js AI recommendation system...');
  console.log('📍 URL:', window.location.href);
  console.log('📦 Document readyState:', document.readyState);
  
  // Check if we're on the vagas page
  const aiSection = document.getElementById('aiRecommendations');
  if (!aiSection) {
    console.log('⚠️ Not on vagas page (no aiRecommendations element), skipping AI recommendations');
    return;
  }
  
  console.log('✅ AI section found, proceeding...');
  
  // Load recommendations immediately
  loadAIRecommendationsNew();
  setupInfoButton();
}

// Run initialization ASAP
console.log('📌 Script execution point - readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initAIRecommendations);
} else {
  console.log('✅ Document already loaded, initializing immediately...');
  // DOM is already ready - call immediately
  initAIRecommendations();
}

// Export to window so it can replace the old function
window.loadAIRecommendationsNew = loadAIRecommendationsNew;
