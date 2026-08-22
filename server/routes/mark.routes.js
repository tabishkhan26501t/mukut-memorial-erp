const express = require('express');
const router = express.Router();
const markController = require('../controllers/mark.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { markValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('MARKS_VIEW'), markController.getMarks);
router.get('/exam/:examId', requirePermission('MARKS_VIEW'), markController.getMarksByExam);
router.post('/exam/:examId', requirePermission('MARKS_UPDATE'), markValidators.save, markController.saveMarks);
router.get('/report/:studentId/:examId', requirePermission('MARKS_VIEW'), markController.getStudentReport);

module.exports = router;
