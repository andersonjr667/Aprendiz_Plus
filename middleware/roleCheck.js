function roleCheck(allowed = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowed.includes(req.user.type)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = roleCheck;
