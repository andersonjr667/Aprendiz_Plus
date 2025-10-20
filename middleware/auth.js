const jwt = require('jsonwebtoken');
const { UserService } = require('../services/database');

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

const auth = async (req, res, next) => {
    try {
        let token;

        // Verifica header Authorization: 'Bearer <token>'
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        }

        // Se não veio no header, tenta cookie: 'token'
        if (!token) {
            const cookies = parseCookies(req.headers.cookie);
            if (cookies && cookies.token) token = cookies.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Por favor, faça login.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserService.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'Por favor, faça login.' });
        }

        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        console.error('Auth middleware error:', e.message || e);
        res.status(401).json({ error: 'Por favor, faça login.' });
    }
};

module.exports = auth;