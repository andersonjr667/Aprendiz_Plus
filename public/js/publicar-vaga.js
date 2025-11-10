// publicar-vaga.js — Enhanced job publishing form
console.log('publicar-vaga.js loaded!');

// Arrays to store tags
let requirements = [];
let benefits = [];

// Show message function
function showMessage(message, type = 'success') {
  const messageBox = document.getElementById('messageBox');
  if (messageBox) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';
    
    // Scroll to message
    messageBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageBox.style.display = 'none';
      }, 5000);
    }
  }
}

// Initialize tag input
function initTagInput(inputId, containerId, tagsArray) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);
  
  console.log('Initializing tag input:', inputId, 'Container:', containerId);
  console.log('Input found:', !!input, 'Container found:', !!container);
  
  if (!input || !container) {
    console.error('Input or container not found!');
    return;
  }
  
  // Handle Enter key
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = this.value.trim();
      
      console.log('Enter pressed, value:', value);
      
      if (value && !tagsArray.includes(value)) {
        tagsArray.push(value);
        console.log('Tag added to array:', tagsArray);
        addTag(value, container, tagsArray);
        this.value = '';
        updateHiddenInput(inputId, tagsArray);
      } else if (tagsArray.includes(value)) {
        console.log('Tag already exists:', value);
      }
    }
  });
  
  // Handle blur (optional - add tag on losing focus)
  input.addEventListener('blur', function() {
    const value = this.value.trim();
    if (value && !tagsArray.includes(value)) {
      tagsArray.push(value);
      console.log('Tag added on blur:', tagsArray);
      addTag(value, container, tagsArray);
      this.value = '';
      updateHiddenInput(inputId, tagsArray);
    }
  });
}

// Add tag to container
function addTag(text, container, tagsArray) {
  console.log('Adding tag:', text, 'to container:', container.id);
  
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.innerHTML = `
    <span>${text}</span>
    <button type="button" aria-label="Remover">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Remove tag on click
  tag.querySelector('button').addEventListener('click', function(e) {
    e.preventDefault();
    const index = tagsArray.indexOf(text);
    if (index > -1) {
      tagsArray.splice(index, 1);
    }
    tag.remove();
    updateHiddenInput(container.id.replace('Container', 'Input'), tagsArray);
    console.log('Tag removed:', text, 'Remaining:', tagsArray);
  });
  
  // Insert before input
  const input = container.querySelector('.tag-input');
  if (input) {
    container.insertBefore(tag, input);
    console.log('Tag inserted successfully');
  } else {
    console.error('Input not found in container!');
    container.appendChild(tag);
  }
}

// Update hidden input with tags array
function updateHiddenInput(inputId, tagsArray) {
  const hiddenInputId = inputId.replace('Input', '');
  const hiddenInput = document.getElementById(hiddenInputId);
  
  if (hiddenInput) {
    hiddenInput.value = JSON.stringify(tagsArray);
  }
}

// Character counter for description
function initCharCounter() {
  const description = document.getElementById('description');
  const counter = document.getElementById('descriptionCounter');
  
  if (description && counter) {
    description.addEventListener('input', function() {
      counter.textContent = this.value.length.toLocaleString('pt-BR');
    });
  }
}

// Validate form
function validateForm() {
  const title = document.getElementById('title').value.trim();
  const location = document.getElementById('location').value.trim();
  const workModel = document.getElementById('workModel').value;
  const description = document.getElementById('description').value.trim();
  
  if (!title) {
    showMessage('Por favor, preencha o título da vaga', 'error');
    document.getElementById('title').focus();
    return false;
  }
  
  if (title.length < 5) {
    showMessage('O título deve ter pelo menos 5 caracteres', 'error');
    document.getElementById('title').focus();
    return false;
  }
  
  if (!location) {
    showMessage('Por favor, preencha a localização', 'error');
    document.getElementById('location').focus();
    return false;
  }
  
  if (!workModel) {
    showMessage('Por favor, selecione o modelo de trabalho', 'error');
    document.getElementById('workModel').focus();
    return false;
  }
  
  if (!description) {
    showMessage('Por favor, preencha a descrição da vaga', 'error');
    document.getElementById('description').focus();
    return false;
  }
  
  if (description.length < 50) {
    showMessage('A descrição deve ter pelo menos 50 caracteres para ser mais informativa', 'error');
    document.getElementById('description').focus();
    return false;
  }
  
  if (requirements.length === 0) {
    showMessage('Por favor, adicione pelo menos um requisito', 'error');
    document.getElementById('requirementsInput').focus();
    return false;
  }
  
  return true;
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  
  console.log('Form submission started');
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  // Use FormData to handle file upload
  const formData = new FormData();
  
  // Add all form fields
  formData.append('title', document.getElementById('title').value);
  formData.append('location', document.getElementById('location').value);
  formData.append('workModel', document.getElementById('workModel').value);
  formData.append('workload', document.getElementById('workload').value || '');
  formData.append('salary', document.getElementById('salary').value || '');
  formData.append('startDate', document.getElementById('startDate').value || '');
  formData.append('expiresAt', document.getElementById('expiresAt').value || '');
  formData.append('applicationDeadline', document.getElementById('applicationDeadline').value || '');
  formData.append('maxApplicants', document.getElementById('maxApplicants').value || '');
  formData.append('description', document.getElementById('description').value);
  formData.append('requirements', JSON.stringify(requirements));
  formData.append('benefits', JSON.stringify(benefits));
  formData.append('status', 'aberta');
  
  // Add job image if selected
  const jobImageInput = document.getElementById('jobImage');
  if (jobImageInput.files && jobImageInput.files[0]) {
    formData.append('jobImage', jobImageInput.files[0]);
    console.log('Job image added to form:', jobImageInput.files[0].name);
  }
  
  console.log('FormData prepared with image');
  
  // Disable submit button
  const btnSubmit = document.getElementById('btnSubmit');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
  
  try {
    showMessage('Publicando vaga...', 'success');
    
    const res = await fetch('/api/jobs', {
      method: 'POST',
      credentials: 'include',
      body: formData // Send FormData instead of JSON
    });
    
    console.log('Response status:', res.status);
    
    const data = await res.json();
    console.log('Response data:', data);
    
    if (res.ok) {
      showMessage('Vaga publicada com sucesso! Redirecionando...', 'success');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/perfil-empresa';
      }, 2000);
    } else {
      console.error('Error response:', data);
      showMessage(data.error || 'Erro ao publicar vaga. Por favor, tente novamente.', 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Network error:', error);
    showMessage('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalText;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing form...');
  
  // Initialize tag inputs
  initTagInput('requirementsInput', 'requirementsContainer', requirements);
  initTagInput('benefitsInput', 'benefitsContainer', benefits);
  
  // Initialize character counter
  initCharCounter();
  
  // Initialize image upload
  initImageUpload();
  
  // Handle form submission
  const jobForm = document.getElementById('jobForm');
  if (jobForm) {
    jobForm.addEventListener('submit', handleSubmit);
    console.log('Form submit handler attached');
  } else {
    console.error('Form not found!');
  }
  
  // Set min date for date inputs to today
  const today = new Date().toISOString().split('T')[0];
  const startDate = document.getElementById('startDate');
  const expiresAt = document.getElementById('expiresAt');
  const applicationDeadline = document.getElementById('applicationDeadline');
  
  if (startDate) {
    startDate.min = today;
  }
  
  if (expiresAt) {
    expiresAt.min = today;
  }
  
  if (applicationDeadline) {
    applicationDeadline.min = today;
  }
  
  // Auto-fill location from user profile if available
  fetch('/api/users/me', { credentials: 'include' })
    .then(res => res.ok ? res.json() : null)
    .then(user => {
      if (user && user.location) {
        const locationInput = document.getElementById('location');
        if (locationInput && !locationInput.value) {
          locationInput.value = user.location;
        }
      }
    })
    .catch(err => console.log('Could not auto-fill location:', err));
});

// Initialize image upload functionality
function initImageUpload() {
  const jobImageInput = document.getElementById('jobImage');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const imagePreview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const imagePreviewWrapper = document.getElementById('imagePreviewWrapper');
  
  if (!jobImageInput || !uploadPlaceholder || !imagePreview) {
    console.warn('Image upload elements not found');
    return;
  }
  
  // Click to upload
  uploadPlaceholder.addEventListener('click', function() {
    jobImageInput.click();
  });
  
  // Handle file selection
  jobImageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      handleImageFile(file);
    }
  });
  
  // Drag and drop
  imagePreviewWrapper.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.borderColor = '#2ECC71';
  });
  
  imagePreviewWrapper.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.borderColor = '';
  });
  
  imagePreviewWrapper.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.borderColor = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      jobImageInput.files = e.dataTransfer.files;
      handleImageFile(file);
    } else {
      showMessage('Por favor, selecione uma imagem válida', 'error');
    }
  });
  
  // Remove image
  removeImageBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    jobImageInput.value = '';
    uploadPlaceholder.style.display = 'block';
    imagePreview.style.display = 'none';
    previewImg.src = '';
  });
  
  // Handle image file
  function handleImageFile(file) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('Formato não suportado. Use JPG, PNG, GIF ou WEBP', 'error');
      jobImageInput.value = '';
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Imagem muito grande. Tamanho máximo: 5MB', 'error');
      jobImageInput.value = '';
      return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      uploadPlaceholder.style.display = 'none';
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}
