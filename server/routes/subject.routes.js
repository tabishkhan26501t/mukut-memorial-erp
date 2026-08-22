const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { subjectValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('SUBJECT_VIEW'), subjectController.getSubjects);
router.get('/:id', requirePermission('SUBJECT_VIEW'), subjectController.getSubject);
router.post('/', requirePermission('SUBJECT_CREATE'), subjectValidators.create, subjectController.createSubject);
router.put('/:id', requirePermission('SUBJECT_UPDATE'), subjectValidators.update, subjectController.updateSubject);
router.delete('/:id', requirePermission('SUBJECT_DELETE'), subjectValidators.delete, subjectController.deleteSubject);

module.exports = router;
