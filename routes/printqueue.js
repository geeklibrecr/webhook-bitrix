const express = require('express');
const router = express.Router();
const { listPrintQueue, updatePrintQueueStatus, imprimirEtiqueta, renderPrintQueueHtml, getPrintQueueItemJson } = require('../controllers/printQueueController');

router.get('/', listPrintQueue);
router.patch('/:id/status', updatePrintQueueStatus);
router.post('/imprimir/:id', imprimirEtiqueta);
router.get('/html', renderPrintQueueHtml);
router.get('/json/:id', getPrintQueueItemJson);

module.exports = router;
