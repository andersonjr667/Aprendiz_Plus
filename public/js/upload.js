// Upload functionality
let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuthForUpload();
    
    // Initialize upload interface
    initializeUpload();
    
    // Load user uploads
    loadUploads();
});

function checkAuthForUpload() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const btnSelectFile = document.getElementById('btnSelectFile');
    const btnClear = document.getElementById('btnClear');
    const btnUpload = document.getElementById('btnUpload');

    // Click to select file
    btnSelectFile.addEventListener('click', () => {
        fileInput.click();
    });

    uploadArea.addEventListener('click', (e) => {
        if (e.target === uploadArea || e.target.closest('.upload-area')) {
            fileInput.click();
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelection(file);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelection(file);
        }
    });

    // Clear selection
    btnClear.addEventListener('click', clearFileSelection);

    // Upload file
    btnUpload.addEventListener('click', uploadFile);
}

function handleFileSelection(file) {
    console.log('File selected:', file);

    // Validate file type
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
        if (window.UI && window.UI.toast) {
            window.UI.toast('Tipo de arquivo não permitido. Use: JPG, PNG, WEBP, PDF, DOCX, TXT', 'error');
        } else {
            alert('Tipo de arquivo não permitido. Use: JPG, PNG, WEBP, PDF, DOCX, TXT');
        }
        return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        if (window.UI && window.UI.toast) {
            window.UI.toast('Arquivo muito grande. Tamanho máximo: 10MB', 'error');
        } else {
            alert('Arquivo muito grande. Tamanho máximo: 10MB');
        }
        return;
    }

    selectedFile = file;
    showFilePreview(file);
}

function showFilePreview(file) {
    const uploadArea = document.getElementById('uploadArea');
    const filePreview = document.getElementById('filePreview');
    const previewImage = document.getElementById('previewImage');
    const previewDocument = document.getElementById('previewDocument');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');

    // Hide upload area, show preview
    uploadArea.style.display = 'none';
    filePreview.style.display = 'block';

    // Show file info
    previewName.textContent = file.name;
    previewSize.textContent = formatFileSize(file.size);

    // Show preview based on type
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            previewDocument.style.display = 'none';
        };
        reader.readAsDataURL(file);
    } else {
        previewImage.style.display = 'none';
        previewDocument.style.display = 'block';
    }
}

function clearFileSelection() {
    selectedFile = null;
    const uploadArea = document.getElementById('uploadArea');
    const filePreview = document.getElementById('filePreview');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.style.display = 'block';
    filePreview.style.display = 'none';
    fileInput.value = '';
}

async function uploadFile() {
    if (!selectedFile) {
        alert('Selecione um arquivo primeiro');
        return;
    }

    const btnUpload = document.getElementById('btnUpload');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    try {
        btnUpload.disabled = true;
        uploadProgress.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = 'Enviando...';

        // Simulate progress (since we can't track actual upload progress easily)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                progressFill.style.width = progress + '%';
            }
        }, 200);

        // Create FormData
        const formData = new FormData();
        formData.append('file', selectedFile);

        // Upload to server
        const response = await fetch('/api/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao fazer upload');
        }

        const data = await response.json();
        console.log('Upload success:', data);

        progressText.textContent = 'Upload concluído!';
        
        // Show success message
        setTimeout(() => {
            if (window.UI && window.UI.toast) {
                window.UI.toast('Arquivo enviado com sucesso!', 'success');
            } else {
                alert('Arquivo enviado com sucesso!');
            }
            clearFileSelection();
            loadUploads(); // Reload uploads list
        }, 1000);

    } catch (err) {
        console.error('Upload error:', err);
        if (window.UI && window.UI.toast) {
            window.UI.toast('Erro ao fazer upload: ' + err.message, 'error');
        } else {
            alert('Erro ao fazer upload: ' + err.message);
        }
        uploadProgress.style.display = 'none';
    } finally {
        btnUpload.disabled = false;
    }
}

async function loadUploads() {
    const uploadsList = document.getElementById('uploadsList');
    
    try {
        uploadsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

        const response = await fetch('/api/uploads', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar uploads');
        }

        const uploads = await response.json();
        console.log('Uploads loaded:', uploads);

        if (uploads.length === 0) {
            uploadsList.innerHTML = `
                <div class="no-uploads">
                    <i class="fas fa-folder-open"></i>
                    <p>Nenhum arquivo enviado ainda</p>
                </div>
            `;
            return;
        }

        uploadsList.innerHTML = uploads.map(upload => {
            const isImage = upload.fileType === 'image';
            const icon = isImage ? 'fa-image' : 'fa-file-alt';
            const iconClass = isImage ? 'image' : 'document';
            const date = new Date(upload.uploadedAt).toLocaleDateString('pt-BR');
            const time = new Date(upload.uploadedAt).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            return `
                <div class="upload-item">
                    <div class="upload-icon-wrapper ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="upload-info">
                        <h4>${upload.originalName}</h4>
                        <div class="upload-meta">
                            <span><i class="fas fa-hdd"></i> ${formatFileSize(upload.size)}</span>
                            <span><i class="fas fa-calendar"></i> ${date}</span>
                            <span><i class="fas fa-clock"></i> ${time}</span>
                        </div>
                    </div>
                    <div class="upload-actions">
                        <button class="btn-view" onclick="viewFile('${upload.fileUrl}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn-delete" onclick="deleteUpload('${upload._id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Error loading uploads:', err);
        uploadsList.innerHTML = `
            <div class="no-uploads">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar arquivos</p>
            </div>
        `;
    }
}

function viewFile(fileUrl) {
    window.open(fileUrl, '_blank');
}

async function deleteUpload(uploadId) {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) {
        return;
    }

    try {
        const response = await fetch(`/api/uploads/${uploadId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir arquivo');
        }

        if (window.UI && window.UI.toast) {
            window.UI.toast('Arquivo excluído com sucesso!', 'success');
        } else {
            alert('Arquivo excluído com sucesso!');
        }
        loadUploads(); // Reload list

    } catch (err) {
        console.error('Delete error:', err);
        if (window.UI && window.UI.toast) {
            window.UI.toast('Erro ao excluir arquivo: ' + err.message, 'error');
        } else {
            alert('Erro ao excluir arquivo: ' + err.message);
        }
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
