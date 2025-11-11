const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.warn('[MongoDB] MONGODB_URI no está definido en el entorno. La conexión no se realizará.');
} else {
  const dbName = process.env.MONGODB_DB || 'webhookbitrix';
  mongoose
    .connect(uri, {
      dbName,
    })
    .then(() => {
      console.log(`[MongoDB] Conectado a Atlas. DB: ${dbName}`);
    })
    .catch((err) => {
      console.error('[MongoDB] Error de conexión:', err.message);
    });
}

module.exports = mongoose;

