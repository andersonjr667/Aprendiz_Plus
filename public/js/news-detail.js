// news-detail.js
function getNewsIdFromPath() {
  // Extrai o ID da URL no formato /news/{id} ou /noticia/{id}
  const path = window.location.pathname;
  const matches = path.match(/\/(?:news|noticia)\/([a-f0-9]{24})/i);
  return matches ? matches[1] : null;
}

// Fallback para URLs antigas com query params (?id=...)
function getQuery() {
  return new URLSearchParams(window.location.search);
}

// Tenta primeiro extrair do path, depois da query string
const newsId = getNewsIdFromPath() || getQuery().get('id');

async function loadNewsDetail() {
  if (!newsId) {
    showError('ID da notícia não encontrado');
    return;
  }

  try {
    const res = await fetch(`/api/news/${newsId}`);
    const news = await res.json();
    const container = document.getElementById('news-detail');
    
    if (!container) return;

    if (!res.ok) {
      showError(news.error || 'Não foi possível carregar a notícia');
      return;
    }

    // Formatar data
    const date = new Date(news.createdAt).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });

    // Autor
    const author = news.author ? news.author.name : 'Autor não informado';

    container.innerHTML = `
      <div class="news-detail-card">
        <header class="news-detail-header">
          <h1 class="news-detail-title">${news.title}</h1>
          <div class="news-detail-meta">
            <div class="news-author">
              <i class="fas fa-user"></i>
              <span>Por ${author}</span>
            </div>
            <div class="news-date">
              <i class="fas fa-calendar"></i>
              <span>${date}</span>
            </div>
          </div>
        </header>
        
        <div class="news-detail-content">
          <div class="news-content-text">
            ${formatContent(news.content)}
          </div>
        </div>

        <footer class="news-detail-footer">
          <div class="news-actions">
            <button class="btn-outline-secondary" onclick="shareNews()">
              <i class="fas fa-share"></i> Compartilhar
            </button>
            <button class="btn-secondary" onclick="window.location.href='/news'">
              <i class="fas fa-newspaper"></i> Mais notícias
            </button>
          </div>
        </footer>
      </div>
    `;

  } catch (error) {
    console.error('Erro ao carregar notícia:', error);
    showError('Erro de conexão. Verifique sua internet e tente novamente.');
  }
}

function formatContent(content) {
  if (!content) return '<p>Conteúdo não disponível.</p>';
  
  // Quebrar em parágrafos se não estiver formatado
  const paragraphs = content.split('\n').filter(p => p.trim());
  
  if (paragraphs.length <= 1) {
    return `<p>${content}</p>`;
  }
  
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
}

function showError(message) {
  const container = document.getElementById('news-detail');
  if (container) {
    container.innerHTML = `
      <div class="news-error">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Erro ao carregar notícia</h3>
        <p>${message}</p>
        <div class="error-actions">
          <button class="btn-primary" onclick="loadNewsDetail()">
            <i class="fas fa-redo"></i> Tentar novamente
          </button>
          <button class="btn-outline-secondary" onclick="window.location.href='/news'">
            <i class="fas fa-arrow-left"></i> Voltar às notícias
          </button>
        </div>
      </div>
    `;
  }
}

function shareNews() {
  if (navigator.share) {
    navigator.share({
      title: document.querySelector('.news-detail-title')?.textContent || 'Notícia',
      text: 'Confira esta notícia interessante!',
      url: window.location.href
    });
  } else {
    // Fallback para copiar URL
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link copiado para a área de transferência!');
    }).catch(() => {
      alert('URL: ' + window.location.href);
    });
  }
}

// Função para o botão voltar
function setupBackButton() {
  const btnVoltar = document.getElementById('btnVoltarNews');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', function() {
      // Verifica se há histórico para voltar
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Se não há histórico, vai para a página de notícias
        window.location.href = '/news';
      }
    });
  }
}

// Carregar notícia quando a página carregar
if (newsId) {
  window.addEventListener('DOMContentLoaded', function() {
    loadNewsDetail();
    setupBackButton();
  });
} else {
  window.addEventListener('DOMContentLoaded', function() {
    setupBackButton();
    showError('ID da notícia não especificado na URL');
  });
}