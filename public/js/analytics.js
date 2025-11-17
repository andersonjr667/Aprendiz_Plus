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
function updateMetrics() {
    const summary = analyticsData.summary;

    document.getElementById('total-applications').textContent = summary.totalApplications;
    document.getElementById('pending-applications').textContent = summary.pendingApplications;
    document.getElementById('accepted-applications').textContent = summary.acceptedApplications;
    document.getElementById('rejected-applications').textContent = summary.rejectedApplications;
    document.getElementById('conversion-rate').textContent = `${summary.conversionRate}%`;

    if (summary.avgResponseTime !== null) {
        document.getElementById('avg-response-time').textContent = `${summary.avgResponseTime}h`;
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

    // Destroy existing chart if it exists
    if (window.dailyTrendChart) {
        window.dailyTrendChart.destroy();
    }

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
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Status distribution chart
function renderStatusChart() {
    const ctx = document.getElementById('status-chart').getContext('2d');

    // Destroy existing chart if it exists
    if (window.statusChart) {
        window.statusChart.destroy();
    }

    const summary = analyticsData.summary;

    window.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Aceitas', 'Rejeitadas'],
            datasets: [{
                data: [summary.pendingApplications, summary.acceptedApplications, summary.rejectedApplications],
                backgroundColor: [
                    '#ffc107', // warning
                    '#28a745', // success
                    '#dc3545'  // danger
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
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
    try {
        const user = await getCurrentUser();
        if (!user) return;

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

    } catch (error) {
        console.error('Error exporting data:', error);
        if (window.UI && window.UI.toast) {
            window.UI.toast('Erro ao exportar dados. Tente novamente.', 'error');
        } else {
            alert('Erro ao exportar dados. Tente novamente.');
        }
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