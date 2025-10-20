// Funções de autenticação
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            // Token é enviado via cookie httpOnly; não armazenar em localStorage
            window.location.href = '/';
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erro ao fazer login');
    }
}

async function register(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const type = document.getElementById('type').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ name, email, password, type })
        });

        const data = await response.json();
        if (response.ok) {
            // Token em cookie httpOnly
            window.location.href = '/';
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Erro ao fazer cadastro');
    }
}

function logout() {
    // pedir ao servidor para limpar cookie e depois redirecionar
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .catch(() => {})
        .finally(() => {
            // Cookie limpo pelo servidor; não manipular localStorage
            window.location.href = '/login';
        });
}

// Verificar autenticação
function checkAuth() {
    // Verifica no servidor via cookie httpOnly
    fetch('/api/auth/me', { credentials: 'include' })
        .then(res => {
            const authLinks = document.querySelectorAll('.auth-link');
            const profileLinks = document.querySelectorAll('.profile-link');
            if (!res.ok) {
                authLinks.forEach(link => link.style.display = 'block');
                profileLinks.forEach(link => link.style.display = 'none');
                return null;
            }
                return res.json().then(user => {
                authLinks.forEach(link => link.style.display = 'none');
                profileLinks.forEach(link => {
                    link.style.display = 'block';
                    if (link.classList.contains('profile-name')) {
                        link.textContent = user.name;
                    }
                });
                return user;
            });
        })
        .catch(() => {});
}

// Carregar notícias
async function loadNews() {
    try {
        const response = await fetch('/api/news');
        const news = await response.json();
        
        const newsContainer = document.getElementById('news-container');
        if (!newsContainer) return;
        
        newsContainer.innerHTML = news.map(item => `
            <article class="news-item">
                <h2>${item.title}</h2>
                <p>${item.content.substring(0, 200)}...</p>
                <div class="news-meta">
                    <span>Por: ${item.author.name}</span>
                    <span>Data: ${new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <a href="/noticia/${item._id}" class="read-more">Ler mais</a>
            </article>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadNews();
    // Adicionar funcionalidade de scroll suave para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Adicionar classe active ao header quando rolar a página
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('header-active');
        } else {
            header.classList.remove('header-active');
        }
    });

    // Animação para os números nas estatísticas
    const stats = document.querySelectorAll('.stat-item h3');
    const animateStats = () => {
        stats.forEach(stat => {
            const target = parseInt(stat.innerText.replace('+', ''));
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    stat.innerText = '+' + target;
                    clearInterval(timer);
                } else {
                    stat.innerText = '+' + Math.floor(current);
                }
            }, 20);
        });
    };

    // Observer para animar as estatísticas quando visíveis
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.unobserve(entry.target);
            }
        });
    });

    const statistics = document.querySelector('.statistics');
    if (statistics) {
        observer.observe(statistics);
    }
});