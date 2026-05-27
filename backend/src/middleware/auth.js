import jwt from 'jsonwebtoken';
import config from '../config.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.slice(7), config.jwt.secret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
