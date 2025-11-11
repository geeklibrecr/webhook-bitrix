// Lista de campos esperados desde Bitrix para normalizar el objeto FIELDS
const EXPECTED_FIELDS = [
  'ID',
  'TITLE',
  'TYPE_ID',
  'OPPORTUNITY',
  'CURRENCY_ID',
  'DATE_CREATE',
  'ASSIGNED_BY_FULL_NAME',
  'ASSIGNED_BY_EMAIL',
  'CONTACT_ID',
  'CONTACT_FULL_NAME',
  'CONTACT_EMAIL',
  'CONTACT_PHONE',
  'COMPANY_ID',
  'COMPANY_TITLE',
  'COMPANY_PHONE',
  'COMPANY_EMAIL',
  // Campos personalizados de texto
  'DESTINATARIO',
  'TELEFONO',
  'PROVINCIA',
  'CANTON',
  'DISTRITO',
  'CODIGO_POSTAL',
  'DETALLE_DIRECCION',
  'NUMERO_REFERENCIA',
  'DETALLE_REFERENCIA',
];

function normalizeFields(fieldsInput = {}) {
  const fields = fieldsInput || {};
  const normalizedFields = EXPECTED_FIELDS.reduce((acc, fieldName) => {
    acc[fieldName] = fields[fieldName] ?? null;
    return acc;
  }, {});

  const extraFields = Object.keys(fields).reduce((acc, key) => {
    if (!EXPECTED_FIELDS.includes(key)) acc[key] = fields[key];
    return acc;
  }, {});

  const mergedFields = { ...normalizedFields, ...extraFields };

  // Forzar a string los campos personalizados de texto cuando vengan definidos
  const TEXT_FIELDS = [
    'DESTINATARIO',
    'TELEFONO',
    'PROVINCIA',
    'CANTON',
    'DISTRITO',
    'CODIGO_POSTAL',
    'DETALLE_DIRECCION',
    'NUMERO_REFERENCIA',
    'DETALLE_REFERENCIA',
  ];
  for (const key of TEXT_FIELDS) {
    if (mergedFields[key] !== null && mergedFields[key] !== undefined) {
      mergedFields[key] = String(mergedFields[key]);
    }
  }
  return { normalizedFields, extraFields, mergedFields };
}

module.exports = { EXPECTED_FIELDS, normalizeFields };
