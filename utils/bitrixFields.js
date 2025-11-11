// Lista de campos esperados desde Bitrix para normalizar el objeto FIELDS
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
  'COMPANY_EMAIL',
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
  return { normalizedFields, extraFields, mergedFields };
}

module.exports = { EXPECTED_FIELDS, normalizeFields };

