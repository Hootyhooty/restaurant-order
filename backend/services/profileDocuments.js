const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const AppError = require('../utils/appError');

const DEFAULT_PHOTO = 'other_img/default.jpg';

async function loadProfileDocuments(principal) {
  if (!principal?._id) {
    throw new AppError('User not found.', 404);
  }

  if (principal.accountType === 'staff') {
    const staff = await Staff.findById(principal._id);
    if (!staff) throw new AppError('User not found.', 404);
    let customer = null;
    if (staff.customerId) {
      customer = await Customer.findById(staff.customerId);
    }
    return { staff, customer, accountType: 'staff' };
  }

  const customer = await Customer.findById(principal._id);
  if (!customer) throw new AppError('User not found.', 404);
  return { staff: null, customer, accountType: 'customer' };
}

function buildProfileUserPayload({ customer, staff, accountType, role }) {
  const profileCustomer = customer || null;
  const profileStaff = staff || null;

  return {
    id: profileCustomer?._id || profileStaff?._id,
    username: profileStaff?.username || profileCustomer?.username,
    email: profileStaff?.email || profileCustomer?.email,
    role: role || profileStaff?.role || 'USER',
    alternate_email: profileCustomer?.alternate_email,
    first_name: profileStaff?.first_name || profileCustomer?.first_name,
    last_name: profileStaff?.last_name || profileCustomer?.last_name,
    photo: profileCustomer?.photo || profileStaff?.photo || DEFAULT_PHOTO,
    phone: profileStaff?.phone || profileCustomer?.phone,
    display_phone: profileCustomer?.display_phone,
    address_line1: profileCustomer?.address_line1,
    address_line2: profileCustomer?.address_line2,
    city: profileCustomer?.city,
    state: profileCustomer?.state,
    zipcode: profileCustomer?.zipcode,
    country: profileCustomer?.country,
    latitude: profileCustomer?.latitude,
    longitude: profileCustomer?.longitude,
    email_verified: profileStaff?.email_verified ?? profileCustomer?.email_verified,
    phone_verified: profileCustomer?.phone_verified,
    profile_slug: profileCustomer?.profile_slug,
    accountType: accountType || (profileStaff ? 'staff' : 'customer'),
    customerId: profileCustomer?._id?.toString() || profileStaff?.customerId || null,
    staffId: profileStaff?._id?.toString() || null,
  };
}

async function applyProfileUpdates({ customer, staff, accountType }, data) {
  const profileCustomer = customer || null;
  const profileStaff = staff || null;

  if (profileCustomer) {
    if (data.first_name !== undefined) profileCustomer.first_name = data.first_name;
    if (data.last_name !== undefined) profileCustomer.last_name = data.last_name;
    if (data.alternate_email !== undefined) profileCustomer.alternate_email = data.alternate_email;
    if (data.address_line1 !== undefined) profileCustomer.address_line1 = data.address_line1;
    if (data.address_line2 !== undefined) profileCustomer.address_line2 = data.address_line2;
    if (data.city !== undefined) profileCustomer.city = data.city;
    if (data.state !== undefined) profileCustomer.state = data.state;
    if (data.zipcode !== undefined) profileCustomer.zipcode = data.zipcode;
    if (data.country !== undefined) profileCustomer.country = data.country;
    if (data.phone !== undefined) profileCustomer.phone = data.phone;
    if (data.display_phone !== undefined) {
      profileCustomer.display_phone = Boolean(data.display_phone);
    }
    if (data.photo !== undefined) profileCustomer.photo = data.photo || DEFAULT_PHOTO;
    if (data.latitude !== undefined) profileCustomer.latitude = data.latitude;
    if (data.longitude !== undefined) profileCustomer.longitude = data.longitude;
    await profileCustomer.save();
  }

  if (profileStaff) {
    if (data.first_name !== undefined) profileStaff.first_name = data.first_name;
    if (data.last_name !== undefined) profileStaff.last_name = data.last_name;
    if (data.phone !== undefined) profileStaff.phone = data.phone;
    if (!profileCustomer && data.photo !== undefined) {
      profileStaff.photo = data.photo || DEFAULT_PHOTO;
    }
    await profileStaff.save();
  } else if (accountType === 'customer' && profileCustomer) {
    // Pure customer — already saved above.
  }

  return buildProfileUserPayload({
    customer: profileCustomer,
    staff: profileStaff,
    accountType,
    role: profileStaff?.role || 'USER',
  });
}

async function resolvePublicProfile(userId) {
  const customer = await Customer.findById(userId).lean();
  if (customer) {
    return {
      id: customer._id,
      username: customer.username,
      first_name: customer.first_name,
      last_name: customer.last_name,
      photo: customer.photo || DEFAULT_PHOTO,
      address_line1: customer.address_line1,
      address_line2: customer.address_line2,
      city: customer.city,
      state: customer.state,
      zipcode: customer.zipcode,
      country: customer.country,
      email_verified: customer.email_verified,
      phone_verified: customer.phone_verified,
      display_phone: customer.display_phone,
    };
  }

  const staff = await Staff.findById(userId).lean();
  if (!staff) return null;

  if (staff.customerId) {
    return resolvePublicProfile(staff.customerId);
  }

  return {
    id: staff._id,
    username: staff.username,
    first_name: staff.first_name,
    last_name: staff.last_name,
    photo: staff.photo || DEFAULT_PHOTO,
    address_line1: undefined,
    address_line2: undefined,
    city: undefined,
    state: undefined,
    zipcode: undefined,
    country: undefined,
    email_verified: staff.email_verified,
    phone_verified: false,
    display_phone: false,
  };
}

function resolveHistoryUserId(principal) {
  if (principal.accountType === 'staff' && principal.customerId) {
    return principal.customerId;
  }
  return principal._id.toString();
}

module.exports = {
  DEFAULT_PHOTO,
  loadProfileDocuments,
  buildProfileUserPayload,
  applyProfileUpdates,
  resolvePublicProfile,
  resolveHistoryUserId,
};
