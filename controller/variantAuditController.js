const { VariantAuditLog, User } = require("../db/models");

const toPlain = (row) => (row && typeof row.toJSON === "function" ? row.toJSON() : row);

const stringifyValue = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// node-postgres returns NUMERIC/DECIMAL columns as STRINGS (to avoid float
// precision loss), e.g. "73.00" - a plain string compare against a freshly
// parsed JS number (73) would treat every untouched numeric field as
// "changed". Compare numerically when both sides parse as numbers, string
// compare otherwise (also handles pg's BOOLEAN columns, which come back as
// real JS booleans and compare correctly with ===).
const valuesEqual = (oldVal, newVal) => {
  if (oldVal === newVal) return true;
  if (oldVal === null || oldVal === undefined || newVal === null || newVal === undefined) {
    return (oldVal ?? null) === (newVal ?? null);
  }
  const oldNum = Number(oldVal);
  const newNum = Number(newVal);
  if (!Number.isNaN(oldNum) && !Number.isNaN(newNum)) {
    return oldNum === newNum;
  }
  return String(oldVal) === String(newVal);
};

// changedFields: { fieldName: newValue }. Compares against oldRow (a Variant
// instance or plain object fetched BEFORE the write) and only writes a log
// row for fields that actually differ - a full-row PUT that happens to send
// back a field's existing value produces no log noise.
const logVariantFieldChanges = async (variantId, userId, oldRow, changedFields) => {
  const plainOld = toPlain(oldRow) || {};
  const entries = [];
  for (const [field, newValue] of Object.entries(changedFields || {})) {
    const oldValue = plainOld[field];
    if (valuesEqual(oldValue, newValue)) continue;
    entries.push({
      variantId,
      userId,
      action: "update",
      field,
      oldValue: stringifyValue(oldValue),
      newValue: stringifyValue(newValue),
    });
  }
  if (entries.length > 0) {
    await VariantAuditLog.bulkCreate(entries);
  }
  return entries.length;
};

const logVariantCreate = async (variantId, userId, newRow) => {
  await VariantAuditLog.create({
    variantId,
    userId,
    action: "create",
    field: null,
    oldValue: null,
    newValue: stringifyValue(toPlain(newRow)),
  });
};

const logVariantDelete = async (variantId, userId, oldRow) => {
  await VariantAuditLog.create({
    variantId,
    userId,
    action: "delete",
    field: null,
    oldValue: stringifyValue(toPlain(oldRow)),
    newValue: null,
  });
};

const getVariantAuditLog = async (variantId) => {
  return await VariantAuditLog.findAll({
    where: { variantId },
    include: [{ model: User, attributes: ["id", "name", "surname", "email"] }],
    order: [["createdAt", "DESC"]],
  });
};

module.exports = { logVariantFieldChanges, logVariantCreate, logVariantDelete, getVariantAuditLog };
