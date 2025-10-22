document.addEventListener('DOMContentLoaded', async () => {
    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    let jobId = getQueryParam('id');
    // Se não veio via query param, tentar extrair da path /vaga/:id
    if (!jobId) {
        const match = window.location.pathname.match(/\/vaga\/(.+)$/);
        if (match) jobId = match[1];
    }
    const container = document.querySelector('.job-details-container');

    if (!jobId) {
        if (container) container.innerHTML = '<p class="error-message">Vaga não especificada.</p>';
        return;
    }

    try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Erro ao carregar vaga');
        }
        const job = await res.json();

        // Preencher cabeçalho
        const titleEl = document.querySelector('.job-header h1') || document.querySelector('.job-header .company-details h1');
        if (titleEl) titleEl.textContent = job.title || 'Vaga';

        const companyNameEl = document.querySelector('.company-name');
        if (companyNameEl) companyNameEl.textContent = job.company_name || (job.company && job.company.name) || '';

        // Tags
        const tagsEl = document.querySelector('.job-tags');
        if (tagsEl) {
            tagsEl.innerHTML = '';
            if (job.category) tagsEl.insertAdjacentHTML('beforeend', `<span class="badge badge-primary">${job.category}</span>`);
            if (job.type) tagsEl.insertAdjacentHTML('beforeend', `<span class="badge badge-success">${job.type}</span>`);
            if (job.city && job.state) tagsEl.insertAdjacentHTML('beforeend', `<span class="badge badge-warning">${job.city}, ${job.state}</span>`);
        }

        // Conteúdo principal
        const main = document.querySelector('.job-main');
        if (main) {
            const desc = job.description || '';
            main.querySelector('section.job-section:nth-of-type(1) p').textContent = desc;

            const responsibilities = job.responsibilities || job.bullets || [];
            const respSection = main.querySelector('section.job-section:nth-of-type(2) ul');
            if (respSection) {
                respSection.innerHTML = '';
                (Array.isArray(responsibilities) ? responsibilities : [responsibilities]).forEach(r => {
                    respSection.insertAdjacentHTML('beforeend', `<li>${r}</li>`);
                });
            }

            const requirements = job.requirements || job.requisitos || [];
            const reqSection = main.querySelector('section.job-section:nth-of-type(3) ul');
            if (reqSection) {
                reqSection.innerHTML = '';
                (Array.isArray(requirements) ? requirements : [requirements]).forEach(r => {
                    reqSection.insertAdjacentHTML('beforeend', `<li>${r}</li>`);
                });
            }

            const benefits = job.benefits || job.beneficios || [];
            const benefitsGrid = main.querySelector('.benefits-grid');
            if (benefitsGrid) {
                benefitsGrid.innerHTML = '';
                (Array.isArray(benefits) ? benefits : [benefits]).forEach(b => {
                    benefitsGrid.insertAdjacentHTML('beforeend', `
                        <div class="benefit-item">
                            <i class="fas fa-check"></i>
                            <span>${b}</span>
                        </div>
                    `);
                });
            }
        }

        // Sidebar overview
        const overview = document.querySelector('.job-overview');
        if (overview) {
            overview.querySelector('ul li:nth-of-type(1) span:last-child').textContent = job.salary ? `R$ ${Number(job.salary).toFixed(2)}` : 'A combinar';
            overview.querySelector('ul li:nth-of-type(2) span:last-child').textContent = job.hours || job.shift || 'Não informado';
            overview.querySelector('ul li:nth-of-type(3) span:last-child').textContent = job.city && job.state ? `${job.city}, ${job.state}` : 'Local não informado';
            overview.querySelector('ul li:nth-of-type(4) span:last-child').textContent = job.mode || job.work_model || 'Não informado';
        }

        // Company card
        const companyCard = document.querySelector('.company-card p');
        if (companyCard) {
            companyCard.textContent = (job.company && job.company.description) || job.company_description || 'Empresa não informada.';
        }

        // Candidatar-se button
        const applyBtn = document.querySelector('.job-actions .btn-primary');
        if (applyBtn) {
            applyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const resp = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/apply`, { method: 'POST', credentials: 'include' });
                    const d = await resp.json();
                    if (!resp.ok) throw new Error(d.error || 'Erro ao candidatar');
                    alert('Candidatura enviada');
                } catch (err) {
                    alert(err.message || 'Erro');
                }
            });
        }

    } catch (err) {
        if (container) container.innerHTML = `<p class="error-message">Erro ao carregar vaga: ${err.message}</p>`;
    }
});
