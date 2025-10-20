const express = require('express');
const auditService = require('../../services/audit');
const auth = require('../../middleware/auth');

const auditRoutes = express.Router();

const handleLog = (req, res) => {
    const { field, oldValue, newValue, action } = req.body;
    auditService.log(req.user.id, action, field, oldValue, newValue)
        .then(log => res.json(log))
        .catch(error => {
            console.error('Erro ao registrar log:', error);
            res.status(500).json({ error: 'Erro ao registrar alteração' });
        });
};

const handleGetLogs = (req, res) => {
    auditService.getLogsForUser(req.user.id)
        .then(logs => res.json(logs))
        .catch(error => {
            console.error('Erro ao buscar logs:', error);
            res.status(500).json({ error: 'Erro interno ao buscar logs de auditoria' });
        });
};

// Registrar uma alteração
auditRoutes.post('/log', auth, handleLog);

// Obter logs de auditoria do usuário autenticado
auditRoutes.get('/user-logs', auth, handleGetLogs);

module.exports = auditRoutes;