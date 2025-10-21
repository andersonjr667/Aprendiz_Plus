// session-ui.js
// Responsável por ajustar elementos da UI conforme autenticação do usuário
(async function () {
    // Páginas que requerem autenticação
    const authRequiredPages = [
        '/perfil-candidato',
        '/perfil-empresa',
        '/publicar-vaga',
        '/admin',
        '/vagas/publicar'
    ];

    // Páginas com restrições de tipo de usuário
    const pagePermissions = {
        '/perfil-candidato': ['candidato', 'admin'],
        '/perfil-empresa': ['empresa', 'admin'],
        '/publicar-vaga': ['empresa', 'admin'],
        '/admin': ['admin']
    };

    async function getMe() {
        // Se já temos o usuário no estado global, use-o
        if (window.currentUser) {
            return window.currentUser;
        }

        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) return null;
            const user = await res.json();
            window.currentUser = user; // Armazena globalmente
            return user;
        } catch (e) {
            return null;
        }
    }

    function checkPageAccess(user) {
        const currentPath = window.location.pathname;
        
        // Verificar se a página atual requer autenticação
        if (authRequiredPages.includes(currentPath)) {
            if (!user) {
                window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
                return false;
            }

            // Verificar permissões específicas da página
            if (pagePermissions[currentPath] && 
                !pagePermissions[currentPath].includes(user.type) && 
                user.type !== 'admin') {
                // Redirecionar para página apropriada
                switch (user.type) {
                    case 'candidato':
                        window.location.href = '/perfil-candidato';
                        break;
                    case 'empresa':
                        window.location.href = '/perfil-empresa';
                        break;
                    default:
                        window.location.href = '/';
                }
                return false;
            }
        }
        return true;
    }

    function updateNavigationVisibility(user) {
        // Atualizar visibilidade dos links baseado no tipo de usuário
        const empresasLink = document.querySelector('.nav-menu a[href="/empresas"]')?.parentElement;
        const vagasLink = document.querySelector('.nav-menu a[href="/vagas"]')?.parentElement;
        const candidatosLink = document.querySelector('.nav-menu a[href="/candidatos"]')?.parentElement;
        
        if (user) {
            // Admin vê tudo
            if (user.type === 'admin') {
                if (empresasLink) empresasLink.style.display = 'block';
                if (vagasLink) vagasLink.style.display = 'block';
                if (candidatosLink) candidatosLink.style.display = 'block';
            }
            // Empresa vê vagas e candidatos
            else if (user.type === 'empresa') {
                if (empresasLink) empresasLink.style.display = 'block';
                if (vagasLink) vagasLink.style.display = 'block';
                if (candidatosLink) candidatosLink.style.display = 'block';
            }
            // Candidato vê vagas
            else if (user.type === 'candidato') {
                if (empresasLink) empresasLink.style.display = 'none';
                if (vagasLink) vagasLink.style.display = 'block';
                if (candidatosLink) candidatosLink.style.display = 'none';
            }
        } else {
            // Usuário não logado vê links básicos
            if (empresasLink) empresasLink.style.display = 'block';
            if (vagasLink) vagasLink.style.display = 'block';
            if (candidatosLink) candidatosLink.style.display = 'none';
        }
    }

    function renderUserMenu(user) {
        const nav = document.querySelector('.nav-menu');
        if (!nav || !user) return;

        window.currentUser = user; // Garante que o estado global está atualizado

        // Remove botões de autenticação se existirem
        const authButtons = nav.querySelector('.auth-buttons');
        if (authButtons) {
            authButtons.remove();
        }

        // Criar item de usuário
        const li = document.createElement('li');
        li.className = 'nav-user';
        
        // Preparar os links do menu baseado no tipo de usuário
        const profilePath = user.type === 'candidato' ? '/perfil-candidato' : 
                          user.type === 'empresa' ? '/perfil-empresa' : 
                          user.type === 'admin' ? '/admin' : '/';
        
        let menuItems = '';
        if (user.type === 'admin') {
            menuItems = `
                <a href="/admin" class="dropdown-item">Painel Admin</a>
                <a href="/perfil-candidato" class="dropdown-item">Meu Perfil Candidato</a>
                <a href="/perfil-empresa" class="dropdown-item">Meu Perfil Empresa</a>
            `;
        } else {
            menuItems = `<a href="${profilePath}" class="dropdown-item">Meu Perfil</a>`;
        }

        // Atualizar o link do perfil no header principal
        const profileLinks = document.querySelectorAll('[data-profile-link="true"]');
        profileLinks.forEach(link => {
            link.href = profilePath;
        });

        li.innerHTML = `
            <a class="user-link" style="cursor:pointer">${user.name}</a>
            <div class="user-dropdown" style="display:none; position:absolute; right:0; background:white; box-shadow:0 2px 8px rgba(0,0,0,0.1); border-radius:4px; min-width:180px; z-index:1000">
                <div style="padding:8px">
                    ${menuItems}
                    <div class="dropdown-divider" style="height:1px; background:#eee; margin:8px 0"></div>
                    <a href="#" id="logoutBtn" class="dropdown-item" style="color:#dc3545">Sair</a>
                </div>
            </div>
        `;
        nav.appendChild(li);

        const link = li.querySelector('.user-link');
        const dd = li.querySelector('.user-dropdown');
        // Abrir/fechar dropdown ao clicar no nome
        link.addEventListener('click', (e) => {
            e.preventDefault();
            dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (e) {
                // ignore
            }
            // Cookie já limpo pelo servidor; redirecionar
            window.location.href = '/';
        });

        // Fecha dropdown ao clicar fora
        document.addEventListener('click', (ev) => {
            const target = ev.target;
            if (!li.contains(target)) {
                dd.style.display = 'none';
            }
        });

        // Adicionar evento de clique no nome do usuário para redirecionar para o perfil
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const profilePath = user.type === 'candidato' ? '/perfil-candidato' : 
                              user.type === 'empresa' ? '/perfil-empresa' : 
                              user.type === 'admin' ? '/admin' : '/';
            window.location.href = profilePath;
        });
    }

    function renderGuestMenu() {
        const nav = document.querySelector('.nav-menu');
        if (!nav) return;
        
        // Remove o menu do usuário se existir
        const userMenu = nav.querySelector('.nav-user');
        if (userMenu) {
            userMenu.remove();
        }

        // Garante que os botões de autenticação existam
        if (!nav.querySelector('.auth-buttons')) {
            const li = document.createElement('li');
            li.className = 'auth-buttons';
            li.innerHTML = `
                <a href="/login" class="btn-login">Fazer Login</a>
                <a href="/cadastro" class="btn-cadastro">Cadastre-se</a>
            `;
            nav.appendChild(li);
        }
    }

    function applyPageLinks(user) {
        // Atualiza botões de 'Meu Perfil' estáticos
        const perfilButtons = document.querySelectorAll('.btn-perfil');
        perfilButtons.forEach(btn => {
            if (user) {
                const path = user.type === 'candidato' ? '/perfil-candidato' : user.type === 'empresa' ? '/perfil-empresa' : '/';
                btn.setAttribute('href', path);
                btn.addEventListener('click', (e) => {
                    // caso seja um <button>, permitir navegação programática
                    if (btn.tagName.toLowerCase() === 'button') {
                        e.preventDefault();
                        window.location.href = path;
                    }
                });
            } else {
                btn.setAttribute('href', '/login?redirect=' + encodeURIComponent(window.location.pathname));
                btn.addEventListener('click', (e) => {
                    if (btn.tagName.toLowerCase() === 'button') {
                        e.preventDefault();
                        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                    }
                });
            }
        });

        // Atualiza botões de 'Publicar Vaga'
        const publishButtons = document.querySelectorAll('.btn-publicar, .btn-publicar-vaga, .btn-post-job');
        publishButtons.forEach(btn => {
            if (user && (user.type === 'empresa' || user.type === 'admin')) {
                btn.setAttribute('href', '/publicar-vaga');
                btn.addEventListener('click', (e) => {
                    if (btn.tagName.toLowerCase() === 'button') {
                        e.preventDefault();
                        window.location.href = '/publicar-vaga';
                    }
                });
            } else {
                // redireciona para login
                btn.setAttribute('href', '/login?redirect=' + encodeURIComponent('/publicar-vaga'));
                btn.addEventListener('click', (e) => {
                    if (btn.tagName.toLowerCase() === 'button') {
                        e.preventDefault();
                        window.location.href = '/login?redirect=' + encodeURIComponent('/publicar-vaga');
                    }
                });
            }
        });
    }

    const user = await getMe();
    
    // Verificar acesso à página atual
    if (checkPageAccess(user)) {
        // Renderizar menu apropriado
        if (user) {
            renderUserMenu(user);
            applyPageLinks(user);
        } else {
            renderGuestMenu();
            applyPageLinks(null);
        }
        // Atualizar visibilidade da navegação
        updateNavigationVisibility(user);
    }
})();
