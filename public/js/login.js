// Login handler moved out of inline script to satisfy CSP (script-src 'self')
// Depends on /public/js/auth.js which defines login function

// Default avatar image path based on user type (uses images placed in /public/images)
function getDefaultAvatarPath(user) {
    const base = '/public/images';
    if (!user) return `${base}/user_icon_green.png`;
    const type = (user.type || '').toString().toLowerCase();
    if (type === 'empresa' || type === 'company') return `${base}/company_icon_green.png`;
    if (type === 'admin' || type === 'owner') return `${base}/admin_icon_green.png`;
    return `${base}/user_icon_green.png`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se já está autenticado ao carregar a página de login
    if (window.Auth && typeof window.Auth.getToken === 'function' && window.Auth.getToken()) {
        // Testa se o token é válido
        window.Auth.getCurrentUser && window.Auth.getCurrentUser().then(user => {
            if (user) {
                window.location.href = '/';
            }
        });
    }

    // Sincroniza login/logout entre abas
    window.addEventListener('storage', (event) => {
        if (event.key === 'aprendizplus_token') {
            if (event.newValue) {
                // Se logou em outra aba
                window.location.reload();
            } else {
                // Se fez logout em outra aba
                window.location.href = '/login';
            }
        }
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            // Previne dupla submissão
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) errorMessage.style.display = 'none';
            // Usa a função login definida em auth.js
            login(event);
        });
    }
});