// Script para visualização de histórico de alterações no perfil
document.addEventListener('DOMContentLoaded', function() {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;

    loadUserHistory();
});

async function loadUserHistory() {
    try {
        const response = await fetch('/api/audit/user-logs', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar histórico');
        }

        const logs = await response.json();
        displayHistory(logs);
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        showToast('Erro ao carregar histórico de alterações', 'error');
    }
}

function displayHistory(logs) {
    const container = document.getElementById('history-container');
    if (!logs.length) {
        container.innerHTML = '<p class="text-center">Nenhuma alteração registrada</p>';
        return;
    }

    const timeline = document.createElement('div');
    timeline.className = 'timeline';

    logs.forEach(log => {
        const item = createTimelineItem(log);
        timeline.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(timeline);
}

function createTimelineItem(log) {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const time = document.createElement('div');
    time.className = 'timeline-time';
    time.textContent = new Date(log.createdAt).toLocaleString();

    const content = document.createElement('div');
    content.className = 'timeline-content';
    
    const title = document.createElement('h4');
    title.textContent = formatAction(log.action);

    const details = document.createElement('p');
    details.innerHTML = formatChange(log);

    content.appendChild(title);
    content.appendChild(details);

    item.appendChild(time);
    item.appendChild(content);

    return item;
}

function formatAction(action) {
    const actions = {
        'UPDATE': 'Atualização',
        'CREATE': 'Criação',
        'DELETE': 'Exclusão'
    };
    return actions[action] || action;
}

function formatChange(log) {
    let formattedField = log.field.charAt(0).toUpperCase() + log.field.slice(1);
    formattedField = formattedField.replace(/([A-Z])/g, ' $1').trim();

    let changeText = `<strong>${formattedField}:</strong> `;
    
    if (log.action === 'UPDATE') {
        changeText += `Alterado de "${log.oldValue || ''}" para "${log.newValue || ''}"`;
    } else if (log.action === 'CREATE') {
        changeText += `Definido como "${log.newValue || ''}"`;
    } else if (log.action === 'DELETE') {
        changeText += `Removido (valor anterior: "${log.oldValue || ''}")`;
    }

    return changeText;
}