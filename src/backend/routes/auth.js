// src/backend/routes/auth.js
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    console.log('Received registration request:', { username, email, phone });

    if (!username || !email || !password) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await Customer.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('User already exists:', { username, email });
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const customer = new Customer({ username, email, password, phone });
    await customer.save();
    console.log('User saved to database:', customer._id);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Received login request:', { username });

    if (!username || !password) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const customer = await Customer.findOne({ username });
    if (!customer) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log('Login successful, token generated for:', customer._id);
    res.json({ token, user: { id: customer._id, username: customer.username } });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;