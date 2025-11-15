const mongoose = require('../db/mongoose');

const LARS_DB_NAME = process.env.LARS_DB_NAME || 'webhookbitrix';
const LARS_COLLECTION = process.env.LARS_COLLECTION || 'lars_clients';
const DEFAULT_PAGE_SIZE = Number(process.env.CLIENTS_PAGE_SIZE) || 50;
const MAX_PAGE_SIZE = Number(process.env.CLIENTS_MAX_PAGE_SIZE) || 500;

function getMongoClient() {
  const conn = mongoose.connection;
  if (!conn) return null;
  if (typeof conn.getClient === 'function') return conn.getClient();
  return conn.client || null;
}

function buildFilter(query = {}) {
  const filter = {};
  if (query.bitrixId) {
    const parsed = Number(query.bitrixId);
    if (!Number.isNaN(parsed)) {
      filter.bitrixId = parsed;
    }
  }
  if (query.entityType) {
    filter.entityType = query.entityType;
  }
  return filter;
}

exports.listLarsClients = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'error',
        message: 'Conexion a MongoDB no disponible',
      });
    }

    const client = getMongoClient();
    if (!client) {
      throw new Error('Cliente de MongoDB no inicializado');
    }

    const db = client.db(LARS_DB_NAME);
    const collection = db.collection(LARS_COLLECTION);
    const filter = buildFilter(req.query);
    const rawPage = parseInt(req.query.page, 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const rawPageSize = parseInt(req.query.pageSize ?? req.query.limit, 10);
    const pageSize = Number.isNaN(rawPageSize)
      ? DEFAULT_PAGE_SIZE
      : Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const cursor = collection.find(filter).sort({ syncedAt: -1 }).skip(skip).limit(pageSize);
    const [clients, total] = await Promise.all([cursor.toArray(), collection.countDocuments(filter)]);
    const totalPages = Math.max(Math.ceil((total || 0) / pageSize), 1);

    res.status(200).json({
      status: 'ok',
      count: clients.length,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
      clients,
    });
  } catch (err) {
    console.error('Error obteniendo clientes de Lars:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'No se pudo obtener la lista de clientes',
      error: err.message,
    });
  }
};
