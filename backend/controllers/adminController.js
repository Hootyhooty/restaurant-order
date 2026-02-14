// Admin controller - manages users, menu items (meals), and reviews
const Customer = require('../models/Customer');
const Meal = require('../models/Meal');
const { meals } = require('../data/meals');

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const users = await Customer.find()
      .select('-password -password_reset_token')
      .sort({ createdAt: -1 })
      .limit(limit);

    const serialized = users.map(u => ({
      id: u._id.toString(),
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
        id: customer._id.toString(),
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

// Get menu items (static meals + DB meals)
const getMenuItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const staticItems = meals.slice(0, limit).map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: m.price,
      category: m.category,
      image: m.image,
      isPopular: m.isPopular || false
    }));
    const dbMeals = await Meal.find().sort({ createdAt: -1 }).limit(limit);
    const dbItems = dbMeals.map(m => ({
      id: m._id.toString(),
      name: m.name,
      description: m.description || '',
      price: m.price,
      category: m.category,
      image: m.image || '',
      isPopular: m.isPopular || false
    }));
    const items = [...staticItems, ...dbItems];
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete menu item (admin only - DB meals only)
const deleteMenuItem = async (req, res) => {
  try {
    const meal = await Meal.findByIdAndDelete(req.params.menuItemId);
    if (!meal) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create menu item (admin only)
const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;
    if (!name || price === undefined || price === null || !category) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    }
    const meal = new Meal({
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      image: (image || '').trim(),
      category: category.trim(),
      isPopular: false
    });
    await meal.save();
    res.status(201).json({
      success: true,
      item: {
        id: meal._id.toString(),
        name: meal.name,
        description: meal.description,
        price: meal.price,
        image: meal.image,
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
    const totalMenuItems = meals.length + (await Meal.countDocuments());

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

module.exports = {
  getUsers,
  toggleUserActive,
  deleteUser,
  createUser,
  getMenuItems,
  createMenuItem,
  deleteMenuItem,
  getDashboardStats
};
