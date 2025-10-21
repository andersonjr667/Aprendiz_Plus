// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Atualizar data atual
    const currentDate = document.getElementById('currentDate');
    const date = new Date();
    currentDate.textContent = date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    // Carregar dados do dashboard
    loadDashboardData();
    loadCharts();
    loadRecentActivity();
});

async function loadDashboardData() {
    try {
        const response = await fetch('/api/admin/dashboard', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Falha ao carregar dados do dashboard');
        }

        const data = await response.json();
        
        // Atualizar números
        document.getElementById('totalUsers').textContent = data.totalUsers || 0;
        document.getElementById('totalJobs').textContent = data.totalJobs || 0;
        document.getElementById('totalCompanies').textContent = data.totalCompanies || 0;
        document.getElementById('totalNews').textContent = data.totalNews || 0;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

function loadCharts() {
    // Gráfico de Registros por Mês
    const registrationCtx = document.getElementById('registrationChart').getContext('2d');
    new Chart(registrationCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Novos Registros',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Gráfico de Vagas por Categoria
    const jobsCtx = document.getElementById('jobsChart').getContext('2d');
    new Chart(jobsCtx, {
        type: 'doughnut',
        data: {
            labels: ['TI', 'Administração', 'Vendas', 'Marketing', 'Outros'],
            datasets: [{
                data: [12, 19, 3, 5, 2],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/admin/recent-activity', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Falha ao carregar atividades recentes');
        }

        const activities = await response.json();
        const activityList = document.getElementById('recentActivity');
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-title">${activity.description}</p>
                    <span class="activity-time">${formatActivityTime(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
    }
}

function getActivityIcon(type) {
    const icons = {
        'user': 'fa-user',
        'job': 'fa-briefcase',
        'company': 'fa-building',
        'news': 'fa-newspaper',
        'default': 'fa-info-circle'
    };
    return icons[type] || icons.default;
}

function formatActivityTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        return `${diffMinutes} minutos atrás`;
    } else if (diffHours < 24) {
        return `${diffHours} horas atrás`;
    } else {
        return `${diffDays} dias atrás`;
    }
}

// Tratamento do logout
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await fetch('/api/auth/logout', { 
            method: 'POST', 
            credentials: 'include' 
        });
        window.location.href = '/login';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
});