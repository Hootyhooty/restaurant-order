/**
 * One-time / idempotent migration: copy ADMIN/STAFF/KITCHEN customers into staffs,
 * then set customer.role = USER.
 *
 * Usage: node backend/scripts/migrateStaffsCollection.js
 * Requires MONGODB_URI (loads backend/.env if present).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');

const LEGACY_OPS_ROLES = ['ADMIN', 'STAFF', 'KITCHEN'];

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri, {
    dbName: 'restaurant_db',
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const legacy = await Customer.find({ role: { $in: LEGACY_OPS_ROLES } });
  const counts = { created: 0, skipped: 0, demoted: 0 };

  for (const customer of legacy) {
    const customerId = customer._id.toString();
    const existing = await Staff.findOne({ customerId });
    if (existing) {
      counts.skipped += 1;
    } else {
      const staff = new Staff({
        customerId,
        username: customer.username,
        email: customer.email,
        phone: customer.phone,
        first_name: customer.first_name,
        last_name: customer.last_name,
        role: customer.role,
        password: customer.password,
        active: customer.active !== false,
        email_verified: true,
      });
      staff.$locals.skipPasswordHash = true;
      await staff.save();
      counts.created += 1;
    }

    if (customer.role !== 'USER') {
      customer.role = 'USER';
      await customer.save({ validateModifiedOnly: true });
      counts.demoted += 1;
    }
  }

  console.log('Migration complete:', counts);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
