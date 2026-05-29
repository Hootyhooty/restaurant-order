const AdminAuditLog = require('../models/AdminAuditLog');
const { info } = require('./logger');

const getClientIp = (req) => {
  if (!req) return undefined;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip;
};

/**
 * Persist an admin or system audit entry (booking actions, refund reconciliation).
 */
async function recordAdminAudit(req, {
  action,
  resourceType = 'booking',
  resourceId,
  bookingId,
  previousStatus,
  newStatus,
  metadata = {},
  actorId,
  actorUsername,
}) {
  const admin = req?.user;
  const adminId = admin?._id?.toString() || actorId || 'system';
  const adminUsername = admin?.username || actorUsername || (adminId === 'system' ? 'system' : 'unknown');

  const doc = await AdminAuditLog.create({
    adminId,
    adminUsername,
    action,
    resourceType,
    resourceId: resourceId || bookingId,
    bookingId,
    requestId: req?.requestId,
    previousStatus,
    newStatus,
    metadata,
    ip: getClientIp(req),
  });

  info(
    'admin_audit',
    {
      auditId: doc._id,
      action,
      adminId,
      adminUsername,
      bookingId: bookingId || resourceId,
      previousStatus,
      newStatus,
    },
    req,
  );

  return doc;
}

module.exports = {
  recordAdminAudit,
};
