document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está logado
    if (!localStorage.getItem('token')) {
        window.location.href = '/login?redirect=/candidatos';
        return;
    }

    // Elementos do DOM
    const activeApplicationsEl = document.getElementById('activeApplications');
    const activeCoursesEl = document.getElementById('activeCourses');
    const suggestedJobsEl = document.getElementById('suggestedJobs');
    const applicationsListEl = document.getElementById('applicationsList');
    const coursesListEl = document.getElementById('coursesList');
    const suggestedJobsListEl = document.getElementById('suggestedJobsList');

    // Carregar dados do candidato
    loadCandidateData();

    async function loadCandidateData() {
        try {
            const [applicationsResponse, coursesResponse, suggestedResponse] = await Promise.all([
                fetch('/api/users/me/applications', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/users/me/courses', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/recommendations/jobs', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const [applications, courses, suggested] = await Promise.all([
                applicationsResponse.json(),
                coursesResponse.json(),
                suggestedResponse.json()
            ]);

            updateDashboardStats(applications, courses, suggested);
            displayApplications(applications);
            displayCourses(courses);
            displaySuggestedJobs(suggested);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados. Por favor, tente novamente mais tarde.');
        }
    }

    function updateDashboardStats(applications, courses, suggested) {
        const activeApps = applications.filter(app => app.status === 'pending').length;
        const activeCourses = courses.filter(course => course.status === 'in_progress').length;
        
        activeApplicationsEl.textContent = activeApps;
        activeCoursesEl.textContent = activeCourses;
        suggestedJobsEl.textContent = suggested.length;
    }

    function displayApplications(applications) {
        if (!applications.length) {
            applicationsListEl.innerHTML = '<p>Você ainda não tem candidaturas.</p>';
            return;
        }

        applicationsListEl.innerHTML = applications.map(app => `
            <div class="application-item">
                <div class="application-header">
                    <span class="application-title">${app.job.title}</span>
                    <span class="application-status status-${app.status}">
                        ${getStatusText(app.status)}
                    </span>
                </div>
                <div class="application-details">
                    <p><i class="fas fa-building"></i> ${app.job.company_name}</p>
                    <p><i class="fas fa-calendar-alt"></i> Aplicado em: ${formatDate(app.appliedAt)}</p>
                </div>
            </div>
        `).join('');
    }

    function displayCourses(courses) {
        if (!courses.length) {
            coursesListEl.innerHTML = '<p>Você ainda não está matriculado em nenhum curso.</p>';
            return;
        }

        coursesListEl.innerHTML = courses.map(course => `
            <div class="course-item">
                <div class="course-header">
                    <span class="course-title">${course.title}</span>
                    <span class="course-status">${formatCourseStatus(course.status)}</span>
                </div>
                <div class="course-info">
                    <p>${course.description}</p>
                </div>
                <div class="course-progress">
                    <div class="progress-bar" style="width: ${course.progress}%"></div>
                </div>
            </div>
        `).join('');
    }

    function displaySuggestedJobs(jobs) {
        if (!jobs.length) {
            suggestedJobsListEl.innerHTML = '<p>Nenhuma vaga sugerida no momento.</p>';
            return;
        }

        suggestedJobsListEl.innerHTML = jobs.map(job => `
            <div class="suggested-job">
                <div class="suggested-job-info">
                    <h4>${job.title}</h4>
                    <div class="suggested-job-details">
                        <span><i class="fas fa-building"></i> ${job.company_name}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${job.city}, ${job.state}</span>
                    </div>
                </div>
                <a href="/vaga-detalhes?id=${job.id}" class="btn btn-secondary">
                    Ver Vaga
                </a>
            </div>
        `).join('');
    }

    // Funções auxiliares
    function getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'approved': 'Aprovado',
            'rejected': 'Rejeitado',
            'interview': 'Entrevista Marcada'
        };
        return statusMap[status] || status;
    }

    function formatCourseStatus(status) {
        const statusMap = {
            'not_started': 'Não Iniciado',
            'in_progress': 'Em Andamento',
            'completed': 'Concluído'
        };
        return statusMap[status] || status;
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    // Função para abrir o perfil do usuário
    window.openProfile = () => {
        window.location.href = '/perfil-candidato';
    };
});