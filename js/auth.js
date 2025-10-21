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
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                
                if (response.ok) {
                    // Token está em cookie httpOnly; não usar localStorage
                    
                    // Verificar se há um redirecionamento pendente
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirectUrl = urlParams.get('redirect');
                    
                    if (redirectUrl) {
                        // Se for admin, permite qualquer redirecionamento
                        if (data.user.type === 'admin') {
                            window.location.href = redirectUrl;
                            return;
                        }
                        
                        // Para outros usuários, validar o redirecionamento
                        const allowedPaths = {
                            candidato: ['/perfil-candidato', '/vagas'],
                            empresa: ['/perfil-empresa', '/publicar-vaga', '/vagas', '/candidatos']
                        };
                        
                        const userAllowedPaths = allowedPaths[data.user.type] || [];
                        if (userAllowedPaths.some(path => redirectUrl.startsWith(path))) {
                            window.location.href = redirectUrl;
                            return;
                        }
                    }
                    
                    // Se não houver redirecionamento ou não for permitido, usar redirecionamento padrão
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
                    console.error('Login error response:', data);
                    Toast.error(data.error || 'Erro ao fazer login');
                }
            } catch (error) {
                console.error('Login request failed:', error);
                Toast.error('Erro ao conectar com o servidor');
            }
        });
    }

    // Função de registro (somente para formulários simples, não para multi-step)
    if (registerForm && !document.querySelector('.steps-indicator')) {
        // Configurar validações em tempo real
        const validationConfig = {
            name: ['required', Validator.rules.minLength(3)],
            email: ['required', 'email'],
            password: ['required', Validator.rules.minLength(6)],
            'confirm-password': ['required'],
            cpf: ['required', 'cpf'],
            birthdate: ['required', 'date', Validator.rules.age(14)],
            cidade: ['required'],
            estado: ['required'],
            titulo: [Validator.rules.maxLength(100)],
            setor: [Validator.rules.maxLength(100)],
            website: ['url']
        };

        // Validar campos em tempo real
        Object.keys(validationConfig).forEach(field => {
            const input = registerForm.querySelector(`[name="${field}"]`);
            if (input) {
                input.addEventListener('blur', () => {
                    const error = Validator.validateField(input.value, validationConfig[field]);
                    if (error) {
                        Validator.showFieldError(input, error);
                    } else {
                        Validator.clearFieldError(input);
                    }
                });
            }
        });

        // Alterna entre tipos de conta
        const accountTypes = document.querySelectorAll('.account-type');
        accountTypes.forEach(btn => {
            btn.addEventListener('click', () => {
                accountTypes.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Mostrar/esconder campos específicos
                const type = btn.dataset.type;
                document.querySelectorAll('.candidate-field').forEach(el => {
                    el.style.display = type === 'candidate' ? 'block' : 'none';
                });
                document.querySelectorAll('.company-field').forEach(el => {
                    el.style.display = type === 'company' ? 'block' : 'none';
                });
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
            const cidade = document.getElementById('cidade').value;
            const estado = document.getElementById('estado').value;
            let type = document.querySelector('.account-type.active').dataset.type;
            // mapear para valores esperados pelo backend (pt-br)
            if (type === 'candidate') type = 'candidato';
            if (type === 'company') type = 'empresa';
            
            // campos específicos por tipo
            const additionalData = type === 'candidato' ? {
                titulo: document.getElementById('titulo').value || 'Estudante',
                escolaridade: document.getElementById('escolaridade').value
            } : {
                setor: document.getElementById('setor').value,
                website: document.getElementById('website').value
            };
            
            // Validar formulário completo
            const { isValid, errors } = Validator.validateForm(registerForm, validationConfig);
            
            if (!isValid) {
                Toast.error('Por favor, corrija os erros no formulário');
                return;
            }

            // Validar senha de confirmação
            if (password !== confirmPassword) {
                Validator.showFieldError(
                    document.getElementById('confirm-password'),
                    'As senhas não coincidem'
                );
                Toast.error('As senhas não coincidem');
                return;
            }
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        cpf: cpf.replace(/\D/g, ''),
                        birthdate,
                        type,
                        cidade,
                        estado,
                        ...additionalData
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    // Token está no cookie httpOnly; não usar localStorage

                    // Redirecionar
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
                    Toast.error(data.error || 'Erro ao fazer cadastro');
                }
                } catch (error) {
                    Toast.error('Erro ao conectar com o servidor');
                    console.error('Registro error:', error);
                }
        });
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
        // Agora usamos cookie httpOnly; verificação será feita pelo servidor quando necessário
    }

    // Verificar autenticação ao carregar a página
    checkAuth();
});