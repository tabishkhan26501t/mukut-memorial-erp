const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { classValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('CLASS_VIEW'), classController.getClasses);
router.get('/:id', requirePermission('CLASS_VIEW'), classController.getClass);
router.post('/', requirePermission('CLASS_CREATE'), classValidators.create, classController.createClass);
router.put('/:id', requirePermission('CLASS_UPDATE'), classValidators.update, classController.updateClass);
router.delete('/:id', requirePermission('CLASS_DELETE'), classValidators.delete, classController.deleteClass);

module.exports = router;
