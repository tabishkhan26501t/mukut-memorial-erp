const { verifyAccessToken } = require('../utils/generateToken');
const prisma = require('../config/db');
const { ROLES } = require('../constants/roles');
const { logActivity } = require('../utils/audit');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or account deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

const getPermissionNames = (user) => {
  if (!user || !user.role) return [];
  return user.role.permissions.map((rp) => rp.permission.name);
};

const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role && user.role.name === ROLES.SUPER_ADMIN) return true;
  return getPermissionNames(user).includes(permission);
};

const hasAnyPermission = (user, permissions) => {
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((permission) => hasPermission(user, permission));
};

const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (hasAnyPermission(req.user, permissions)) {
      return next();
    }
    logActivity({
      req,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      entity: 'Auth',
      description: `Blocked: user ${req.user.email} (${req.user.role ? req.user.role.name : 'no role'}) attempted ${req.method} ${req.originalUrl} requiring [${permissions.join(', ')}]`,
    });
    return res.status(403).json({ message: 'Insufficient permissions.' });
  };
};

module.exports = { authenticate, requirePermission, hasPermission, hasAnyPermission, getPermissionNames };