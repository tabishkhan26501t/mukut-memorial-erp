const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const upload = require('../utils/multer');
const { teacherValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('TEACHER_VIEW'), teacherController.getTeachers);
router.get('/:id', requirePermission('TEACHER_VIEW'), teacherController.getTeacher);
router.post('/', requirePermission('TEACHER_CREATE'), teacherValidators.create, teacherController.createTeacher);
router.put('/:id', requirePermission('TEACHER_UPDATE'), teacherValidators.update, teacherController.updateTeacher);
router.delete('/:id', requirePermission('TEACHER_DELETE'), teacherValidators.delete, teacherController.deleteTeacher);
router.put('/:id/photo', requirePermission('TEACHER_UPDATE'), upload.single('photo'), teacherController.updateTeacherPhoto);

module.exports = router;
