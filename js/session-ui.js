// session-ui.js
// Responsável por ajustar elementos da UI conforme autenticação do usuário
(async function () {
    async function getMe() {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    function updateNavigationVisibility(user) {
        const empresasLink = document.querySelector('.nav-menu a[href="/empresas"]')?.parentElement;
        if (empresasLink) {
            if (user && user.type === 'company') {
                empresasLink.style.display = 'block';
            } else {
                empresasLink.style.display = 'none';
            }
        }
    }

    function renderUserMenu(user) {
        const nav = document.querySelector('.nav-menu');
        if (!nav) return;

        // Remove CTA de cadastro/login se existir
        const cadastroBtn = nav.querySelector('.btn-cadastro');
        if (cadastroBtn) cadastroBtn.remove();

        // Criar item de usuário
        const li = document.createElement('li');
        li.className = 'nav-user';
        li.innerHTML = `
            <a href="#" class="user-link">${user.name}</a>
            <div class="user-dropdown" style="display:none; position:absolute; background:white; box-shadow:0 2px 8px rgba(0,0,0,0.1); padding:8px;">
                <a href="${user.type === 'candidato' ? '/perfil-candidato.html' : '/perfil-empresa.html'}" class="dropdown-item">Meu Perfil</a>
                <a href="#" id="logoutBtn" class="dropdown-item">Sair</a>
            </div>
        `;
        nav.appendChild(li);

        const link = li.querySelector('.user-link');
        const dd = li.querySelector('.user-dropdown');
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
    }

    function renderGuestMenu() {
        const nav = document.querySelector('.nav-menu');
        if (!nav) return;
        // garante que botão de cadastro exista
        if (!nav.querySelector('.btn-cadastro')) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="/cadastro" class="btn-cadastro">Cadastre-se</a>`;
            nav.appendChild(li);
        }
    }

    const user = await getMe();
    if (user) {
        renderUserMenu(user);
    } else {
        renderGuestMenu();
    }
    updateNavigationVisibility(user);
})();
