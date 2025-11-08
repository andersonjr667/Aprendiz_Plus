// noticias.js - Enhanced with categories, pagination, and sidebar
let allNews = [];
let displayedCount = 6;
let currentCategory = 'all';

// Category translations
const categories = {
  'carreira': 'Carreira',
  'entrevistas': 'Entrevistas',
  'tendencias': 'Tendências',
  'dicas': 'Dicas',
  'mercado': 'Mercado'
};

// Get random category for demo
function getRandomCategory() {
  const keys = Object.keys(categories);
  return keys[Math.floor(Math.random() * keys.length)];
}

// Format date in Portuguese
function formatDate(dateString) {
  if (!dateString) return 'Data não disponível';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// Truncate text
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Share article
function shareArticle(newsId, title) {
  const url = `${window.location.origin}/news/${newsId}`;
  const text = `Confira este artigo: ${title}`;
  
  if (navigator.share) {
    navigator.share({
      title: title,
      text: text,
      url: url
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(`${text} - ${url}`).then(() => {
      alert('Link copiado para a área de transferência!');
    });
  }
}

// Render news card
function renderNewsCard(news, isFeatured = false) {
  const newsId = news._id || news.id;
  const author = news.author?.name || 'Aprendiz+ Redação';
  const category = news.category || getRandomCategory();
  const date = formatDate(news.createdAt);
  
  if (isFeatured) {
    return `
      <article class="featured-article">
        <div class="featured-image">
          ${news.image ? `<img src="${news.image}" alt="${news.title}">` : '<i class="fas fa-newspaper placeholder-icon"></i>'}
          <span class="featured-badge">⭐ EM DESTAQUE</span>
        </div>
        <div class="featured-content">
          <span class="featured-category">${categories[category] || 'Notícias'}</span>
          <h2 class="featured-title">${news.title}</h2>
          <div class="featured-meta">
            <span><i class="far fa-calendar"></i> ${date}</span>
            <span><i class="far fa-user"></i> ${author}</span>
          </div>
          <p class="featured-excerpt">${truncate(news.content, 200)}</p>
          <a href="/news/${newsId}" class="btn-readmore">
            Leia o artigo completo <i class="fas fa-arrow-right"></i>
          </a>
        </div>
      </article>
    `;
  }
  
  return `
    <article class="news-card">
      <div class="news-image">
        ${news.image ? `<img src="${news.image}" alt="${news.title}">` : '<i class="fas fa-newspaper placeholder-icon"></i>'}
        <span class="news-category-badge">${categories[category] || 'Notícias'}</span>
      </div>
      <div class="news-body">
        <div class="news-meta">
          <span><i class="far fa-calendar"></i> ${date}</span>
          <span><i class="far fa-user"></i> ${author}</span>
        </div>
        <h3 class="news-title">${news.title}</h3>
        <p class="news-excerpt">${truncate(news.content, 150)}</p>
        <div class="news-footer">
          <a href="/news/${newsId}" class="btn-readmore">
            Leia mais <i class="fas fa-arrow-right"></i>
          </a>
          <div class="share-buttons">
            <button class="btn-share" onclick="shareArticle('${newsId}', '${news.title.replace(/'/g, "\\'")}')">
              <i class="fas fa-share-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

// Render news grid
function renderNews() {
  const container = document.getElementById('news');
  if (!container) return;
  
  // Filter by category
  let filteredNews = currentCategory === 'all' 
    ? allNews 
    : allNews.filter(n => (n.category || getRandomCategory()) === currentCategory);
  
  if (filteredNews.length === 0) {
    container.innerHTML = `
      <div class="news-empty">
        <i class="fas fa-search"></i>
        <h3>Nenhum artigo encontrado</h3>
        <p>Não há artigos nesta categoria no momento. Tente outra categoria!</p>
      </div>
    `;
    document.getElementById('loadMoreContainer').style.display = 'none';
    return;
  }
  
  // Show featured article + regular cards
  const toShow = filteredNews.slice(0, displayedCount);
  const hasFeatured = displayedCount >= 6 && filteredNews.length > 0;
  
  let html = '';
  
  // Featured article (first one, if showing 6 or more)
  if (hasFeatured) {
    html += renderNewsCard(toShow[0], true);
    html += toShow.slice(1).map(news => renderNewsCard(news)).join('');
  } else {
    html = toShow.map(news => renderNewsCard(news)).join('');
  }
  
  container.innerHTML = html;
  
  // Show/hide load more button
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  if (loadMoreContainer) {
    loadMoreContainer.style.display = displayedCount < filteredNews.length ? 'block' : 'none';
  }
}

// Load more articles
function loadMore() {
  displayedCount += 6;
  renderNews();
  
  // Smooth scroll to new content
  setTimeout(() => {
    const cards = document.querySelectorAll('.news-card');
    if (cards.length > 0) {
      cards[cards.length - 6]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// Setup category filters
function setupCategoryFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update category and reset pagination
      currentCategory = btn.dataset.category;
      displayedCount = 6;
      renderNews();
      
      // Scroll to top of news
      document.querySelector('.news-grid')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// Load popular news for sidebar
async function loadPopularNews() {
  const container = document.getElementById('popularNews');
  if (!container) return;
  
  // Use first 5 news as "popular" (in real app, this would be based on views/clicks)
  const popular = allNews.slice(0, 5);
  
  if (popular.length === 0) {
    container.innerHTML = '<p style="color: #999; font-size: 14px;">Nenhum artigo popular no momento.</p>';
    return;
  }
  
  container.innerHTML = popular.map((news, index) => {
    const newsId = news._id || news.id;
    return `
      <div class="popular-news-item">
        <a href="/news/${newsId}">
          <span class="number">${index + 1}</span>
          <span>${truncate(news.title, 80)}</span>
        </a>
      </div>
    `;
  }).join('');
}

// Load recent jobs for sidebar
async function loadRecentJobs() {
  const container = document.getElementById('recentJobs');
  if (!container) return;
  
  try {
    const res = await fetch('/api/jobs?limit=5');
    const data = await res.json();
    
    if (!res.ok || !data.items || data.items.length === 0) {
      container.innerHTML = '<li style="color: #999; font-size: 14px;">Nenhuma vaga disponível.</li>';
      return;
    }
    
    container.innerHTML = data.items.map(job => `
      <li>
        <a href="/vaga/${job._id}">
          <i class="fas fa-chevron-right"></i>
          ${truncate(job.title, 60)}
        </a>
      </li>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar vagas:', error);
    container.innerHTML = '<li style="color: #999; font-size: 14px;">Erro ao carregar vagas.</li>';
  }
}

// Setup newsletter form
function setupNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    
    // In real app, send to backend
    alert(`✅ Obrigado! Você será inscrito com o e-mail: ${email}\n\nEm breve você receberá nossas novidades!`);
    form.reset();
  });
}

// Main load function
async function loadNoticias() {
  const container = document.getElementById('news');
  const loading = document.getElementById('loading');
  
  if (!container) return;
  
  // Show loading
  if (loading) loading.style.display = 'grid';
  container.innerHTML = '';
  
  try {
    const res = await fetch('/api/news');
    const data = await res.json();
    
    // Hide loading
    if (loading) loading.style.display = 'none';
    
    if (!res.ok || !data || data.length === 0) {
      container.innerHTML = `
        <div class="news-empty">
          <i class="fas fa-newspaper"></i>
          <h3>Nenhuma notícia encontrada</h3>
          <p>Volte em breve para conferir as últimas novidades!</p>
          <a href="/vagas" class="btn-readmore" style="margin-top: 20px;">
            <i class="fas fa-briefcase"></i> Ver Vagas Disponíveis
          </a>
        </div>
      `;
      return;
    }
    
    // Store all news
    allNews = data;
    
    // Assign random categories for demo (in real app, this comes from backend)
    allNews = allNews.map(news => ({
      ...news,
      category: news.category || getRandomCategory()
    }));
    
    // Render initial news
    renderNews();
    
    // Load sidebar content
    loadPopularNews();
    loadRecentJobs();
    
  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    if (loading) loading.style.display = 'none';
    
    container.innerHTML = `
      <div class="news-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Erro ao carregar notícias</h3>
        <p>Verifique sua conexão e tente novamente.</p>
        <button onclick="loadNoticias()" class="btn-readmore" style="margin-top: 20px;">
          <i class="fas fa-sync"></i> Tentar Novamente
        </button>
      </div>
    `;
  }
}

// Initialize
window.addEventListener('DOMContentLoaded', function() {
  loadNoticias();
  setupCategoryFilters();
  setupNewsletter();
  
  // Setup load more button
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMore);
  }
});
