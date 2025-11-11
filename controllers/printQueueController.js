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
        message: `Estado invÃ¡lido. Valores permitidos: ${allowed.join(', ')}`,
      });
    }

    const filter = status ? { status } : {};
    const items = await PrintQueueItem.find(filter).sort({ createdAt: -1 }).lean();

    res.status(200).json({ status: 'ok', count: items.length, items });
  } catch (err) {
    console.error('Error listando cola de impresiÃ³n:', err.message);
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
        message: `Estado invÃ¡lido. Valores permitidos: ${allowed.join(', ')}`,
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
  <title>Cola de ImpresiÃ³n</title>
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
    <h1>Cola de ImpresiÃ³n</h1>
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

// Devuelve JSON de un item puntual (apoyo para el botÃ³n VER)
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
    
    // Datos formateados para la etiqueta
    const remitenteNombre = (f.COMPANY_TITLE || f.ASSIGNED_BY_FULL_NAME || '').toString();
    const remitenteTelefono = (f.COMPANY_PHONE || f.CONTACT_PHONE || f.TELEFONO || '').toString();
    const fechaOrden = createdAt ? createdAt.toLocaleDateString('es-CR') : '';
    const destinatario = (f.DESTINATARIO || '').toString();
    const telDest = (f.TELEFONO || '').toString();
    const direccionLinea = [f.PROVINCIA, f.CANTON, f.DISTRITO].filter(Boolean).map(v => String(v).toUpperCase()).join(', ');
    const detalleDir = (f.DETALLE_DIRECCION || '').toString();
    const ref1 = (f.NUMERO_REFERENCIA || '').toString();
    const ref2 = (f.DETALLE_REFERENCIA || '').toString();


    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta</title>
  <style>
    @page { size: 100mm 120mm; margin: 5mm; }
    body { margin: 0; font-family: Arial, sans-serif; }
    .label {
      width: 100mm; height: 120mm; padding: 4mm; box-sizing: border-box;
      display: flex; flex-direction: column; justify-content: space-between;
      border: 1px solid #000;
    }
    .row { display: flex; justify-content: space-between; align-items: flex-start; }
    .col { flex: 1; padding-right: 4mm; min-width: 0; }
    .col-remitente { width: calc(100% - 30mm); }  
    .col-qr { width:26mm;   margin-left: auto; display: flex; justify-content: flex-end;  align-items: flex-start;}
    .logo { width: 100%; text-align: center; }
    .logo img { max-width: 100%; }  
    .small { font-size: 11pt; color: #333; }
    .strong { font-weight: 600; }
    .qr { width: 25mm; height: 25mm; margin-left: auto; display: flex; justify-content: flex-end;  align-items: flex-start;}
    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
    .cell { border: 1px solid #000; padding: 2mm; font-size: 9pt; }
    .guia { font-weight: bold; font-size: 11pt; }
    table.attempts { width: 100%; border-collapse: collapse; }
    table.attempts th, table.attempts td { border: 2px solid #000; padding: 2mm; text-align: center; font-size: 9pt; }
  </style>
  <script>window.onload = function(){ window.print && window.print(); };</script>
</head>
<body>
  <div class="label">
    <div class="logo"><img src="https://geeklibre.net/images/LOGO_etiqueta.png" alt="Logo" /></div>
    <div class="header-grid">
      <div class="cell">PBX: ${escapeHtml(remitenteTelefono)}</div>
      <div class="cell">WhatsApp: ${escapeHtml(telDest)}</div>
    </div>
    <div class="row small">
      <div class="col-remitente">
      <div class="guia">GUIA - ${escapeHtml(idStr)}</div>
      <span class="strong">Remitente:</span> ${escapeHtml(remitenteNombre)}<br/>
      <span class="strong">Tel&eacute;fono:</span> ${escapeHtml(remitenteTelefono)} <br/>
      <span class="strong">Fecha Orden:</span> ${escapeHtml(fechaOrden)} <br/>
      <hr/>
      </div>
      <div class="col-qr">
        ${qrUrl ? `<img class="qr" src="${qrUrl}" alt="QR ${escapeHtml(idStr)}" />` : ''}
      </div>
    </div>
    <div class="row">
      <div class="col small">
        <div><span class="strong">Destinatario:</span> ${escapeHtml((f.DESTINATARIO || '').toString()).slice(0, 50)}</div>
        <div><span class="strong">Tel&eacute;fono:</span> ${escapeHtml((f.TELEFONO || '').toString()).slice(0, 30)}</div>
        <div><span class="strong">Direcci&oacute;n:</span> ${escapeHtml([f.PROVINCIA, f.CANTON, f.DISTRITO].filter(Boolean).join(', '))} ${f.CODIGO_POSTAL ? '('+escapeHtml(f.CODIGO_POSTAL.toString())+')' : ''}</div>
        <div>${escapeHtml((f.DETALLE_DIRECCION || '').toString()).slice(0, 70)}</div>
        <div><span class="strong">Monto:</span> ${formatAmount(amount)} ${currency && amount != null ? '' : ''}</div>
        <div><span class="strong">Referencia:</span> ${escapeHtml((f.NUMERO_REFERENCIA || '').toString())} ${escapeHtml((f.DETALLE_REFERENCIA || '').toString()).slice(0, 60)}</div>
        <div><span class="strong">Referencia 2:</span> ${escapeHtml((f.DETALLE_REFERENCIA || '').toString())} ${escapeHtml((f.DETALLE_REFERENCIA || '').toString()).slice(0, 60)}</div>
        <!-- <div ">Enlace: ${linkUrl}</div> -->
      </div>
    </div>
    <table class="attempts">
      <thead><tr><th>Intento 1</th><th>Intento 2</th><th>Intento 3</th></tr></thead>
      <tbody><tr><td></td><td></td><td></td></tr></tbody>
    </table>
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

