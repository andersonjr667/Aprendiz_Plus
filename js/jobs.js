document.addEventListener('DOMContentLoaded', () => {
    const jobsList = document.getElementById('jobsList');
    const jobsCount = document.getElementById('jobsCount');
    const pagination = document.getElementById('pagination');
    const filterForm = document.getElementById('filterForm');
    
    let currentPage = 1;
    const limit = 10;

    async function loadJobs(page = 1, filters = {}) {
        try {
            let url = `/api/jobs?page=${page}&limit=${limit}`;
            
            // Adicionar filtros à URL
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    url += `&${key}=${encodeURIComponent(filters[key])}`;
                }
            });

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao carregar vagas');
            }

            displayJobs(data.jobs);
            updatePagination(data.currentPage, data.totalPages);
            jobsCount.textContent = data.total;

        } catch (error) {
            console.error('Erro:', error);
            jobsList.innerHTML = `<p class="error-message">Erro ao carregar vagas: ${error.message}</p>`;
        }
    }

    function displayJobs(jobs) {
        if (!jobs.length) {
            jobsList.innerHTML = '<p class="no-jobs">Nenhuma vaga encontrada</p>';
            return;
        }

        jobsList.innerHTML = jobs.map(job => `
            <article class="job-card">
                <h3>${job.title}</h3>
                <div class="job-info">
                    <span><i class="fas fa-building"></i> ${job.company_name}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${job.city}, ${job.state}</span>
                    <span><i class="fas fa-money-bill-wave"></i> R$ ${job.salary.toFixed(2)}</span>
                </div>
                <p class="job-description">${job.description.substring(0, 200)}...</p>
                <div class="job-actions">
                    <a href="/vaga-detalhes?id=${job.id}" class="btn btn-primary">Ver Detalhes</a>
                    ${isUserLoggedIn() && getUserType() === 'candidato' ? 
                        `<button onclick="applyForJob('${job.id}')" class="btn btn-secondary">
                            Candidatar-se
                        </button>` : 
                        ''}
                </div>
            </article>
        `).join('');
    }

    function updatePagination(currentPage, totalPages) {
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        let paginationHtml = '';

        if (currentPage > 1) {
            paginationHtml += `
                <button onclick="changePage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>`;
        }

        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <button class="${i === currentPage ? 'active' : ''}"
                        onclick="changePage(${i})">
                    ${i}
                </button>`;
        }

        if (currentPage < totalPages) {
            paginationHtml += `
                <button onclick="changePage(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>`;
        }

        pagination.innerHTML = paginationHtml;
    }

    // Função para verificar se o usuário está logado
    async function isUserLoggedIn() {
        try {
            const me = await fetch('/api/auth/me', { credentials: 'include' });
            if (!me.ok) return false;
            const user = await me.json();
            window.__currentUser = user;
            return true;
        } catch (e) {
            return false;
        }
    }

    // Função para obter o tipo de usuário (sincrona após carregamento)
    function getUserType() {
        const user = window.__currentUser;
        return user ? user.type : null;
    }

    // Função para se candidatar a uma vaga
    async function applyForJob(jobId) {
        if (!isUserLoggedIn()) {
            alert('Por favor, faça login para se candidatar à vaga');
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch(`/api/jobs/${jobId}/apply`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao se candidatar');
            }

            alert('Candidatura realizada com sucesso!');
            window.location.reload();

        } catch (error) {
            alert(error.message);
        }
    }

    // Event listener para o formulário de filtros
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(filterForm);
        const filters = Object.fromEntries(formData.entries());
        currentPage = 1;
        loadJobs(currentPage, filters);
    });

    // Função para mudar de página
    window.changePage = (page) => {
        currentPage = page;
        const formData = new FormData(filterForm);
        const filters = Object.fromEntries(formData.entries());
        loadJobs(currentPage, filters);
    };

    // Carregar vagas iniciais
    loadJobs();
});