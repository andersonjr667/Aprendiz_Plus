// Manipulação do perfil
document.addEventListener('DOMContentLoaded', () => {
    // Container para o conteúdo de login requerido
    const loginRequiredContainer = document.createElement('div');
    loginRequiredContainer.classList.add('login-required');
    loginRequiredContainer.innerHTML = `
        <div class="login-required-content">
            <h2>Acesso Restrito</h2>
            <p>Para acessar esta página, é necessário fazer login</p>
            <div class="login-required-buttons">
                <a href="/login" class="btn btn-primary">Fazer Login</a>
                <a href="/cadastro" class="btn btn-secondary">Criar Conta</a>
            </div>
        </div>
    `;

    // Verifica se usuário está autenticado no servidor via cookie httpOnly
    let isAuthenticated = false;
    (async function checkAuth() {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) {
                isAuthenticated = false;
                // Mostrar mensagem de login requerido
                document.querySelector('.perfil-container').style.display = 'none';
                document.body.appendChild(loginRequiredContainer);
                return;
            }
            const user = await res.json();
            isAuthenticated = !!user;
            
            if (!isAuthenticated) {
                // Mostrar mensagem de login requerido
                document.querySelector('.perfil-container').style.display = 'none';
                document.body.appendChild(loginRequiredContainer);
            } else {
                // Preencher dados do perfil
                const dadosEl = document.querySelector('.perfil-dados');
                const profile = user.type === 'candidato' ? user.candidateProfile : user.companyProfile;
                const address = profile?.address || {};
                const titulo = user.type === 'candidato' ? 
                    (profile?.education?.[0]?.degree || 'Estudante') : 
                    (profile?.industry || 'Empresa');

                dadosEl.innerHTML = `
                    <h1>${user.name}</h1>
                    <p class="perfil-titulo" data-field="titulo">${titulo}</p>
                    <p class="perfil-local" data-field="localizacao">${address.city || ''}, ${address.state || ''}</p>
                    <div class="perfil-actions">
                        <button class="btn-editar" data-target="titulo">Editar Título</button>
                        <button class="btn-editar" data-target="localizacao">Editar Localização</button>
                    </div>
                `;
                
                // Marcar o elemento com o ID do usuário para edições
                document.querySelector('.perfil-container').dataset.userId = user.id;
                
                // Informações específicas por tipo
                const infoList = document.querySelector('.perfil-sidebar .perfil-card ul');
                if (user.type === 'candidato') {
                    const education = profile?.education?.[0] || {};
                    infoList.innerHTML = `
                        <li><strong>CPF:</strong> ${user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''}</li>
                        <li><strong>Idade:</strong> ${calculateAge(user.birthdate)} anos</li>
                        <li><strong>Escolaridade:</strong> ${education.degree || 'Não informado'}</li>
                        <li><strong>Instituição:</strong> ${education.institution || 'Não informado'}</li>
                        <li><strong>Curso:</strong> ${education.course || 'Não informado'}</li>
                        <li><strong>Status:</strong> ${education.current ? 'Em Andamento' : 'Concluído'}</li>
                        <li><strong>Email:</strong> ${user.email}</li>
                        <li><strong>Telefone:</strong> ${profile?.phone || 'Não informado'}</li>
                        ${profile?.address ? `
                        <li><strong>Endereço:</strong><br>
                            ${profile.address.street}, ${profile.address.number}
                            ${profile.address.complement ? `, ${profile.address.complement}` : ''}<br>
                            ${profile.address.neighborhood}<br>
                            ${profile.address.city} - ${profile.address.state}<br>
                            CEP: ${profile.address.zipCode}
                        </li>` : ''}
                    `;
                } else {
                    infoList.innerHTML = `
                        <li><strong>Setor:</strong> ${profile?.industry || 'Não informado'}</li>
                        <li><strong>Website:</strong> ${profile?.website ? `<a href="${profile.website}" target="_blank">${profile.website}</a>` : 'Não informado'}</li>
                        <li><strong>Email:</strong> ${user.email}</li>
                        <li><strong>Telefone:</strong> ${profile?.phone || 'Não informado'}</li>
                        <li><strong>CNPJ:</strong> ${profile?.cnpj || 'Não informado'}</li>
                        ${profile?.address ? `
                        <li><strong>Endereço:</strong><br>
                            ${profile.address.street}, ${profile.address.number}
                            ${profile.address.complement ? `, ${profile.address.complement}` : ''}<br>
                            ${profile.address.neighborhood}<br>
                            ${profile.address.city} - ${profile.address.state}<br>
                            CEP: ${profile.address.zipCode}
                        </li>` : ''}
                    `;
                }

                // Preencher seção Sobre
                const sobreContent = document.querySelector('.sobre-content');
                if (sobreContent) {
                    const profile = user.type === 'candidato' ? user.candidateProfile : user.companyProfile;
                    if (profile?.description) {
                        sobreContent.innerHTML = `<p>${profile.description}</p>`;
                        sobreContent.closest('.perfil-card').querySelector('.btn-editar').textContent = 'Editar Descrição';
                    } else {
                        sobreContent.innerHTML = '<p class="placeholder-text">Conte um pouco sobre você, seus objetivos e interesses...</p>';
                    }
                }

                // Preencher Formação Acadêmica
                const formacaoContent = document.querySelector('.formacao-content');
                if (formacaoContent) {
                    const profile = user.type === 'candidato' ? user.candidateProfile : user.companyProfile;
                    if (profile?.education && profile.education.length > 0) {
                        formacaoContent.innerHTML = profile.education.map(edu => `
                            <div class="formacao-item">
                                <h4>${edu.degree}</h4>
                                <p>${edu.institution}</p>
                                <p>${edu.course || ''}</p>
                                ${edu.current ? '<span class="status-atual">Cursando atualmente</span>' : ''}
                            </div>
                        `).join('');
                        formacaoContent.closest('.perfil-card').querySelector('.btn-editar').textContent = 'Editar Formação';
                    } else {
                        formacaoContent.innerHTML = '<p class="placeholder-text">Adicione informações sobre sua formação acadêmica atual...</p>';
                    }
                }

                // Preencher Cursos e Certificações
                const cursosContent = document.querySelector('.cursos-content');
                if (cursosContent) {
                    const profile = user.type === 'candidato' ? user.candidateProfile : user.companyProfile;
                    if (profile?.courses && profile.courses.length > 0) {
                        cursosContent.innerHTML = profile.courses.map(curso => `
                            <div class="curso-item">
                                <h4>${curso.name}</h4>
                                <p>${curso.institution}</p>
                                <p>${curso.duration} horas - ${new Date(curso.completionDate).getFullYear()}</p>
                            </div>
                        `).join('');
                        cursosContent.closest('.perfil-card').querySelector('.btn-editar').textContent = 'Adicionar Novo Curso';
                    } else {
                        cursosContent.innerHTML = '<p class="placeholder-text">Adicione seus cursos e certificações aqui...</p>';
                    }
                }

                // Preencher habilidades/benefícios
                const skillsEl = document.querySelector('.skills-list');
                if (skillsEl) {
                    const profile = user.type === 'candidato' ? user.candidateProfile : user.companyProfile;
                    if (profile?.skills && Array.isArray(profile.skills)) {
                        skillsEl.innerHTML = profile.skills
                            .map(skill => `<span class="skill-tag">${skill}</span>`)
                            .join('');
                    } else {
                        skillsEl.innerHTML = '<p class="text-muted">Nenhuma habilidade cadastrada</p>';
                    }
                }

                // Reconfigurar botões após preencher dados
                setupEditButtons();
            }
        } catch (e) {
            isAuthenticated = false;
            // Mostrar mensagem de login requerido
            document.querySelector('.perfil-container').style.display = 'none';
            document.body.appendChild(loginRequiredContainer);
        }
    })();

    // Função auxiliar para calcular idade
    function calculateAge(birthdate) {
        const birth = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    // Função para editar campos
    const setupEditButtons = () => {
        document.querySelectorAll('.btn-editar').forEach(button => {
            button.addEventListener('click', function() {
                const target = this.dataset.target;
                let content, fieldType = 'text';
                let container = this.closest('.perfil-card, .perfil-dados');
                
                if (target) {
                    // Campos específicos no cabeçalho
                    content = container.querySelector(`[data-field="${target}"]`);
                    
                    if (target === 'localizacao') {
                        // Form especial para localização
                        const [cidade = '', estado = ''] = content.textContent.split(',').map(s => s.trim());
                        const editForm = document.createElement('div');
                        editForm.className = 'edit-mode';
                        editForm.innerHTML = `
                            <div class="location-inputs">
                                <input type="text" class="edit-input cidade" value="${cidade}" placeholder="Cidade">
                                <select class="edit-input estado">
                                    <option value="">UF</option>
                                    ${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
                                        .map(uf => `<option value="${uf}" ${estado === uf ? 'selected' : ''}>${uf}</option>`).join('')}
                                </select>
                            </div>
                            <div class="edit-actions">
                                <button class="btn-save">Salvar</button>
                                <button class="btn-cancel">Cancelar</button>
                            </div>
                        `;
                        
                        content.style.display = 'none';
                        content.after(editForm);
                        
                        // Setup especial para salvar localização
                        setupLocationEditButtons(editForm, content);
                        return;
                    }
                } else {
                    content = container.querySelector('p, ul, .skills-list, .beneficios-lista');
                    if (content.classList.contains('skills-list') || content.classList.contains('beneficios-lista')) {
                        fieldType = 'tags';
                    }
                }
                
                if (content && !container.querySelector('.edit-mode')) {
                    // Criar formulário de edição padrão
                    const currentContent = fieldType === 'tags' 
                        ? Array.from(content.querySelectorAll('span')).map(span => span.textContent).join(', ')
                        : content.innerText;
                    
                    const editForm = document.createElement('div');
                    editForm.className = 'edit-mode';
                    
                    const sectionTitle = container.querySelector('h3')?.textContent;
                    
                    if (fieldType === 'tags') {
                        editForm.innerHTML = `
                            <input type="text" value="${currentContent}" class="edit-input" placeholder="Separar por vírgulas">
                            <div class="edit-actions">
                                <button class="btn-save">Salvar</button>
                                <button class="btn-cancel">Cancelar</button>
                            </div>
                        `;
                    } else if (sectionTitle === 'Formação Acadêmica') {
                        const education = user?.candidateProfile?.education?.[0] || {};
                        editForm.innerHTML = `
                            <div class="form-group">
                                <input type="text" class="edit-input" placeholder="Grau (Ex: Ensino Médio, Técnico, etc)" 
                                    value="${education.degree || ''}" name="degree">
                                <input type="text" class="edit-input" placeholder="Instituição de Ensino"
                                    value="${education.institution || ''}" name="institution">
                                <input type="text" class="edit-input" placeholder="Curso"
                                    value="${education.course || ''}" name="course">
                                <label class="checkbox-container">
                                    <input type="checkbox" ${education.current ? 'checked' : ''} name="current">
                                    Cursando atualmente
                                </label>
                            </div>
                            <div class="edit-actions">
                                <button class="btn-save">Salvar</button>
                                <button class="btn-cancel">Cancelar</button>
                            </div>
                        `;
                    } else if (sectionTitle === 'Cursos e Certificações') {
                        editForm.innerHTML = `
                            <div class="form-group">
                                <input type="text" class="edit-input" placeholder="Nome do Curso" name="name">
                                <input type="text" class="edit-input" placeholder="Instituição" name="institution">
                                <div class="curso-details">
                                    <input type="number" class="edit-input" placeholder="Duração (horas)" name="duration">
                                    <input type="month" class="edit-input" name="completionDate">
                                </div>
                            </div>
                            <div class="edit-actions">
                                <button class="btn-save">Salvar</button>
                                <button class="btn-cancel">Cancelar</button>
                            </div>
                        `;
                    } else {
                        editForm.innerHTML = `
                            <textarea class="edit-input">${currentContent}</textarea>
                            <div class="edit-actions">
                                <button class="btn-save">Salvar</button>
                                <button class="btn-cancel">Cancelar</button>
                            </div>
                        `;
                    }
                    
                    content.style.display = 'none';
                    content.after(editForm);
                    
                    // Eventos dos botões de salvar e cancelar
                    setupEditFormButtons(editForm, content, currentContent);
                }
            });
        });
    };

    // Configurar botões do formulário de edição para localização
    const setupLocationEditButtons = (editForm, content) => {
        const saveBtn = editForm.querySelector('.btn-save');
        const cancelBtn = editForm.querySelector('.btn-cancel');
        const originalContent = content.textContent;
        
        saveBtn.addEventListener('click', () => {
            const cidade = editForm.querySelector('.cidade').value.trim();
            const estado = editForm.querySelector('.estado').value;
            const newContent = cidade && estado ? `${cidade}, ${estado}` : originalContent;
            
            if (isAuthenticated) {
                const userId = document.querySelector('.perfil-container').dataset.userId;
                if (userId) {
                    fetch(`/api/users/${userId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ cidade, estado })
                    }).then(r => r.json()).then(json => {
                        if (json && json.error) {
                            alert('Erro ao salvar: ' + json.error);
                            content.textContent = originalContent;
                        } else {
                            content.textContent = newContent;
                        }
                    }).catch(err => {
                        console.error('Save location error', err);
                        content.textContent = originalContent;
                        alert('Erro ao salvar alteração');
                    });
                }
            } else {
                content.textContent = originalContent;
                alert('Você precisa estar logado para salvar alterações.');
            }
            
            content.style.display = '';
            editForm.remove();
        });
        
        cancelBtn.addEventListener('click', () => {
            content.style.display = '';
            editForm.remove();
        });
    };

    // Configurar botões do formulário de edição
    const setupEditFormButtons = (editForm, content, originalContent) => {
        const saveBtn = editForm.querySelector('.btn-save');
        const cancelBtn = editForm.querySelector('.btn-cancel');
        
        saveBtn.addEventListener('click', () => {
            const input = editForm.querySelector('.edit-input');
            const isTags = content.classList.contains('skills-list') || content.classList.contains('beneficios-lista');
            let newContent, fieldValue;
            
            if (isTags) {
                const tags = input.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                newContent = tags.map(tag => `<span class="skill-tag">${tag}</span>`).join('');
                fieldValue = tags;
            } else {
                newContent = input.value;
                fieldValue = input.value;
            }

            // Persistir alteração no servidor
            if (isAuthenticated) {
                const userId = document.querySelector('.perfil-container').dataset.userId;
                if (userId) {
                    // Determinar campo e payload baseado no tipo de campo
                    let payload;
                    const profile = user.type === 'candidato' ? 'candidateProfile' : 'companyProfile';

                    if (content.dataset.field === 'titulo') {
                        if (user.type === 'candidato') {
                            payload = {
                                [profile]: {
                                    education: [{
                                        ...user[profile].education[0],
                                        degree: fieldValue
                                    }]
                                }
                            };
                        } else {
                            payload = {
                                [profile]: {
                                    ...user[profile],
                                    industry: fieldValue
                                }
                            };
                        }
                    } else if (content.dataset.field === 'localizacao') {
                        const [city, state] = fieldValue.split(',').map(s => s.trim());
                        payload = {
                            [profile]: {
                                ...user[profile],
                                address: {
                                    ...user[profile].address,
                                    city,
                                    state
                                }
                            }
                        };
                    } else if (isTags) {
                        payload = {
                            [profile]: {
                                ...user[profile],
                                skills: fieldValue
                            }
                        };
                    } else if (content.closest('.perfil-card').querySelector('h3').textContent === 'Formação Acadêmica') {
                        // Campo formação acadêmica
                        const formacao = {
                            degree: fieldValue.split('\n')[0] || '',
                            institution: fieldValue.split('\n')[1] || '',
                            course: fieldValue.split('\n')[2] || '',
                            current: fieldValue.toLowerCase().includes('cursando')
                        };
                        
                        payload = {
                            [profile]: {
                                ...user[profile],
                                education: [formacao]
                            }
                        };
                    } else if (content.closest('.perfil-card').querySelector('h3').textContent === 'Cursos e Certificações') {
                        // Campo cursos
                        const curso = {
                            name: fieldValue.split('\n')[0] || '',
                            institution: fieldValue.split('\n')[1] || '',
                            duration: fieldValue.split('\n')[2]?.split(' ')[0] || '0',
                            completionDate: new Date().toISOString()
                        };
                        
                        payload = {
                            [profile]: {
                                ...user[profile],
                                courses: [...(user[profile]?.courses || []), curso]
                            }
                        };
                    } else {
                        // Campo sobre
                        payload = {
                            [profile]: {
                                ...user[profile],
                                description: fieldValue
                            }
                        };
                    }

                    fetch(`/api/users/${userId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    }).then(r => r.json()).then(json => {
                        if (json && json.error) {
                            alert('Erro ao salvar: ' + json.error);
                            content.innerHTML = originalContent;
                        } else {
                            content.innerHTML = newContent;
                        }
                    }).catch(err => {
                        console.error('Save error:', err);
                        content.innerHTML = originalContent;
                        alert('Erro ao salvar alteração');
                    });
                }
            } else {
                content.innerHTML = originalContent;
                alert('Você precisa estar logado para salvar alterações.');
            }
            
            content.style.display = '';
            editForm.remove();
        });
        
        cancelBtn.addEventListener('click', () => {
            content.style.display = '';
            content.innerHTML = originalContent;
            editForm.remove();
        });
    };

    // Upload de imagem de perfil
    const setupImageUpload = () => {
        const editAvatarBtn = document.querySelector('.edit-avatar');
        if (editAvatarBtn) {
            editAvatarBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        // Validar tipo e tamanho do arquivo
                        if (!file.type.startsWith('image/')) {
                            alert('Por favor, selecione apenas arquivos de imagem.');
                            return;
                        }
                        
                        if (file.size > 5 * 1024 * 1024) { // 5MB
                            alert('A imagem deve ter no máximo 5MB.');
                            return;
                        }

                        // Preview da imagem
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const avatarImg = document.querySelector('.perfil-avatar img');
                            const tempUrl = event.target.result;
                            
                            if (isAuthenticated) {
                                const userId = document.querySelector('.perfil-container').dataset.userId;
                                if (userId) {
                                    const formData = new FormData();
                                    formData.append('profileImage', file);

                                    fetch(`/api/users/${userId}/profile-image`, {
                                        method: 'POST',
                                        credentials: 'include',
                                        body: formData
                                    })
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.error) {
                                            alert('Erro ao fazer upload da imagem: ' + data.error);
                                            // Reverter para imagem anterior
                                            avatarImg.src = '/images/avatar-default.png';
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Upload error:', error);
                                        alert('Erro ao fazer upload da imagem');
                                        // Reverter para imagem anterior
                                        avatarImg.src = '/images/avatar-default.png';
                                    });
                                }
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                };
                
                input.click();
            });
        }
    };

    // Publicar nova vaga
    const setupPublicarVaga = () => {
        const btnPublicar = document.querySelector('.btn-publicar-vaga');
        if (btnPublicar) {
            btnPublicar.addEventListener('click', () => {
                window.location.href = '/publicar-vaga';
            });
        }
    };

    // Visualizar candidatos
    const setupVerCandidatos = () => {
        document.querySelectorAll('.btn-ver-candidatos').forEach(btn => {
            btn.addEventListener('click', function() {
                const vagaId = this.closest('.vaga-item').dataset.id;
                window.location.href = `/candidatos-vaga/${vagaId}`;
            });
        });
    };

    // Estilos dinâmicos
    const style = document.createElement('style');
    style.textContent = `
        .edit-mode {
            margin: 1rem 0;
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .edit-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        
        .edit-input:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
        }
        
        .location-inputs {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .location-inputs .cidade {
            flex: 1;
        }
        
        .location-inputs .estado {
            width: 80px;
        }
        
        textarea.edit-input {
            min-height: 120px;
            resize: vertical;
            line-height: 1.5;
        }
        
        .edit-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .btn-save, .btn-cancel {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .btn-save {
            background: var(--primary-color);
            color: white;
        }
        
        .btn-save:hover {
            background: var(--primary-dark);
        }
        
        .btn-cancel {
            background: #dc3545;
            color: white;
        }
        
        .btn-cancel:hover {
            background: #c82333;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .curso-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        
        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
            cursor: pointer;
        }
        
        .checkbox-container input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .skill-tag {
            display: inline-block;
            background: var(--primary-light);
            color: var(--primary-dark);
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            margin: 0.25rem;
            font-size: 0.9rem;
        }

        .perfil-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }

        .placeholder-text {
            color: #999;
            font-style: italic;
            text-align: center;
            padding: 2rem;
            background: #f9f9f9;
            border-radius: 4px;
            border: 2px dashed #ddd;
        }

        .empty-section {
            text-align: center;
            padding: 2rem;
        }

        .formacao-item, .curso-item {
            border: 1px solid #eee;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
        }

        .formacao-item:last-child, .curso-item:last-child {
            margin-bottom: 0;
        }

        .status-atual {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 4px;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }
    `;
    document.head.appendChild(style);

    // Inicializar funcionalidades
    setupEditButtons();
    setupImageUpload();
    setupPublicarVaga();
    setupVerCandidatos();
});