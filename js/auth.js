// Funções de gerenciamento de autenticação
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');

    // Função para alternar visibilidade da senha
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Função de login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Redirecionar baseado no tipo de usuário
                    switch(data.user.type) {
                        case 'candidato':
                            window.location.href = '/perfil-candidato';
                            break;
                        case 'empresa':
                            window.location.href = '/perfil-empresa';
                            break;
                        case 'admin':
                            window.location.href = '/admin';
                            break;
                        default:
                            window.location.href = '/';
                    }
                } else {
                    showError(data.error || 'Erro ao fazer login');
                }
            } catch (error) {
                showError('Erro ao conectar com o servidor');
            }
        });
    }

    // Função de registro
    if (registerForm) {
        // Alterna entre tipos de conta
        const accountTypes = document.querySelectorAll('.account-type');
        accountTypes.forEach(btn => {
            btn.addEventListener('click', () => {
                accountTypes.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Máscara para CPF
        const cpfInput = document.getElementById('cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                }
                e.target.value = value;
            });
        }

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const cpf = document.getElementById('cpf').value;
            const birthdate = document.getElementById('birthdate').value;
            const type = document.querySelector('.account-type.active').dataset.type;
            
            // Validações
            if (password !== confirmPassword) {
                showError('As senhas não coincidem');
                return;
            }

            // Validar CPF
            if (!validateCPF(cpf)) {
                showError('CPF inválido');
                return;
            }

            // Validar idade (mínimo 14 anos)
            const today = new Date();
            const birthdateDate = new Date(birthdate);
            const age = today.getFullYear() - birthdateDate.getFullYear();
            const monthDiff = today.getMonth() - birthdateDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateDate.getDate())) {
                age--;
            }

            if (age < 14) {
                showError('É necessário ter pelo menos 14 anos para se cadastrar');
                return;
            }
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password, type })
                });

                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Redirecionar baseado no tipo de usuário
                    switch(data.user.type) {
                        case 'candidato':
                            window.location.href = '/perfil-candidato';
                            break;
                        case 'empresa':
                            window.location.href = '/perfil-empresa';
                            break;
                        default:
                            window.location.href = '/';
                    }
                } else {
                    showError(data.error || 'Erro ao fazer cadastro');
                }
            } catch (error) {
                showError('Erro ao conectar com o servidor');
            }
        });
    }

    // Função para mostrar mensagens de erro
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;
        
        const form = document.querySelector('.auth-form');
        form.insertBefore(errorDiv, form.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Função para validar CPF
    function validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11) return false;
        
        // Verifica CPFs com dígitos iguais
        if (/^(\d)\1+$/.test(cpf)) return false;
        
        // Validação dos dígitos verificadores
        let sum = 0;
        let remainder;
        
        for (let i = 1; i <= 9; i++) {
            sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return false;
        
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    }

    // Verificar autenticação atual via API
    async function checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Usuário autenticado — redirecionar se estiver em login/cadastro
                if (window.location.pathname === '/login' || window.location.pathname === '/cadastro') {
                    window.location.href = '/';
                }
            } else {
                // token inválido — remover
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (e) {
            console.error('Erro ao verificar token', e);
        }
    }

    // Verificar autenticação ao carregar a página
    checkAuth();
});