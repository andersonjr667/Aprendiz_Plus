function roleCheck(allowed = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    // Donos (type: 'owner') têm acesso a tudo
    if (req.user.type === 'owner') {
      return next();
    }
    
    if (!allowed.includes(req.user.type)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = roleCheck;
