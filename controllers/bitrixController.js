exports.handleBitrixWebhook = (req, res) => {
  const payload = req.body;

  console.log("Webhook recibido:", JSON.stringify(payload, null, 2));

  // Aquí puedes filtrar por tipo de evento, stage, etc.
  if (payload.event === 'ONCRMDEALUPDATE') {
    const dealId = payload.data.FIELDS.ID;
    console.log("Cambio de etapa detectado para Deal:", dealId);
    // Lógica adicional aquí
  }

  res.sendStatus(200);
};
