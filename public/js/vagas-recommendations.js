// AI Recommendations for Jobs Page
console.log('vagas-recommendations.js loaded - OVERRIDING old system');

let currentUserProfile = null;

// Override the old loadAIRecommendations function
window.loadAIRecommendationsNew = async function() {
  try {
    console.log('🧠 Loading NEW AI recommendations from backend...');
    
    const aiSection = document.getElementById('aiRecommendations');
    
    if (!aiSection) {
      console.warn('⚠️ AI section not found in HTML');
      return;
    }
    
    const res = await fetch('/api/jobs/ai-recommendations', {
      credentials: 'include'
    });
    
    if (!res.ok) {
      console.log('❌ Not authenticated or error loading recommendations');
      
      // Show login prompt
      aiSection.style.display = 'block';
      const aiJobsGrid = document.getElementById('aiJobsGrid');
      if (aiJobsGrid) {
        aiJobsGrid.innerHTML = `
          <div class="ai-incomplete-message">
            <i class="fas fa-lock" style="font-size: 4rem; color: #ffd700; margin-bottom: 1rem;"></i>
            <h3>Faça login para recomendações com IA</h3>
            <p>Nosso sistema de IA analisa seu perfil e recomenda as melhores vagas para você!</p>
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
            <i class="fas fa-user-circle" style="font-size: 4rem; color: #3498DB; margin-bottom: 1rem;"></i>
            <h3>Complete seu perfil para recomendações personalizadas</h3>
            <p>${data.message || 'Preencha 100% do seu perfil para receber vagas selecionadas especialmente para você.'}</p>
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
      
      <div class="job-header">
        <h3 class="job-title">
          <a href="/vaga-detalhes?id=${job._id}">${job.title}</a>
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
        <a href="/vaga-detalhes?id=${job._id}" class="btn btn-primary btn-sm">
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
        '🧠 Como funciona a IA?\n\n' +
        'Nossa Inteligência Artificial analisa seu perfil completo:\n\n' +
        '✓ Suas habilidades e competências\n' +
        '✓ Suas áreas de interesse\n' +
        '✓ Seu perfil profissional\n' +
        '✓ Sua localização\n\n' +
        'Com base nisso, selecionamos as vagas mais compatíveis com você, ' +
        'aumentando suas chances de sucesso nas candidaturas!'
      );
    });
  }
}

// Initialize on page load - OVERRIDE old system
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing NEW AI recommendation system...');
  
  // Wait for page to be fully loaded, then load recommendations
  setTimeout(() => {
    console.log('⏰ Timeout reached, calling loadAIRecommendationsNew');
    loadAIRecommendationsNew();
  }, 1500);
  
  setupInfoButton();
});

// Export to window so it can replace the old function
window.loadAIRecommendationsNew = loadAIRecommendationsNew;
