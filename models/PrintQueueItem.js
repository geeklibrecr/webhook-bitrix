const mongoose = require('mongoose');

const PrintQueueItemSchema = new mongoose.Schema(
  {
    fields: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pendiente', 'procesando', 'impreso', 'error'],
      default: 'pendiente',
    },
    webhookEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'WebhookEvent' },
  },
  { timestamps: true, collection: 'cola_impresion' }
);

module.exports = mongoose.model('PrintQueueItem', PrintQueueItemSchema);

