// Function to show messages in the register page
function showRegisterMessage(message, type = 'info') {
  // Exibe toast no canto superior direito
  const toast = document.getElementById('toastNotification');
  if (toast) {
    toast.textContent = message;
    toast.className = `toast-notification ${type} show`;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 5000);
  }
  // Também exibe no messageContainer local (acima do formulário)
  const container = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');
  if (container && messageText) {
    messageText.textContent = message;
    container.className = `message-container ${type}`;
    container.style.display = 'block';
    if (type !== 'error') {
      setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
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
    // Limpar campos de empresa
    const companyFields = ['cnpj', 'tradeName', 'legalName', 'businessArea', 'numberOfEmployees', 
                           'commercialPhone', 'corporateEmail', 'companyCep', 'companyStreet', 
                           'companyNumber', 'companyNeighborhood', 'companyCity', 'companyState', 'website'];
    companyFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = '';
    });
  } else {
    // Limpar campos de candidato
    const candidateFields = ['cpf', 'birthDate', 'rg', 'gender', 'maritalStatus', 'whatsapp',
                             'cep', 'street', 'number', 'neighborhood', 'city', 'state',
                             'areasOfInterest', 'skills', 'previousExperience', 'extracurricularCourses',
                             'availability', 'currentEducation', 'educationInstitution', 'studyShift',
                             'technicalCourse', 'expectedGraduation', 'pcdDescription', 'apprenticeshipProgramName',
                             'linkedinUrl', 'portfolioUrl'];
    candidateFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = '';
    });
    // Limpar checkboxes
    const isPCDCheckbox = document.getElementById('isPCD');
    if (isPCDCheckbox) isPCDCheckbox.checked = false;
    const isInApprenticeshipCheckbox = document.getElementById('isInApprenticeshipProgram');
    if (isInApprenticeshipCheckbox) isInApprenticeshipCheckbox.checked = false;
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

  // Validar CEP se fornecido
  const cep = formData.get('cep');
  const companyCep = formData.get('companyCep');

  if (type === 'candidato' && cep && cep.trim()) {
    const cepClean = cep.replace(/\D/g, '');
    if (cepClean.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }
  }

  if (type === 'empresa' && companyCep && companyCep.trim()) {
    const cepClean = companyCep.replace(/\D/g, '');
    if (cepClean.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
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
  let submitButton = event.target && event.target.querySelector
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
      
      // Criar objeto candidateProfile com todos os campos
      userData.candidateProfile = {};
      
      const birthDate = formData.get('birthDate');
      if (birthDate) userData.candidateProfile.birthDate = birthDate;
      
      const rg = formData.get('rg');
      if (rg) userData.candidateProfile.rg = rg.replace(/\D/g, '');
      
      const gender = formData.get('gender');
      if (gender) userData.candidateProfile.gender = gender;
      
      const maritalStatus = formData.get('maritalStatus');
      if (maritalStatus) userData.candidateProfile.maritalStatus = maritalStatus;
      
      // Endereço
      const cep = formData.get('cep');
      if (cep) userData.candidateProfile.cep = cep.replace(/\D/g, '');
      
      const street = formData.get('street');
      if (street) userData.candidateProfile.street = street.trim();
      
      const number = formData.get('number');
      if (number) userData.candidateProfile.number = number.trim();
      
      const neighborhood = formData.get('neighborhood');
      if (neighborhood) userData.candidateProfile.neighborhood = neighborhood.trim();
      
      const city = formData.get('city');
      if (city) userData.candidateProfile.city = city.trim();
      
      const state = formData.get('state');
      if (state) userData.candidateProfile.state = state;
      
      // Telefone
      const whatsapp = formData.get('whatsapp');
      if (whatsapp) userData.candidateProfile.whatsapp = whatsapp.replace(/\D/g, '');
      
      // Áreas de interesse
      const areasOfInterest = formData.get('areasOfInterest');
      if (areasOfInterest) {
        userData.candidateProfile.areasOfInterest = areasOfInterest.split(',').map(a => a.trim()).filter(a => a);
      }
      
      // Habilidades
      const skills = formData.get('skills');
      if (skills) {
        userData.skills = skills.split(',').map(s => s.trim()).filter(s => s);
      }
      
      const previousExperience = formData.get('previousExperience');
      if (previousExperience) userData.candidateProfile.previousExperience = previousExperience.trim();
      
      const extracurricularCourses = formData.get('extracurricularCourses');
      if (extracurricularCourses) userData.candidateProfile.extracurricularCourses = extracurricularCourses.trim();
      
      const availability = formData.get('availability');
      if (availability) userData.candidateProfile.availability = availability;
      
      // PCD
      const isPCD = formData.get('isPCD') === 'on';
      userData.candidateProfile.isPCD = isPCD;
      
      const pcdDescription = formData.get('pcdDescription');
      if (isPCD && pcdDescription) userData.candidateProfile.pcdDescription = pcdDescription.trim();
      
      // Programa de aprendizagem
      const isInApprenticeshipProgram = formData.get('isInApprenticeshipProgram') === 'on';
      userData.candidateProfile.isInApprenticeshipProgram = isInApprenticeshipProgram;
      
      const apprenticeshipProgramName = formData.get('apprenticeshipProgramName');
      if (isInApprenticeshipProgram && apprenticeshipProgramName) {
        userData.candidateProfile.apprenticeshipProgramName = apprenticeshipProgramName.trim();
      }
      
      // Redes sociais
      const linkedinUrl = formData.get('linkedinUrl');
      if (linkedinUrl) userData.candidateProfile.linkedinUrl = linkedinUrl.trim();
      
      const portfolioUrl = formData.get('portfolioUrl');
      if (portfolioUrl) userData.candidateProfile.portfolioUrl = portfolioUrl.trim();
      
      // Educação
      const currentEducation = formData.get('currentEducation');
      if (currentEducation) userData.candidateProfile.currentEducation = currentEducation;
      
      const educationInstitution = formData.get('educationInstitution');
      if (educationInstitution) userData.candidateProfile.educationInstitution = educationInstitution.trim();
      
      const studyShift = formData.get('studyShift');
      if (studyShift) userData.candidateProfile.studyShift = studyShift;
      
      const technicalCourse = formData.get('technicalCourse');
      if (technicalCourse) userData.candidateProfile.technicalCourse = technicalCourse.trim();
      
      const expectedGraduation = formData.get('expectedGraduation');
      if (expectedGraduation) userData.candidateProfile.expectedGraduation = expectedGraduation;
      
    } else {
      const cnpj = formData.get('cnpj');
      if (cnpj) userData.cnpj = cnpj.replace(/\D/g, '');
      
      // Criar objeto companyProfile com todos os campos
      userData.companyProfile = {};
      
      const tradeName = formData.get('tradeName');
      if (tradeName) userData.companyProfile.tradeName = tradeName.trim();
      
      const legalName = formData.get('legalName');
      if (legalName) userData.companyProfile.legalName = legalName.trim();
      
      const businessArea = formData.get('businessArea');
      if (businessArea) userData.companyProfile.businessArea = businessArea.trim();
      
      const numberOfEmployees = formData.get('numberOfEmployees');
      if (numberOfEmployees) userData.companyProfile.numberOfEmployees = parseInt(numberOfEmployees);
      
      const commercialPhone = formData.get('commercialPhone');
      if (commercialPhone) userData.companyProfile.commercialPhone = commercialPhone.replace(/\D/g, '');
      
      const corporateEmail = formData.get('corporateEmail');
      if (corporateEmail) userData.companyProfile.corporateEmail = corporateEmail.trim();
      
      // Endereço da empresa
      const companyCep = formData.get('companyCep');
      if (companyCep) userData.companyProfile.cep = companyCep.replace(/\D/g, '');
      
      const companyStreet = formData.get('companyStreet');
      if (companyStreet) userData.companyProfile.street = companyStreet.trim();
      
      const companyNumber = formData.get('companyNumber');
      if (companyNumber) userData.companyProfile.number = companyNumber.trim();
      
      const companyNeighborhood = formData.get('companyNeighborhood');
      if (companyNeighborhood) userData.companyProfile.neighborhood = companyNeighborhood.trim();
      
      const companyCity = formData.get('companyCity');
      if (companyCity) userData.companyProfile.city = companyCity.trim();
      
      const companyState = formData.get('companyState');
      if (companyState) userData.companyProfile.state = companyState;
      
      const website = formData.get('website');
      if (website) userData.companyProfile.website = website.trim();
    }

    showRegisterMessage('Criando conta...', 'info');

    // Verifica se API.fetch existe
    if (typeof API === 'undefined' || typeof API.fetch !== 'function') {
      throw new Error('Erro interno: API não disponível');
    }

    // Envia para API (usa o wrapper API.fetch definido em /public/js/api.js)
    const result = await API.fetch('/auth/register', { method: 'POST', body: userData });
    
    if (result && (result.ok || result.success || result.user || result.token)) {
      showRegisterMessage('✅ Cadastro realizado com sucesso! Redirecionando para o login...', 'success');
      
      // Redirecionar imediatamente para o login
      setTimeout(() => { 
        window.location.href = '/login?registered=true'; 
      }, 1500);
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

// Formatação de RG
function formatRG(e) {
  let v = e.target.value.replace(/\D/g,'');
  if (v.length > 9) v = v.slice(0, 9);
  v = v.replace(/(\d{2})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1})$/, '$1-$2');
  e.target.value = v;
}

// Formatação de CEP
function formatCEP(e) {
  let v = e.target.value.replace(/\D/g,'');
  if (v.length > 8) v = v.slice(0, 8);
  v = v.replace(/(\d{5})(\d)/, '$1-$2');
  e.target.value = v;
}

// Formatação de telefone
function formatPhone(e) {
  let v = e.target.value.replace(/\D/g,'');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length <= 10) {
    v = v.replace(/(\d{2})(\d)/, '($1) $2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    v = v.replace(/(\d{2})(\d)/, '($1) $2');
    v = v.replace(/(\d{5})(\d)/, '$1-$2');
  }
  e.target.value = v;
}

// Adicionar event listeners para formatação
document.addEventListener('DOMContentLoaded', () => {
  // RG
  const rgInput = document.getElementById('rg');
  if (rgInput) rgInput.addEventListener('input', formatRG);
  
  // CEP candidato
  const cepInput = document.getElementById('cep');
  if (cepInput) cepInput.addEventListener('input', formatCEP);
  
  // CEP empresa
  const companyCepInput = document.getElementById('companyCep');
  if (companyCepInput) companyCepInput.addEventListener('input', formatCEP);
  
  // WhatsApp
  const whatsappInput = document.getElementById('whatsapp');
  if (whatsappInput) whatsappInput.addEventListener('input', formatPhone);
  
  // Telefone comercial
  const commercialPhoneInput = document.getElementById('commercialPhone');
  if (commercialPhoneInput) commercialPhoneInput.addEventListener('input', formatPhone);
});

// Validação de CEP
function isValidCEP(cep) {
  if (!cep || typeof cep !== 'string') return false;
  
  // Remove caracteres não numéricos
  cep = cep.replace(/\D/g, '');
  
  // Verifica se tem 8 dígitos
  return cep.length === 8;
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

// Validação de CEP
function isValidCEP(cep) {
  if (!cep || typeof cep !== 'string') return false;
  
  // Remove caracteres não numéricos
  cep = cep.replace(/\D/g, '');
  
  // Verifica se tem 8 dígitos
  return cep.length === 8;
}
