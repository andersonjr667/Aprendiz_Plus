const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { UserService } = require('../../services/database');

const updateSchema = Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    cpf: Joi.string().pattern(/^\d{11}$/).optional(),
    birthdate: Joi.date().optional(),
    type: Joi.string().valid('candidato','empresa').optional(),
    // campos livres como titulo, local, sobre
    titulo: Joi.string().max(200).optional(),
    local: Joi.string().max(200).optional(),
    sobre: Joi.string().max(2000).optional()
}).min(1);

// PATCH /api/users/:id - atualizar perfil (apenas dono ou admin)
// POST /api/users/:id/profile-image - upload de imagem de perfil
// GET /api/users/:id - obter dados públicos do usuário
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserService.findById(userId);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (e) {
        console.error('Users GET error:', e && e.stack ? e.stack : e);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

router.post('/:id/profile-image', auth, upload.single('profileImage'), async (req, res) => {
    try {
        const userId = req.params.id;

        // Autorização: apenas o dono do perfil ou admin pode fazer upload
        if (req.user.id !== userId && req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada' });
        }

        // Atualiza o caminho da imagem no perfil do usuário
        const imageUrl = `/data/images_perfil_candidato/${req.file.filename}`;
        const updated = await UserService.update(userId, {
            profileImage: imageUrl
        });

        if (!updated) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ 
            message: 'Imagem de perfil atualizada',
            imageUrl: imageUrl
        });
    } catch (e) {
        console.error('Profile image upload error:', e);
        res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
});

router.patch('/:id', auth, async (req, res) => {
    try {
        const { error, value } = updateSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const userId = req.params.id;

        // autorização: apenas o dono do perfil ou admin
        if (req.user.id !== userId && req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Não permitir alterar para admin via endpoint
        if (value.type && value.type === 'admin') {
            return res.status(400).json({ error: 'Alteração de role não permitida' });
        }

        const updated = await UserService.update(userId, value);
        if (!updated) return res.status(404).json({ error: 'Usuário não encontrado' });

        res.json({ message: 'Perfil atualizado', user: updated });
    } catch (e) {
        console.error('Users PATCH error:', e && e.stack ? e.stack : e);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

module.exports = router;
