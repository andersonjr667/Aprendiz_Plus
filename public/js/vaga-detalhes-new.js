// ============================================
// JOB DETAIL PAGE - Premium Functionality
// ============================================

// State
let currentJob = null;
let isFavorited = false;
let hasApplied = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const jobId = getJobIdFromUrl();
    
    if (!jobId) {
        showError();
        return;
    }
    
    loadJobDetails(jobId);
    initializeEventListeners();
});

// Get job ID from URL
function getJobIdFromUrl() {
    // Primeiro tenta pegar da query string (?id=...)
    const queryParams = new URLSearchParams(window.location.search);
    const queryId = queryParams.get('id');
    if (queryId) return queryId;
    
    // Se não encontrar, pega da URL /vaga/{id}
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'vaga' && pathParts[2]) {
        return pathParts[2];
    }
    
    return null;
}

// Load job details
async function loadJobDetails(jobId) {
    try {
        showLoading();
        
        const response = await fetch(`/api/jobs/${jobId}`);
        
        if (!response.ok) {
            throw new Error('Job not found');
        }
        
        currentJob = await response.json();
        
        // Track view with AI system
        trackJobView(currentJob);
        
        // Update page
        updatePageMeta(currentJob);
        renderJobDetails(currentJob);
        loadSimilarJobs(currentJob);
        checkFavoriteStatus(jobId);
        checkApplicationStatus(jobId);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading job:', error);
        showError();
    }
}

// Render job details
function renderJobDetails(job) {
    // Badges
    renderBadges(job);
    
    // Header
    document.getElementById('jobTitle').textContent = job.title || 'Título não disponível';
    
    // Company name - handle both string and object
    const companyName = typeof job.company === 'object' ? job.company.name : job.company;
    document.getElementById('companyName').textContent = companyName || 'Empresa não informada';
    
    // Company info
    const companyLogo = document.getElementById('companyLogo');
    if (job.companyLogo) {
        companyLogo.innerHTML = `<img src="${job.companyLogo}" alt="${companyName}">`;
    } else {
        const initial = (companyName || 'E').charAt(0).toUpperCase();
        companyLogo.innerHTML = initial;
    }
    
    document.getElementById('companyLocation').innerHTML = `
        <i class="fas fa-map-marker-alt"></i> ${job.location || 'Não informado'}
    `;
    
    document.getElementById('companySize').innerHTML = `
        <i class="fas fa-users"></i> ${job.companySize || 'Não informado'}
    `;
    
    document.getElementById('companyIndustry').innerHTML = `
        <i class="fas fa-industry"></i> ${job.industry || 'Diversos'}
    `;
    
    // Quick info
    renderQuickInfo(job);
    
    // Description
    const descSection = document.getElementById('jobDescription');
    descSection.innerHTML = `
        <h3><i class="fas fa-file-alt"></i> Descrição da Vaga</h3>
        <p>${job.description || 'Descrição não disponível.'}</p>
    `;
    
    // Requirements
    const reqSection = document.getElementById('jobRequirements');
    if (job.requirements && job.requirements.length > 0) {
        const reqList = Array.isArray(job.requirements) 
            ? job.requirements 
            : job.requirements.split('\n').filter(r => r.trim());
            
        reqSection.innerHTML = `
            <h3><i class="fas fa-check-circle"></i> Requisitos</h3>
            <ul>
                ${reqList.map(req => `<li>${req}</li>`).join('')}
            </ul>
        `;
    } else {
        reqSection.style.display = 'none';
    }
    
    // Benefits
    const benSection = document.getElementById('jobBenefits');
    if (job.benefits && job.benefits.length > 0) {
        const benList = Array.isArray(job.benefits) 
            ? job.benefits 
            : job.benefits.split('\n').filter(b => b.trim());
            
        benSection.innerHTML = `
            <h3><i class="fas fa-gift"></i> Benefícios</h3>
            <div class="benefits-grid">
                ${benList.map(benefit => `
                    <div class="benefit-item">
                        <i class="fas fa-check"></i>
                        <span>${benefit}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        benSection.style.display = 'none';
    }
    
    // Job info stats
    renderJobStats(job);
}

// Render badges
function renderBadges(job) {
    const badgesContainer = document.getElementById('jobBadges');
    const badges = [];
    
    // Check if job is new (less than 7 days)
    if (job.createdAt) {
        const jobDate = new Date(job.createdAt);
        const daysSince = Math.floor((Date.now() - jobDate) / (1000 * 60 * 60 * 24));
        
        if (daysSince <= 7) {
            badges.push('<span class="badge-premium badge-new"><i class="fas fa-star"></i> Nova</span>');
        }
    }
    
    if (job.featured) {
        badges.push('<span class="badge-premium badge-featured"><i class="fas fa-crown"></i> Destaque</span>');
    }
    
    if (job.urgent) {
        badges.push('<span class="badge-premium badge-urgent"><i class="fas fa-bolt"></i> Urgente</span>');
    }
    
    badgesContainer.innerHTML = badges.join('');
}

// Render quick info
function renderQuickInfo(job) {
    const container = document.getElementById('jobQuickInfo');
    
    const infoItems = [
        {
            icon: 'fa-briefcase',
            label: 'Modalidade',
            value: job.workModel || 'Não informado'
        },
        {
            icon: 'fa-map-marker-alt',
            label: 'Localização',
            value: job.location || 'Não informado'
        },
        {
            icon: 'fa-clock',
            label: 'Regime',
            value: job.workType || 'Não informado'
        },
        {
            icon: 'fa-dollar-sign',
            label: 'Salário',
            value: job.salary || 'A combinar'
        }
    ];
    
    container.innerHTML = infoItems.map(item => `
        <div class="info-item">
            <div class="info-icon">
                <i class="fas ${item.icon}"></i>
            </div>
            <div class="info-content">
                <h4>${item.label}</h4>
                <p>${item.value}</p>
            </div>
        </div>
    `).join('');
}

// Render job stats
function renderJobStats(job) {
    const container = document.getElementById('jobInfoStats');
    
    const stats = [
        {
            label: 'Publicada há',
            value: getTimeAgo(job.createdAt)
        },
        {
            label: 'Candidaturas',
            value: job.applicants || '0'
        },
        {
            label: 'Visualizações',
            value: job.views || '0'
        },
        {
            label: 'Vagas',
            value: job.positions || '1'
        }
    ];
    
    container.innerHTML = stats.map(stat => `
        <div class="stat-item">
            <span class="stat-label">${stat.label}</span>
            <span class="stat-value">${stat.value}</span>
        </div>
    `).join('');
}

// Load similar jobs
async function loadSimilarJobs(currentJob) {
    try {
        const response = await fetch('/api/jobs');
        const allJobs = await response.json();
        
        // Filter similar jobs (same category or location, exclude current)
        const similarJobs = allJobs
            .filter(job => 
                job.id !== currentJob.id && 
                (job.category === currentJob.category || job.location === currentJob.location)
            )
            .slice(0, 3);
        
        if (similarJobs.length === 0) {
            document.getElementById('similarJobs').style.display = 'none';
            return;
        }
        
        const container = document.getElementById('similarJobsList');
        container.innerHTML = similarJobs.map(job => {
            const companyName = typeof job.company === 'object' ? job.company.name : job.company;
            return `
                <div class="similar-job-item" onclick="window.location.href='/vaga/${job.id}'">
                    <h4>${job.title}</h4>
                    <div class="similar-job-meta">
                        <span><i class="fas fa-building"></i> ${companyName}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading similar jobs:', error);
        document.getElementById('similarJobs').style.display = 'none';
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Back button
    document.getElementById('btnVoltar').addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/vagas';
        }
    });
    
    // Apply button
    document.getElementById('btnApply').addEventListener('click', handleApply);
    
    // Favorite button
    document.getElementById('btnFavorite').addEventListener('click', handleFavorite);
    
    // Share button (mobile)
    document.getElementById('btnShare').addEventListener('click', handleShare);
    
    // Share buttons in widget
    document.querySelectorAll('.share-btn-widget').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const platform = e.currentTarget.dataset.platform;
            shareOnPlatform(platform);
        });
    });
}

// Handle apply
async function handleApply() {
    if (hasApplied) {
        alert('Você já se candidatou para esta vaga!');
        return;
    }
    
    const btnApply = document.getElementById('btnApply');
    btnApply.disabled = true;
    btnApply.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    
    try {
        const response = await fetch(`/api/jobs/${currentJob.id}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobId: currentJob.id
            })
        });
        
        if (response.ok) {
            hasApplied = true;
            localStorage.setItem(`applied_${currentJob.id}`, 'true');
            
            btnApply.innerHTML = '<i class="fas fa-check"></i> Candidatura Enviada';
            btnApply.classList.add('applied');
            
            showApplicationModal();
        } else {
            throw new Error('Failed to apply');
        }
        
    } catch (error) {
        console.error('Error applying:', error);
        alert('Erro ao enviar candidatura. Por favor, tente novamente.');
        
        btnApply.disabled = false;
        btnApply.innerHTML = '<i class="fas fa-paper-plane"></i> Candidatar-se';
    }
}

// Handle favorite
function handleFavorite() {
    const btnFavorite = document.getElementById('btnFavorite');
    
    if (isFavorited) {
        // Remove from favorites
        const favorites = JSON.parse(localStorage.getItem('favoriteJobs') || '[]');
        const updatedFavorites = favorites.filter(id => id !== currentJob.id);
        localStorage.setItem('favoriteJobs', JSON.stringify(updatedFavorites));
        
        isFavorited = false;
        btnFavorite.classList.remove('favorited');
        btnFavorite.innerHTML = '<i class="far fa-heart"></i> Salvar';
        
        // Track unfavorite with AI
        if (window.jobAI) {
            // Could implement negative tracking
        }
    } else {
        // Add to favorites
        const favorites = JSON.parse(localStorage.getItem('favoriteJobs') || '[]');
        favorites.push(currentJob.id);
        localStorage.setItem('favoriteJobs', JSON.stringify(favorites));
        
        isFavorited = true;
        btnFavorite.classList.add('favorited');
        btnFavorite.innerHTML = '<i class="fas fa-heart"></i> Salvo';
        
        // Track favorite with AI
        trackJobFavorite(currentJob);
    }
}

// Handle share (mobile)
async function handleShare() {
    const shareData = {
        title: currentJob.title,
        text: `Confira esta vaga: ${currentJob.title} na ${currentJob.company}`,
        url: window.location.href
    };
    
    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            console.log('Share canceled');
        }
    } else {
        copyToClipboard(window.location.href);
        alert('Link copiado para a área de transferência!');
    }
}

// Share on platform
function shareOnPlatform(platform) {
    const url = encodeURIComponent(window.location.href);
    const companyName = typeof currentJob.company === 'object' ? currentJob.company.name : currentJob.company;
    const title = encodeURIComponent(`${currentJob.title} - ${companyName}`);
    const text = encodeURIComponent(`Confira esta vaga: ${currentJob.title}`);
    
    const shareUrls = {
        whatsapp: `https://api.whatsapp.com/send?text=${text}%20${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`
    };
    
    if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

// Check favorite status
function checkFavoriteStatus(jobId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteJobs') || '[]');
    isFavorited = favorites.includes(jobId);
    
    if (isFavorited) {
        const btnFavorite = document.getElementById('btnFavorite');
        btnFavorite.classList.add('favorited');
        btnFavorite.innerHTML = '<i class="fas fa-heart"></i> Salvo';
    }
}

// Check application status
function checkApplicationStatus(jobId) {
    hasApplied = localStorage.getItem(`applied_${jobId}`) === 'true';
    
    if (hasApplied) {
        const btnApply = document.getElementById('btnApply');
        btnApply.innerHTML = '<i class="fas fa-check"></i> Candidatura Enviada';
        btnApply.classList.add('applied');
        btnApply.disabled = true;
    }
}

// Track job view with AI
function trackJobView(job) {
    if (window.jobAI && typeof window.jobAI.trackJobView === 'function') {
        window.jobAI.trackJobView(job);
    }
}

// Track job favorite with AI
function trackJobFavorite(job) {
    if (window.jobAI && typeof window.jobAI.trackJobFavorite === 'function') {
        window.jobAI.trackJobFavorite(job);
    }
}

// Update page meta tags
function updatePageMeta(job) {
    const companyName = typeof job.company === 'object' ? job.company.name : job.company;
    document.title = `${job.title} - ${companyName} | Aprendiz+`;
    
    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.content = `${job.title} na ${companyName}. ${job.description?.substring(0, 150)}...`;
    }
    
    // Update OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
        ogTitle.content = `${job.title} - ${companyName}`;
    }
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
        ogDesc.content = `${job.description?.substring(0, 200)}...`;
    }
}

// Show application modal
function showApplicationModal() {
    document.getElementById('applicationModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('applicationModal').style.display = 'none';
}

// Show loading
function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('jobContent').style.display = 'none';
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('jobContent').style.display = 'grid';
}

// Show error
function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('jobContent').style.display = 'none';
}

// Get time ago
function getTimeAgo(date) {
    if (!date) return 'Recente';
    
    const jobDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - jobDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return '1 dia';
    if (diffDays < 7) return `${diffDays} dias`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas`;
    return `${Math.floor(diffDays / 30)} meses`;
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('applicationModal');
    if (e.target === modal) {
        closeModal();
    }
});
