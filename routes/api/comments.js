const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { CommentService } = require('../../services/database');

// Listar comentários de uma notícia
router.get('/news/:newsId', async (req, res) => {
    try {
        const comments = await CommentService.findByNews(req.params.newsId);
        for (let c of comments) {
            c.replies = await CommentService.findReplies(c.id);
        }
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar novo comentário
router.post('/', auth, async (req, res) => {
    try {
        const created = await CommentService.create({
            content: req.body.content,
            news: req.body.newsId,
            author: req.user.id,
            parentComment: req.body.parentComment || null
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Editar comentário
router.patch('/:id', auth, async (req, res) => {
    try {
        const comment = await CommentService.findById(req.params.id);
        if (!comment || comment.author !== req.user.id) return res.status(404).json({ error: 'Comentário não encontrado' });
        const updated = await CommentService.update(req.params.id, { content: req.body.content });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Excluir comentário
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await CommentService.findById(req.params.id);
        if (!comment || comment.author !== req.user.id) return res.status(404).json({ error: 'Comentário não encontrado' });
        await CommentService.delete(req.params.id);
        res.json({ message: 'Comentário excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Curtir/descurtir comentário
router.post('/:id/like', auth, async (req, res) => {
    try {
        const likes = await CommentService.toggleLike(req.params.id, req.user.id);
        if (likes === null) return res.status(404).json({ error: 'Comentário não encontrado' });
        res.json({ likes });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;