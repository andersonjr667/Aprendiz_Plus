// Estado global
let currentPage = 1;
let currentCategory = 'all';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Carregar notícias iniciais
    await loadNews();

    // Controle das categorias
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            currentPage = 1;
            await loadNews();
        });
    });

    // Função para carregar notícias
    async function loadNews() {
        try {
            let url = `/api/news?page=${currentPage}`;
            if (currentCategory !== 'all') {
                url += `&category=${currentCategory}`;
            }
            if (currentSearch) {
                url += `&search=${encodeURIComponent(currentSearch)}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao carregar notícias');
            }

            displayNews(data.news);
            updatePagination(data.totalPages);
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    // Pesquisa de notícias
    const searchBox = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.search-box button');

    searchButton.addEventListener('click', async () => {
        currentSearch = searchBox.value.trim();
        currentPage = 1;
        await loadNews();
    });

    searchBox.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            currentSearch = searchBox.value.trim();
            currentPage = 1;
            await loadNews();
        }
    });

    // Função para exibir as notícias
    function displayNews(news) {
        const newsContainer = document.querySelector('.news-grid');
        if (!newsContainer) return;

        newsContainer.innerHTML = news.map(item => `
            <article class="news-card">
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ''}
                <div class="news-content">
                    <h3>${item.title}</h3>
                    <p>${item.content.substring(0, 150)}...</p>
                    <div class="news-meta">
                        <span class="author">Por: ${item.author.name}</span>
                        <span class="date">${new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <a href="/noticia/${item._id}" class="read-more">Ler mais</a>
                </div>
            </article>
        `).join('');
    }

    // Função para atualizar a paginação
    function updatePagination(totalPages) {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        let pagesHtml = '';
        
        // Botão anterior
        pagesHtml += `
            <button class="page-btn prev ${currentPage === 1 ? 'disabled' : ''}" 
                    ${currentPage === 1 ? 'disabled' : ''}>
                Anterior
            </button>
        `;

        // Números das páginas
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || // Primeira página
                i === totalPages || // Última página
                (i >= currentPage - 2 && i <= currentPage + 2) // 2 páginas antes e depois da atual
            ) {
                pagesHtml += `
                    <button class="page-btn number ${i === currentPage ? 'active' : ''}" 
                            data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (
                i === currentPage - 3 || // Reticências antes
                i === currentPage + 3 // Reticências depois
            ) {
                pagesHtml += '<span class="page-dots">...</span>';
            }
        }

        // Botão próximo
        pagesHtml += `
            <button class="page-btn next ${currentPage === totalPages ? 'disabled' : ''}"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                Próximo
            </button>
        `;

        pagination.innerHTML = pagesHtml;

        // Adicionar event listeners
        const pageButtons = pagination.querySelectorAll('.page-btn');
        pageButtons.forEach(button => {
            button.addEventListener('click', async () => {
                if (button.classList.contains('disabled')) return;

                if (button.classList.contains('prev')) {
                    currentPage--;
                } else if (button.classList.contains('next')) {
                    currentPage++;
                } else {
                    currentPage = parseInt(button.dataset.page);
                }

                await loadNews();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // Newsletter
    const newsletterForm = document.querySelector('.newsletter-form');
    newsletterForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = newsletterForm.querySelector('input[type="email"]').value;
        if (validateEmail(email)) {
            subscribeNewsletter(email);
        } else {
            showMessage('Por favor, insira um e-mail válido', 'error');
        }
    });

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function subscribeNewsletter(email) {
        // Simulação de envio para API
        console.log(`Inscrevendo e-mail: ${email}`);
        showMessage('Inscrição realizada com sucesso!', 'success');
        newsletterForm.reset();
    }

    // Sistema de mensagens
    function showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.textContent = message;

        // Insere a mensagem no topo da sidebar
        const sidebar = document.querySelector('.news-sidebar');
        sidebar.insertBefore(messageDiv, sidebar.firstChild);

        // Remove a mensagem após 3 segundos
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Paginação
    const pageButtons = document.querySelectorAll('.page-numbers button');
    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            pageButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            // Implementar a lógica de mudança de página
            loadPage(button.textContent);
        });
    });

    function loadPage(pageNumber) {
        // Implementar a lógica de carregamento da página
        console.log(`Carregando página ${pageNumber}`);
    }

    // Compartilhamento de artigos
    const articles = document.querySelectorAll('.news-card, .featured-card');
    articles.forEach(article => {
        article.addEventListener('click', () => {
            const title = article.querySelector('h3, h2').textContent;
            // Redireciona para a página completa da notícia
            navigateToArticle(title);
        });
    });

    function navigateToArticle(title) {
        // Implementar a navegação para a página completa da notícia
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        console.log(`Navegando para: /noticias/${slug}`);
    }

    // Lazy loading para imagens
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
});