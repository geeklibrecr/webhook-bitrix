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

// Renderiza una vista HTML simple de la cola con colores por estado
exports.renderPrintQueueHtml = async (req, res) => {
  try {
    const allowed = ['pendiente', 'procesando', 'impreso', 'error'];
    const { status } = req.query;
    const filter = status && allowed.includes(status) ? { status } : {};
    const items = await PrintQueueItem.find(filter).sort({ createdAt: -1 }).lean();

    const pad = (v) => (v == null ? '' : String(v));
    const fmtAmount = (val, currency) => {
      const n = val == null ? null : Number(val);
      if (n == null || Number.isNaN(n)) return '';
      const cur = currency || 'USD';
      try { return new Intl.NumberFormat('es-CR', { style: 'currency', currency: cur }).format(n); }
      catch { return String(n); }
    };
    const fmtDate = (d) => (d ? new Date(d).toISOString() : '');

    const esc = (s) => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const rowHtml = items.map((it) => {
      const f = it.fields || {};
      const cur = pad(f.CURRENCY_ID || '');
      const amount = fmtAmount(f.OPPORTUNITY, cur);
      const statusClass = `status-${esc(it.status || '')}`;
      const statusLabel = ({ pendiente: 'Pendiente', procesando: 'Procesando', impreso: 'Impreso', error: 'Error' })[it.status] || esc(it.status || '');
      return `
      <tr>
        <td>
          <form action="/printqueue/imprimir/${it._id}" method="post" target="_blank">
            <button class="btn">IMPRIMIR</button>
          </form>
        </td>
        <td><a class="link" href="/printqueue/json/${it._id}" target="_blank">VER</a></td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>${esc(pad(f.TITLE))}</td>
        <td class="num">${esc(amount)}</td>
        <td>${esc(cur)}</td>
        <td>${esc(fmtDate(f.DATE_CREATE))}</td>
        <td>${esc(pad(f.DESTINATARIO))}</td>
        <td>${esc(pad(f.TELEFONO))}</td>
        <td>${esc(pad(f.PROVINCIA))}</td>
        <td>${esc(pad(f.CANTON))}</td>
        <td>${esc(pad(f.DISTRITO))}</td>
        <td>${esc(pad(f.CODIGO_POSTAL))}</td>
        <td>${esc(pad(f.DETALLE_DIRECCION))}</td>
        <td>${esc(pad(f.NUMERO_REFERENCIA))}</td>
        <td>${esc(pad(f.DETALLE_REFERENCIA))}</td>
      </tr>`;
    }).join('');

    const statusOptions = ['','pendiente','procesando','impreso','error']
      .map(v => `<option value="${v}" ${v === (status||'') ? 'selected' : ''}>${v ? v[0].toUpperCase()+v.slice(1) : 'Estado'}</option>`)
      .join('');

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Cola de Impresión</title>
  <style>
    body { font-family: Inter, system-ui, Arial, sans-serif; background:#f7f7fb; margin:24px; color:#1f2937; }
    h1 { font-size: 22px; margin-bottom: 12px; }
    .toolbar { display:flex; gap:12px; align-items:center; margin: 10px 0 16px; }
    .pill { background:#eef2ff; color:#4f46e5; border-radius:999px; padding:6px 10px; font-size:12px; }
    .btn { background:#2563eb; color:#fff; border:none; border-radius:6px; padding:8px 12px; cursor:pointer; }
    .btn:hover { background:#1d4ed8; }
    .link { color:#2563eb; text-decoration:none; font-weight:600; }
    select { padding:8px 10px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #e5e7eb; }
    th, td { padding:12px 10px; border-bottom:1px solid #e5e7eb; font-size:14px; }
    th { text-align:left; color:#6b7280; background:#f9fafb; }
    td.num { text-align:right; font-variant-numeric: tabular-nums; }
    .badge { display:inline-block; padding:4px 10px; border-radius:999px; font-weight:700; font-size:12px; color:#fff; letter-spacing: .2px; }
    .status-pendiente { background:#f59e0b; color:#ffffff; }
    .status-procesando { background:#2563eb; color:#ffffff; }
    .status-impreso { background:#16a34a; color:#ffffff; }
    .status-error { background:#dc2626; color:#ffffff; }
  </style>
  <script>
    function aplicarFiltro(){
      const s = document.getElementById('fstatus').value;
      const qp = s ? ('?status=' + encodeURIComponent(s)) : '';
      location.href = '/printqueue/html' + qp;
    }
  </script>
  </head>
  <body>
    <h1>Cola de Impresión</h1>
    <div class="toolbar">
      <span class="pill">Origen: /printqueue</span>
      <span class="pill">Actualizado: ${esc(new Date().toLocaleString('es-CR'))}</span>
      <div style="margin-left:auto; display:flex; gap:8px;">
        <select id="fstatus" onchange="aplicarFiltro()">${statusOptions}</select>
        <button class="btn" onclick="aplicarFiltro()">ACTUALIZAR</button>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Acciones</th>
          <th>Detalles</th>
          <th>Status</th>
          <th>TITLE</th>
          <th>OPPORTUNITY</th>
          <th>CURRENCY_ID</th>
          <th>DATE_CREATE</th>
          <th>DESTINATARIO</th>
          <th>TELEFONO</th>
          <th>PROVINCIA</th>
          <th>CANTON</th>
          <th>DISTRITO</th>
          <th>CODIGO_POSTAL</th>
          <th>DETALLE_DIRECCION</th>
          <th>NUMERO_REFERENCIA</th>
          <th>DETALLE_REFERENCIA</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml}
      </tbody>
    </table>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Error renderizando HTML de cola:', err.message);
    return res.status(500).send('<p>Error generando vista</p>');
  }
};

// Devuelve JSON de un item puntual (apoyo para el botón VER)
exports.getPrintQueueItemJson = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await PrintQueueItem.findById(id).lean();
    if (!item) return res.status(404).json({ status: 'error', message: 'Item no encontrado' });
    return res.status(200).json({ status: 'ok', item });
  } catch (err) {
    console.error('Error obteniendo item:', err.message);
    return res.status(500).json({ status: 'error', message: 'Error interno', error: err.message });
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
    const status = item.status || 'pendiente';
    const statusLabel = ({ pendiente: 'Pendiente', procesando: 'Procesando', impreso: 'Impreso', error: 'Error' })[status] || status;

    const escapeHtml = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta</title>
  <style>
    @page { size: 100mm 100mm; margin: 5mm; }
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
    .status { text-align: right; margin-bottom: 2mm; }
    .badge { display: inline-block; padding: 2mm 3mm; font-size: 9pt; border-radius: 4mm; font-weight: 600; color: #fff; }
    .status-pendiente { background-color: #ff9800; }
    .status-procesando { background-color: #2196f3; }
    .status-impreso { background-color: #4caf50; }
    .status-error { background-color: #f44336; }
    .table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    .table th, .table td { border: 1px solid #ddd; padding: 1.5mm; vertical-align: top; }
    .table th { background: #f5f5f5; text-align: left; white-space: nowrap; }
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
        <div class="small">Destinatario: ${escapeHtml((f.DESTINATARIO || '').toString()).slice(0, 50)}</div>
        <div class="small">Teléfono: ${escapeHtml((f.TELEFONO || '').toString()).slice(0, 30)}</div>
        <div class="small">Dirección: ${escapeHtml([f.PROVINCIA, f.CANTON, f.DISTRITO].filter(Boolean).join(', '))} ${f.CODIGO_POSTAL ? '('+escapeHtml(f.CODIGO_POSTAL.toString())+')' : ''}</div>
        <div class="small">Detalle dirección: ${escapeHtml((f.DETALLE_DIRECCION || '').toString()).slice(0, 70)}</div>
        <div class="small">Referencia: ${escapeHtml((f.NUMERO_REFERENCIA || '').toString())} ${escapeHtml((f.DETALLE_REFERENCIA || '').toString()).slice(0, 60)}</div>
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
