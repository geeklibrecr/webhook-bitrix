const PrintQueueItem = require('../models/PrintQueueItem');

// Enlace base para el QR; sobreescribible por entorno
const QR_LINK_BASE = process.env.QR_LINK_BASE || 'https://dev.example.com/bitrix/deal';

exports.listPrintQueue = async (req, res) => {
  try {
    const allowed = ['pendiente', 'procesando', 'impreso', 'error'];
    const { status } = req.query;

    if (status && !allowed.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Estado inválido. Valores permitidos: ${allowed.join(', ')}`,
      });
    }

    const filter = status ? { status } : {};
    const items = await PrintQueueItem.find(filter).sort({ createdAt: -1 }).lean();

    res.status(200).json({ status: 'ok', count: items.length, items });
  } catch (err) {
    console.error('Error listando cola de impresión:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno', error: err.message });
  }
};

exports.updatePrintQueueStatus = async (req, res) => {
  try {
    const allowed = ['pendiente', 'procesando', 'impreso', 'error'];
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({ status: 'error', message: 'Falta status en el cuerpo' });
    }
    if (!allowed.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Estado inválido. Valores permitidos: ${allowed.join(', ')}`,
      });
    }

    const updated = await PrintQueueItem.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Item no encontrado' });
    }

    res.status(200).json({ status: 'ok', item: updated });
  } catch (err) {
    console.error('Error actualizando estado:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno', error: err.message });
  }
};

exports.imprimirEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await PrintQueueItem.findById(id).lean();
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item no encontrado' });
    }

    const f = item.fields || {};
    const idStr = (f.ID ?? '').toString().trim();
    const currency = (f.CURRENCY_ID || '').toString();
    const amount = f.OPPORTUNITY != null ? Number(f.OPPORTUNITY) : null;
    const formatAmount = (val) => (val == null || Number.isNaN(val) ? '' : new Intl.NumberFormat('es-CR', { style: 'currency', currency: currency || 'USD' }).format(val));
    const createdAt = f.DATE_CREATE ? new Date(f.DATE_CREATE) : null;
    const linkUrl = idStr ? `${QR_LINK_BASE}/${encodeURIComponent(idStr)}` : '';
    const qrUrl = linkUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(linkUrl)}` : null;

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta</title>
  <style>
    @page { size: 100mm 50mm; margin: 5mm; }
    body { margin: 0; font-family: Arial, sans-serif; }
    .label {
      width: 100mm; height: 100mm; padding: 4mm; box-sizing: border-box;
      display: flex; flex-direction: column; justify-content: space-between;
      border: 1px dashed #999;
    }
    .row { display: flex; justify-content: space-between; align-items: baseline; }
    .col { flex: 1; padding-right: 4mm; min-width: 0; }
    .logo { width: 100%; text-align: center; margin-bottom: 2mm; }
    .logo img { max-width: 100%; margin-bottom: 2mm; }  
    .title { font-size: 14pt; font-weight: bold; line-height: 1.1; }
    .small { font-size: 9pt; color: #333; }
    .strong { font-weight: 600; }
    .qr { width: 30mm; height: 30mm; }
  </style>
  <script>window.onload = function(){ window.print && window.print(); };</script>
</head>
<body>
  <div class="label">
    <div class="row">
      <div class="col">
        <div class="logo"><img src="https://geeklibre.net/images/LOGO_etiqueta.png" alt="Logo" /></div>  
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="title">${(f.TITLE || 'Etiqueta').toString().slice(0, 60)}</div>
        <div class="small">ID: <span class="strong">${idStr}</span></div>
        <div class="small">Cliente: ${(f.CONTACT_FULL_NAME || f.COMPANY_TITLE || '').toString().slice(0, 40)}</div>
        <div class="small">Monto: ${formatAmount(amount)} ${currency && amount != null ? '' : ''}</div>
        <div class="small">Fecha: ${createdAt ? createdAt.toLocaleDateString('es-CR') : ''}</div>
        <div class="small">Enlace: ${linkUrl}</div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="logo">${qrUrl ? `<img class="qr" src="${qrUrl}" alt="QR ${idStr}" />` : ''}</div>  
      </div>
    </div>
    <div class="small">Responsable: ${(f.ASSIGNED_BY_FULL_NAME || '').toString().slice(0, 40)}</div>
  </div>
</body>
</html>`;

    await PrintQueueItem.findByIdAndUpdate(id, { status: 'impreso' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Error al imprimir etiqueta:', err.message);
    return res.status(500).json({ status: 'error', message: 'Error generando etiqueta', error: err.message });
  }
};

