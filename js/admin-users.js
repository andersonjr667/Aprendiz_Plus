// Gestão de Usuários

let currentPage = 1;
let totalPages = 1;
let currentFilters = {
    search: '',
    type: '',
    status: ''
};

document.addEventListener('DOMContentLoaded', function() {
    // Carregar usuários iniciais
    loadUsers();

    // Configurar eventos dos filtros
    setupFilters();

    // Configurar eventos do modal
    setupModal();

    // Configurar paginação
    setupPagination();
});

function setupFilters() {
    const searchInput = document.getElementById('searchUser');
    const typeSelect = document.getElementById('userType');
    const statusSelect = document.getElementById('userStatus');

    const applyFilters = debounce(() => {
        currentFilters = {
            search: searchInput.value,
            type: typeSelect.value,
            status: statusSelect.value
        };
        currentPage = 1;
        loadUsers();
    }, 300);

    searchInput.addEventListener('input', applyFilters);
    typeSelect.addEventListener('change', applyFilters);
    statusSelect.addEventListener('change', applyFilters);
}

function setupModal() {
    const modal = document.getElementById('userModal');
    const addBtn = document.getElementById('addUserBtn');
    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelUserBtn');
    const saveBtn = document.getElementById('saveUserBtn');
    const form = document.getElementById('userForm');

    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Novo Usuário';
        form.reset();
        toggleModal(true);
    });

    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => toggleModal(false));
    });

    saveBtn.addEventListener('click', async () => {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());
        
        try {
            if (form.dataset.userId) {
                await updateUser(form.dataset.userId, userData);
            } else {
                await createUser(userData);
            }
            
            toggleModal(false);
            loadUsers();
            showToast('Usuário salvo com sucesso!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

function setupPagination() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadUsers();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadUsers();
        }
    });
}

async function loadUsers() {
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            ...currentFilters
        });

        const response = await fetch(`/api/admin/users?${queryParams}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Falha ao carregar usuários');

        const data = await response.json();
        renderUsers(data.users);
        updatePagination(data.pagination);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${formatUserType(user.type)}</td>
            <td>
                <span class="status-badge status-${user.status}">
                    ${formatStatus(user.status)}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewUser(${user.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    totalPages = pagination.totalPages;
    document.getElementById('pageInfo').textContent = 
        `Página ${currentPage} de ${totalPages}`;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

async function createUser(userData) {
    const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar usuário');
    }
}

async function updateUser(userId, userData) {
    const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar usuário');
    }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Erro ao excluir usuário');

        loadUsers();
        showToast('Usuário excluído com sucesso!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function viewUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Erro ao carregar dados do usuário');

        const user = await response.json();
        // Implementar visualização detalhada do usuário
        console.log(user);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Erro ao carregar dados do usuário');

        const user = await response.json();
        const form = document.getElementById('userForm');
        
        form.dataset.userId = userId;
        document.getElementById('modalTitle').textContent = 'Editar Usuário';
        
        // Preencher formulário
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userTypeModal').value = user.type;
        document.getElementById('userStatusModal').value = user.status;
        document.getElementById('userPassword').value = '';

        toggleModal(true);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Funções auxiliares
function toggleModal(show) {
    const modal = document.getElementById('userModal');
    modal.classList.toggle('active', show);
}

function formatUserType(type) {
    const types = {
        'candidato': 'Candidato',
        'empresa': 'Empresa',
        'admin': 'Administrador'
    };
    return types[type] || type;
}

function formatStatus(status) {
    const statuses = {
        'active': 'Ativo',
        'inactive': 'Inativo',
        'pending': 'Pendente'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showToast(message, type = 'info') {
    // Implementar sistema de notificações
    console.log(`${type}: ${message}`);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}