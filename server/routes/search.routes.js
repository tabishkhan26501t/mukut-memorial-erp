const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', requirePermission('SEARCH'), searchController.search);

module.exports = router;
