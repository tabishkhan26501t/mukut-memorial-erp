const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fee.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', requirePermission('FEES_VIEW'), feeController.getFees);
router.get('/:id', requirePermission('FEES_VIEW'), feeController.getFee);
router.post('/', requirePermission('FEES_CREATE'), feeController.createFee);
router.put('/:id', requirePermission('FEES_UPDATE'), feeController.updateFee);
router.delete('/:id', requirePermission('FEES_DELETE'), feeController.deleteFee);

module.exports = router;
