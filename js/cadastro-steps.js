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

    // Alternar tipo de conta
    const accountTypes = document.querySelectorAll('.account-type');
    accountTypes.forEach(btn => {
        btn.addEventListener('click', () => {
            accountTypes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            
            // Atualizar campos visíveis
            if (type === 'candidate') {
                // Campos da etapa profissional
                document.querySelector('.candidate-fields').style.display = 'block';
                document.querySelector('.company-fields').style.display = 'none';
                // Campos pessoais
                document.querySelector('.candidate-personal-fields').style.display = 'block';
                document.querySelector('.company-personal-fields').style.display = 'none';
                // Título da etapa
                document.querySelector('.candidate-step-title').style.display = 'block';
                document.querySelector('.company-step-title').style.display = 'none';
            } else {
                // Campos da etapa profissional
                document.querySelector('.candidate-fields').style.display = 'none';
                document.querySelector('.company-fields').style.display = 'block';
                // Campos pessoais
                document.querySelector('.candidate-personal-fields').style.display = 'none';
                document.querySelector('.company-personal-fields').style.display = 'block';
                // Título da etapa
                document.querySelector('.candidate-step-title').style.display = 'none';
                document.querySelector('.company-step-title').style.display = 'block';
            }

            // Atualizar campos required
            const candidateFields = document.querySelectorAll('.candidate-fields [required]');
            const companyFields = document.querySelectorAll('.company-fields [required]');

            candidateFields.forEach(field => {
                field.required = type === 'candidate';
            });

            companyFields.forEach(field => {
                field.required = type === 'company';
            });

            // Reset form validation state
            const currentStepContainer = document.querySelector('.step-container.active');
            const invalidFields = currentStepContainer.querySelectorAll('.invalid');
            invalidFields.forEach(field => field.classList.remove('invalid'));
        });
    });

    // Validação de campos por etapa
    function validateStep(step) {
        const currentContainer = document.querySelector('.step-container[data-step="' + step + '"]');
        const requiredFields = currentContainer.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            // Se for o select de curso, verificar os campos relacionados apenas se "sim" estiver selecionado
            if (field.id === 'tem_curso' && field.value === 'sim') {
                const camposObrigatoriosCurso = ['instituicao', 'curso', 'status_curso'];
                camposObrigatoriosCurso.forEach(id => {
                    const campo = document.getElementById(id);
                    if (campo && !campo.value.trim()) {
                        isValid = false;
                        campo.classList.add('invalid');
                    }
                });
            }
            
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('invalid');
            } else {
                field.classList.remove('invalid');
            }
        });

        if (!isValid) {
            Toast.error('Por favor, preencha todos os campos obrigatórios');
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

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Adicionar tipo de conta
        const accountType = document.querySelector('.account-type.active').dataset.type;
        data.type = accountType === 'candidate' ? 'candidato' : 'empresa';
        // Esperar um pouco mais para garantir que o cookie seja definido
        const redirectDelay = 2000; // 2 segundos

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (response.ok) {
                Toast.success('Cadastro realizado com sucesso!');
                setTimeout(() => {
                    window.location.href = data.type === 'candidato' ? '/perfil-candidato' : '/perfil-empresa';
                }, redirectDelay);
            } else {
                Toast.error(responseData.error || 'Erro ao realizar cadastro');
            }
        } catch (error) {
            console.error('Erro no cadastro:', error);
            Toast.error('Erro ao conectar com o servidor');
        }
    });
});