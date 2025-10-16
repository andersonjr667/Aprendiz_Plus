const jwt = require('jsonwebtoken');
const { UserService } = require('../services/database');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserService.findById(decoded.id);

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Por favor, faça login.' });
    }
};

module.exports = auth;