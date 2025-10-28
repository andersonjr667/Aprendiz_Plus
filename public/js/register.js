// Register page scripts moved out of inline HTML to satisfy CSP (script-src 'self')
// Depends on /public/js/auth.js which defines showMessage and Auth

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

  const cpfEl = document.getElementById('cpf');
  const cnpjEl = document.getElementById('cnpj');
  if (cpfEl) cpfEl.addEventListener('input', formatCPF);
  if (cnpjEl) cnpjEl.addEventListener('input', formatCNPJ);
});

function validateForm(formData) {
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (password !== confirmPassword) {
    throw new Error('As senhas não coincidem');
  }

  if (password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres');
  }

  // CPF e CNPJ são opcionais no momento do cadastro
  const type = formData.get('type');
  const cpf = formData.get('cpf');
  const cnpj = formData.get('cnpj');

  if (type === 'candidato' && cpf && !cpf.match(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)) {
    throw new Error('CPF inválido');
  }
  
  if (type === 'empresa' && cnpj && !cnpj.match(/^\d{2}\.?\d{3}\.?\d{3}\/?[0-9]{4}-?\d{2}$/)) {
    throw new Error('CNPJ inválido');
  }
}

async function handleRegister(event) {
  event.preventDefault();

  // Desabilitar o botão de submit para evitar múltiplos envios
  const submitButton = event.target && event.target.querySelector
    ? event.target.querySelector('button[type="submit"]')
    : null;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = 'Criando conta...';
  }

  // Limpar mensagens de erro anteriores
  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage) errorMessage.style.display = 'none';

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

  // Envia para API (usa o wrapper API.fetch definido em /public/js/api.js)
  const result = await API.fetch('/auth/register', { method: 'POST', body: userData });
    if (result && result.success) {
      showToast('success', 'Cadastro realizado com sucesso!');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }

    // Se aqui, API respondeu com erro
    const errMsg = (result && result.error) || 'Erro ao criar conta';
    throw new Error(errMsg);

  } catch (error) {
    const msg = (error && error.message) || 'Erro ao realizar cadastro';
    if (window.showMessage) {
      showMessage(msg, 'error');
    } else {
      showToast('error', msg);
      if (errorMessage) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
      }
    }

  } finally {
    // Re-habilitar o botão de submit
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Criar conta';
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

// expose globals for HTML handlers
window.selectUserType = selectUserType;
window.handleRegister = handleRegister;
