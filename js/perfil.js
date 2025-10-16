// Manipulação do perfil
document.addEventListener('DOMContentLoaded', () => {
    // Função para editar campos
    const setupEditButtons = () => {
        document.querySelectorAll('.btn-editar').forEach(button => {
            button.addEventListener('click', function() {
                const card = this.closest('.perfil-card');
                const content = card.querySelector('p, ul, .skills-list, .beneficios-lista');
                
                if (content) {
                    if (!card.querySelector('.edit-mode')) {
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
                                <textarea class="edit-input">${content.innerText}</textarea>
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
                // Atualizar texto
                content.innerText = input.value;
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