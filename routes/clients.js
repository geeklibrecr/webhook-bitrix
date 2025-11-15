const express = require('express');
const { listLarsClients } = require('../controllers/clientController');

const router = express.Router();

router.get('/', listLarsClients);

module.exports = router;

