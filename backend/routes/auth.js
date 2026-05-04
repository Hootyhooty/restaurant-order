// src/backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { validateRegisterBody, validateLoginBody } = require('../utils/validation');

router.post('/register', validateRegisterBody, register);
router.post('/login', validateLoginBody, login);

module.exports = router;