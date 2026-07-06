const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const { buildProfileUserPayload, DEFAULT_PHOTO } = require('./profileDocuments');

const ALL_ROLES = ['USER', 'ADMIN', 'STAFF', 'KITCHEN'];
const OPS_ROLES = Staff.OPS_ROLES;

function normalizePrincipal(doc, accountType, linkedCustomer = null) {
  if (!doc) return null;

  if (accountType === 'staff') {
    const payload = buildProfileUserPayload({
      customer: linkedCustomer,
      staff: doc,
      accountType: 'staff',
      role: doc.role,
    });
    return {
      _id: doc._id,
      ...payload,
      active: doc.active !== false,
      phone_verified: linkedCustomer?.phone_verified || false,
    };
  }

  return {
    _id: doc._id,
    username: doc.username,
    email: doc.email,
    phone: doc.phone,
    first_name: doc.first_name,
    last_name: doc.last_name,
    photo: doc.photo || DEFAULT_PHOTO,
    role: 'USER',
    active: doc.active !== false && doc.is_active !== false,
    email_verified: doc.email_verified,
    phone_verified: doc.phone_verified,
    address_line1: doc.address_line1,
    address_line2: doc.address_line2,
    city: doc.city,
    state: doc.state,
    zipcode: doc.zipcode,
    country: doc.country,
    latitude: doc.latitude,
    longitude: doc.longitude,
    alternate_email: doc.alternate_email,
    display_phone: doc.display_phone,
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
    if (!staff) return null;
    let linkedCustomer = null;
    if (staff.customerId) {
      linkedCustomer = await Customer.findById(staff.customerId).lean();
    }
    return normalizePrincipal(staff, 'staff', linkedCustomer);
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
