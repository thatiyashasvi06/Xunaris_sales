import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xunaris_super_secret_jwt_key_2026';

// Insecure shortcuts (x-user-id header, anonymous admin) are OFF unless explicitly enabled. Never set this on a hosted server.
const DEV_AUTH = process.env.ALLOW_DEV_AUTH === 'true';

export const authMiddleware = (req, res, next) => {
  try {
    // 1. Check Authorization Bearer Header or custom x-user-id for easy dev/testing
    const authHeader = req.headers.authorization;
    const directUserId = req.headers['x-user-id'];

    if (directUserId && DEV_AUTH) {
      const user = db.prepare('SELECT id, name, email, role, department, function_access, status FROM users WHERE id = ?').get(directUserId);
      if (user && user.status === 'Active') {
        req.user = user;
        return next();
      }
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, name, email, role, department, function_access, status FROM users WHERE id = ?').get(decoded.id);

      if (user && user.status === 'Active') {
        req.user = user;
        return next();
      }
    }

    // Opt-in local development only (ALLOW_DEV_AUTH=true): unauthenticated calls fall back to Admin.
    if (!DEV_AUTH) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const defaultUser = db.prepare('SELECT id, name, email, role, department, function_access, status FROM users WHERE role = ? LIMIT 1').get('ADMIN');
    if (defaultUser) {
      req.user = defaultUser;
      return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
};

export const requireFunction = (func) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    if (req.user.role === 'ADMIN' || req.user.function_access === 'Both' || req.user.function_access === func) {
      return next();
    }
    return res.status(403).json({ error: 'You do not have permission to perform this action.' });
  };
};
