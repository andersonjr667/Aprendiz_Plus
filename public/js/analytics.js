// Exibir indicador de carregamento
function showLoading() {
    let el = document.getElementById('analytics-loading');
    if (!el) {
        el = document.createElement('div');
        el.id = 'analytics-loading';
        el.style.position = 'fixed';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100vw';
        el.style.height = '100vh';
        el.style.background = 'rgba(255,255,255,0.7)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.zIndex = '9999';
        el.innerHTML = '<div style="font-size:2rem;color:#007bff;"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
        document.body.appendChild(el);
    } else {
        el.style.display = 'flex';
    }
}

// Ocultar indicador de carregamento
function hideLoading() {
    const el = document.getElementById('analytics-loading');
    if (el) el.style.display = 'none';
}
// Função para buscar o usuário logado
async function getCurrentUser() {
    try {
        const token = window.Auth && window.Auth.getToken ? window.Auth.getToken() : null;
        const response = await fetch('/api/users/me', {
            credentials: 'include',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

// Função para exibir mensagens de erro na tela
function showError(msg) {
    let el = document.getElementById('analytics-error-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'analytics-error-msg';
        el.style.color = 'red';
        el.style.margin = '20px 0';
        el.style.fontWeight = 'bold';
        document.querySelector('.analytics-container')?.prepend(el);
    }
    el.textContent = msg;
}

function hideError() {
    const el = document.getElementById('analytics-error-msg');
    if (el) el.remove();
}
// Analytics Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadAnalytics();
    setupEventListeners();
});

let analyticsData = null;
let currentPeriod = 30;
let userType = null;

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
        if (!user || !['empresa', 'admin', 'owner'].includes(user.type)) {
            showError('Acesso negado. Apenas empresas ou administradores podem acessar esta página.');
            return;
        }
        userType = user.type;
        const token = window.Auth && window.Auth.getToken ? window.Auth.getToken() : null;
        let response;
        if (user.type === 'admin' || user.type === 'owner') {
            // Admin: painel geral
            response = await fetch(`/api/analytics/overview?period=${currentPeriod}d`, {
                credentials: 'include',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Erro ao carregar dados');
            analyticsData = await response.json();
            renderAdminAnalytics();
        } else {
            // Empresa: painel da empresa
            response = await fetch(`/api/analytics/applications/${user._id}?period=${currentPeriod}`, {
                credentials: 'include',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Erro ao carregar dados');
            analyticsData = await response.json();
            renderAnalytics();
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Erro ao carregar dados. Tente novamente.');
    }
}

// Render analytics data
function renderAnalytics() {
    hideLoading();
    hideError();

    if (!analyticsData || !analyticsData.summary || analyticsData.summary.totalApplications === 0) {
        showError('Nenhum dado encontrado para o período selecionado. Cadastre vagas e receba candidaturas para visualizar os relatórios.');
        return;
    }

    // Update metrics
    updateMetrics();

    // Render charts
    renderCharts();

    // Render jobs table
    renderJobsTable();
}

// Render analytics for admin
function renderAdminAnalytics() {
    hideLoading();
    hideError();
    if (!analyticsData || !analyticsData.data) {
        showError('Nenhum dado encontrado para o período selecionado.');
        return;
    }
    // Atualiza cards principais
    document.getElementById('total-applications').textContent = analyticsData.data.applications?.total || 0;
    document.getElementById('pending-applications').textContent = '-';
    document.getElementById('accepted-applications').textContent = '-';
    document.getElementById('rejected-applications').textContent = '-';
    // Exemplo: pode adicionar mais cards para usuários, vagas, etc.
    // Renderizar gráfico geral
    renderAdminChart();
}

// Renderiza gráfico para admin
async function renderAdminChart() {
    const ctx = document.getElementById('analytics-chart');
    if (!ctx) return;
    try {
        const token = window.Auth && window.Auth.getToken ? window.Auth.getToken() : null;
        const response = await fetch(`/api/analytics/chart?metric=applications.total&days=${currentPeriod}`, {
            credentials: 'include',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) throw new Error('Erro ao carregar gráfico');
        const chartData = await response.json();
        const labels = chartData.map(d => new Date(d.date).toLocaleDateString('pt-BR'));
        const data = chartData.map(d => d.value);
        if (window.analyticsChart) window.analyticsChart.destroy();
        window.analyticsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Candidaturas',
                    data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0,123,255,0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    } catch (e) {
        showError('Erro ao carregar gráfico.');
    }
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


function renderCharts() {
    renderDailyTrendSVGChart();
}

// Gráfico de linhas SVG puro
function renderDailyTrendSVGChart() {
    const svg = document.getElementById('analytics-svg-chart');
    if (!svg || !analyticsData || !analyticsData.dailyTrend) return;
    // Limpa SVG
    svg.innerHTML = '';
    const width = svg.clientWidth || 600;
    const height = svg.clientHeight || 260;
    const padding = 40;
    const data = analyticsData.dailyTrend;
    if (!data.length) return;
    const maxY = Math.max(...data.map(d => d.count), 1);
    const minY = 0;
    const stepX = (width - 2 * padding) / (data.length - 1);
    // Gera pontos
    const points = data.map((d, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((d.count - minY) / (maxY - minY)) * (height - 2 * padding);
        return { x, y, label: d.date, value: d.count };
    });
    // Eixos
    svg.innerHTML += `<line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="#888" stroke-width="1" />`;
    svg.innerHTML += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height-padding}" stroke="#888" stroke-width="1" />`;
    // Linhas do gráfico
    let path = '';
    points.forEach((pt, i) => {
        path += (i === 0 ? 'M' : 'L') + pt.x + ' ' + pt.y + ' ';
    });
    svg.innerHTML += `<path d="${path}" fill="none" stroke="#007bff" stroke-width="2" />`;
    // Pontos
    points.forEach(pt => {
        svg.innerHTML += `<circle cx="${pt.x}" cy="${pt.y}" r="3" fill="#007bff" />`;
    });
    // Labels do eixo Y
    for (let i = 0; i <= 4; i++) {
        const y = height - padding - i * (height - 2 * padding) / 4;
        const val = Math.round(minY + (maxY - minY) * i / 4);
        svg.innerHTML += `<text x="${padding-10}" y="${y+5}" font-size="12" text-anchor="end" fill="#444">${val}</text>`;
        svg.innerHTML += `<line x1="${padding-5}" y1="${y}" x2="${width-padding}" y2="${y}" stroke="#eee" stroke-width="1" />`;
    }
    // Labels do eixo X (datas)
    const labelStep = Math.ceil(data.length / 7);
    points.forEach((pt, i) => {
        if (i % labelStep === 0 || i === data.length-1) {
            svg.innerHTML += `<text x="${pt.x}" y="${height-padding+18}" font-size="11" text-anchor="middle" fill="#444">${pt.label}</text>`;
        }
    });
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