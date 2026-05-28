const jwt = require('jsonwebtoken');

function signSession(profileId) {
  return jwt.sign({ sub: String(profileId) }, process.env.JWT_SECRET || 'dev-only-secret', { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'PIN session required' });
  try {
    req.session = jwt.verify(token, process.env.JWT_SECRET || 'dev-only-secret');
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
}

module.exports = { requireAuth, signSession };
