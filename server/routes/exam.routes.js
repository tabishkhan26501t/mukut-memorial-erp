const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { examValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('EXAMS_VIEW'), examController.getExams);
router.get('/:id', requirePermission('EXAMS_VIEW'), examController.getExam);
router.post('/', requirePermission('EXAMS_CREATE'), examValidators.create, examController.createExam);
router.put('/:id', requirePermission('EXAMS_UPDATE'), examValidators.update, examController.updateExam);
router.delete('/:id', requirePermission('EXAMS_DELETE'), examValidators.delete, examController.deleteExam);

module.exports = router;
