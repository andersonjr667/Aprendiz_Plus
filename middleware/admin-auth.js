const Role = require('../models/Role');

/**
 * Middleware para verificar se o usuário é admin
 */
async function isAdmin(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticação necessária' });
        }

        // Se o usuário não tem role definida, não é admin
        if (!req.user.role) {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }

        // Buscar a role do usuário
        const userRole = await Role.findById(req.user.role);
        if (!userRole) {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }

        // Verificar se é admin
        if (!userRole.isAdmin) {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }

        // Adicionar role ao objeto req para uso posterior
        req.userRole = userRole;
        next();
    } catch (error) {
        console.error('Erro ao verificar permissões de admin:', error);
        res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
}

/**
 * Middleware para verificar permissões específicas
 * @param {string} resource - Recurso a ser acessado (users, jobs, etc)
 * @param {string} action - Ação a ser executada (create, read, update, delete, manage)
 */
function hasPermission(resource, action) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Autenticação necessária' });
            }

            // Se não tem role definida, não tem permissão
            if (!req.user.role) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            // Buscar a role do usuário
            const userRole = await Role.findById(req.user.role);
            if (!userRole) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            // Se for admin, permite qualquer ação
            if (userRole.isAdmin) {
                req.userRole = userRole;
                return next();
            }

            // Verificar permissão específica
            if (!userRole.hasPermission(resource, action)) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            // Adicionar role ao objeto req para uso posterior
            req.userRole = userRole;
            next();
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            res.status(500).json({ error: 'Erro ao verificar permissões' });
        }
    };
}

/**
 * Middleware para verificar múltiplas permissões
 * @param {Array<{resource: string, action: string}>} permissions - Array de permissões necessárias
 */
function hasPermissions(permissions) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Autenticação necessária' });
            }

            if (!req.user.role) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            const userRole = await Role.findById(req.user.role);
            if (!userRole) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            // Se for admin, permite qualquer ação
            if (userRole.isAdmin) {
                req.userRole = userRole;
                return next();
            }

            // Verificar todas as permissões necessárias
            if (!userRole.hasPermissions(permissions)) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }

            req.userRole = userRole;
            next();
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            res.status(500).json({ error: 'Erro ao verificar permissões' });
        }
    };
}

/**
 * Middleware para verificar se usuário tem acesso ao dashboard
 */
async function canAccessDashboard(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticação necessária' });
        }

        if (!req.user.role) {
            return res.status(403).json({ error: 'Acesso negado ao dashboard' });
        }

        const userRole = await Role.findById(req.user.role);
        if (!userRole) {
            return res.status(403).json({ error: 'Acesso negado ao dashboard' });
        }

        // Admin tem acesso total
        if (userRole.isAdmin) {
            req.userRole = userRole;
            return next();
        }

        // Verificar permissão de acesso ao dashboard
        if (!userRole.hasPermission('dashboard', 'read')) {
            return res.status(403).json({ error: 'Acesso negado ao dashboard' });
        }

        req.userRole = userRole;
        next();
    } catch (error) {
        console.error('Erro ao verificar acesso ao dashboard:', error);
        res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
}

module.exports = {
    isAdmin,
    hasPermission,
    hasPermissions,
    canAccessDashboard
};