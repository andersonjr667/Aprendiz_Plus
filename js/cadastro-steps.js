document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const nextButton = document.getElementById('nextStep');
    const prevButton = document.getElementById('prevStep');
    const submitButton = document.getElementById('submitButton');
    const steps = document.querySelectorAll('.step-container');
    const stepDots = document.querySelectorAll('.step-dot');
    const progressLine = document.querySelector('.step-line-progress');
    let currentStep = 1;

    // Função para buscar endereço pelo CEP
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('blur', async () => {
            const cep = cepInput.value.replace(/\D/g, '');
            if (cep.length === 8) {
                const container = cepInput.closest('.input-group');
                container.classList.add('cep-loading');

                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();

                    if (!data.erro) {
                        document.getElementById('rua').value = data.logradouro;
                        document.getElementById('bairro').value = data.bairro;
                        document.getElementById('cidade').value = data.localidade;
                        document.getElementById('estado').value = data.uf;
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                } finally {
                    container.classList.remove('cep-loading');
                }
            }
        });
    }

    // Gerenciamento de habilidades e benefícios
    const habilidadeInput = document.getElementById('habilidade');
    const habilidadesList = document.getElementById('habilidades-list');
    const habilidadesHidden = document.getElementById('habilidades');
    const habilidades = new Set();

    const beneficioInput = document.getElementById('beneficio');
    const beneficiosList = document.getElementById('beneficios-list');
    const beneficiosHidden = document.getElementById('beneficios');
    const beneficios = new Set();

    if (habilidadeInput) {
        habilidadeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const valor = habilidadeInput.value.trim();
                if (valor && !habilidades.has(valor)) {
                    adicionarHabilidade(valor);
                    habilidadeInput.value = '';
                }
            }
        });
    }

    if (beneficioInput) {
        beneficioInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const valor = beneficioInput.value.trim();
                if (valor && !beneficios.has(valor)) {
                    adicionarBeneficio(valor);
                    beneficioInput.value = '';
                }
            }
        });
    }

    function adicionarHabilidade(valor) {
        habilidades.add(valor);
        atualizarHabilidades();
    }

    function removerHabilidade(valor) {
        habilidades.delete(valor);
        atualizarHabilidades();
    }

    function atualizarHabilidades() {
        if (!habilidadesList) return;
        habilidadesList.innerHTML = '';
        habilidadesHidden.value = JSON.stringify([...habilidades]);

        [...habilidades].forEach(hab => {
            const tag = document.createElement('span');
            tag.classList.add('skill-tag');
            tag.innerHTML = hab + '<button type="button" class="remove-skill">&times;</button>';
            
            tag.querySelector('.remove-skill').addEventListener('click', () => {
                removerHabilidade(hab);
            });

            habilidadesList.appendChild(tag);
        });
    }

    function adicionarBeneficio(valor) {
        beneficios.add(valor);
        atualizarBeneficios();
    }

    function removerBeneficio(valor) {
        beneficios.delete(valor);
        atualizarBeneficios();
    }

    function atualizarBeneficios() {
        if (!beneficiosList) return;
        beneficiosList.innerHTML = '';
        beneficiosHidden.value = JSON.stringify([...beneficios]);

        [...beneficios].forEach(ben => {
            const tag = document.createElement('span');
            tag.classList.add('skill-tag');
            tag.innerHTML = ben + '<button type="button" class="remove-skill">&times;</button>';
            
            tag.querySelector('.remove-skill').addEventListener('click', () => {
                removerBeneficio(ben);
            });

            beneficiosList.appendChild(tag);
        });
    }

    // Mascarar campos
    const masks = {
        cpf: value => value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            .slice(0, 14),

        phone: value => value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
            .slice(0, 15),

        cep: value => value
            .replace(/\D/g, '')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 9),

        cnpj: value => value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
            .slice(0, 18)
    };

    document.querySelectorAll('input').forEach(input => {
        const maskName = input.dataset.mask;
        if (maskName && masks[maskName]) {
            input.addEventListener('input', e => {
                e.target.value = masks[maskName](e.target.value);
            });
        }
    });

    // Controle de exibição dos campos do curso
    const temCursoSelect = document.getElementById('tem_curso');
    const camposCurso = document.getElementById('campos-curso');
    
    if (temCursoSelect && camposCurso) {
        temCursoSelect.addEventListener('change', () => {
            const mostrarCampos = temCursoSelect.value === 'sim';
            camposCurso.style.display = mostrarCampos ? 'block' : 'none';
            
            // Atualizar required dos campos
            const campos = camposCurso.querySelectorAll('input, select');
            campos.forEach(campo => {
                if (mostrarCampos) {
                    if (campo.id === 'instituicao' || campo.id === 'curso' || campo.id === 'status_curso') {
                        campo.required = true;
                    }
                } else {
                    campo.required = false;
                    campo.value = ''; // Limpar campos quando escondidos
                }
            });
        });
    }

    // Alternar tipo de conta (suporta variações de nome de classe)
    const accountTypes = document.querySelectorAll('.account-type');
    accountTypes.forEach(btn => {
        btn.addEventListener('click', () => {
            accountTypes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;

            // Seletores mais tolerantes para encontrar os grupos corretos
            const candidateGroups = document.querySelectorAll('.candidate-field, .candidate-fields, .candidate-personal-fields');
            const companyGroups = document.querySelectorAll('.company-field, .company-fields, .company-personal-fields');

            candidateGroups.forEach(el => el.style.display = type === 'candidate' ? 'block' : 'none');
            companyGroups.forEach(el => el.style.display = type === 'company' ? 'block' : 'none');

            // Títulos das etapas
            const candidateStepTitle = document.querySelectorAll('.candidate-step-title');
            const companyStepTitle = document.querySelectorAll('.company-step-title');
            candidateStepTitle.forEach(el => el.style.display = type === 'candidate' ? 'block' : 'none');
            companyStepTitle.forEach(el => el.style.display = type === 'company' ? 'block' : 'none');

            // Atualizar atributos required de forma abrangente
            const candidateRequired = document.querySelectorAll('.candidate-field [required], .candidate-fields [required], .candidate-personal-fields [required]');
            const companyRequired = document.querySelectorAll('.company-field [required], .company-fields [required], .company-personal-fields [required]');

            candidateRequired.forEach(field => { field.required = type === 'candidate'; });
            companyRequired.forEach(field => { field.required = type === 'company'; });

            // Reset form validation state (remover classe invalid apenas no container atual)
            const currentStepContainer = document.querySelector('.step-container.active');
            if (currentStepContainer) {
                const invalidFields = currentStepContainer.querySelectorAll('.invalid');
                invalidFields.forEach(field => field.classList.remove('invalid'));
            }
        });
    });

    // Garantir estado inicial com base no botão ativo (se houver)
    const initiallyActive = document.querySelector('.account-type.active');
    if (initiallyActive) {
        // chama o handler para aplicar classes/required corretamente
        initiallyActive.click();
    }

    // Validação de campos por etapa
    function validateStep(step) {
        const currentContainer = document.querySelector('.step-container[data-step="' + step + '"]');
        const requiredFields = currentContainer.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalid = null;

        const isVisible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));

        requiredFields.forEach(field => {
            // Ignorar campos escondidos
            if (!isVisible(field)) return;

            // Se for o select de curso, verificar os campos relacionados apenas se "sim" estiver selecionado
            if (field.id === 'tem_curso' && field.value === 'sim') {
                const camposObrigatoriosCurso = ['instituicao', 'curso', 'status_curso'];
                camposObrigatoriosCurso.forEach(id => {
                    const campo = document.getElementById(id);
                    if (campo && isVisible(campo) && !campo.value.toString().trim()) {
                        isValid = false;
                        campo.classList.add('invalid');
                        if (!firstInvalid) firstInvalid = campo;
                    }
                });
            }

            const val = field.value == null ? '' : field.value.toString();
            if (!val.trim()) {
                isValid = false;
                field.classList.add('invalid');
                if (!firstInvalid) firstInvalid = field;
            } else {
                field.classList.remove('invalid');
            }
        });

        if (!isValid) {
            Toast.error('Por favor, preencha todos os campos obrigatórios');
            // foco no primeiro campo inválido visível para melhor UX
            if (firstInvalid && isVisible(firstInvalid)) {
                try {
                    firstInvalid.focus();
                } catch (e) {
                    const currentContainer = document.querySelector('.step-container[data-step="' + step + '"]');
                    if (currentContainer && currentContainer.scrollIntoView) currentContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                const currentContainer = document.querySelector('.step-container[data-step="' + step + '"]');
                if (currentContainer && currentContainer.scrollIntoView) currentContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return isValid;
    }

    // Navegação entre etapas
    function updateStep(newStep) {
        if (newStep < 1 || newStep > steps.length) return;

        if (newStep > currentStep && !validateStep(currentStep)) {
            return;
        }

        steps.forEach(step => step.classList.remove('active'));
        stepDots.forEach(dot => dot.classList.remove('active', 'completed'));

        document.querySelector('.step-container[data-step="' + newStep + '"]').classList.add('active');
        
        // Atualizar indicadores
        for (let i = 1; i <= steps.length; i++) {
            const dot = document.querySelector('.step-dot[data-step="' + i + '"]');
            if (i < newStep) {
                dot.classList.add('completed');
            } else if (i === newStep) {
                dot.classList.add('active');
            }
        }

        // Atualizar linha de progresso
        const progress = ((newStep - 1) / (steps.length - 1)) * 100;
        progressLine.style.width = progress + '%';

        // Atualizar botões
        prevButton.disabled = newStep === 1;
        nextButton.style.display = newStep === steps.length ? 'none' : 'block';
        submitButton.style.display = newStep === steps.length ? 'block' : 'none';

        currentStep = newStep;
    }

    nextButton.addEventListener('click', () => updateStep(currentStep + 1));
    prevButton.addEventListener('click', () => updateStep(currentStep - 1));

    // Envio do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep(currentStep)) {
            return;
        }
        // Construir um objeto limpo a partir do formulário (inclui campos escondidos)
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Adicionar tipo de conta selecionado
        const accountTypeEl = document.querySelector('.account-type.active');
        const accountType = accountTypeEl ? accountTypeEl.dataset.type : 'candidate';
        data.type = accountType === 'candidate' ? 'candidato' : 'empresa';

        // Sanitizações e validações extras do cliente
        if (data.cpf) data.cpf = data.cpf.replace(/\D/g, '');
        if (data.cep) data.cep = data.cep.replace(/\D/g, '');

        // Validações de senha (caso existam no formulário)
        const password = data.password || '';
        const confirmPassword = data['confirm-password'] || data.confirmPassword || '';
        if (password.length < 6) {
            Toast.error('A senha deve ter no mínimo 6 caracteres');
            return;
        }
        if (password !== confirmPassword) {
            Toast.error('As senhas não coincidem');
            return;
        }

        // Garantir que habilidades e benefícios sejam arrays válidos
        try {
            if (typeof data.habilidades === 'string' && data.habilidades.trim() === '') data.habilidades = JSON.stringify([]);
        } catch (e) { data.habilidades = JSON.stringify([]); }
        try {
            if (typeof data.beneficios === 'string' && data.beneficios.trim() === '') data.beneficios = JSON.stringify([]);
        } catch (e) { data.beneficios = JSON.stringify([]); }

        // Desabilitar botões para prevenir múltiplos envios
        submitButton.disabled = true;
        nextButton.disabled = true;
        prevButton.disabled = true;

        const redirectDelay = 1200; // pequeno atraso para UX

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            let responseData = {};
            try { responseData = await response.json(); } catch (e) { /* ignore parse errors */ }

            if (response.ok) {
                Toast.success('Cadastro realizado com sucesso!');
                setTimeout(() => {
                    window.location.href = data.type === 'candidato' ? '/perfil-candidato' : '/perfil-empresa';
                }, redirectDelay);
            } else {
                console.error('Register response error:', response.status, responseData);
                Toast.error(responseData.error || 'Erro ao realizar cadastro');
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            Toast.error('Erro ao conectar com o servidor');
        } finally {
            submitButton.disabled = false;
            nextButton.disabled = false;
            prevButton.disabled = false;
        }
    });
});