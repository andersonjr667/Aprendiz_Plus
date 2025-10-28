// Login handler moved out of inline script to satisfy CSP (script-src 'self')
// Depends on /public/js/auth.js which defines login function

document.addEventListener('DOMContentLoaded', () => {
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