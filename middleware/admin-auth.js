// Middleware para verificação de permissões administrativas

function isAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Autenticação necessária' });
    }

    if (req.user.type !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    next();
}

// Verificar permissões específicas
function hasPermission(permission) {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(401).json({ error: 'Autenticação necessária' });
        }

        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Permissão insuficiente' });
        }

        next();
    };
}

module.exports = {
    isAdmin,
    hasPermission
};