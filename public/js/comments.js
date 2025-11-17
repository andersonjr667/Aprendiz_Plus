/**
 * Sistema de Comentários - Frontend
 * Gerencia comentários em notícias e vagas
 */

class CommentSystem {
  constructor(targetType, targetId, containerId) {
    this.targetType = targetType; // 'news' or 'job'
    this.targetId = targetId;
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.currentUser = null;
    this.comments = [];
    this.page = 1;
    this.limit = 20;
    this.sort = 'newest';
    this.loading = false;

    this.init();
  }

  async init() {
    try {
      // Verificar se usuário está logado
      await this.checkAuth();

      // Renderizar interface
      this.render();

      // Carregar comentários
      await this.loadComments();

    } catch (error) {
      console.error('Erro ao inicializar sistema de comentários:', error);
      this.showError('Erro ao carregar comentários');
    }
  }

  async checkAuth() {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include'
      });
      if (response.ok) {
        this.currentUser = await response.json();
        console.log('Usuário autenticado:', this.currentUser.name);
      } else {
        console.log('Usuário não autenticado - Status:', response.status);
      }
    } catch (error) {
      console.log('Erro ao verificar autenticação:', error);
    }
  }

  render() {
    const html = `
      <div class="comments-section">
        <div class="comments-header">
          <h3>Comentários</h3>
          <div class="comments-controls">
            <select id="sort-comments" class="form-control">
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="mostLiked">Mais curtidos</option>
            </select>
          </div>
        </div>

        ${this.currentUser ? this.renderCommentForm() : this.renderLoginPrompt()}

        <div class="comments-list" id="comments-list">
          <div class="loading-comments">
            <div class="spinner"></div>
            <span>Carregando comentários...</span>
          </div>
        </div>

        <div class="comments-pagination" id="comments-pagination"></div>
      </div>
    `;

    this.container.innerHTML = html;

    // Adicionar event listeners
    this.bindEvents();
  }

  renderCommentForm(parentCommentId = null) {
    const placeholder = parentCommentId ? 'Escreva sua resposta...' : 'Escreva seu comentário...';
    const buttonText = parentCommentId ? 'Responder' : 'Comentar';

    return `
      <div class="comment-form-container" data-parent="${parentCommentId || ''}">
        <form class="comment-form" data-parent="${parentCommentId || ''}">
          <div class="form-group">
            <textarea
              name="content"
              placeholder="${placeholder}"
              maxlength="1000"
              required
            ></textarea>
            <div class="char-counter">
              <span class="char-count">0</span>/1000
            </div>
          </div>
          <div class="form-actions">
            ${parentCommentId ? '<button type="button" class="btn-cancel">Cancelar</button>' : ''}
            <button type="submit" class="btn-submit">${buttonText}</button>
          </div>
        </form>
      </div>
    `;
  }

  renderLoginPrompt() {
    return `
      <div class="login-prompt">
        <p>Faça <a href="/pages/login.html">login</a> para participar da discussão</p>
      </div>
    `;
  }

  renderComments() {
    const commentsList = document.getElementById('comments-list');

    if (this.comments.length === 0) {
      commentsList.innerHTML = `
        <div class="no-comments">
          <p>Seja o primeiro a comentar!</p>
        </div>
      `;
      return;
    }

    const html = this.comments.map(comment => this.renderComment(comment)).join('');
    commentsList.innerHTML = html;
  }

  renderComment(comment) {
    const isLiked = comment.likes?.some(like => like.user === this.currentUser?._id);
    const canEdit = this.currentUser && comment.author._id === this.currentUser._id;
    const canDelete = canEdit || this.currentUser?.type === 'admin';

    const html = `
      <div class="comment-item" data-id="${comment._id}">
        <div class="comment-avatar">
          <img src="${comment.author.profilePhotoUrl || '/images/default-avatar.png'}"
               alt="${comment.author.name}"
               onerror="this.src='/images/default-avatar.png'">
        </div>

        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${comment.author.name}</span>
            <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
            ${comment.editedAt ? '<span class="comment-edited">(editado)</span>' : ''}
          </div>

          <div class="comment-text">${this.escapeHtml(comment.content)}</div>

          <div class="comment-actions">
            ${this.currentUser ? `
              <button class="action-btn like-btn ${isLiked ? 'liked' : ''}"
                      data-id="${comment._id}">
                <i class="icon-heart"></i>
                <span>${comment.likesCount || 0}</span>
              </button>

              <button class="action-btn reply-btn" data-id="${comment._id}">
                <i class="icon-reply"></i>
                Responder
              </button>
            ` : ''}

            ${canEdit ? `
              <button class="action-btn edit-btn" data-id="${comment._id}">
                <i class="icon-edit"></i>
                Editar
              </button>
            ` : ''}

            ${canDelete ? `
              <button class="action-btn delete-btn" data-id="${comment._id}">
                <i class="icon-trash"></i>
                Excluir
              </button>
            ` : ''}

            <button class="action-btn report-btn" data-id="${comment._id}">
              <i class="icon-flag"></i>
              Denunciar
            </button>
          </div>

          <div class="comment-replies" id="replies-${comment._id}">
            ${comment.replies ? comment.replies.map(reply => this.renderReply(reply)).join('') : ''}
          </div>
        </div>
      </div>
    `;

    return html;
  }

  renderReply(reply) {
    const isLiked = reply.likes?.some(like => like.user === this.currentUser?._id);
    const canEdit = this.currentUser && reply.author._id === this.currentUser._id;
    const canDelete = canEdit || this.currentUser?.type === 'admin';

    return `
      <div class="reply-item" data-id="${reply._id}">
        <div class="reply-avatar">
          <img src="${reply.author.profilePhotoUrl || '/images/default-avatar.png'}"
               alt="${reply.author.name}"
               onerror="this.src='/images/default-avatar.png'">
        </div>

        <div class="reply-content">
          <div class="reply-header">
            <span class="reply-author">${reply.author.name}</span>
            <span class="reply-date">${this.formatDate(reply.createdAt)}</span>
            ${reply.editedAt ? '<span class="reply-edited">(editado)</span>' : ''}
          </div>

          <div class="reply-text">${this.escapeHtml(reply.content)}</div>

          <div class="reply-actions">
            ${this.currentUser ? `
              <button class="action-btn like-btn ${isLiked ? 'liked' : ''}"
                      data-id="${reply._id}">
                <i class="icon-heart"></i>
                <span>${reply.likesCount || 0}</span>
              </button>
            ` : ''}

            ${canEdit ? `
              <button class="action-btn edit-btn" data-id="${reply._id}">
                <i class="icon-edit"></i>
                Editar
              </button>
            ` : ''}

            ${canDelete ? `
              <button class="action-btn delete-btn" data-id="${reply._id}">
                <i class="icon-trash"></i>
                Excluir
              </button>
            ` : ''}

            <button class="action-btn report-btn" data-id="${reply._id}">
              <i class="icon-flag"></i>
              Denunciar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Formulário de comentário
    this.container.addEventListener('submit', (e) => {
      e.preventDefault();
      if (e.target.classList.contains('comment-form')) {
        this.handleCommentSubmit(e);
      }
    });

    // Contador de caracteres
    this.container.addEventListener('input', (e) => {
      if (e.target.name === 'content') {
        this.updateCharCounter(e.target);
      }
    });

    // Botões de ação
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('.action-btn');
      if (!btn) return;

      const commentId = btn.dataset.id;

      if (btn.classList.contains('like-btn')) {
        this.handleLike(commentId);
      } else if (btn.classList.contains('reply-btn')) {
        this.showReplyForm(commentId);
      } else if (btn.classList.contains('edit-btn')) {
        this.showEditForm(commentId);
      } else if (btn.classList.contains('delete-btn')) {
        this.handleDelete(commentId);
      } else if (btn.classList.contains('report-btn')) {
        this.handleReport(commentId);
      } else if (btn.classList.contains('btn-cancel')) {
        this.hideReplyForm(commentId);
      }
    });

    // Ordenação
    const sortSelect = document.getElementById('sort-comments');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sort = e.target.value;
        this.page = 1;
        this.loadComments();
      });
    }
  }

  async handleCommentSubmit(e) {
    const form = e.target;
    const formData = new FormData(form);
    const content = formData.get('content').trim();
    const parentCommentId = form.dataset.parent;

    if (!content) return;

    try {
      this.setLoading(form, true);

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          targetType: this.targetType,
          targetId: this.targetId,
          content,
          parentComment: parentCommentId || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar comentário');
      }

      const newComment = await response.json();

      // Limpar formulário
      form.reset();
      this.updateCharCounter(form.querySelector('textarea'));

      // Recarregar comentários
      await this.loadComments();

      // Esconder formulário de resposta se for uma resposta
      if (parentCommentId) {
        this.hideReplyForm(parentCommentId);
      }

      this.showSuccess('Comentário enviado com sucesso!');

    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      this.showError(error.message);
    } finally {
      this.setLoading(form, false);
    }
  }

  async handleLike(commentId) {
    if (!this.currentUser) {
      this.showError('Faça login para curtir comentários');
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao curtir comentário');
      }

      const result = await response.json();

      // Atualizar contador na interface
      const likeBtn = this.container.querySelector(`[data-id="${commentId}"].like-btn`);
      if (likeBtn) {
        const icon = likeBtn.querySelector('i');
        const count = likeBtn.querySelector('span');

        if (result.liked) {
          likeBtn.classList.add('liked');
          icon.classList.add('icon-heart-filled');
        } else {
          likeBtn.classList.remove('liked');
          icon.classList.remove('icon-heart-filled');
        }

        count.textContent = result.likesCount;
      }

    } catch (error) {
      console.error('Erro ao curtir comentário:', error);
      this.showError(error.message);
    }
  }

  showReplyForm(commentId) {
    const commentItem = this.container.querySelector(`[data-id="${commentId}"].comment-item`);
    if (!commentItem) return;

    // Remover formulários de resposta existentes
    this.container.querySelectorAll('.reply-form-container').forEach(form => form.remove());

    const repliesContainer = commentItem.querySelector('.comment-replies');
    const replyFormHtml = this.renderCommentForm(commentId);

    repliesContainer.insertAdjacentHTML('afterbegin', replyFormHtml);
  }

  hideReplyForm(commentId) {
    const replyForm = this.container.querySelector(`[data-parent="${commentId}"].comment-form-container`);
    if (replyForm) {
      replyForm.remove();
    }
  }

  async showEditForm(commentId) {
    try {
      // Buscar comentário atual
      const comment = await this.getCommentById(commentId);
      if (!comment) return;

      // Criar formulário de edição
      const editFormHtml = `
        <div class="edit-form-container" data-id="${commentId}">
          <form class="edit-comment-form">
            <div class="form-group">
              <textarea name="content" maxlength="1000" required>${this.escapeHtml(comment.content)}</textarea>
              <div class="char-counter">
                <span class="char-count">${comment.content.length}</span>/1000
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancel">Cancelar</button>
              <button type="submit" class="btn-submit">Salvar</button>
            </div>
          </form>
        </div>
      `;

      // Substituir conteúdo do comentário
      const commentItem = this.container.querySelector(`[data-id="${commentId}"]`);
      const commentText = commentItem.querySelector('.comment-text');
      commentText.innerHTML = editFormHtml;

      // Focar no textarea
      const textarea = commentText.querySelector('textarea');
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      // Adicionar event listeners
      const form = commentText.querySelector('.edit-comment-form');
      form.addEventListener('submit', (e) => this.handleEditSubmit(e, commentId));
      form.querySelector('.btn-cancel').addEventListener('click', () => this.cancelEdit(commentId));

      textarea.addEventListener('input', () => this.updateCharCounter(textarea));

    } catch (error) {
      console.error('Erro ao mostrar formulário de edição:', error);
      this.showError('Erro ao editar comentário');
    }
  }

  async handleEditSubmit(e, commentId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const content = formData.get('content').trim();

    if (!content) return;

    try {
      this.setLoading(form, true);

      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao editar comentário');
      }

      // Recarregar comentários
      await this.loadComments();
      this.showSuccess('Comentário editado com sucesso!');

    } catch (error) {
      console.error('Erro ao editar comentário:', error);
      this.showError(error.message);
    } finally {
      this.setLoading(form, false);
    }
  }

  cancelEdit(commentId) {
    // Recarregar comentários para restaurar o estado original
    this.loadComments();
  }

  async handleDelete(commentId) {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir comentário');
      }

      // Recarregar comentários
      await this.loadComments();
      this.showSuccess('Comentário excluído com sucesso!');

    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      this.showError(error.message);
    }
  }

  async handleReport(commentId) {
    const reason = prompt('Motivo da denúncia (opcional):');
    if (reason === null) return; // Cancelado

    try {
      const response = await fetch(`/api/comments/${commentId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao denunciar comentário');
      }

      this.showSuccess('Comentário denunciado com sucesso!');

    } catch (error) {
      console.error('Erro ao denunciar comentário:', error);
      this.showError(error.message);
    }
  }

  async loadComments() {
    try {
      this.loading = true;
      this.showLoading();

      const response = await fetch(
        `/api/comments/${this.targetType}/${this.targetId}?page=${this.page}&limit=${this.limit}&sort=${this.sort}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar comentários');
      }

      const data = await response.json();
      this.comments = data.comments;

      this.renderComments();
      this.renderPagination(data.pagination);

    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      this.showError('Erro ao carregar comentários');
    } finally {
      this.loading = false;
    }
  }

  async getCommentById(commentId) {
    // Procurar nos comentários carregados
    for (const comment of this.comments) {
      if (comment._id === commentId) return comment;
      if (comment.replies) {
        const reply = comment.replies.find(r => r._id === commentId);
        if (reply) return reply;
      }
    }
    return null;
  }

  renderPagination(pagination) {
    const paginationEl = document.getElementById('comments-pagination');

    if (pagination.pages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let html = '<div class="pagination">';

    // Anterior
    if (pagination.page > 1) {
      html += `<button class="page-btn" data-page="${pagination.page - 1}">« Anterior</button>`;
    }

    // Páginas
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
      html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Próximo
    if (pagination.page < pagination.pages) {
      html += `<button class="page-btn" data-page="${pagination.page + 1}">Próximo »</button>`;
    }

    html += '</div>';
    paginationEl.innerHTML = html;

    // Event listeners
    paginationEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('page-btn')) {
        const page = parseInt(e.target.dataset.page);
        if (page !== this.page) {
          this.page = page;
          this.loadComments();
        }
      }
    });
  }

  updateCharCounter(textarea) {
    const counter = textarea.parentElement.querySelector('.char-count');
    if (counter) {
      counter.textContent = textarea.value.length;
    }
  }

  setLoading(form, loading) {
    const submitBtn = form.querySelector('.btn-submit');
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Enviando...' : (form.dataset.parent ? 'Responder' : 'Comentar');
    }
  }

  showLoading() {
    const commentsList = document.getElementById('comments-list');
    if (this.loading) {
      commentsList.innerHTML = `
        <div class="loading-comments">
          <div class="spinner"></div>
          <span>Carregando comentários...</span>
        </div>
      `;
    }
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showToast(message, type = 'info') {
    // Criar toast se não existir
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      toast.remove();
    }, 5000);

    // Event listener para fechar
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? 'agora' : `${diffMinutes}min atrás`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h atrás`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Função global para inicializar comentários
function initComments(targetType, targetId, containerId) {
  return new CommentSystem(targetType, targetId, containerId);
}

// Exportar para uso global
window.CommentSystem = CommentSystem;
window.initComments = initComments;