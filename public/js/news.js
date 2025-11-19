// news.js — moved from inline script in news.html
async function loadNews() {
  try {
    const res = await fetch('/api/news');
    const items = await res.json();
    
    const el = document.getElementById('news');
    
    if (!el) return;
    
    if (!items || items.length === 0) {
      el.innerHTML = `
        <div class="news-empty">
          <i class="fas fa-newspaper"></i>
          <h3>Nenhuma notícia encontrada</h3>
          <p>Volte em breve para conferir as últimas novidades!</p>
        </div>
      `;
      return;
    }
    
    el.innerHTML = ''; // Limpar conteúdo existente (incluindo loading)
    el.className = 'news-grid'; // Garantir que tenha a classe correta
    
    items.forEach((n, index) => {
      const d = document.createElement('div');
      d.className = 'news-card';
      
      // Formatar data
      const date = new Date(n.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Autor
      const author = n.author ? n.author.name : 'Autor não informado';
      
      // Verificar se o ID existe e usar fallback
      const newsId = n._id || n.id;
      
      d.innerHTML = `
        <!-- Removido: div news-header -->
          <h3 class="news-title">${n.title}</h3>
          <div class="news-meta">
            <span class="news-author"><i class="fas fa-user"></i> ${author}</span>
            <span class="news-date"><i class="fas fa-calendar"></i> ${date}</span>
          </div>
        </div>
        <div class="news-content">
          <p>${n.content}</p>
        </div>
        <div class="news-footer">
          <a href="/news/${newsId || ''}" class="btn-readmore ${!newsId ? 'disabled' : ''}" ${!newsId ? 'aria-disabled="true"' : ''}>
            <i class="fas fa-arrow-right"></i> Leia mais
          </a>
        </div>
      `;
      
      el.appendChild(d);
    });
  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    const el = document.getElementById('news');
    if (el) {
      el.innerHTML = `
        <div class="news-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Erro ao carregar notícias</h3>
          <p>Tente novamente mais tarde.</p>
        </div>
      `;
    }
  }
}

function readMore(newsId) {
  if (!newsId || newsId === 'undefined') {
    if (window.UI && window.UI.toast) {
      window.UI.toast('Erro: ID da notícia inválido', 'error');
    } else {
      alert('Erro: ID da notícia inválido');
    }
    return;
  }
  
  // Navegar para página de detalhes da notícia
  window.location.href = `/news/${newsId}`;
}

window.addEventListener('DOMContentLoaded', loadNews);
