// Admin controller - manages users, menu items (meals), and reviews
const path = require('path');
const fs = require('fs');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Meal = require('../models/Meal');
const Souvenir = require('../models/Souvenir');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const AdminAuditLog = require('../models/AdminAuditLog');
const { getLatencySnapshot } = require('../utils/apiLatencyStore');
const { getOpsSnapshot } = require('../utils/opsMetricsStore');
const { evaluateAlerts } = require('../utils/alertRules');
const { warn: logWarn } = require('../utils/logger');
const mealsDataPath = path.join(__dirname, '..', 'data', 'meals.js');
const souvenirsDataPath = path.join(__dirname, '..', 'data', 'souvenirs.js');
const { getMealsData } = require('../utils/mealsData');
const { getSouvenirsData } = require('../utils/souvenirsData');
const { uploadImageBuffer } = require('../utils/cloudinary');
const { changeUserRole, normalizeRole } = require('../services/userRoleService');
const { OPS_ROLES } = require('../services/resolvePrincipal');

// Get users or staff (admin only) — ?audience=customers|staff (default customers)
const getUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const audience = String(req.query.audience || 'customers').toLowerCase();

    if (audience === 'staff') {
      const staffList = await Staff.find({ role: { $in: ['STAFF', 'KITCHEN'] } })
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const linkedCustomerIds = staffList
        .map((s) => s.customerId)
        .filter(Boolean);
      const linkedCustomers = linkedCustomerIds.length
        ? await Customer.find({ _id: { $in: linkedCustomerIds } })
            .select('username email phone first_name last_name active')
            .lean()
        : [];
      const customerById = Object.fromEntries(
        linkedCustomers.map((c) => [c._id.toString(), c]),
      );

      const items = staffList.map((s) => {
        const linked = s.customerId ? customerById[s.customerId] : null;
        return {
          id: s._id,
          profileId: s.customerId || s._id,
          staffId: s._id,
          customerId: s.customerId || null,
          username: s.username || linked?.username,
          email: s.email || linked?.email,
          phone: s.phone || linked?.phone,
          role: s.role,
          accountType: s.customerId ? 'staff-linked' : 'staff-only',
          active: s.active !== false,
          first_name: s.first_name || linked?.first_name,
          last_name: s.last_name || linked?.last_name,
          created_at: s.createdAt,
        };
      });

      return res.json({ success: true, audience: 'staff', items });
    }

    const customers = await Customer.find()
      .select('-password -password_reset_token')
      .sort({ createdAt: -1 })
      .limit(limit * 2);

    const customerIds = customers.map((c) => c._id.toString());
    const linkedStaff = await Staff.find({ customerId: { $in: customerIds } }).lean();
    const staffByCustomerId = Object.fromEntries(
      linkedStaff.map((s) => [s.customerId, s]),
    );

    const items = customers
      .filter((u) => !staffByCustomerId[u._id.toString()])
      .slice(0, limit)
      .map((u) => ({
        id: u._id,
        profileId: u._id,
        username: u.username,
        email: u.email,
        phone: u.phone,
        role: 'USER',
        staffId: null,
        accountType: 'customer',
        active: u.active !== false,
        first_name: u.first_name,
        last_name: u.last_name,
        created_at: u.createdAt,
      }));

    res.json({ success: true, audience: 'customers', items });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle user active status (customer + linked staff)
const toggleUserActive = async (req, res) => {
  try {
    const userId = req.params.userId;
    let customer = await Customer.findById(userId);
    let staff = await Staff.findOne({ customerId: userId });
    if (!customer && !staff) {
      staff = await Staff.findById(userId);
      if (staff?.customerId) {
        customer = await Customer.findById(staff.customerId);
      }
    }
    if (!customer && !staff) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentlyActive = customer
      ? customer.active !== false
      : staff.active !== false;
    const nextActive = !currentlyActive;

    if (customer) {
      customer.active = nextActive;
      await customer.save();
      const linked = staff || await Staff.findOne({ customerId: customer._id.toString() });
      if (linked) {
        linked.active = nextActive;
        await linked.save();
      }
    } else if (staff) {
      staff.active = nextActive;
      await staff.save();
    }

    res.json({ success: true, active: nextActive });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user (customer + linked staff, or standalone staff)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    let customer = await Customer.findById(userId);
    let linkedStaff = await Staff.findOne({ customerId: userId });
    if (!customer && !linkedStaff) {
      linkedStaff = await Staff.findById(userId);
      if (linkedStaff?.customerId) {
        customer = await Customer.findById(linkedStaff.customerId);
      }
    }

    if (!customer && !linkedStaff) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (linkedStaff) await Staff.findByIdAndDelete(linkedStaff._id);
    if (customer) await Customer.findByIdAndDelete(customer._id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create user (admin can create users with any role)
const createUser = async (req, res) => {
  try {
    const { username, email, phone, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }

    const normalizedRole = normalizeRole(role);
    const existingCustomer = await Customer.findOne({ $or: [{ email }, { username }] });
    const existingStaff = await Staff.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existingStaff || (existingCustomer && normalizedRole === 'USER')) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }

    if (normalizedRole === 'USER') {
      const customer = new Customer({
        username,
        email,
        password,
        phone,
        role: 'USER',
        email_verified: true,
      });
      await customer.save();
      return res.status(201).json({
        success: true,
        user: {
          id: customer._id,
          username: customer.username,
          email: customer.email,
          role: 'USER',
        },
      });
    }

    if (existingCustomer) {
      const result = await changeUserRole(
        { userId: existingCustomer._id.toString(), newRole: normalizedRole, actorId: null },
        req,
      );
      return res.status(201).json({
        success: true,
        user: {
          id: existingCustomer._id,
          username: existingCustomer.username,
          email: existingCustomer.email,
          role: result.role,
          staffId: result.staffId,
        },
      });
    }

    const staff = new Staff({
      username,
      email,
      password,
      phone,
      role: normalizedRole,
      email_verified: true,
    });
    await staff.save();

    res.status(201).json({
      success: true,
      user: {
        id: staff._id,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        staffId: staff._id,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/admin/users/:userId/role
const updateUserRole = async (req, res) => {
  try {
    const result = await changeUserRole(
      {
        userId: req.params.userId,
        newRole: req.body?.role,
        actorId: req.user?._id?.toString?.(),
        actorCustomerId: req.user?.customerId || null,
      },
      req,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const appendMealToFile = (meal) => {
  const meals = getMealsData();
  const maxId = Math.max(0, ...meals.map(m => m.id));
  const newId = maxId + 1;
  const escape = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const entry = `  },\n  {\n    id: ${newId},\n    name: '${escape(meal.name)}',\n    description: '${escape(meal.description)}',\n    price: ${meal.price},\n    image: '${escape(meal.image)}',\n    category: '${meal.category}',\n  },\n];`;
  let content = fs.readFileSync(mealsDataPath, 'utf8');
  // Match "  },\n];" - don't use $ as there's more content (function getMealBySlug...) after
  content = content.replace(/ {2}\},\s*\r?\n\];/, entry);
  fs.writeFileSync(mealsDataPath, content);
  return newId;
};

const removeMealFromFile = (mealFileId) => {
  let content = fs.readFileSync(mealsDataPath, 'utf8');
  const blockRegex = new RegExp(`  \\{\\s*id:\\s*${mealFileId},[\\s\\S]*?\\n  \\},\\s*\\n`, 'm');
  content = content.replace(blockRegex, '');
  fs.writeFileSync(mealsDataPath, content);
};

const updateMealInFile = (mealFileId, meal) => {
  const escape = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const newBlock = `  {\n    id: ${mealFileId},\n    name: '${escape(meal.name)}',\n    description: '${escape(meal.description)}',\n    price: ${meal.price},\n    image: '${escape(meal.image)}',\n    category: '${meal.category}',\n  },\n`;
  let content = fs.readFileSync(mealsDataPath, 'utf8');
  const blockRegex = new RegExp(`  \\{\\s*id:\\s*${mealFileId},[\\s\\S]*?\\n  \\},\\s*\\n`, 'm');
  content = content.replace(blockRegex, newBlock);
  fs.writeFileSync(mealsDataPath, content);
};

// Get menu items (from data/meals.js) - attach mongoId for admin-added items (for delete)
const getMenuItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const meals = getMealsData();
    const mealsWithMongo = await Meal.find({ mealFileId: { $in: meals.map(m => m.id) } }).lean();
    const mongoByFileId = Object.fromEntries(mealsWithMongo.map(m => [m.mealFileId, m._id.toString()]));
    const items = meals.slice(0, limit).map(m => ({
      id: m.id,
      mongoId: mongoByFileId[m.id] || null,
      name: m.name,
      description: m.description,
      price: m.price,
      category: m.category,
      image: m.image && m.image.startsWith('/') ? `${req.protocol}://${req.get('host')}${m.image}` : (m.image || ''),
      isPopular: m.isPopular || false
    }));
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete menu item (admin only - removes from DB, meals.js, and deletes image file)
const deleteMenuItem = async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.menuItemId);
    if (!meal) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    const meals = getMealsData();
    const fileMeal = meals.find(m => m.id === meal.mealFileId);
    if (fileMeal && fileMeal.image) {
      // Extract filename from various path formats: /food_img/xxx.jpg, food_img/xxx.jpg, backend/public/food_img/xxx.jpg
      const filename = fileMeal.image.replace(/^\/?food_img[/\\]/, '').replace(/^.*[/\\]food_img[/\\]/, '');
      const filePath = path.join(__dirname, '..', 'public', 'food_img', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    if (meal.mealFileId != null) {
      removeMealFromFile(meal.mealFileId);
    }
    await Meal.findByIdAndDelete(req.params.menuItemId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update menu item (admin only) - updates DB and meals.js
const updateMenuItem = async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.menuItemId);
    if (!meal) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    const { name, description, price, category } = req.body;
    if (!name || price === undefined || price === null || !category) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    }
    const meals = getMealsData();
    const fileMeal = meals.find(m => m.id === meal.mealFileId);
    if (!fileMeal) {
      return res.status(404).json({ success: false, message: 'Menu item not found in meals file' });
    }
    // Existing image URL (may be local /food_img/... or full URL)
    let imageUrl = fileMeal.image || '';
    // If a new file is uploaded, send it to Cloudinary
    if (req.file && req.file.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer, {
        folder: 'restaurant/food',
        public_id: `menu_${meal.mealFileId || 'new'}_${Date.now()}`,
      });
      imageUrl = uploadResult.secure_url;
    }
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }
    updateMealInFile(meal.mealFileId, {
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      category: category.trim(),
      image: imageUrl,
    });
    meal.name = name.trim();
    meal.description = (description || '').trim();
    meal.price = Number(price);
    meal.category = category.trim();
    await meal.save();
    res.json({
      success: true,
      item: {
        id: meal.mealFileId,
        name: meal.name,
        description: meal.description,
        price: meal.price,
        image: imageUrl,
        category: meal.category,
        isPopular: meal.isPopular
      }
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create menu item (admin only) - saves to DB (no image), appends to data/meals.js (with image)
const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    if (!name || price === undefined || price === null || !category) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    // Upload to Cloudinary
    const uploadResult = await uploadImageBuffer(req.file.buffer, {
      folder: 'restaurant/food',
      public_id: `menu_${Date.now()}`,
    });
    const imageUrl = uploadResult.secure_url;
    const mealData = {
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      category: category.trim(),
      image: imageUrl
    };
    const mealFileId = appendMealToFile(mealData);
    const meal = new Meal({
      name: mealData.name,
      description: mealData.description,
      price: mealData.price,
      category: mealData.category,
      isPopular: false,
      mealFileId
    });
    await meal.save();
    res.status(201).json({
      success: true,
      item: {
        id: mealFileId,
        name: meal.name,
        description: meal.description,
        price: meal.price,
        image: imageUrl,
        category: meal.category,
        isPopular: meal.isPopular
      }
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await Customer.countDocuments();
    const activeUsers = await Customer.countDocuments({ active: true });
    const adminUsers = await Staff.countDocuments({ role: 'ADMIN', active: { $ne: false } });
    const totalMenuItems = getMealsData().length;
    const totalSouvenirItems = getSouvenirsData().length;

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        totalMenuItems,
        totalSouvenirItems
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reviews: list menus with review counts (admin only)
// GET /api/admin/review-menus
const getReviewMenus = async (req, res) => {
  try {
    const meals = getMealsData();
    const counts = await Review.aggregate([
      { $group: { _id: '$mealId', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
    ]);
    const byMealId = new Map(counts.map((c) => [Number(c._id), { count: c.count, avgRating: c.avgRating }]));

    const items = meals.map((m) => {
      const stats = byMealId.get(Number(m.id)) || { count: 0, avgRating: null };
      return {
        mealId: Number(m.id),
        name: m.name,
        category: m.category,
        reviewCount: stats.count,
        avgRating: stats.avgRating ? Number(stats.avgRating.toFixed(2)) : null,
      };
    });

    // Sort by most reviewed first, then name
    items.sort((a, b) => (b.reviewCount - a.reviewCount) || a.name.localeCompare(b.name));
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get review menus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reviews: list reviews (optionally filtered by mealId) with pagination/search
// GET /api/admin/reviews?mealId=1&page=1&limit=20&q=...
const getReviews = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const mealId = req.query.mealId != null && req.query.mealId !== '' ? Number(req.query.mealId) : null;
    const q = (req.query.q || '').trim();

    const filter = {};
    if (Number.isFinite(mealId)) filter.mealId = mealId;

    if (q) {
      const maybeRating = Number(q);
      const or = [
        { username: { $regex: q, $options: 'i' } },
        { review: { $regex: q, $options: 'i' } },
      ];
      if (Number.isFinite(maybeRating)) or.push({ rating: maybeRating });
      filter.$or = or;
    }

    const total = await Review.countDocuments(filter);
    const items = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      page,
      limit,
      total,
      items: items.map((r) => ({
        id: r._id,
        mealId: r.mealId,
        mealName: r.mealName || '',
        username: r.username || '',
        review: r.review,
        rating: r.rating,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/reviews/:reviewId
const deleteReview = async (req, res) => {
  try {
    const r = await Review.findByIdAndDelete(req.params.reviewId);
    if (!r) return res.status(404).json({ success: false, message: 'Review not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Transactions: list with pagination/search
// GET /api/admin/transactions?page=1&limit=20&q=...
const getTransactions = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const q = (req.query.q || '').trim();

    const filter = {};
    if (q) {
      const or = [
        { customerEmail: { $regex: q, $options: 'i' } },
        { stripePaymentIntentId: { $regex: q, $options: 'i' } },
        { status: { $regex: q, $options: 'i' } },
      ];

      const maybeAmount = Number(q);
      if (Number.isFinite(maybeAmount)) or.push({ amountTotal: maybeAmount });

      // Allow UUID search for transaction id
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q)) {
        or.push({ _id: q });
      }
      // Allow order ID search (ORD-yyyy-nnnnn)
      if (/^ORD-\d{4}-\d{5}$/i.test(q)) {
        or.push({ orderId: q.toUpperCase() });
      }

      filter.$or = or;
    }

    const total = await Transaction.countDocuments(filter);
    const items = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      page,
      limit,
      total,
      items: items.map((t) => ({
        id: t._id,
        orderId: t.orderId || '',
        customerEmail: t.customerEmail || '',
        amountTotal: t.amountTotal,
        currency: t.currency || 'thb',
        paymentIntentId: t.stripePaymentIntentId || '',
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAnalysis = async (req, res) => {
  try {
    const range = String(req.query.range || 'day').toLowerCase();
    const allowedRanges = new Set(['day', 'week', 'month']);
    const safeRange = allowedRanges.has(range) ? range : 'day';

    const paidTxFilter = { status: 'paid' };
    const paidTx = await Transaction.find(paidTxFilter)
      .select('amountTotal createdAt status')
      .lean();

    const allTx = await Transaction.find({})
      .select('createdAt status')
      .lean();

    const allBookings = await Booking.find({})
      .select('createdAt status amountTotal')
      .lean();

    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rangeStart =
      safeRange === 'day'
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : safeRange === 'week'
        ? startOfWeek
        : startOfMonth;

    const inRange = (d) => new Date(d) >= rangeStart;

    const paymentTotalAll = paidTx.reduce((sum, t) => sum + Number(t.amountTotal || 0), 0);
    const paymentTotalMonth = paidTx
      .filter((t) => new Date(t.createdAt) >= startOfMonth)
      .reduce((sum, t) => sum + Number(t.amountTotal || 0), 0);
    const paymentTotalWeek = paidTx
      .filter((t) => new Date(t.createdAt) >= startOfWeek)
      .reduce((sum, t) => sum + Number(t.amountTotal || 0), 0);

    const txSuccess = allTx.filter((t) => t.status === 'paid').length;
    const txFail = allTx.filter((t) => t.status === 'failed' || t.status === 'canceled').length;
    const txTotal = allTx.length;

    const refundSuccess = allBookings.filter((b) => b.status === 'refunded').length;
    const refundFail = allBookings.filter((b) => b.status === 'refund_pending').length;
    const refundTotal = refundSuccess + refundFail;

    const byDay = new Map();
    for (const t of paidTx.filter((x) => inRange(x.createdAt))) {
      const d = new Date(t.createdAt).toISOString().slice(0, 10);
      byDay.set(d, (byDay.get(d) || 0) + Number(t.amountTotal || 0));
    }
    const paymentSeries = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount: Number(amount.toFixed(2)) }));

    const txSeriesMap = new Map();
    for (const t of allTx.filter((x) => inRange(x.createdAt))) {
      const d = new Date(t.createdAt).toISOString().slice(0, 10);
      if (!txSeriesMap.has(d)) txSeriesMap.set(d, { date: d, total: 0, success: 0, fail: 0 });
      const row = txSeriesMap.get(d);
      row.total += 1;
      if (t.status === 'paid') row.success += 1;
      if (t.status === 'failed' || t.status === 'canceled') row.fail += 1;
    }
    const transactionSeries = [...txSeriesMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    const refundSeriesMap = new Map();
    for (const b of allBookings.filter((x) => inRange(x.createdAt))) {
      if (b.status !== 'refunded' && b.status !== 'refund_pending') continue;
      const d = new Date(b.createdAt).toISOString().slice(0, 10);
      if (!refundSeriesMap.has(d)) refundSeriesMap.set(d, { date: d, total: 0, success: 0, fail: 0 });
      const row = refundSeriesMap.get(d);
      row.total += 1;
      if (b.status === 'refunded') row.success += 1;
      if (b.status === 'refund_pending') row.fail += 1;
    }
    const refundSeries = [...refundSeriesMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    const apiLatency = getLatencySnapshot(safeRange);
    const ops = getOpsSnapshot(safeRange);
    const refundBacklogBookings = await Booking.countDocuments({ status: 'refund_pending' });
    const refundBacklogIntents = await BookingIntent.countDocuments({ status: 'refund_pending' });
    const refundBacklog = refundBacklogBookings + refundBacklogIntents;

    const { alerts, thresholds } = evaluateAlerts({
      bookings: ops.bookings,
      webhooks: ops.webhooks,
      refundBacklog,
      apiLatency,
    });

    for (const alert of alerts) {
      logWarn(
        'alert_active',
        {
          alertId: alert.id,
          severity: alert.severity,
          message: alert.message,
          value: alert.value,
          threshold: alert.threshold,
        },
        req,
      );
    }

    return res.json({
      success: true,
      analysis: {
        range: safeRange,
        payments: {
          totalAllTime: Number(paymentTotalAll.toFixed(2)),
          totalThisMonth: Number(paymentTotalMonth.toFixed(2)),
          totalThisWeek: Number(paymentTotalWeek.toFixed(2)),
          series: paymentSeries,
        },
        transactions: {
          total: txTotal,
          success: txSuccess,
          fail: txFail,
          series: transactionSeries,
        },
        refunds: {
          total: refundTotal,
          success: refundSuccess,
          fail: refundFail,
          series: refundSeries,
        },
        apiLatency,
        ops: {
          ...ops,
          refundBacklog,
          refundBacklogBookings,
          refundBacklogIntents,
        },
        alerts,
        alertThresholds: thresholds,
      },
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load analysis' });
  }
};

// GET /api/admin/audit-logs?page=1&limit=50&bookingId=&action=
const getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const bookingId = String(req.query.bookingId || '').trim();
    const action = String(req.query.action || '').trim();

    const filter = {};
    if (bookingId) filter.bookingId = bookingId;
    if (action) filter.action = action;

    const total = await AdminAuditLog.countDocuments(filter);
    const items = await AdminAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      page,
      limit,
      total,
      items: items.map((row) => ({
        id: row._id,
        adminId: row.adminId,
        adminUsername: row.adminUsername,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        bookingId: row.bookingId,
        requestId: row.requestId,
        previousStatus: row.previousStatus,
        newStatus: row.newStatus,
        metadata: row.metadata || {},
        ip: row.ip,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load audit logs' });
  }
};

// Souvenir CRUD - same pattern as menu: data/souvenirs.js is source of truth, MongoDB links for admin ops
const appendSouvenirToFile = (souvenir) => {
  const souvenirs = getSouvenirsData();
  const maxId = souvenirs.length === 0 ? 0 : Math.max(...souvenirs.map(s => s.id));
  const newId = maxId + 1;
  const escape = (str) => (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const absPath = path.resolve(souvenirsDataPath);
  let content = fs.readFileSync(absPath, 'utf8');
  let newContent;
  if (souvenirs.length === 0) {
    // Directly insert first item - replace empty array "[\n];" or "[];" with content
    const newBlock = `  {\n    id: ${newId},\n    name: '${escape(souvenir.name)}',\n    description: '${escape(souvenir.description)}',\n    price: ${souvenir.price},\n    image: '${escape(souvenir.image)}',\n    category: '${escape(souvenir.category)}',\n  },\n`;
    const arrayStart = content.indexOf('const souvenirs = ');
    if (arrayStart === -1) throw new Error('appendSouvenirToFile: could not find "const souvenirs = "');
    const bracketOpen = content.indexOf('[', arrayStart);
    const bracketClose = content.indexOf('];', bracketOpen);
    if (bracketOpen === -1 || bracketClose === -1) throw new Error('appendSouvenirToFile: could not find array brackets');
    newContent = content.slice(0, bracketOpen + 1) + '\n' + newBlock + content.slice(bracketClose);
  } else {
    const newBlock = `  },\n  {\n    id: ${newId},\n    name: '${escape(souvenir.name)}',\n    description: '${escape(souvenir.description)}',\n    price: ${souvenir.price},\n    image: '${escape(souvenir.image)}',\n    category: '${escape(souvenir.category)}',\n  },\n`;
    content = content.replace(/ {2}\},\s*\r?\n\];/, newBlock + '];');
    newContent = content;
  }
  fs.writeFileSync(absPath, newContent, 'utf8');
  return newId;
};

const removeSouvenirFromFile = (souvenirFileId) => {
  const absPath = path.resolve(souvenirsDataPath);
  let content = fs.readFileSync(absPath, 'utf8');
  const blockRegex = new RegExp(`  \\{\\s*id:\\s*${souvenirFileId},[\\s\\S]*?\\n  \\},\\s*\\n`, 'm');
  content = content.replace(blockRegex, '');
  fs.writeFileSync(absPath, content, 'utf8');
};

const updateSouvenirInFile = (souvenirFileId, souvenir) => {
  const escape = (str) => (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const newBlock = `  {\n    id: ${souvenirFileId},\n    name: '${escape(souvenir.name)}',\n    description: '${escape(souvenir.description)}',\n    price: ${souvenir.price},\n    image: '${escape(souvenir.image)}',\n    category: '${escape(souvenir.category)}',\n  },\n`;
  const absPath = path.resolve(souvenirsDataPath);
  let content = fs.readFileSync(absPath, 'utf8');
  const blockRegex = new RegExp(`  \\{\\s*id:\\s*${souvenirFileId},[\\s\\S]*?\\n  \\},\\s*\\n`, 'm');
  content = content.replace(blockRegex, newBlock);
  fs.writeFileSync(absPath, content, 'utf8');
};

const getSouvenirItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const souvenirs = getSouvenirsData();
    const souvenirsWithMongo = await Souvenir.find({ souvenirFileId: { $in: souvenirs.map(s => s.id) } }).lean();
    const mongoByFileId = Object.fromEntries(souvenirsWithMongo.map(s => [s.souvenirFileId, s._id.toString()]));
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const items = souvenirs.slice(0, limit).map(s => ({
      id: s.id,
      mongoId: mongoByFileId[s.id] || null,
      name: s.name,
      description: s.description || '',
      price: s.price,
      category: s.category || 'souvenir',
      image: s.image && s.image.startsWith('/')
        ? `${baseUrl}${s.image}`
        : (s.image || ''),
    }));
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get souvenir items error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSouvenirItem = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    const uploadResult = await uploadImageBuffer(req.file.buffer, {
      folder: 'restaurant/souvenir',
      public_id: `souvenir_${Date.now()}`,
    });
    const imageUrl = uploadResult.secure_url;
    const souvenirData = {
      name: (name || '').trim(),
      description: (description || '').trim(),
      price: Number(price),
      category: (category || 'souvenir').trim(),
      image: imageUrl,
    };
    const souvenirFileId = appendSouvenirToFile(souvenirData);
    const souvenir = new Souvenir({
      name: souvenirData.name,
      description: souvenirData.description,
      price: souvenirData.price,
      category: souvenirData.category,
      imageFilename: imageUrl,
      souvenirFileId,
    });
    await souvenir.save();
    res.status(201).json({
      success: true,
      item: {
        id: souvenirFileId,
        name: souvenir.name,
        description: souvenir.description,
        price: souvenir.price,
        image: imageUrl,
        category: souvenir.category,
      }
    });
  } catch (error) {
    console.error('Create souvenir error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSouvenirItem = async (req, res) => {
  try {
    const souvenir = await Souvenir.findById(req.params.souvenirItemId);
    if (!souvenir) {
      return res.status(404).json({ success: false, message: 'Souvenir item not found' });
    }
    const { name, description, price, category } = req.body;
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }
    const souvenirs = getSouvenirsData();
    const fileSouvenir = souvenirs.find(s => s.id === souvenir.souvenirFileId);
    if (!fileSouvenir) {
      return res.status(404).json({ success: false, message: 'Souvenir not found in souvenirs file' });
    }
    // Existing image URL (may be local /food_img/... or full URL)
    let imageUrl = fileSouvenir.image || '';
    if (req.file && req.file.buffer) {
      const uploadResult = await uploadImageBuffer(req.file.buffer, {
        folder: 'restaurant/souvenir',
        public_id: `souvenir_${souvenir.souvenirFileId || 'new'}_${Date.now()}`,
      });
      imageUrl = uploadResult.secure_url;
    }
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }
    updateSouvenirInFile(souvenir.souvenirFileId, {
      name: (name || '').trim(),
      description: (description || '').trim(),
      price: Number(price),
      category: (category || 'souvenir').trim(),
      image: imageUrl,
    });
    souvenir.name = (name || '').trim();
    souvenir.description = (description || '').trim();
    souvenir.price = Number(price);
    souvenir.category = (category || 'souvenir').trim();
    souvenir.imageFilename = imageUrl;
    await souvenir.save();
    res.json({
      success: true,
      item: {
        id: souvenir.souvenirFileId,
        name: souvenir.name,
        description: souvenir.description,
        price: souvenir.price,
        image: imageUrl,
        category: souvenir.category,
      }
    });
  } catch (error) {
    console.error('Update souvenir error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSouvenirItem = async (req, res) => {
  try {
    const souvenir = await Souvenir.findById(req.params.souvenirItemId);
    if (!souvenir) {
      return res.status(404).json({ success: false, message: 'Souvenir item not found' });
    }
    const souvenirs = getSouvenirsData();
    const fileSouvenir = souvenirs.find(s => s.id === souvenir.souvenirFileId);
    if (fileSouvenir && fileSouvenir.image) {
      const filename = fileSouvenir.image.replace(/^\/?food_img[/\\]/, '').replace(/^.*[/\\]food_img[/\\]/, '');
      const filePath = path.join(__dirname, '..', 'public', 'food_img', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    removeSouvenirFromFile(souvenir.souvenirFileId);
    await Souvenir.findByIdAndDelete(req.params.souvenirItemId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete souvenir error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  toggleUserActive,
  deleteUser,
  createUser,
  updateUserRole,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getSouvenirItems,
  createSouvenirItem,
  updateSouvenirItem,
  deleteSouvenirItem,
  getDashboardStats,
  getReviewMenus,
  getReviews,
  deleteReview,
  getTransactions,
  getAnalysis,
  getAuditLogs,
};
