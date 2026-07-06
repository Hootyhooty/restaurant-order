const Staff = require('../models/Staff');

/**
 * Resolve an admin actor id for system messages and notifications.
 * Prefers linked customerId when the admin staff row is tied to a customer.
 */
async function getAdminActorId() {
  const admin = await Staff.findOne({ role: 'ADMIN', active: { $ne: false } })
    .sort({ createdAt: 1 })
    .select('_id customerId')
    .lean();
  if (!admin) return null;
  return admin.customerId || admin._id.toString();
}

module.exports = { getAdminActorId };
