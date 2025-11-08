// news-detail.js - Enhanced with social sharing, related articles, and more
let currentNews = null;
let allNews = [];

// Get news ID from URL
function getNewsIdFromPath() {
  const path = window.location.pathname;
  const matches = path.match(/\/(?:news|noticia)\/([a-f0-9]{24})/i);
  return matches ? matches[1] : null;
}

// Fallback for query params
function getQuery() {
  return new URLSearchParams(window.location.search);
}

const newsId = getNewsIdFromPath() || getQuery().get('id');

// Format date
function formatDate(dateString, format = 'long') {
  if (!dateString) return 'Data não disponível';
  const date = new Date(dateString);
  
  if (format === 'long') {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Truncate text
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Get random category
function getRandomCategory() {
  const categories = ['Carreira', 'Entrevistas', 'Tendências', 'Dicas', 'Mercado'];
  return categories[Math.floor(Math.random() * categories.length)];
}

// Format content with better HTML
function formatContent(content) {
  if (!content) return '<p>Conteúdo não disponível.</p>';
  
  // Split by double line breaks first
  let sections = content.split('\n\n');
  
  // If no double breaks, try single breaks
  if (sections.length === 1) {
    sections = content.split('\n').filter(p => p.trim());
  }
  
  if (sections.length === 1) {
    return `<p>${content}</p>`;
  }
  
  return sections.map(section => {
    const trimmed = section.trim();
    
    // Check if it's a heading (starts with # or is all caps)
    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#+\s*/, '');
      return `<h${Math.min(level + 1, 6)}>${text}</h${Math.min(level + 1, 6)}>`;
    }
    
    // Check if it's a list item
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      return `<li>${trimmed.substring(1).trim()}</li>`;
    }
    
    // Regular paragraph
    return `<p>${trimmed}</p>`;
  }).join('');
}

// Share functions
function shareWhatsApp() {
  const text = encodeURIComponent(`${currentNews.title} - ${window.location.href}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
}

function shareTwitter() {
  const text = encodeURIComponent(currentNews.title);
  const url = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

function shareLinkedIn() {
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    // Show feedback
    const btn = event.target.closest('.share-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.style.background = '#2ECC71';
    btn.style.color = 'white';
    btn.style.borderColor = '#2ECC71';
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style = '';
    }, 2000);
  }).catch(() => {
    alert('Link: ' + window.location.href);
  });
}

// Update page meta tags
function updatePageMeta(news) {
  document.getElementById('pageTitle').textContent = `${news.title} | Aprendiz+`;
  document.getElementById('pageDescription').content = truncate(news.content, 160);
  document.getElementById('ogTitle').content = news.title;
  document.getElementById('ogDescription').content = truncate(news.content, 200);
  
  if (news.image) {
    document.getElementById('ogImage').content = news.image;
  }
}

// Load related articles
async function loadRelatedArticles() {
  const container = document.getElementById('relatedArticles');
  if (!container) return;
  
  try {
    // If we don't have all news yet, fetch them
    if (allNews.length === 0) {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (res.ok && data) {
        allNews = data;
      }
    }
    
    // Filter out current article and get 3 random ones
    const related = allNews
      .filter(n => n._id !== newsId)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    if (related.length === 0) {
      container.innerHTML = '<p style="color: #999; font-size: 14px;">Nenhum artigo relacionado encontrado.</p>';
      return;
    }
    
    container.innerHTML = related.map(news => `
      <a href="/news/${news._id}" class="related-article">
        <div class="related-thumbnail">
          ${news.image ? `<img src="${news.image}" alt="${news.title}">` : '<i class="fas fa-newspaper"></i>'}
        </div>
        <div class="related-info">
          <h4>${truncate(news.title, 70)}</h4>
          <div class="related-date">
            <i class="far fa-calendar"></i>
            ${formatDate(news.createdAt, 'short')}
          </div>
        </div>
      </a>
    `).join('');
    
  } catch (error) {
    console.error('Erro ao carregar artigos relacionados:', error);
    container.innerHTML = '<p style="color: #999; font-size: 14px;">Erro ao carregar artigos.</p>';
  }
}

// Render article
function renderArticle(news) {
  const container = document.getElementById('newsArticle');
  if (!container) return;
  
  currentNews = news;
  const author = news.author?.name || 'Aprendiz+ Redação';
  const authorInitials = author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const category = news.category || getRandomCategory();
  const date = formatDate(news.createdAt);
  
  // Extract first paragraph as excerpt
  const firstParagraph = news.content?.split('\n')[0] || '';
  const excerpt = truncate(firstParagraph, 200);
  
  // Generate tags from title and content
  const tags = generateTags(news);
  
  container.innerHTML = `
    <!-- Featured Image -->
    <div class="article-featured-image">
      ${news.image ? `<img src="${news.image}" alt="${news.title}">` : '<i class="fas fa-newspaper placeholder-icon"></i>'}
      <span class="article-category-badge">${category}</span>
    </div>

    <!-- Header -->
    <header class="article-header">
      <h1 class="article-title">${news.title}</h1>
      
      <div class="article-meta">
        <div class="meta-item author">
          <i class="fas fa-user-circle"></i>
          <span>Por ${author}</span>
        </div>
        <div class="meta-item date">
          <i class="far fa-calendar-alt"></i>
          <span>${date}</span>
        </div>
        <div class="meta-item">
          <i class="far fa-clock"></i>
          <span>${estimateReadTime(news.content)} min de leitura</span>
        </div>
      </div>

      ${excerpt ? `<div class="article-excerpt">${excerpt}</div>` : ''}

      <!-- Social Share Bar -->
      <div class="share-bar">
        <span class="share-label">Compartilhar:</span>
        <button class="share-btn whatsapp" onclick="shareWhatsApp()" title="WhatsApp">
          <i class="fab fa-whatsapp"></i>
        </button>
        <button class="share-btn facebook" onclick="shareFacebook()" title="Facebook">
          <i class="fab fa-facebook-f"></i>
        </button>
        <button class="share-btn twitter" onclick="shareTwitter()" title="Twitter">
          <i class="fab fa-twitter"></i>
        </button>
        <button class="share-btn linkedin" onclick="shareLinkedIn()" title="LinkedIn">
          <i class="fab fa-linkedin-in"></i>
        </button>
        <button class="share-btn copy" onclick="copyLink()" title="Copiar link">
          <i class="fas fa-link"></i>
        </button>
      </div>
    </header>

    <!-- Article Body -->
    <div class="article-body">
      ${formatContent(news.content)}
    </div>

    <!-- Tags -->
    ${tags.length > 0 ? `
      <div class="article-tags">
        <span class="tags-label">Tags:</span>
        <div class="tag-list">
          ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Call to Action -->
    <div class="article-cta">
      <h3>Gostou deste artigo?</h3>
      <p>Cadastre-se na plataforma e encontre oportunidades incríveis de estágio e emprego!</p>
      <a href="/register" class="btn-cta">
        <i class="fas fa-user-plus"></i>
        Criar Conta Grátis
      </a>
    </div>
  `;
  
  // Update author box
  renderAuthorBox(author, authorInitials);
  
  // Load related articles
  loadRelatedArticles();
  
  // Update meta tags
  updatePageMeta(news);
  
  // Initialize scroll features
  initScrollFeatures();
}

// Generate tags from content
function generateTags(news) {
  const commonWords = new Set(['de', 'da', 'do', 'para', 'com', 'em', 'no', 'na', 'o', 'a', 'e', 'que']);
  const words = (news.title + ' ' + news.content)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4 && !commonWords.has(w));
  
  // Count frequency
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  
  // Get top 5
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

// Estimate read time
function estimateReadTime(content) {
  if (!content) return 1;
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

// Render author box
function renderAuthorBox(authorName, initials) {
  const widget = document.getElementById('authorWidget');
  const container = document.getElementById('authorBox');
  if (!container || !widget) return;
  
  container.innerHTML = `
    <div class="author-box">
      <div class="author-avatar">${initials}</div>
      <div class="author-info">
        <h4>${authorName}</h4>
        <div class="author-role">Editor</div>
        <p class="author-bio">
          Especialista em carreira e mercado de trabalho, com foco em ajudar jovens profissionais a conquistarem suas primeiras oportunidades.
        </p>
      </div>
    </div>
  `;
  
  widget.style.display = 'block';
}

// Initialize scroll features
function initScrollFeatures() {
  const progressBar = document.getElementById('progressBar');
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = (scrolled / documentHeight) * 100;
      
      progressBar.style.width = progress + '%';
      
      // Show/hide scroll to top button
      if (scrollTopBtn) {
        if (scrolled > 500) {
          scrollTopBtn.classList.add('visible');
        } else {
          scrollTopBtn.classList.remove('visible');
        }
      }
    });
  }
  
  // Scroll to top functionality
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// Show error
function showError(message) {
  const container = document.getElementById('newsArticle');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Erro ao carregar notícia</h3>
        <p>${message}</p>
        <div class="error-actions">
          <button class="btn btn-primary" onclick="loadNewsDetail()">
            <i class="fas fa-redo"></i> Tentar novamente
          </button>
          <a href="/noticias" class="btn btn-secondary">
            <i class="fas fa-arrow-left"></i> Voltar às notícias
          </a>
        </div>
      </div>
    `;
  }
}

// Load news detail
async function loadNewsDetail() {
  if (!newsId) {
    showError('ID da notícia não encontrado na URL');
    return;
  }

  try {
    const res = await fetch(`/api/news/${newsId}`);
    const news = await res.json();

    if (!res.ok) {
      showError(news.error || 'Não foi possível carregar a notícia');
      return;
    }

    renderArticle(news);

  } catch (error) {
    console.error('Erro ao carregar notícia:', error);
    showError('Erro de conexão. Verifique sua internet e tente novamente.');
  }
}

// Setup newsletter form
function setupNewsletter() {
  const form = document.getElementById('sidebarNewsletter');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    
    alert(`✅ Obrigado! Você será inscrito com o e-mail: ${email}\n\nEm breve você receberá nossas novidades!`);
    form.reset();
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', function() {
  loadNewsDetail();
  setupNewsletter();
});