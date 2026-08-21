import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hemolink-production-secret-key-2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    // Set user info on request object from decoded token payload
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role // Server-side validated role
    };
    next();
  });
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

export function generateToken(userPayload) {
  return jwt.sign(
    {
      id: userPayload.id,
      email: userPayload.email,
      role: userPayload.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
