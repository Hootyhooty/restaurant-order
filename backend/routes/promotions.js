const express = require('express');
const router = express.Router();
const { listPublicPromotions } = require('../controllers/promotionController');

router.get('/', listPublicPromotions);

module.exports = router;
