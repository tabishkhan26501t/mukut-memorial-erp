const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const { authValidators } = require('../validators');

router.post('/login', authValidators.login, authController.login);
router.post('/refresh', authValidators.refresh, authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authValidators.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidators.resetPassword, authController.resetPassword);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
