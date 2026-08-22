const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backup.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', requirePermission('BACKUP_VIEW'), backupController.getBackups);
router.post('/', requirePermission('BACKUP_CREATE'), backupController.createBackup);
router.post('/restore', requirePermission('BACKUP_RESTORE'), backupController.restoreBackup);
router.get('/download/:filename', requirePermission('BACKUP_VIEW'), backupController.downloadBackup);
router.delete('/:filename', requirePermission('BACKUP_CREATE'), backupController.deleteBackup);

module.exports = router;
