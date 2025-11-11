const WebhookEvent = require('../models/WebhookEvent');
const PrintQueueItem = require('../models/PrintQueueItem');
const { normalizeFields } = require('../utils/bitrixFields');

exports.handleBitrixWebhook = async (req, res) => {
  const payload = req.body || {};
  const fields = payload?.data?.FIELDS || {};
  const { normalizedFields, extraFields, mergedFields } = normalizeFields(fields);

  console.log('Webhook recibido:', JSON.stringify(payload, null, 2));
  console.log('FIELDS recibidos:', JSON.stringify(fields, null, 2));

  try {
    const doc = await WebhookEvent.create({
      event: payload.event || null,
      payload,
      fields: mergedFields,
      status: 'received',
    });

    const queueItem = await PrintQueueItem.create({
      fields: mergedFields,
      status: 'pendiente',
      webhookEvent: doc._id,
    });

    res.status(200).json({
      status: 'ok',
      id: doc._id,
      queueId: queueItem._id,
      receivedAt: new Date().toISOString(),
      event: payload.event || null,
      fields: mergedFields,
      payload,
    });
  } catch (err) {
    console.error('Error guardando webhook:', err.message);
    res.status(500).json({ status: 'error', message: 'Error guardando webhook', error: err.message });
  }
};
