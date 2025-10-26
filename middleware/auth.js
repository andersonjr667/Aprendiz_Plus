const jwt = require('jsonwebtoken');
const db = require('../services/database');
const UserService = db.UserService;
const mongoose = require('mongoose');

function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(function(cookie) {
        const parts = cookie.split('=');
        const key = parts.shift().trim();
        const value = decodeURI(parts.join('='));
        list[key] = value;
    });
    return list;
}

function isApiRequest(req) {
    const accepts = req.headers.accept || '';
    return req.xhr || (req.originalUrl && req.originalUrl.startsWith('/api/')) || accepts.indexOf('application/json') !== -1;
}

const auth = async (req, res, next) => {
    try {
        let token;

        // 1) Tenta header Authorization: 'Bearer <token>'
        const authHeader = req.get('Authorization') || req.header && req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
        }

        // 2) Se não veio no header, tenta cookie: 'token'
        if (!token && req.headers && req.headers.cookie) {
            const cookies = parseCookies(req.headers.cookie);
            if (cookies && cookies.token) {
                token = cookies.token;
            }
        }

        // Remover aspas extras se existirem
        if (typeof token === 'string' && token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1);
        }

        // 3) Se não tem token, responder/redirect conforme tipo de request
        if (!token) {
            // Log temporário para depuração: mostrar cookies recebidos
            try { console.log('[Auth][DEBUG] cookies header:', req.headers.cookie); } catch (e) {}
            if (isApiRequest(req)) {
                return res.status(401).json({ error: 'Por favor, faça login.' });
            }
            return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl || '/')}`);
        }

        // 4) Verificar e decodificar JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtErr) {
            console.warn('[Auth] JWT verification failed:', jwtErr.message);
            // limpar cookie inválido (se aplicável)
            try { res.clearCookie && res.clearCookie('token'); } catch (e) {}
            if (isApiRequest(req)) return res.status(401).json({ error: 'Sessão inválida. Por favor, faça login novamente.' });
            return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl || '/')}`);
        }

        // (Nota) Não rejeitamos tokens com id não-formato-ObjectId aqui porque o UserService
        // pode oferecer fallback para o banco JSON local. Continuamos e tentamos buscar o usuário —
        // se houver um CastError ou usuário não encontrado, lidaremos abaixo.

        // 6) Buscar usuário
        const user = await UserService.findById(decoded.id);
        if (!user) {
            console.warn('[Auth] User not found for token id:', decoded && decoded.id);
            try { res.clearCookie && res.clearCookie('token'); } catch (e) {}
            if (isApiRequest(req)) return res.status(401).json({ error: 'Usuário não encontrado.' });
            return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl || '/')}`);
        }

        // 7) Anexar e seguir
        req.token = token;
        req.user = user;
        return next();
    } catch (err) {
        // Tratar CastError do mongoose como sessão inválida (retornar 401 em vez de 500)
        if (err && (err.name === 'CastError' || err instanceof mongoose.Error.CastError)) {
            console.warn('[Auth] CastError ao buscar usuário - token possivelmente com id antigo:', err.message || err);
            try { res.clearCookie && res.clearCookie('token'); } catch (e) {}
            if (isApiRequest(req)) return res.status(401).json({ error: 'Sessão inválida. Por favor, faça login novamente.' });
            return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl || '/')}`);
        }

        console.error('[Auth] Middleware error:', err && err.stack ? err.stack : err);
        if (isApiRequest(req)) return res.status(500).json({ error: 'Erro de autenticação' });
        return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl || '/')}`);
    }
};

module.exports = auth;