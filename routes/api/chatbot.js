const express = require('express');
const router = express.Router();
const { handleChatMessage } = require('../../services/chatbot');
const auth = require('../../middleware/auth');

// Rota para enviar mensagem ao chatbot
router.post('/message', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Mensagem não fornecida' 
            });
        }

        const response = await handleChatMessage(userId, message);
        res.json(response);

    } catch (error) {
        console.error('Erro na rota do chatbot:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Erro interno do servidor' 
        });
    }
});

module.exports = router;