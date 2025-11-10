exports.handleBitrixWebhook = (req, res) => {
  const payload = req.body || {};
  const fields = payload?.data?.FIELDS || {};

  console.log("Webhook recibido:", JSON.stringify(payload, null, 2));
  console.log("FIELDS recibidos:", JSON.stringify(fields, null, 2));

  res.status(200).json({
    status: 'ok',
    receivedAt: new Date().toISOString(),
    event: payload.event || null,
    fields,
    payload
  });
};
