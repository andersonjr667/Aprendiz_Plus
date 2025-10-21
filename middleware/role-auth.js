const roleAuth = (allowedTypes) => {
    return (req, res, next) => {
        // Se não há usuário autenticado, redirecionar para login
        if (!req.user) {
            return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        // Admin tem acesso a tudo
        if (req.user.type === 'admin') {
            return next();
        }

        // Verificar se o tipo do usuário está entre os permitidos
        if (allowedTypes.includes(req.user.type)) {
            return next();
        }

        // Redirecionar para página apropriada baseado no tipo do usuário
        switch (req.user.type) {
            case 'candidato':
                return res.redirect('/perfil-candidato');
            case 'empresa':
                return res.redirect('/perfil-empresa');
            default:
                return res.redirect('/');
        }
    };
};

module.exports = roleAuth;