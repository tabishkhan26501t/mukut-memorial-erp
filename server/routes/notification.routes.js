const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { notificationValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('NOTIFICATION_VIEW'), notificationController.getNotifications);
router.post('/', requirePermission('NOTIFICATION_CREATE'), notificationValidators.create, notificationController.createNotification);
router.put('/:id/read', requirePermission('NOTIFICATION_VIEW'), notificationController.markAsRead);
router.delete('/:id', requirePermission('NOTIFICATION_MANAGE'), notificationValidators.delete, notificationController.deleteNotification);

module.exports = router;
