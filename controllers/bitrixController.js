const EXPECTED_FIELDS = [
  'ID',
  'TITLE',
  'TYPE_ID',
  'STAGE_ID',
  'CATEGORY_ID',
  'OPPORTUNITY',
  'CURRENCY_ID',
  'DATE_CREATE',
  'ASSIGNED_BY_FULL_NAME',
  'ASSIGNED_BY_EMAIL',
  'CONTACT_ID',
  'CONTACT_NAME',
  'CONTACT_SECOND_NAME',
  'CONTACT_LAST_NAME',
  'CONTACT_FULL_NAME',
  'CONTACT_EMAIL',
  'CONTACT_PHONE',
  'COMPANY_ID',
  'COMPANY_TITLE',
  'COMPANY_PHONE',
  'COMPANY_EMAIL'
];

exports.handleBitrixWebhook = (req, res) => {
  const payload = req.body || {};
  const fields = payload?.data?.FIELDS || {};
  // Pre-fill expected fields with null so missing values don't break downstream consumers.
  const normalizedFields = EXPECTED_FIELDS.reduce((acc, fieldName) => {
    acc[fieldName] = fields[fieldName] ?? null;
    return acc;
  }, {});

  const extraFields = Object.keys(fields).reduce((acc, key) => {
    if (!EXPECTED_FIELDS.includes(key)) {
      acc[key] = fields[key];
    }
    return acc;
  }, {});

  console.log("Webhook recibido:", JSON.stringify(payload, null, 2));
  console.log("FIELDS recibidos:", JSON.stringify(fields, null, 2));

  res.status(200).json({
    status: 'ok',
    receivedAt: new Date().toISOString(),
    event: payload.event || null,
    fields: { ...normalizedFields, ...extraFields },
    payload
  });
};
