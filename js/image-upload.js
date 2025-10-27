// Funções compartilhadas para upload de imagem
const imageUpload = {
    // Inicializa o input de arquivo
    setupImageInput(containerId, previewImageId, uploadEndpoint) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Criar input de arquivo oculto
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        container.appendChild(input);

        // Adicionar evento de clique ao container
        container.style.cursor = 'pointer';
        container.addEventListener('click', () => {
            input.click();
        });

        // Manipular seleção de arquivo
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                // Mostrar preview
                const previewImage = document.getElementById(previewImageId);
                if (previewImage) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImage.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }

                // Enviar arquivo para o servidor
                const formData = new FormData();
                formData.append('profileImage', file);

                const response = await fetch(uploadEndpoint, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Erro ao fazer upload da imagem');
                }

                // Atualizar src da imagem com a URL retornada pelo servidor
                if (previewImage && data.imageUrl) {
                    previewImage.src = data.imageUrl;
                }

                Toast.success('Imagem atualizada com sucesso');
            } catch (error) {
                console.error('Erro no upload:', error);
                Toast.error(error.message || 'Erro ao fazer upload da imagem');
            }
        });

        // Adicionar efeito de hover
        container.addEventListener('mouseover', () => {
            const editButton = container.querySelector('.edit-avatar');
            if (editButton) {
                editButton.style.opacity = '1';
            }
        });

        container.addEventListener('mouseout', () => {
            const editButton = container.querySelector('.edit-avatar');
            if (editButton) {
                editButton.style.opacity = '0';
            }
        });
    }
};