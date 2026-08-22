const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { userValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('USER_VIEW'), userController.getUsers);
router.get('/roles', requirePermission('USER_VIEW'), userController.getRoles);
router.get('/permissions', requirePermission('USER_VIEW'), userController.getPermissionsList);
router.get('/:id', requirePermission('USER_VIEW'), userController.getUser);
router.post('/', requirePermission('USER_CREATE'), userValidators.create, userController.createUser);
router.put('/:id', requirePermission('USER_UPDATE'), userValidators.update, userController.updateUser);
router.put('/:id/active', requirePermission('USER_DISABLE'), userController.setUserActive);
router.put('/:id/reset-password', requirePermission('USER_DISABLE'), userValidators.resetUserPassword, userController.resetUserPassword);
router.put('/roles/:id/permissions', requirePermission('USER_UPDATE'), userValidators.rolePermissions, userController.updateRolePermissions);

module.exports = router;