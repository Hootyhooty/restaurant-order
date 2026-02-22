// Public souvenirs API for the frontend (Store page)
const express = require('express');
const router = express.Router();
const { getSouvenirs } = require('../controllers/souvenirController');

router.get('/', getSouvenirs);

module.exports = router;
