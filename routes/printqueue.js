const express = require('express');
const router = express.Router();
const { listPrintQueue, updatePrintQueueStatus, imprimirEtiqueta } = require('../controllers/printQueueController');

router.get('/', listPrintQueue);
router.patch('/:id/status', updatePrintQueueStatus);
router.post('/imprimir/:id', imprimirEtiqueta);

module.exports = router;
