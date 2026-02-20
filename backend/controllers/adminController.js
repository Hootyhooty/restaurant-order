// Admin controller - manages users, menu items (meals), and reviews
const path = require('path');
const fs = require('fs');
const Customer = require('../models/Customer');
const Meal = require('../models/Meal');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const mealsDataPath = path.join(__dirname, '..', 'data', 'meals.js');
const { getMealsData } = require('../utils/mealsData');

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const users = await Customer.find()
      .select('-password -password_reset_token')
      .sort({ createdAt: -1 })
      .limit(limit);

    const serialized = users.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role || 'USER',
      active: u.active !== false,
      first_name: u.first_name,
      last_name: u.last_name,
      created_at: u.createdAt
    }));

    res.json({ success: true, items: serialized });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle user active status
const toggleUserActive = async (req, res) => {
  try {
    const user = await Customer.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.active = !user.active;
    await user.save();

    res.json({ success: true, active: user.active });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await Customer.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

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

    const existingUser = await Customer.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }

    const customer = new Customer({
      username,
      email,
      password,
      phone,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER'
    });

    await customer.save();

    res.status(201).json({
      success: true,
      user: {
        id: customer._id,
        username: customer.username,
        email: customer.email,
        role: customer.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const appendMealToFile = (meal) => {
  const meals = getMealsData();
  const maxId = Math.max(0, ...meals.map(m => m.id));
  const newId = maxId + 1;
  const escape = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const entry = `  },\n  {\n    id: ${newId},\n    name: '${escape(meal.name)}',\n    description: '${escape(meal.description)}',\n    price: ${meal.price},\n    image: '/food_img/${meal.imageFilename}',\n    category: '${meal.category}',\n  },\n];`;
  let content = fs.readFileSync(mealsDataPath, 'utf8');
  // Match "  },\n];" - don't use $ as there's more content (function getMealBySlug...) after
  content = content.replace(/  \},\s*\r?\n\];/, entry);
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
  const newBlock = `  {\n    id: ${mealFileId},\n    name: '${escape(meal.name)}',\n    description: '${escape(meal.description)}',\n    price: ${meal.price},\n    image: '/food_img/${meal.imageFilename}',\n    category: '${meal.category}',\n  },\n`;
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
    let imageFilename = null;
    if (req.file) {
      imageFilename = req.file.filename;
      if (fileMeal.image) {
        const oldFilename = fileMeal.image.replace(/^\/?food_img[/\\]/, '').replace(/^.*[/\\]food_img[/\\]/, '');
        const oldPath = path.join(__dirname, '..', 'public', 'food_img', oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } else if (fileMeal.image) {
      imageFilename = fileMeal.image.replace(/^\/?food_img[/\\]/, '').replace(/^.*[/\\]food_img[/\\]/, '');
    } else {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }
    updateMealInFile(meal.mealFileId, {
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      category: category.trim(),
      imageFilename
    });
    meal.name = name.trim();
    meal.description = (description || '').trim();
    meal.price = Number(price);
    meal.category = category.trim();
    await meal.save();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      success: true,
      item: {
        id: meal.mealFileId,
        name: meal.name,
        description: meal.description,
        price: meal.price,
        image: `${baseUrl}/food_img/${imageFilename}`,
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
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    const imageFilename = req.file.filename;
    const mealData = {
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      category: category.trim(),
      imageFilename
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
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      success: true,
      item: {
        id: mealFileId,
        name: meal.name,
        description: meal.description,
        price: meal.price,
        image: `${baseUrl}/food_img/${imageFilename}`,
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
    const adminUsers = await Customer.countDocuments({ role: 'ADMIN' });
    const totalMenuItems = getMealsData().length;

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        totalMenuItems
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

module.exports = {
  getUsers,
  toggleUserActive,
  deleteUser,
  createUser,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getDashboardStats,
  getReviewMenus,
  getReviews,
  deleteReview,
  getTransactions,
};
