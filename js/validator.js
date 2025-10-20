// Validação de formulários
const Validator = {
    // Regras de validação
    rules: {
        required: {
            test: value => value && value.trim().length > 0,
            message: 'Campo obrigatório'
        },
        email: {
            test: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            message: 'Email inválido'
        },
        cpf: {
            test: value => {
                value = value.replace(/[^\d]/g, '');
                if (value.length !== 11) return false;
                if (/^(\d)\1+$/.test(value)) return false;
                
                let sum = 0;
                for (let i = 1; i <= 9; i++) {
                    sum += parseInt(value[i-1]) * (11 - i);
                }
                let remainder = (sum * 10) % 11;
                if (remainder === 10 || remainder === 11) remainder = 0;
                if (remainder !== parseInt(value[9])) return false;
                
                sum = 0;
                for (let i = 1; i <= 10; i++) {
                    sum += parseInt(value[i-1]) * (12 - i);
                }
                remainder = (sum * 10) % 11;
                if (remainder === 10 || remainder === 11) remainder = 0;
                if (remainder !== parseInt(value[10])) return false;
                
                return true;
            },
            message: 'CPF inválido'
        },
        minLength: (min) => ({
            test: value => value && value.length >= min,
            message: `Mínimo de ${min} caracteres`
        }),
        maxLength: (max) => ({
            test: value => !value || value.length <= max,
            message: `Máximo de ${max} caracteres`
        }),
        url: {
            test: value => !value || /^https?:\/\/.+\..+/.test(value),
            message: 'URL inválida'
        },
        date: {
            test: value => !value || !isNaN(new Date(value).getTime()),
            message: 'Data inválida'
        },
        age: (min) => ({
            test: value => {
                if (!value) return true;
                const birth = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                return age >= min;
            },
            message: `Idade mínima de ${min} anos`
        })
    },

    // Validar um campo específico com regras
    validateField(value, rules) {
        for (const rule of rules) {
            let validator;
            if (typeof rule === 'string') {
                validator = this.rules[rule];
            } else if (typeof rule === 'function') {
                validator = rule();
            } else {
                validator = rule;
            }

            if (!validator.test(value)) {
                return validator.message;
            }
        }
        return null;
    },

    // Validar formulário inteiro
    validateForm(formEl, config) {
        const errors = {};
        let hasErrors = false;

        for (const field in config) {
            const input = formEl.querySelector(`[name="${field}"]`);
            if (!input) continue;

            const error = this.validateField(input.value, config[field]);
            if (error) {
                errors[field] = error;
                hasErrors = true;
                this.showFieldError(input, error);
            } else {
                this.clearFieldError(input);
            }
        }

        return { isValid: !hasErrors, errors };
    },

    // Mostrar erro em um campo
    showFieldError(input, message) {
        let errorDiv = input.parentElement.querySelector('.field-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            input.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        input.classList.add('error');
    },

    // Limpar erro de um campo
    clearFieldError(input) {
        const errorDiv = input.parentElement.querySelector('.field-error');
        if (errorDiv) errorDiv.remove();
        input.classList.remove('error');
    }
};

// Adicionar estilos CSS
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .field-error {
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }

        input.error, textarea.error, select.error {
            border-color: #dc3545 !important;
        }

        input.error:focus, textarea.error:focus, select.error:focus {
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
        }
    `;
    document.head.appendChild(style);
});

// Exportar para uso em outros arquivos
window.Validator = Validator;