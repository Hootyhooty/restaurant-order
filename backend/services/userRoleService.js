const AppError = require('../utils/appError');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const { recordAdminAudit } = require('../utils/auditLog');
const { OPS_ROLES, getEffectiveRoleForCustomerId } = require('./resolvePrincipal');

function normalizeRole(role) {
  const r = String(role || 'USER').trim().toUpperCase();
  if (r === 'USER' || OPS_ROLES.includes(r)) return r;
  throw new AppError('Invalid role.', 400);
}

async function countActiveAdmins(excludeStaffId = null) {
  const filter = { role: 'ADMIN', active: { $ne: false } };
  if (excludeStaffId) filter._id = { $ne: excludeStaffId };
  return Staff.countDocuments(filter);
}

async function findStaffForUser(userId) {
  const byCustomer = await Staff.findOne({ customerId: userId });
  if (byCustomer) return byCustomer;
  return Staff.findById(userId);
}

async function promoteCustomerToOps(customer, role, req) {
  const existing = await Staff.findOne({ customerId: customer._id.toString() });
  if (existing) {
    existing.role = role;
    existing.username = customer.username;
    existing.email = customer.email;
    existing.phone = customer.phone;
    existing.first_name = customer.first_name;
    existing.last_name = customer.last_name;
    existing.password = customer.password;
    existing.$locals.skipPasswordHash = true;
    existing.active = customer.active !== false;
    await existing.save();
    return existing;
  }

  const staff = new Staff({
    customerId: customer._id.toString(),
    username: customer.username,
    email: customer.email,
    phone: customer.phone,
    first_name: customer.first_name,
    last_name: customer.last_name,
    role,
    password: customer.password,
    active: customer.active !== false,
    email_verified: true,
  });
  staff.$locals.skipPasswordHash = true;
  await staff.save();

  if (customer.role !== 'USER') {
    customer.role = 'USER';
    await customer.save();
  }

  await recordAdminAudit(req, {
    action: 'user_role_promote',
    resourceType: 'user',
    resourceId: customer._id.toString(),
    previousStatus: 'USER',
    newStatus: role,
    metadata: { staffId: staff._id.toString(), customerId: customer._id.toString() },
  });

  return staff;
}

async function demoteStaffToUser(staff, req) {
  if (staff.role === 'ADMIN') {
    const adminCount = await countActiveAdmins(staff._id.toString());
    if (adminCount === 0) {
      throw new AppError('Cannot demote the last active admin.', 400);
    }
  }

  const previousRole = staff.role;
  const customerId = staff.customerId || staff._id.toString();
  await Staff.findByIdAndDelete(staff._id);

  await recordAdminAudit(req, {
    action: 'user_role_demote',
    resourceType: 'user',
    resourceId: customerId,
    previousStatus: previousRole,
    newStatus: 'USER',
    metadata: { staffId: staff._id.toString(), customerId },
  });
}

async function changeUserRole({ userId, newRole, actorId, actorCustomerId }, req) {
  const role = normalizeRole(newRole);
  const targetId = String(userId || '').trim();
  if (!targetId) throw new AppError('User id is required.', 400);

  const actorCustId = actorCustomerId ? String(actorCustomerId) : null;
  if (actorId && (actorId.toString() === targetId || (actorCustId && actorCustId === targetId))) {
    throw new AppError('You cannot change your own role.', 400);
  }

  const customer = await Customer.findById(targetId);
  const staff = await findStaffForUser(targetId);
  const currentRole = staff?.role || (customer ? await getEffectiveRoleForCustomerId(customer._id.toString()) : null);

  if (!customer && !staff) {
    throw new AppError('User not found.', 404);
  }

  if (staff && actorId && staff._id.toString() === actorId.toString()) {
    throw new AppError('You cannot change your own role.', 400);
  }

  if (role === currentRole) {
    return { role, customerId: customer?._id?.toString() || staff?.customerId || null, staffId: staff?._id?.toString() || null };
  }

  if (role === 'USER') {
    if (staff) {
      await demoteStaffToUser(staff, req);
    }
    return { role: 'USER', customerId: customer?._id?.toString() || staff?.customerId || null, staffId: null };
  }

  if (!customer) {
    if (!staff) throw new AppError('User not found.', 404);
    if (staff.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await countActiveAdmins(staff._id.toString());
      if (adminCount === 0) throw new AppError('Cannot demote the last active admin.', 400);
    }
    const previousRole = staff.role;
    staff.role = role;
    await staff.save();
    await recordAdminAudit(req, {
      action: 'user_role_change',
      resourceType: 'user',
      resourceId: staff._id.toString(),
      previousStatus: previousRole,
      newStatus: role,
      metadata: { staffId: staff._id.toString(), customerId: staff.customerId || null },
    });
    return { role, customerId: staff.customerId || null, staffId: staff._id.toString() };
  }

  const updatedStaff = await promoteCustomerToOps(customer, role, req);
  if (staff && staff._id.toString() !== updatedStaff._id.toString()) {
    await Staff.findByIdAndDelete(staff._id);
  } else if (staff && staff.role !== role) {
    const previousRole = staff.role;
    staff.role = role;
    await staff.save();
    await recordAdminAudit(req, {
      action: 'user_role_change',
      resourceType: 'user',
      resourceId: customer._id.toString(),
      previousStatus: previousRole,
      newStatus: role,
      metadata: { staffId: staff._id.toString(), customerId: customer._id.toString() },
    });
  }

  return {
    role,
    customerId: customer._id.toString(),
    staffId: updatedStaff._id.toString(),
  };
}

module.exports = {
  normalizeRole,
  changeUserRole,
  promoteCustomerToOps,
  demoteStaffToUser,
  findStaffForUser,
  countActiveAdmins,
};
