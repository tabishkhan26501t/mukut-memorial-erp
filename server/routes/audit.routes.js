const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', requirePermission('AUDIT_VIEW'), auditController.getAuditLogs);
router.get('/entities', requirePermission('AUDIT_VIEW'), auditController.getAuditEntities);
router.get('/export', requirePermission('AUDIT_VIEW'), auditController.exportAuditLogs);

module.exports = router;
