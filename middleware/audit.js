const AuditLog = require('../models/AuditLog');

async function logAction({ action, userId, resourceType, resourceId, details }) {
  try {
    await AuditLog.create({ action, userId, resourceType, resourceId, details });
  } catch (err) {
    console.error('Audit log error', err);
  }
}

module.exports = { logAction };
