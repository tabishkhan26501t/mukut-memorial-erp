const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');

router.use(authenticate);

router.get('/stats', requirePermission('DASHBOARD_VIEW'), dashboardController.getDashboardStats);
router.get('/charts', requirePermission('DASHBOARD_VIEW'), dashboardController.getChartData);
router.get('/activity', requirePermission('DASHBOARD_VIEW'), dashboardController.getActivity);
router.get('/upcoming-exams', requirePermission('DASHBOARD_VIEW'), dashboardController.getUpcomingExams);
router.get('/notices', requirePermission('DASHBOARD_VIEW'), dashboardController.getNotices);
router.get('/health', requirePermission('DASHBOARD_VIEW'), dashboardController.getSystemHealth);

module.exports = router;