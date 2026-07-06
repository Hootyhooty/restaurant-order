const Customer = require('../models/Customer');
const Staff = require('../models/Staff');

const ALL_ROLES = ['USER', 'ADMIN', 'STAFF', 'KITCHEN'];
const OPS_ROLES = Staff.OPS_ROLES;

function normalizePrincipal(doc, accountType) {
  if (!doc) return null;

  if (accountType === 'staff') {
    return {
      _id: doc._id,
      username: doc.username,
      email: doc.email,
      phone: doc.phone,
      first_name: doc.first_name,
      last_name: doc.last_name,
      photo: 'other_img/default.jpg',
      role: doc.role,
      active: doc.active !== false,
      email_verified: doc.email_verified !== false,
      phone_verified: false,
      accountType: 'staff',
      customerId: doc.customerId || null,
      staffId: doc._id.toString(),
    };
  }

  return {
    _id: doc._id,
    username: doc.username,
    email: doc.email,
    phone: doc.phone,
    first_name: doc.first_name,
    last_name: doc.last_name,
    photo: doc.photo,
    role: 'USER',
    active: doc.active !== false && doc.is_active !== false,
    email_verified: doc.email_verified,
    phone_verified: doc.phone_verified,
    address_line1: doc.address_line1,
    city: doc.city,
    state: doc.state,
    zipcode: doc.zipcode,
    accountType: 'customer',
    customerId: doc._id.toString(),
    staffId: null,
  };
}

async function findStaffByLogin(usernameOrEmail) {
  const value = String(usernameOrEmail || '').trim();
  if (!value) return null;
  const isEmail = value.includes('@');
  return Staff.findOne(
    isEmail ? { email: value.toLowerCase() } : { username: value },
  );
}

async function findCustomerByLogin(usernameOrEmail) {
  const value = String(usernameOrEmail || '').trim();
  if (!value) return null;
  const isEmail = value.includes('@');
  return Customer.findOne(
    isEmail ? { email: value.toLowerCase() } : { username: value },
  );
}

async function resolvePrincipalById(id, accountType) {
  if (!id) return null;
  if (accountType === 'staff') {
    const staff = await Staff.findById(id);
    return normalizePrincipal(staff, 'staff');
  }
  const customer = await Customer.findById(id);
  return normalizePrincipal(customer, 'customer');
}

async function resolvePrincipalFromToken(decoded) {
  const id = decoded?.user_id || decoded?.id;
  if (!id) return null;

  if (decoded.accountType === 'staff') {
    return resolvePrincipalById(id, 'staff');
  }
  if (decoded.accountType === 'customer') {
    return resolvePrincipalById(id, 'customer');
  }

  // Legacy tokens: staff id first, then customer
  const staffPrincipal = await resolvePrincipalById(id, 'staff');
  if (staffPrincipal) return staffPrincipal;
  return resolvePrincipalById(id, 'customer');
}

async function getEffectiveRoleForCustomerId(customerId) {
  const staff = await Staff.findOne({ customerId }).lean();
  return staff?.role || 'USER';
}

module.exports = {
  ALL_ROLES,
  OPS_ROLES,
  normalizePrincipal,
  findStaffByLogin,
  findCustomerByLogin,
  resolvePrincipalById,
  resolvePrincipalFromToken,
  getEffectiveRoleForCustomerId,
};
