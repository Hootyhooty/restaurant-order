const express = require('express');
const { submitContact } = require('../controllers/contactController');
const { validateContactBody } = require('../utils/validation');

const router = express.Router();

router.post('/', validateContactBody, submitContact);

module.exports = router;
