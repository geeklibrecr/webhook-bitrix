const mongoose = require('mongoose');

const WebhookEventSchema = new mongoose.Schema(
  {
    event: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['received', 'processed', 'failed'],
      default: 'received',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebhookEvent', WebhookEventSchema);

