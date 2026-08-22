const prisma = require('../config/db');
const logger = require('../utils/logger');

const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, entity, action } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { adminName: { contains: search } },
        { entity: { contains: search } },
        { description: { contains: search } },
        { entityId: { contains: search } },
      ];
    }
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getAuditEntities = async (req, res) => {
  try {
    const entities = await prisma.auditLog.findMany({
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    });
    res.json(entities.map((e) => e.entity));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const escapeCsv = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

const exportAuditLogs = async (req, res) => {
  try {
    const { search, entity, action } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { adminName: { contains: search } },
        { entity: { contains: search } },
        { description: { contains: search } },
        { entityId: { contains: search } },
      ];
    }
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const header = ['Date', 'Time', 'Admin', 'Action', 'Entity', 'Description'];
    const rows = logs.map((log) => [
      log.createdAt.toISOString().slice(0, 10),
      log.createdAt.toISOString().slice(11, 19),
      log.adminName,
      log.action,
      log.entity,
      log.description,
    ]);

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    logger.error('Export audit logs error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getAuditLogs, getAuditEntities, exportAuditLogs };
