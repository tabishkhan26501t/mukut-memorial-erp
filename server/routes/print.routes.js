const express = require('express');
const router = express.Router();
const printController = require('../controllers/print.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');

router.use(authenticate);

router.get('/student/:id', requirePermission('REPORT_PRINT'), printController.studentProfile);
router.get('/teacher/:id', requirePermission('REPORT_PRINT'), printController.teacherProfile);
router.get('/attendance', requirePermission('REPORT_PRINT'), printController.attendanceReport);
router.get('/marksheet', requirePermission('REPORT_PRINT'), printController.marksheet);
router.get('/fee-receipt/:id', requirePermission('REPORT_PRINT'), printController.feeReceipt);

module.exports = router;
