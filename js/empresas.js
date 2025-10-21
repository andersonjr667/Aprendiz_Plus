document.addEventListener('DOMContentLoaded', async () => {
    try {
        const resp = await fetch('/api/companies/me/dashboard', { credentials: 'include' });
        if (!resp.ok) {
            console.warn('Não foi possível obter dashboard da empresa', await resp.text());
            return;
        }
        const data = await resp.json();

        const activeJobsCountEl = document.getElementById('activeJobsCount');
        const applicationsCountEl = document.getElementById('applicationsCount');
        const recentActivityEl = document.getElementById('recentActivity');

        if (activeJobsCountEl) activeJobsCountEl.textContent = data.activeJobs || 0;
        if (applicationsCountEl) applicationsCountEl.textContent = data.applicationsCount || 0;

        if (recentActivityEl && Array.isArray(data.recentActivity)) {
            recentActivityEl.innerHTML = '';
            data.recentActivity.forEach(item => {
                const div = document.createElement('div');
                div.className = 'activity-item';
                div.innerHTML = `<h4>${escapeHtml(item.title)}</h4><small>${new Date(item.createdAt).toLocaleString()}</small>`;
                recentActivityEl.appendChild(div);
            });
        }
    } catch (e) {
        console.error('Erro ao carregar dashboard da empresa', e);
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`]/g, s => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;'
    }[s]));
}
