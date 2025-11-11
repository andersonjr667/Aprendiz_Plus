// Sistema de Notificações
class NotificationSystem {
    constructor() {
        this.init();
    }

    init() {
        this.createNotificationBell();
        this.loadNotifications();
        this.startPolling();
    }

    createNotificationBell() {
        const navbar = document.querySelector('.nav-links');
        if (!navbar) return;

        const bellContainer = document.createElement('div');
        bellContainer.className = 'notification-bell-container';
        bellContainer.innerHTML = `
            <button class="notification-bell" id="notificationBell">
                🔔
                <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
            </button>
            <div class="notification-dropdown" id="notificationDropdown" style="display: none;">
                <div class="notification-header">
                    <h4>Notificações</h4>
                    <button onclick="notificationSystem.markAllAsRead()">Marcar todas como lidas</button>
                </div>
                <div class="notification-list" id="notificationList">
                    Carregando...
                </div>
            </div>
        `;

        navbar.appendChild(bellContainer);

        // Toggle dropdown
        document.getElementById('notificationBell').addEventListener('click', () => {
            const dropdown = document.getElementById('notificationDropdown');
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-bell-container')) {
                document.getElementById('notificationDropdown').style.display = 'none';
            }
        });
    }

    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications?limit=10', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const notifications = await response.json();
                this.renderNotifications(notifications);
                this.updateBadge();
            }
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    }

    renderNotifications(notifications) {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Nenhuma notificação</p>';
            return;
        }

        list.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" 
                 onclick="notificationSystem.markAsRead('${notif.id}')">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-time">${this.formatTime(notif.createdAt)}</div>
            </div>
        `).join('');
    }

    async updateBadge() {
        try {
            const response = await fetch('/api/notifications/unread-count', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const { count } = await response.json();
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar badge:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            this.loadNotifications();
            this.updateBadge();
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
        }
    }

    async markAllAsRead() {
        try {
            await fetch('/api/notifications/read-all', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            this.loadNotifications();
            this.updateBadge();
        } catch (error) {
            console.error('Erro ao marcar todas como lidas:', error);
        }
    }

    startPolling() {
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.loadNotifications();
            this.updateBadge();
        }, 30000);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        if (days < 7) return `${days}d atrás`;

        return date.toLocaleDateString('pt-BR');
    }
}

// Sistema de Favoritos
class FavoriteSystem {
    static async toggle(targetId, targetType) {
        try {
            // Check if already favorited
            const checkResponse = await fetch(`/api/favorites/check/${targetId}?targetType=${targetType}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (checkResponse.ok) {
                const { isFavorite } = await checkResponse.json();

                if (isFavorite) {
                    // Remove favorite
                    const response = await fetch(`/api/favorites/${targetId}?targetType=${targetType}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.ok) {
                        return { favorited: false, message: 'Removido dos favoritos' };
                    }
                } else {
                    // Add favorite
                    const response = await fetch('/api/favorites', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ targetId, targetType })
                    });

                    if (response.ok) {
                        return { favorited: true, message: 'Adicionado aos favoritos' };
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao favoritar:', error);
            throw error;
        }
    }

    static addButton(container, targetId, targetType) {
        const button = document.createElement('button');
        button.className = 'favorite-button';
        button.innerHTML = '⭐ Favoritar';
        button.onclick = async () => {
            try {
                const result = await FavoriteSystem.toggle(targetId, targetType);
                button.innerHTML = result.favorited ? '★ Favoritado' : '⭐ Favoritar';
                button.style.color = result.favorited ? '#ffc107' : '#666';
            } catch (error) {
                alert('Erro ao favoritar');
            }
        };

        container.appendChild(button);
    }
}

// Sistema de Avaliações
class ReviewSystem {
    static createReviewForm(targetId, targetType, jobId = null) {
        return `
            <div class="review-form">
                <h3>Avaliar ${targetType === 'candidate' ? 'Candidato' : 'Empresa'}</h3>
                
                <div class="rating-input">
                    <label>Nota:</label>
                    <div class="stars-input" id="starsInput">
                        ${[1, 2, 3, 4, 5].map(i => 
                            `<span class="star" data-rating="${i}">☆</span>`
                        ).join('')}
                    </div>
                </div>
                
                <textarea id="reviewComment" placeholder="Compartilhe sua experiência..." rows="4"></textarea>
                
                <div>
                    <label>
                        <input type="checkbox" id="reviewAnonymous">
                        Avaliar anonimamente
                    </label>
                </div>
                
                <button onclick="ReviewSystem.submitReview('${targetId}', '${targetType}', ${jobId ? `'${jobId}'` : 'null'})">
                    Enviar Avaliação
                </button>
            </div>
        `;
    }

    static async submitReview(targetId, targetType, jobId = null) {
        const rating = document.querySelector('.star.selected')?.dataset.rating;
        const comment = document.getElementById('reviewComment').value;
        const anonymous = document.getElementById('reviewAnonymous').checked;

        if (!rating) {
            alert('Por favor, selecione uma nota');
            return;
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    targetId,
                    targetType,
                    jobId,
                    rating: parseInt(rating),
                    comment,
                    anonymous
                })
            });

            if (response.ok) {
                alert('Avaliação enviada com sucesso! Ela será revisada antes de ser publicada.');
                location.reload();
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao enviar avaliação');
            }
        } catch (error) {
            console.error('Erro ao enviar avaliação:', error);
            alert('Erro ao enviar avaliação');
        }
    }

    static initStarsInput() {
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', function() {
                const rating = this.dataset.rating;
                document.querySelectorAll('.star').forEach((s, idx) => {
                    if (idx < rating) {
                        s.textContent = '★';
                        s.classList.add('selected');
                    } else {
                        s.textContent = '☆';
                        s.classList.remove('selected');
                    }
                });
            });
        });
    }
}

// Sistema de Verificação
class VerificationSystem {
    static async requestEmailVerification() {
        try {
            const response = await fetch('/api/verification/email/request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                alert('Email de verificação enviado! Verifique sua caixa de entrada.');
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao enviar email de verificação');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao enviar email de verificação');
        }
    }

    static showVerificationBadge(isVerified) {
        if (isVerified) {
            return '<span class="verified-badge" title="Perfil Verificado">✓</span>';
        }
        return '';
    }
}

// Inicializar sistemas quando a página carregar
if (localStorage.getItem('token')) {
    window.notificationSystem = new NotificationSystem();
}

// Export para uso global
window.FavoriteSystem = FavoriteSystem;
window.ReviewSystem = ReviewSystem;
window.VerificationSystem = VerificationSystem;
