const { verifyAccess } = require('../services/authService');

function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = verifyAccess(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (token) {
    try { req.user = verifyAccess(token); } catch { /* ignore */ }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
