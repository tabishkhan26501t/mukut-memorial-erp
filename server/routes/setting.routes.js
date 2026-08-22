const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const upload = require('../utils/multer');

// Public subset (school name/logo/address/phone/email) intended for the login page.
// All administrative settings below are authenticated and permission-gated.
router.get('/public', settingController.getPublicSettings);

router.use(authenticate);

router.get('/', requirePermission('SETTINGS_VIEW'), settingController.getSettings);
router.put('/', requirePermission('SETTINGS_UPDATE'), settingController.updateSettings);
router.put('/logo', requirePermission('SETTINGS_UPDATE'), upload.single('logo'), settingController.uploadLogo);

module.exports = router;
