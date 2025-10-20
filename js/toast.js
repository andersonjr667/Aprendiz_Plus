// Sistema de notificações toast
const Toast = {
    init() {
        // Criar container de toasts se não existir
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);

            // Adicionar estilos
            const style = document.createElement('style');
            style.textContent = `
                #toast-container {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    z-index: 9999;
                }
                
                .toast {
                    padding: 1rem;
                    margin-bottom: 0.5rem;
                    min-width: 200px;
                    max-width: 400px;
                    border-radius: 4px;
                    color: white;
                    animation: toast-in 0.3s ease-in-out;
                }
                
                .toast.success {
                    background: #28a745;
                }
                
                .toast.error {
                    background: #dc3545;
                }
                
                .toast.info {
                    background: #17a2b8;
                }
                
                @keyframes toast-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                .toast.removing {
                    animation: toast-out 0.3s ease-in-out forwards;
                }
                
                @keyframes toast-out {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },

    show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);

        // Remover após duração
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message, duration) {
        this.show(message, 'success', duration);
    },

    error(message, duration) {
        this.show(message, 'error', duration);
    },

    info(message, duration) {
        this.show(message, 'info', duration);
    }
};

// Inicializar sistema de toast
document.addEventListener('DOMContentLoaded', () => {
    Toast.init();
});

// Exportar para uso em outros arquivos
window.Toast = Toast;