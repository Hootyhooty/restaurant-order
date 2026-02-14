// Admin Dashboard - adapted from Python/Flask version to React
import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './AdminDashboard.css';

const MENU_CATEGORIES = [
  { id: 'rice', name: 'Rice' },
  { id: 'sandwich', name: 'Sandwich' },
  { id: 'sides', name: 'Sides' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'desserts', name: 'Desserts' },
];

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('users');
  const [sectionData, setSectionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [addMenuForm, setAddMenuForm] = useState({
    imageFile: null,
    imagePreview: '',
    name: '',
    description: '',
    price: '',
    category: ''
  });
  const [addMenuSubmitting, setAddMenuSubmitting] = useState(false);
  const [addMenuImageError, setAddMenuImageError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    loadDashboardStats();
    loadSection('users');
  }, [user, navigate]);

  const fetchJSON = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    return await res.json();
  };

  const loadDashboardStats = async () => {
    try {
      const data = await fetchJSON('/api/admin/stats');
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadSection = async (section) => {
    setActiveSection(section);
    setLoading(true);
    try {
      if (section === 'users') {
        const data = await fetchJSON('/api/admin/users?limit=100');
        setSectionData(data.items);
      } else if (section === 'menu') {
        const data = await fetchJSON('/api/admin/menu-items?limit=100');
        setSectionData(data.items);
      }
    } catch (error) {
      console.error(`Failed to load ${section}:`, error);
      alert(`Failed to load ${section}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserActive = async (userId) => {
    try {
      const data = await fetchJSON(`/api/admin/users/${userId}/toggle`, { method: 'POST' });
      // Reload users
      loadSection('users');
    } catch (error) {
      alert(`Failed to toggle user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await fetchJSON(`/api/admin/users/${userId}`, { method: 'DELETE' });
      loadSection('users');
    } catch (error) {
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  const handleAddUser = async () => {
    const username = prompt('Username');
    if (!username) return;
    const email = prompt('Email');
    if (!email) return;
    const phone = prompt('Phone (optional)');
    const role = prompt('Role (USER/ADMIN)', 'USER');
    const password = prompt('Password', 'changeme123');

    try {
      await fetchJSON('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, email, phone, role, password })
      });
      loadSection('users');
    } catch (error) {
      alert(`Failed to create user: ${error.message}`);
    }
  };

  const openAddMenuModal = () => {
    setAddMenuForm({ imageFile: null, imagePreview: '', name: '', description: '', price: '', category: '' });
    setAddMenuImageError(false);
    setShowAddMenuModal(true);
  };

  const closeAddMenuModal = () => {
    setShowAddMenuModal(false);
  };

  const handleAddMenuFormChange = (field, value) => {
    setAddMenuForm(prev => ({ ...prev, [field]: value }));
    if (field === 'imagePreview') setAddMenuImageError(false);
  };

  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAddMenuForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      image: ''
    }));
    setAddMenuImageError(false);
    e.target.value = '';
  };

  const handleDeleteMenuItem = async (mongoId) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await fetchJSON(`/api/admin/menu-items/${mongoId}`, { method: 'DELETE' });
      loadSection('menu');
      loadDashboardStats();
    } catch (error) {
      alert(`Failed to delete menu item: ${error.message}`);
    }
  };

  const handleAddMenuSubmit = async (e) => {
    e.preventDefault();
    if (!addMenuForm.name?.trim() || addMenuForm.price === '' || !addMenuForm.category) {
      alert('Name, price, and category are required.');
      return;
    }
    if (!addMenuForm.imageFile) {
      alert('Please select an image for the menu item.');
      return;
    }
    setAddMenuSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', addMenuForm.imageFile);
      formData.append('name', addMenuForm.name.trim());
      formData.append('description', addMenuForm.description.trim());
      formData.append('price', String(addMenuForm.price));
      formData.append('category', addMenuForm.category);

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/menu-items', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      loadSection('menu');
      loadDashboardStats();
      closeAddMenuModal();
    } catch (error) {
      alert(`Failed to add menu item: ${error.message}`);
    } finally {
      setAddMenuSubmitting(false);
    }
  };

  const renderUsersTable = () => {
    if (!sectionData || sectionData.length === 0) {
      return <div className="alert alert-info">No users found.</div>;
    }

    return (
      <div className="table-responsive">
        <table className="table table-bordered table-hover text-center admin-table">
          <thead className="table-dark">
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sectionData.map(u => (
              <tr key={u.id}>
                <td>{u.username || '-'}</td>
                <td>{u.email || '-'}</td>
                <td>{u.phone || '-'}</td>
                <td><span className={`badge ${u.role === 'ADMIN' ? 'bg-danger' : 'bg-secondary'}`}>{u.role}</span></td>
                <td>{u.active ? 'Yes' : 'No'}</td>
                <td>
                  <div className="btn-group btn-group-sm">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => handleToggleUserActive(u.id)}
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMenuTable = () => {
    if (!sectionData || sectionData.length === 0) {
      return <div className="alert alert-info">No menu items found.</div>;
    }

    return (
      <div className="table-responsive">
        <table className="table table-bordered table-hover admin-table admin-menu-table">
          <thead className="table-dark">
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Category</th>
              <th className="admin-menu-center">Popular</th>
              <th className="admin-menu-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {sectionData.map(m => (
              <tr key={m.id}>
                <td>
                  <img src={m.image} alt={m.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                </td>
                <td>{m.name}</td>
                <td>{m.description}</td>
                <td>฿{m.price}</td>
                <td>{m.category}</td>
                <td className="admin-menu-center">{m.isPopular ? 'Yes' : 'No'}</td>
                <td className="admin-menu-center">
                  {m.mongoId ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm admin-menu-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteMenuItem(m.mongoId); }}
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <section className="admin-dashboard">
      <div className="container-fluid">
        <div className="row">
          {/* Top Bar: navigation + stats + logout */}
          <div className="col-12">
            <div className="admin-topbar">
              <button
                className={`admin-topbar-link ${activeSection === 'users' ? 'active' : ''}`}
                onClick={() => loadSection('users')}
              >
                Users
              </button>
              <span className="admin-topbar-separator">|</span>
              <button
                className={`admin-topbar-link ${activeSection === 'menu' ? 'active' : ''}`}
                onClick={() => loadSection('menu')}
              >
                Menu
              </button>
              {stats && (
                <>
                  <span className="admin-topbar-separator">|</span>
                  <span className="admin-topbar-stat">Total Users: {stats.totalUsers}</span>
                  <span className="admin-topbar-separator">|</span>
                  <span className="admin-topbar-stat">Active Users: {stats.activeUsers}</span>
                  <span className="admin-topbar-separator">|</span>
                  <span className="admin-topbar-stat">Menu Items: {stats.totalMenuItems}</span>
                </>
              )}
              <span className="admin-topbar-separator">|</span>
              <button
                className="admin-topbar-link admin-topbar-logout"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Logout
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-12">
            {/* Admin Info */}
            {user && (
              <div className="admin-info mb-4">
                <div className="d-flex align-items-center">
                  <div className="admin-avatar">
                    <img src={user.photo || '/other_img/default.jpg'} alt="Admin" />
                  </div>
                  <div>
                    <div><strong>Username:</strong> {user.username}</div>
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><span className="badge bg-danger">ADMIN</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Section Header */}
            <div className="section-header">
              <h4>{activeSection === 'users' ? 'Users' : 'Menu Items'}</h4>
              {activeSection === 'users' && (
                <button className="btn btn-primary" onClick={handleAddUser}>
                  Add User
                </button>
              )}
              {activeSection === 'menu' && (
                <button className="btn btn-primary" onClick={openAddMenuModal}>
                  Add Menu
                </button>
              )}
            </div>

            {/* Section Body */}
            <div className="section-body">
              {loading ? (
                <div className="alert alert-info">Loading...</div>
              ) : activeSection === 'users' ? (
                renderUsersTable()
              ) : (
                renderMenuTable()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Menu Modal */}
      {showAddMenuModal && (
        <div className="admin-modal-overlay" onClick={closeAddMenuModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5>Add Menu Item</h5>
              <button type="button" className="admin-modal-close" onClick={closeAddMenuModal} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={handleAddMenuSubmit} className="admin-modal-body">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageFileSelect}
              />
              <div
                className="admin-add-menu-image-area"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                {addMenuForm.imagePreview && !addMenuImageError ? (
                  <img
                    src={addMenuForm.imagePreview}
                    alt="Preview"
                    onError={() => setAddMenuImageError(true)}
                  />
                ) : (
                  <span>Click to choose image</span>
                )}
              </div>
              <div className="admin-add-menu-field">
                <label>Name:</label>
                <input
                  type="text"
                  value={addMenuForm.name}
                  onChange={e => handleAddMenuFormChange('name', e.target.value)}
                  placeholder="Menu item name"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Description:</label>
                <textarea
                  value={addMenuForm.description}
                  onChange={e => handleAddMenuFormChange('description', e.target.value)}
                  placeholder="Description"
                  rows={3}
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Price:</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addMenuForm.price}
                  onChange={e => handleAddMenuFormChange('price', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Category:</label>
                <select
                  value={addMenuForm.category}
                  onChange={e => handleAddMenuFormChange('category', e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {MENU_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeAddMenuModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addMenuSubmitting}>
                  {addMenuSubmitting ? 'Adding...' : 'Add Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
