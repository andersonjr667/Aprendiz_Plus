// Analytics Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadAnalytics();
    setupEventListeners();
});

let analyticsData = null;
let currentPeriod = 30;

// Setup event listeners
function setupEventListeners() {
    // Period filter
    document.getElementById('period-select').addEventListener('change', function(e) {
        currentPeriod = parseInt(e.target.value);
        loadAnalytics();
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', exportData);
}

// Load analytics data
async function loadAnalytics() {
    showLoading();

    try {
        const user = await getCurrentUser();
        if (!user || user.type !== 'empresa') {
            showError('Acesso negado. Apenas empresas podem acessar esta página.');
            return;
        }

        const response = await fetch(`/api/analytics/applications/${user._id}?period=${currentPeriod}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados');
        }

        analyticsData = await response.json();
        renderAnalytics();

    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Erro ao carregar dados. Tente novamente.');
    }
}

// Render analytics data
function renderAnalytics() {
    hideLoading();
    hideError();

    if (!analyticsData) return;

    // Update metrics
    updateMetrics();

    // Render charts
    renderCharts();

    // Render jobs table
    renderJobsTable();
}

// Update metrics cards
// Função utilitária para animar contagem
function animateValue(id, start, end, duration, suffix = "") {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        obj.textContent = value + suffix;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = end + suffix;
        }
    };
    window.requestAnimationFrame(step);
}

// Update metrics cards com animação
function updateMetrics() {
    const summary = analyticsData.summary;
    animateValue('total-applications', 0, summary.totalApplications, 900);
    animateValue('pending-applications', 0, summary.pendingApplications, 900);
    animateValue('accepted-applications', 0, summary.acceptedApplications, 900);
    animateValue('rejected-applications', 0, summary.rejectedApplications, 900);
    animateValue('conversion-rate', 0, Math.round(summary.conversionRate), 900, '%');
    if (summary.avgResponseTime !== null) {
        animateValue('avg-response-time', 0, Math.round(summary.avgResponseTime), 900, 'h');
    } else {
        document.getElementById('avg-response-time').textContent = 'N/A';
    }
}

// Render charts
function renderCharts() {
    // Daily trend chart
    renderDailyTrendChart();

    // Status distribution chart
    renderStatusChart();
}

// Daily trend chart
function renderDailyTrendChart() {
    const ctx = document.getElementById('daily-trend-chart').getContext('2d');
    if (window.dailyTrendChart) window.dailyTrendChart.destroy();
    const labels = analyticsData.dailyTrend.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    });
    const data = analyticsData.dailyTrend.map(item => item.count);
    window.dailyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Candidaturas',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102,126,234,0.12)',
                tension: 0.35,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#667eea',
                pointHoverRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} candidaturas`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#555' } },
                y: { beginAtZero: true, grid: { color: '#e0e7ff' }, ticks: { color: '#555' } }
            }
        }
    });
    setTimeout(() => {
        document.getElementById('daily-trend-chart').parentElement.style.minHeight = '340px';
    }, 100);
}

// Status distribution chart
function renderStatusChart() {
    const ctx = document.getElementById('status-chart').getContext('2d');
    if (window.statusChart) window.statusChart.destroy();
    const summary = analyticsData.summary;
    const total = summary.pendingApplications + summary.acceptedApplications + summary.rejectedApplications;
    window.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Aceitas', 'Rejeitadas'],
            datasets: [{
                data: [summary.pendingApplications, summary.acceptedApplications, summary.rejectedApplications],
                backgroundColor: [
                    '#fbbf24', // warning
                    '#22c55e', // success
                    '#ef4444'  // danger
                ],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: '#22223b', font: { size: 14 } }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} (${total ? Math.round((ctx.parsed / total)*100) : 0}%)`
                    }
                }
            }
        }
    });
    setTimeout(() => {
        document.getElementById('status-chart').parentElement.style.minHeight = '340px';
    }, 100);
}

// Render jobs table
function renderJobsTable() {
    const tbody = document.getElementById('jobs-table-body');
    tbody.innerHTML = '';

    analyticsData.applicationsByJob.forEach(job => {
        const conversionRate = job.total > 0 ? ((job.accepted / job.total) * 100).toFixed(1) : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${job.jobTitle}</td>
            <td>${job.total}</td>
            <td>${job.pending}</td>
            <td>${job.accepted}</td>
            <td>${job.rejected}</td>
            <td>${conversionRate}%</td>
        `;

        tbody.appendChild(row);
    });
}

// Export data
async function exportData() {
    showExportFeedback('loading');
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado');

        const response = await fetch(`/api/analytics/export/${user._id}?format=csv&period=${currentPeriod}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao exportar dados');
        }

        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `candidaturas_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showExportFeedback('success');
    } catch (error) {
        showExportFeedback('error');
        console.error('Error exporting data:', error);
        if (window.UI && window.UI.toast) {
            window.UI.toast('Erro ao exportar dados. Tente novamente.', 'error');
        }
    }
}

// Feedback visual no botão de exportação
function showExportFeedback(state) {
    const btn = document.getElementById('export-btn');
    if (!btn) return;
    if (state === 'loading') {
        btn.disabled = true;
        btn.innerHTML = '<span class="export-icon" style="font-size:1.2rem;">⏳</span> Exportando...';
    } else if (state === 'success') {
        btn.innerHTML = '<span class="export-icon" style="font-size:1.2rem;">✅</span> Exportado!';
        setTimeout(() => {
            btn.innerHTML = '<span class="export-icon" style="font-size:1.2rem;">📥</span> Exportar Dados';
            btn.disabled = false;
        }, 1500);
    } else if (state === 'error') {
        btn.innerHTML = '<span class="export-icon" style="font-size:1.2rem;">❌</span> Erro ao exportar';
        setTimeout(() => {
            btn.innerHTML = '<span class="export-icon" style="font-size:1.2rem;">📥</span> Exportar Dados';
            btn.disabled = false;
        }, 2000);
    } else {
        btn.innerHTML = '<span class="export-icon" style="font-size:1.2rem;">📥</span> Exportar Dados';
        btn.disabled = false;
    }
}

// Utility functions
function showLoading() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
}

function showError(message) {
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-message').textContent = message;
}

function hideError() {
    document.getElementById('error-state').style.display = 'none';
}

// Get current user
async function getCurrentUser() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting current user:', error);
    }
    return null;
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error during logout:', error);
    }
    window.location.href = '/login.html';
}