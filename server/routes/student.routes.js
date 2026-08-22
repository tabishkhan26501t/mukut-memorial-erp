const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const upload = require('../utils/multer');
const { studentValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('STUDENT_VIEW'), studentController.getStudents);
router.get('/:id', requirePermission('STUDENT_VIEW'), studentController.getStudent);
router.post('/', requirePermission('STUDENT_CREATE'), studentValidators.create, studentController.createStudent);
router.put('/:id', requirePermission('STUDENT_UPDATE'), studentValidators.update, studentController.updateStudent);
router.delete('/:id', requirePermission('STUDENT_DELETE'), studentValidators.delete, studentController.deleteStudent);
router.put('/:id/photo', requirePermission('STUDENT_UPDATE'), upload.single('photo'), studentController.updateStudentPhoto);
router.post('/import', requirePermission('STUDENT_CREATE'), upload.single('file'), studentController.importStudents);

module.exports = router;
