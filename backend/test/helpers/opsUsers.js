const Staff = require('../../models/Staff');
const Customer = require('../../models/Customer');

/**
 * Create a linked staff + customer pair for integration tests.
 */
async function seedOpsUser({
  username,
  email,
  password = 'password12',
  role,
  withCustomer = true,
}) {
  let customer = null;
  if (withCustomer) {
    customer = await Customer.create({
      username,
      email,
      password,
      role: 'USER',
      email_verified: true,
    });
  }

  const staff = await Staff.create({
    customerId: customer?._id?.toString(),
    username,
    email,
    password,
    role,
    email_verified: true,
  });

  return { customer, staff };
}

function staffToken(jwt, staffId) {
  return jwt.sign(
    { id: staffId, accountType: 'staff' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function customerToken(jwt, customerId) {
  return jwt.sign(
    { id: customerId, accountType: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

module.exports = { seedOpsUser, staffToken, customerToken };
