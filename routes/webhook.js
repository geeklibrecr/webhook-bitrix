const express = require('express');
const router = express.Router();
const { handleBitrixWebhook } = require('../controllers/bitrixController');

router.post('/', handleBitrixWebhook);

module.exports = router;
