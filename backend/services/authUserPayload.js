function buildAuthUserPayload(principal) {
  if (!principal) return null;

  const base = {
    id: principal._id,
    username: principal.username,
    email: principal.email,
    phone: principal.phone,
    first_name: principal.first_name,
    last_name: principal.last_name,
    photo: principal.photo,
    role: principal.role,
    email_verified: principal.email_verified,
    phone_verified: principal.phone_verified,
    accountType: principal.accountType,
    customerId: principal.customerId,
    staffId: principal.staffId,
  };

  if (principal.accountType === 'customer') {
    return {
      ...base,
      address_line1: principal.address_line1,
      city: principal.city,
      state: principal.state,
      zipcode: principal.zipcode,
    };
  }

  return base;
}

module.exports = {
  buildAuthUserPayload,
};
