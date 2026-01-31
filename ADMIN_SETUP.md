# Admin Dashboard Implementation

## Overview
A complete admin dashboard has been implemented, adapted from your Python/Flask project to React + Node.js/Express. The system includes role-based authentication and admin-specific routes.

## What Was Implemented

### 1. Backend Changes

#### **Database Model** (Already had role field)
- `src/backend/models/Customer.js`
  - Role field already exists: `USER` or `ADMIN`
  - Active status field for enabling/disabling accounts

#### **Middleware**
- `src/backend/middleware/auth.js`
  - `rolesRequired('ADMIN')` middleware already exists
  - Checks JWT token and verifies user role

#### **Admin Controller** (NEW)
- `src/backend/controllers/adminController.js`
  - `getUsers()` - List all users with pagination
  - `toggleUserActive()` - Enable/disable user accounts
  - `deleteUser()` - Delete users
  - `createUser()` - Create new users (admin can set role)
  - `getMenuItems()` - List menu items from shared meals data
  - `getDashboardStats()` - Get statistics (total users, active users, admins, menu items)

#### **Admin Routes** (NEW)
- `src/backend/routes/adminRoutes.js`
  - `GET /api/admin/stats` - Dashboard statistics
  - `GET /api/admin/users` - List users
  - `POST /api/admin/users` - Create user
  - `POST /api/admin/users/:userId/toggle` - Toggle active status
  - `DELETE /api/admin/users/:userId` - Delete user
  - `GET /api/admin/menu-items` - List menu items

All admin routes are protected by `rolesRequired('ADMIN')` middleware.

#### **Auth Route Updates**
- `src/backend/routes/auth.js`
  - Updated login response to include `role` field so frontend knows if user is admin

### 2. Frontend Changes

#### **AdminDashboard Component** (NEW)
- `src/components/AdminDashboard.jsx`
- `src/components/AdminDashboard.css`

Features:
- **Stats Cards**: Shows total users, active users, admin users, and menu items
- **User Management**:
  - View all users in a table
  - Toggle user active/inactive status
  - Delete users
  - Create new users (with role selection)
- **Menu Items View**: Display all menu items from the meals data
- **Sidebar Navigation**: Switch between Users and Menu sections
- **Admin Profile Card**: Shows logged-in admin's username and email

#### **Login Redirect Logic**
- `src/components/Login.jsx`
  - After successful login, checks user role
  - Admins are redirected to `/admin`
  - Regular users go to `/menu` (or their intended destination)

#### **AuthContext Updates**
- `src/context/AuthContext.jsx`
  - Login function now returns user data (including role)
  - User object stored in context includes role field

#### **App Route**
- `src/App.jsx`
  - Added `/admin` route that renders `AdminDashboard` component

## How to Use

### Creating an Admin User

Since you don't have a UI to create the first admin, you need to manually set a user's role in the database:

**Option 1: Using MongoDB Compass or mongo shell**
```javascript
db.customers.updateOne(
  { username: "yourusername" },
  { $set: { role: "ADMIN" } }
)
```

**Option 2: Using Mongoose/Node.js script**
```javascript
const Customer = require('./src/backend/models/Customer');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/restaurant_db');

Customer.findOneAndUpdate(
  { username: 'yourusername' },
  { role: 'ADMIN' },
  { new: true }
).then(user => {
  console.log('User updated:', user);
  process.exit();
});
```

**Option 3: Register a new user and manually update in DB**
1. Register normally through the app
2. Update the role in MongoDB as shown above

### Testing the Admin Dashboard

1. Make sure your backend is running:
   ```bash
   cd src/backend
   npm start
   ```

2. Make sure your frontend is running:
   ```bash
   npm run dev
   ```

3. Create or update a user to have `ADMIN` role (see above)

4. Login with the admin credentials

5. You should be automatically redirected to `/admin`

6. You'll see:
   - Stats cards at the top
   - Sidebar with Users and Menu Items sections
   - User management table with:
     - View all users
     - Activate/Deactivate toggle
     - Delete button
     - Add User button (creates new users)

### Admin Features

**User Management:**
- View list of all users
- See username, email, phone, role, and active status
- Toggle active/inactive (deactivated users can't login)
- Delete users permanently
- Create new users (can assign ADMIN or USER role)

**Menu Items:**
- View all menu items from the system
- See image, name, description, price, category, and popularity status

**Stats Dashboard:**
- Total number of users
- Number of active users
- Number of admin users
- Total menu items

## Architecture

The implementation follows your previous Python/Flask pattern but adapted for React + Express:

**Python/Flask → React/Express**
- `@roles_required('admin')` decorator → `rolesRequired('ADMIN')` middleware
- Flask templates → React components with state management
- Jinja2 templating → JSX with dynamic rendering
- Python dict serialization → JavaScript object/JSON
- Flask sessions → JWT tokens in localStorage
- MongoDB ODM (mongoengine) → MongoDB with Mongoose

## Files Created/Modified

**Created:**
- `src/backend/controllers/adminController.js`
- `src/backend/routes/adminRoutes.js`
- `src/components/AdminDashboard.jsx`
- `src/components/AdminDashboard.css`

**Modified:**
- `src/backend/index.js` - Added admin routes
- `src/backend/routes/auth.js` - Include role in login response
- `src/components/Login.jsx` - Redirect admins to /admin
- `src/context/AuthContext.jsx` - Return user data from login
- `src/App.jsx` - Added /admin route

## Security Notes

- All admin API routes are protected by `rolesRequired('ADMIN')` middleware
- Middleware verifies JWT token and checks user role
- Non-admin users get 403 Forbidden if they try to access admin routes
- Frontend also checks role before rendering admin UI (double security)
- Deactivated users cannot login even with valid credentials

## Next Steps (Optional Enhancements)

From your Python project, these features could be added later:
- **Email System**: Send emails to users from admin panel
- **Logs Viewer**: View application logs (INFO, WARNING, ERROR)
- **Reviews Management**: Toggle public/private status, delete reviews
- **Orders Management**: View and manage customer orders
- **Sales Logs**: Track and view sales transactions

These weren't implemented yet since the current project doesn't have orders/reviews/logging systems yet.
