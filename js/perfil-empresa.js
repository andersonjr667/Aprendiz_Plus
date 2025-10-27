async function loadCompanyData(userId) {
    try {
        let user;

        // Se nenhum userId for fornecido, tenta obter o usuário logado via cookie httpOnly
        if (!userId) {
            const meRes = await fetch('/api/auth/me', { credentials: 'include' });
            if (!meRes.ok) {
                throw new Error('Usuário não autenticado');
            }
            user = await meRes.json();
            userId = user.id;
        }

        // Se ainda não temos o objeto completo, buscar pelo id público
        if (!user) {
            const response = await fetch(`/api/users/${userId}`);
            if (!response.ok) {
                throw new Error('Usuário não encontrado');
            }
            user = await response.json();
        }

        if (!user || !user.companyProfile) {
            throw new Error('Dados da empresa não encontrados');
        }

    // Atualizar perfil header (usar nome da empresa)
    const headerNameEl = document.querySelector('.perfil-dados h1');
    headerNameEl.textContent = user.companyProfile.nomeFantasia || user.name || 'Nome da Empresa';
    document.querySelector('.perfil-titulo').textContent = user.companyProfile.industry || 'Setor não informado';
        document.querySelector('.perfil-local').textContent = `${user.companyProfile.address?.city || ''}, ${user.companyProfile.address?.state || ''}`;

        // Atualizar logo se houver
        if (user.companyProfile.logoUrl) {
            document.querySelector('.perfil-avatar img').src = user.companyProfile.logoUrl;
        }

        // Atualizar informações da empresa
        const infoList = document.querySelector('.perfil-sidebar .perfil-card ul');
        infoList.innerHTML = `
            <li><strong>Setor:</strong> ${user.companyProfile.industry || 'Não informado'}</li>
            <li><strong>Porte:</strong> ${user.companyProfile.size || 'Não informado'}</li>
            <li><strong>Fundação:</strong> ${user.companyProfile.foundedYear || 'Não informado'}</li>
            <li><strong>Website:</strong> ${
                user.companyProfile.website ? 
                `<a href="${user.companyProfile.website}" target="_blank">${user.companyProfile.website}</a>` : 
                'Não informado'
            }</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Telefone:</strong> ${user.companyProfile.phone || 'Não informado'}</li>
            <li><strong>CNPJ:</strong> ${
                user.companyProfile.cnpj ? 
                user.companyProfile.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : 
                'Não informado'
            }</li>
            ${user.companyProfile.address ? `
            <li><strong>Endereço:</strong><br>
                ${user.companyProfile.address.street}, ${user.companyProfile.address.number}
                ${user.companyProfile.address.complement ? `, ${user.companyProfile.address.complement}` : ''}<br>
                ${user.companyProfile.address.neighborhood}<br>
                ${user.companyProfile.address.city} - ${user.companyProfile.address.state}<br>
                CEP: ${user.companyProfile.address.zipCode}
            </li>` : ''}
        `;

        // Atualizar sobre a empresa
        const aboutContent = document.querySelector('.perfil-main .perfil-card p');
        if (aboutContent) {
            aboutContent.textContent = user.companyProfile.description || 
                'Empresa líder no setor de tecnologia, focada em inovação e desenvolvimento de soluções digitais. Buscamos jovens talentos para crescer conosco e contribuir com o futuro da tecnologia no Brasil.';
        }

        // Carregar vagas da empresa
        const jobsResponse = await fetch(`/api/jobs?company=${userId}`, {
            credentials: 'include'
        });
        const jobs = await jobsResponse.json();

        // Atualizar lista de vagas
        const vagasLista = document.querySelector('.vagas-lista');
        if (jobs && jobs.length > 0) {
            vagasLista.innerHTML = jobs.map(job => `
                <div class="vaga-item" data-id="${job.id}">
                    <h4>${job.title}</h4>
                    <p>${job.city}, ${job.state} • ${job.type}</p>
                    <p>Publicada em ${new Date(job.createdAt).toLocaleDateString('pt-BR')}</p>
                    <div class="vaga-acoes">
                        <button class="btn-editar" onclick="editarVaga('${job.id}')">Editar</button>
                        <button class="btn-ver-candidatos" onclick="verCandidatos('${job.id}')">
                            Ver Candidatos (${job.applications?.length || 0})
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            vagasLista.innerHTML = '<p class="text-muted">Nenhuma vaga publicada</p>';
        }

        // Atualizar benefícios
        const beneficiosLista = document.querySelector('.beneficios-lista');
        if (user.companyProfile.benefits && user.companyProfile.benefits.length > 0) {
            beneficiosLista.innerHTML = user.companyProfile.benefits
                .map(benefit => `<span class="beneficio-tag">${benefit}</span>`)
                .join('');
        } else {
            beneficiosLista.innerHTML = '<p class="text-muted">Nenhum benefício cadastrado</p>';
        }

    } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
        // Se for erro de auth, redirecionar para login
        if (error.message && (error.message.includes('autenticado') || error.message.includes('Usuário não encontrado'))) {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        alert('Erro ao carregar dados da empresa. Por favor, tente novamente mais tarde.');
    }
}

// Funções auxiliares
window.editarVaga = async (jobId) => {
    window.location.href = `/publicar-vaga?id=${jobId}`;
};

window.verCandidatos = async (jobId) => {
    window.location.href = `/candidatos-vaga/${jobId}`;
};

// Carregar automaticamente quando a página estiver pronta
document.addEventListener('DOMContentLoaded', () => {
    // Se o container tiver data-user-id, passa para a função, senão ela buscará /api/auth/me
    const container = document.querySelector('.perfil-container');
    const userId = container ? container.dataset.userId : null;
    loadCompanyData(userId).catch(() => {});
});