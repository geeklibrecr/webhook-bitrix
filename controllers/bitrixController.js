const getFirstValue = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) {
        return entry.trim();
      }

      if (entry && typeof entry === 'object' && entry.VALUE) {
        return entry.VALUE.trim() || null;
      }
    }
  }

  if (typeof value === 'object' && value.VALUE) {
    return value.VALUE.trim() || null;
  }

  return null;
};

exports.handleBitrixWebhook = (req, res) => {
  const payload = req.body;

  console.log("Webhook recibido:", JSON.stringify(payload, null, 2));

  const fields = payload?.data?.FIELDS || {};

  const dealId = fields.ID || fields.DEAL_ID || fields.ORIGIN_ID || null;
  const customerFullName = (
    fields.CONTACT_FULL_NAME ||
    [fields.CONTACT_NAME, fields.CONTACT_SECOND_NAME, fields.CONTACT_LAST_NAME]
      .filter(Boolean)
      .join(' ') ||
    fields.TITLE ||
    fields.NAME ||
    null
  );

  const invoiceAmount = (
    fields.OPPORTUNITY ??
    fields.SUM ??
    fields.AMOUNT ??
    fields.PRICE ??
    null
  );

  const contactEmail = getFirstValue(
    fields.CONTACT_EMAIL ||
    fields.EMAIL ||
    fields.CONTACT_EMAILS
  );

  const contactPhone = getFirstValue(
    fields.CONTACT_PHONE ||
    fields.PHONE ||
    fields.CONTACT_PHONES
  );

  if (payload.event === 'ONCRMDEALUPDATE') {
    console.log("Cambio de etapa detectado para Deal:", dealId);
  }

  console.log("Datos relevantes extraídos:", {
    id: dealId,
    customerFullName,
    invoiceAmount,
    contactEmail,
    contactPhone
  });

  res.status(200).json({
    status: 'ok',
    data: {
      id: dealId,
      customerFullName,
      invoiceAmount,
      contact: {
        email: contactEmail,
        phone: contactPhone
      }
    }
  });
};
