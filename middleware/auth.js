const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

async function authMiddleware(req, res, next) {
  try {
    // Removido: referência a Authorization header
    let token = req.cookies && req.cookies.token;
    
    if (!token) {
      // Removido: uso de req.headers.authorization
    }
    
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    // Check if user is banned
    if (user.status === 'banned') {
      return res.status(403).json({ 
        error: 'Sua conta foi banida',
        reason: user.banReason || 'Violação dos termos de uso',
        message: user.banMessage || '',
        banned: true
      });
    }
    
    // Check if user is suspended
    if (user.status === 'suspended') {
      // Check if suspension has expired
      if (user.suspendedUntil && new Date() > user.suspendedUntil) {
        // Suspension expired, reactivate user
        user.status = 'active';
        user.suspensionReason = undefined;
        user.suspensionMessage = undefined;
        user.suspendedAt = undefined;
        user.suspendedUntil = undefined;
        user.suspendedBy = undefined;
        await user.save();
      } else {
        // Still suspended
        return res.status(403).json({ 
          error: 'Sua conta está suspensa',
          reason: user.suspensionReason || 'Comportamento inadequado',
          message: user.suspensionMessage || '',
          suspendedUntil: user.suspendedUntil,
          suspended: true
        });
      }
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
