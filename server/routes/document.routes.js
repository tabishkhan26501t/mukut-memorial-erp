const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const upload = require('../utils/multer');
const { documentValidators } = require('../validators');

router.use(authenticate);

router.get('/', requirePermission('DOCUMENT_VIEW'), documentController.getDocuments);
router.post('/upload', requirePermission('DOCUMENT_UPLOAD'), upload.single('file'), documentController.uploadDocument);
router.delete('/:id', requirePermission('DOCUMENT_DELETE'), documentValidators.delete, documentController.deleteDocument);
router.get('/download/:id', requirePermission('DOCUMENT_VIEW'), documentController.downloadDocument);

module.exports = router;
