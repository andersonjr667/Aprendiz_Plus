// Function to show messages in the register page
function showRegisterMessage(message, type = 'info') {
  const container = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  
  if (container && messageText) {
    messageText.textContent = message;
    container.className = `message-container ${type}`;
    container.style.display = 'block';
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
    }
  } else {
    // Fallback to global showMessage if elements not found
    if (typeof showMessage === 'function') {
      showMessage(message, type);
    } else {
      // Ultimate fallback - simple alert
      alert(message);
    }
  }
}

function selectUserType(type, element) {
  // Update UI
  document.querySelectorAll('.type-option').forEach(opt => {
    opt.classList.remove('selected');
    opt.setAttribute('aria-selected', 'false');
  });
  element.classList.add('selected');
  element.setAttribute('aria-selected', 'true');

  // Update form
  const userTypeEl = document.getElementById('userType');
  const candidateFields = document.getElementById('candidateFields');
  const companyFields = document.getElementById('companyFields');
  
  if (userTypeEl) {
    userTypeEl.value = type;
  }
  
  // Smooth transition for fields
  if (candidateFields) {
    candidateFields.style.display = type === 'candidato' ? 'block' : 'none';
    if (type === 'candidato') {
      candidateFields.style.opacity = '1';
    }
  }
  
  if (companyFields) {
    companyFields.style.display = type === 'empresa' ? 'block' : 'none';
    if (type === 'empresa') {
      companyFields.style.opacity = '1';
    }
  }

  // Clear validation state
  const form = document.getElementById('registerForm');
  if (form) {
    form.classList.remove('was-validated');
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    // Clear register messages
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
      messageContainer.style.display = 'none';
    }
  }
  
  // Clear fields of inactive type
  if (type === 'candidato') {
    const cnpjInput = document.getElementById('cnpj');
    const websiteInput = document.getElementById('website');
    if (cnpjInput) cnpjInput.value = '';
    if (websiteInput) websiteInput.value = '';
  } else {
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) cpfInput.value = '';
  }
}

// Make the type-option elements keyboard accessible and attach handlers
document.addEventListener('DOMContentLoaded', () => {
  // Setup form submit handler
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Setup type selection handlers
  document.querySelectorAll('.type-option').forEach(el => {
    el.setAttribute('tabindex', '0');
    const guessType = () => {
      if (el.dataset && el.dataset.type) return el.dataset.type;
      const txt = (el.textContent || '').toLowerCase();
      return txt.includes('empresa') ? 'empresa' : 'candidato';
    };
    el.addEventListener('click', () => selectUserType(guessType(), el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectUserType(guessType(), el);
      }
    });
  });

  // Setup formatting handlers
  const cpfEl = document.getElementById('cpf');
  const cnpjEl = document.getElementById('cnpj');
  if (cpfEl) cpfEl.addEventListener('input', formatCPF);
  if (cnpjEl) cnpjEl.addEventListener('input', formatCNPJ);
});

function validateForm(formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  // Validate required fields
  if (!name || name.trim().length === 0) {
    throw new Error('Por favor, insira seu nome completo');
  }

  if (!email || email.trim().length === 0) {
    throw new Error('Por favor, insira seu e-mail');
  }

  if (!email.includes('@') || !email.includes('.')) {
    throw new Error('Por favor, insira um e-mail válido');
  }

  if (!password) {
    throw new Error('Por favor, insira uma senha');
  }

  if (password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres');
  }

  if (!confirmPassword) {
    throw new Error('Por favor, confirme sua senha');
  }

  if (password !== confirmPassword) {
    throw new Error('As senhas não coincidem');
  }

  // CPF e CNPJ são opcionais no momento do cadastro
  const type = formData.get('type');
  const cpf = formData.get('cpf');
  const cnpj = formData.get('cnpj');

  if (type === 'candidato' && cpf && cpf.trim()) {
    const cpfClean = cpf.replace(/\D/g, '');
    if (!isValidCPF(cpfClean)) {
      throw new Error('CPF inválido');
    }
  }
  
  if (type === 'empresa' && cnpj && cnpj.trim()) {
    const cnpjClean = cnpj.replace(/\D/g, '');
    if (!isValidCNPJ(cnpjClean)) {
      throw new Error('CNPJ inválido');
    }
  }
}

async function handleRegister(event) {
  event.preventDefault();

  // Hide any previous messages
  const messageContainer = document.getElementById('messageContainer');
  if (messageContainer) {
    messageContainer.style.display = 'none';
  }

  // Desabilitar o botão de submit para evitar múltiplos envios
  const submitButton = event.target && event.target.querySelector
    ? event.target.querySelector('button[type="submit"]')
    : null;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = 'Criando conta...';
  }

  try {
    const form = event.target;
    const formData = new FormData(form);

    // Validação — pode lançar
    validateForm(formData);

    const userData = {
      name: (formData.get('name') || '').trim(),
      email: (formData.get('email') || '').trim(),
      password: formData.get('password'),
      type: formData.get('type') || 'candidato'
    };

    if (userData.type === 'candidato') {
      const cpf = formData.get('cpf');
      if (cpf) userData.cpf = cpf.replace(/\D/g, '');
    } else {
      const cnpj = formData.get('cnpj');
      const website = formData.get('website');
      if (cnpj) userData.cnpj = cnpj.replace(/\D/g, '');
      if (website) userData.companyProfile = { website: website.trim() };
    }

    showRegisterMessage('Criando conta...', 'info');

    // Verifica se API.fetch existe
    if (typeof API === 'undefined' || typeof API.fetch !== 'function') {
      throw new Error('Erro interno: API não disponível');
    }

    // Envia para API (usa o wrapper API.fetch definido em /public/js/api.js)
    const result = await API.fetch('/auth/register', { method: 'POST', body: userData });
    
    if (result && (result.ok || result.success)) {
      showRegisterMessage('Cadastro realizado com sucesso! Redirecionando para o login...', 'success');
      setTimeout(() => { window.location.href = '/login?registered=true'; }, 2000);
      return;
    }

    // Se chegou aqui, algo deu errado
    const errMsg = (result && result.error) || 'Erro ao criar conta';
    throw new Error(errMsg);

  } catch (error) {
    let msg = 'Erro ao realizar cadastro';
    
    // Verificar se é um erro da API
    if (error && error.payload) {
      if (error.payload.errors && Array.isArray(error.payload.errors) && error.payload.errors.length > 0) {
        // Validation errors
        msg = error.payload.errors[0].msg || error.payload.errors[0];
      } else if (error.payload.error) {
        msg = error.payload.error;
      }
    } else if (error && error.message) {
      // Regular error message
      msg = error.message;
    } else if (typeof error === 'string') {
      msg = error;
    }

    // Translate common error messages to Portuguese
    if (msg === 'Este email ja esta registrado') {
      msg = 'Este e-mail já está registrado. Tente fazer login ou use outro e-mail.';
    }
    
    showRegisterMessage(msg, 'error');
  } finally {
    // Re-habilitar o botão de submit
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Criar Conta';
    }
  }
}

// Formatação de CPF/CNPJ
function formatCPF(e) {
  let v = e.target.value.replace(/\D/g,'');
  if (v.length > 11) v = v.slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  e.target.value = v;
}

function formatCNPJ(e) {
  let v = e.target.value.replace(/\D/g,'');
  if (v.length > 14) v = v.slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, '$1.$2');
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  e.target.value = v;
}

// Validação de CPF
function isValidCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') return false;
  
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  if (parseInt(cpf.charAt(9)) !== digit1) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  if (parseInt(cpf.charAt(10)) !== digit2) return false;
  
  return true;
}

// Validação de CNPJ
function isValidCNPJ(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') return false;
  
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Validação do primeiro dígito verificador
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  let digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Validação do segundo dígito verificador
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}
