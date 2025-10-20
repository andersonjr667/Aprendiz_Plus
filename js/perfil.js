// Manipulação do perfil
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se usuário está autenticado no servidor via cookie httpOnly
    let isAuthenticated = false;
    (async function checkAuth() {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) {
                isAuthenticated = false;
                // esconder elementos de edição se não autenticado
                document.querySelectorAll('.btn-editar, .edit-avatar, .btn-publicar-vaga').forEach(el => el && (el.style.display = 'none'));
                return;
            }
            const user = await res.json();
            isAuthenticated = !!user;
            
            if (!isAuthenticated) {
                document.querySelectorAll('.btn-editar, .edit-avatar, .btn-publicar-vaga').forEach(el => el && (el.style.display = 'none'));
            } else {
                // Preencher dados do perfil
                const dadosEl = document.querySelector('.perfil-dados');
                dadosEl.innerHTML = `
                    <h1>${user.name}</h1>
                    <p class="perfil-titulo" data-field="titulo">${user.titulo || (user.type === 'candidato' ? 'Estudante' : user.setor || 'Empresa')}</p>
                    <p class="perfil-local" data-field="localizacao">${user.cidade || ''}, ${user.estado || ''}</p>
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
                    infoList.innerHTML = `
                        <li><strong>CPF:</strong> ${user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''}</li>
                        <li><strong>Idade:</strong> ${calculateAge(user.birthdate)} anos</li>
                        <li><strong>Escolaridade:</strong> ${user.escolaridade || 'Não informado'}</li>
                        <li><strong>Email:</strong> ${user.email}</li>
                    `;
                } else {
                    infoList.innerHTML = `
                        <li><strong>Setor:</strong> ${user.setor || 'Não informado'}</li>
                        <li><strong>Website:</strong> ${user.website ? `<a href="${user.website}" target="_blank">${user.website}</a>` : 'Não informado'}</li>
                        <li><strong>Email:</strong> ${user.email}</li>
                        <li><strong>CNPJ:</strong> ${user.cnpj || 'Não informado'}</li>
                    `;
                }

                // Preencher sobre
                const sobreEl = document.querySelector('.perfil-main .perfil-card p');
                if (sobreEl) {
                    sobreEl.textContent = user.sobre || 'Adicione uma descrição sobre você...';
                }

                // Preencher habilidades/benefícios
                const skillsEl = document.querySelector('.skills-list');
                if (skillsEl && user.skills) {
                    skillsEl.innerHTML = user.skills
                        .map(skill => `<span class="skill-tag">${skill}</span>`)
                        .join('');
                }
            }
        } catch (e) {
            isAuthenticated = false;
            document.querySelectorAll('.btn-editar, .edit-avatar, .btn-publicar-vaga').forEach(el => el && (el.style.display = 'none'));
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
                
                if (target) {
                    // Campos específicos no cabeçalho
                    content = document.querySelector(`[data-field="${target}"]`);
                    
                    // Tipo específico de campo
                    switch(target) {
                        case 'localizacao':
                            fieldType = 'location';
                            break;
                        case 'titulo':
                            fieldType = 'text';
                            break;
                        default:
                            fieldType = 'text';
                    }

                    // Criar edição para campos do cabeçalho
                    if (content && !content.parentElement.querySelector('.edit-mode')) {
                        const currentContent = content.innerHTML;
                        const editForm = document.createElement('div');
                        editForm.className = 'edit-mode';

                        if (fieldType === 'text' || fieldType === 'location') {
                            editForm.innerHTML = `
                                <input type="text" value="${content.textContent.trim()}" class="edit-input">
                                <div class="edit-actions">
                                    <button class="btn-save">Salvar</button>
                                    <button class="btn-cancel">Cancelar</button>
                                </div>
                            `;
                        } else {
                            editForm.innerHTML = `
                                <textarea class="edit-input">${content.textContent.trim()}</textarea>
                                <div class="edit-actions">
                                    <button class="btn-save">Salvar</button>
                                    <button class="btn-cancel">Cancelar</button>
                                </div>
                            `;
                        }

                        content.style.display = 'none';
                        content.after(editForm);
                        setupEditFormButtons(editForm, content, currentContent);
                    }
                } else {
                    // Edição padrão de cards
                    const card = this.closest('.perfil-card');
                    if (!card) return;
                    content = card.querySelector('p, ul, .skills-list, .beneficios-lista');

                    if (content && !card.querySelector('.edit-mode')) {
                        // Criar formulário de edição
                        const currentContent = content.innerHTML;
                        const editForm = document.createElement('div');
                        editForm.className = 'edit-mode';
                        
                        if (content.classList.contains('skills-list') || content.classList.contains('beneficios-lista')) {
                            // Edição de tags
                            const tags = Array.from(content.querySelectorAll('span'))
                                .map(span => span.textContent)
                                .join(', ');
                            
                            editForm.innerHTML = `
                                <input type="text" value="${tags}" class="edit-input" placeholder="Separar por vírgulas">
                                <div class="edit-actions">
                                    <button class="btn-save">Salvar</button>
                                    <button class="btn-cancel">Cancelar</button>
                                </div>
                            `;
                        } else {
                            // Edição de texto
                            editForm.innerHTML = `
                                <textarea class="edit-input">${content.textContent.trim()}</textarea>
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
                }
            });
        });
    };

    // Configurar botões do formulário de edição
    const setupEditFormButtons = (editForm, content, originalContent) => {
        const saveBtn = editForm.querySelector('.btn-save');
        const cancelBtn = editForm.querySelector('.btn-cancel');
        
        saveBtn.addEventListener('click', () => {
            const input = editForm.querySelector('.edit-input');
            if (content.classList.contains('skills-list') || content.classList.contains('beneficios-lista')) {
                // Atualizar tags
                const tags = input.value.split(',').map(tag => tag.trim());
                content.innerHTML = tags
                    .filter(tag => tag)
                    .map(tag => `<span class="skill-tag">${tag}</span>`)
                    .join('');
            } else {
                // Atualizar texto localmente
                content.innerText = input.value;
            }

            // Persistir alteração no servidor (se o usuário for autenticado)
            if (isAuthenticated) {
                const userIdEl = document.querySelector('[data-user-id]');
                const userId = userIdEl ? userIdEl.dataset.userId : null;
                if (userId) {
                    // montar payload simples: se for lista, enviar como array
                    let payload = {};
                    if (content.classList.contains('skills-list') || content.classList.contains('beneficios-lista')) {
                        const tags = Array.from(content.querySelectorAll('span')).map(s => s.textContent);
                        payload = { skills: tags };
                    } else {
                        // inferir campo pelo atributo data-field, se existir
                        const field = content.dataset.field || 'sobre';
                        payload[field] = input.value;
                    }

                    fetch(`/api/users/${userId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    }).then(r => r.json()).then(json => {
                        if (json && json.error) {
                            alert('Erro ao salvar: ' + json.error);
                            // reverter para original
                            content.innerHTML = originalContent;
                        } else {
                            // opcional: mostrar toast
                            console.log('Perfil atualizado');
                        }
                    }).catch(err => {
                        console.error('Save profile error', err);
                        content.innerHTML = originalContent;
                        alert('Erro ao salvar alteração');
                    });
                }
            } else {
                // Usuário não autenticado — reverter e avisar
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
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const avatarImg = document.querySelector('.perfil-avatar img');
                            avatarImg.src = event.target.result;
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
                // Aqui você pode implementar a lógica para abrir um modal
                // ou redirecionar para a página de criação de vaga
                window.location.href = '/publicar-vaga';
            });
        }
    };

    // Visualizar candidatos
    const setupVerCandidatos = () => {
        document.querySelectorAll('.btn-ver-candidatos').forEach(btn => {
            btn.addEventListener('click', function() {
                const vagaId = this.closest('.vaga-item').dataset.id;
                // Aqui você pode implementar a lógica para abrir um modal
                // ou redirecionar para a página de candidatos da vaga
                window.location.href = `/candidatos-vaga/${vagaId}`;
            });
        });
    };

    // Inicializar todas as funcionalidades
    setupEditButtons();
    setupImageUpload();
    setupPublicarVaga();
    setupVerCandidatos();

    // Adicionar estilos dinâmicos para o formulário de edição
    const style = document.createElement('style');
    style.textContent = `
        .edit-mode {
            margin: 1rem 0;
        }
        
        .edit-input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
        }
        
        textarea.edit-input {
            min-height: 100px;
            resize: vertical;
        }
        
        .edit-actions {
            display: flex;
            gap: 1rem;
        }
        
        .btn-save, .btn-cancel {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .btn-save {
            background: #28a745;
            color: white;
        }
        
        .btn-cancel {
            background: #dc3545;
            color: white;
        }
    `;
    document.head.appendChild(style);
});