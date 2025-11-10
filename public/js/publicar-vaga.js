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
  
  if (!input || !container) return;
  
  // Handle Enter key
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = this.value.trim();
      
      if (value && !tagsArray.includes(value)) {
        tagsArray.push(value);
        addTag(value, container, tagsArray);
        this.value = '';
        updateHiddenInput(inputId, tagsArray);
      }
    }
  });
  
  // Handle blur (optional - add tag on losing focus)
  input.addEventListener('blur', function() {
    const value = this.value.trim();
    if (value && !tagsArray.includes(value)) {
      tagsArray.push(value);
      addTag(value, container, tagsArray);
      this.value = '';
      updateHiddenInput(inputId, tagsArray);
    }
  });
}

// Add tag to container
function addTag(text, container, tagsArray) {
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.innerHTML = `
    <span>${text}</span>
    <button type="button" aria-label="Remover">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Remove tag on click
  tag.querySelector('button').addEventListener('click', function() {
    const index = tagsArray.indexOf(text);
    if (index > -1) {
      tagsArray.splice(index, 1);
    }
    tag.remove();
    updateHiddenInput(container.id.replace('Container', 'Input'), tagsArray);
  });
  
  // Insert before input
  const input = container.querySelector('.tag-input');
  container.insertBefore(tag, input);
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
  
  // Get form data
  const formData = new FormData(e.target);
  
  // Build payload
  const payload = {
    title: formData.get('title'),
    location: formData.get('location'),
    workModel: formData.get('workModel'),
    workload: formData.get('workload') || '',
    salary: formData.get('salary') || '',
    startDate: formData.get('startDate') || null,
    expiresAt: formData.get('expiresAt') || null,
    description: formData.get('description'),
    requirements: requirements,
    benefits: benefits,
    status: 'aberta'
  };
  
  console.log('Payload:', payload);
  
  // Disable submit button
  const btnSubmit = document.getElementById('btnSubmit');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
  
  try {
    showMessage('Publicando vaga...', 'success');
    
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
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
  
  if (startDate) {
    startDate.min = today;
  }
  
  if (expiresAt) {
    expiresAt.min = today;
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
