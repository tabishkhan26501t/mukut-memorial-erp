const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { attendanceValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('ATTENDANCE_VIEW'), attendanceController.getAttendance);
router.post('/', requirePermission('ATTENDANCE_CREATE'), attendanceValidators.save, attendanceController.saveAttendance);
router.get('/report', requirePermission('ATTENDANCE_VIEW'), attendanceController.getAttendanceReport);

module.exports = router;
