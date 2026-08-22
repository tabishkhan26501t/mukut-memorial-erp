const prisma = require('../config/db');
const logger = require('../utils/logger');

const logActivity = ({ req, user = null, action, entity, entityId = null, description = '' }) => {
  try {
    const actor = user || (req && req.user) || null;
    const promise = prisma.auditLog.create({
      data: {
        adminId: actor ? actor.id : null,
        adminName: actor ? actor.name : 'System',
        action,
        entity,
        entityId: entityId !== null && entityId !== undefined ? String(entityId) : null,
        description: String(description || '').slice(0, 2000),
        ipAddress: req && req.ip ? req.ip : null,
      },
    });
    return promise.catch((error) => logger.error('Audit log write error:', error));
  } catch (error) {
    logger.error('Audit log error:', error);
    return Promise.resolve();
  }
};

module.exports = { logActivity };