// Admin Dashboard - adapted from Python/Flask version to React
import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE, DEFAULT_AVATAR } from '../apiConfig';
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
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reviewMenus, setReviewMenus] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState('');
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showEditMenuModal, setShowEditMenuModal] = useState(false);
  const [addMenuForm, setAddMenuForm] = useState({
    imageFile: null,
    imagePreview: '',
    name: '',
    description: '',
    price: '',
    category: ''
  });
  const [editMenuForm, setEditMenuForm] = useState({
    imageFile: null,
    imagePreview: '',
    name: '',
    description: '',
    price: '',
    category: ''
  });
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [addMenuSubmitting, setAddMenuSubmitting] = useState(false);
  const [editMenuSubmitting, setEditMenuSubmitting] = useState(false);
  const [addMenuImageError, setAddMenuImageError] = useState(false);
  const [editMenuImageError, setEditMenuImageError] = useState(false);
  const [sendMessageTarget, setSendMessageTarget] = useState(null);
  const [sendMessageSubject, setSendMessageSubject] = useState('');
  const [sendMessageBody, setSendMessageBody] = useState('');
  const [sendMessageSubmitting, setSendMessageSubmitting] = useState(false);
  const [showAddSouvenirModal, setShowAddSouvenirModal] = useState(false);
  const [showEditSouvenirModal, setShowEditSouvenirModal] = useState(false);
  const [addSouvenirForm, setAddSouvenirForm] = useState({
    imageFile: null,
    imagePreview: '',
    name: '',
    description: '',
    price: '',
    category: 'souvenir'
  });
  const [editSouvenirForm, setEditSouvenirForm] = useState({
    imageFile: null,
    imagePreview: '',
    name: '',
    description: '',
    price: '',
    category: 'souvenir'
  });
  const [editingSouvenirItem, setEditingSouvenirItem] = useState(null);
  const [addSouvenirSubmitting, setAddSouvenirSubmitting] = useState(false);
  const [editSouvenirSubmitting, setEditSouvenirSubmitting] = useState(false);
  const [addSouvenirImageError, setAddSouvenirImageError] = useState(false);
  const [editSouvenirImageError, setEditSouvenirImageError] = useState(false);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const souvenirFileInputRef = useRef(null);
  const souvenirEditFileInputRef = useRef(null);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    loadDashboardStats();
    loadSection('users');
  }, [user, navigate]);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fetchJSON = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${url}`, {
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

  const loadSection = async (section, options = {}) => {
    const { initialMealId } = options;
    setActiveSection(section);
    setLoading(true);
    setQuery('');
    setPage(1);
    setTotal(0);
    try {
      if (section === 'users') {
        const data = await fetchJSON('/api/admin/users?limit=100');
        setSectionData(data.items);
        setTotal(data.items?.length || 0);
      } else if (section === 'menu') {
        const data = await fetchJSON('/api/admin/menu-items?limit=100');
        setSectionData(data.items);
        setTotal(data.items?.length || 0);
      } else if (section === 'reviews') {
        const menus = await fetchJSON('/api/admin/review-menus');
        setReviewMenus(menus.items || []);
        setSectionData([]);
        if (initialMealId != null) {
          setSelectedMealId(String(initialMealId));
          await loadReviews({ mealId: initialMealId, q: '', nextPage: 1 });
        } else {
          setSelectedMealId('');
        }
      } else if (section === 'transactions') {
        const data = await fetchJSON('/api/admin/transactions?page=1&limit=20');
        setSectionData(data.items || []);
        setTotal(data.total || 0);
      } else if (section === 'souvenir') {
        const data = await fetchJSON('/api/admin/souvenir-items?limit=100');
        setSectionData(data.items || []);
        setTotal(data.items?.length || 0);
      }
    } catch (error) {
      console.error(`Failed to load ${section}:`, error);
      alert(`Failed to load ${section}: ${error.message}`);
    } finally {
      setLoading(false);
    }
    scrollToTop();
  };

  const loadReviews = async ({ mealId = selectedMealId, q = query, nextPage = page } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', '20');
      if (mealId) params.set('mealId', String(mealId));
      if (q) params.set('q', q);
      const data = await fetchJSON(`/api/admin/reviews?${params.toString()}`);
      setSectionData(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      alert(`Failed to load reviews: ${error.message}`);
    } finally {
      setLoading(false);
    }
    scrollToTop();
  };

  const loadTransactions = async ({ q = query, nextPage = page } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', '20');
      if (q) params.set('q', q);
      const data = await fetchJSON(`/api/admin/transactions?${params.toString()}`);
      setSectionData(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      alert(`Failed to load transactions: ${error.message}`);
    } finally {
      setLoading(false);
    }
    scrollToTop();
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await fetchJSON(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
      loadReviews({ nextPage: 1 });
    } catch (error) {
      alert(`Failed to delete review: ${error.message}`);
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

  const openEditMenuModal = (m) => {
    setEditingMenuItem(m);
    setEditMenuForm({
      imageFile: null,
      imagePreview: m.image || '',
      name: m.name || '',
      description: m.description || '',
      price: m.price ?? '',
      category: m.category || ''
    });
    setEditMenuImageError(false);
    setShowEditMenuModal(true);
  };

  const closeEditMenuModal = () => {
    setShowEditMenuModal(false);
    setEditingMenuItem(null);
  };

  const handleEditMenuFormChange = (field, value) => {
    setEditMenuForm(prev => ({ ...prev, [field]: value }));
    if (field === 'imagePreview') setEditMenuImageError(false);
  };

  const handleEditImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setEditMenuForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      image: ''
    }));
    setEditMenuImageError(false);
    e.target.value = '';
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

  const openAddSouvenirModal = () => {
    setAddSouvenirForm({ imageFile: null, imagePreview: '', name: '', description: '', price: '', category: 'souvenir' });
    setAddSouvenirImageError(false);
    setShowAddSouvenirModal(true);
  };

  const closeAddSouvenirModal = () => setShowAddSouvenirModal(false);

  const openEditSouvenirModal = (s) => {
    setEditingSouvenirItem(s);
    setEditSouvenirForm({
      imageFile: null,
      imagePreview: s.image || '',
      name: s.name || '',
      description: s.description || '',
      price: s.price ?? '',
      category: s.category || 'souvenir'
    });
    setEditSouvenirImageError(false);
    setShowEditSouvenirModal(true);
  };

  const closeEditSouvenirModal = () => {
    setShowEditSouvenirModal(false);
    setEditingSouvenirItem(null);
  };

  const handleAddSouvenirFormChange = (field, value) => {
    setAddSouvenirForm(prev => ({ ...prev, [field]: value }));
    if (field === 'imagePreview') setAddSouvenirImageError(false);
  };

  const handleEditSouvenirFormChange = (field, value) => {
    setEditSouvenirForm(prev => ({ ...prev, [field]: value }));
    if (field === 'imagePreview') setEditSouvenirImageError(false);
  };

  const handleSouvenirImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAddSouvenirForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
    setAddSouvenirImageError(false);
    e.target.value = '';
  };

  const handleEditSouvenirImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setEditSouvenirForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
    setEditSouvenirImageError(false);
    e.target.value = '';
  };

  const handleAddSouvenirSubmit = async (e) => {
    e.preventDefault();
    if (!addSouvenirForm.name?.trim() || addSouvenirForm.price === '') {
      alert('Name and price are required.');
      return;
    }
    if (!addSouvenirForm.imageFile) {
      alert('Please select an image for the souvenir item.');
      return;
    }
    setAddSouvenirSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', addSouvenirForm.imageFile);
      formData.append('name', addSouvenirForm.name.trim());
      formData.append('description', addSouvenirForm.description.trim());
      formData.append('price', String(addSouvenirForm.price));
      formData.append('category', addSouvenirForm.category || 'souvenir');

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/souvenir-items`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      loadSection('souvenir');
      loadDashboardStats();
      closeAddSouvenirModal();
    } catch (error) {
      alert(`Failed to add souvenir item: ${error.message}`);
    } finally {
      setAddSouvenirSubmitting(false);
    }
  };

  const handleEditSouvenirSubmit = async (e) => {
    e.preventDefault();
    if (!editingSouvenirItem?.mongoId) return;
    if (!editSouvenirForm.name?.trim() || editSouvenirForm.price === '') {
      alert('Name and price are required.');
      return;
    }
    setEditSouvenirSubmitting(true);
    try {
      const formData = new FormData();
      if (editSouvenirForm.imageFile) formData.append('image', editSouvenirForm.imageFile);
      formData.append('name', editSouvenirForm.name.trim());
      formData.append('description', editSouvenirForm.description.trim());
      formData.append('price', String(editSouvenirForm.price));
      formData.append('category', editSouvenirForm.category || 'souvenir');

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/souvenir-items/${editingSouvenirItem.mongoId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      loadSection('souvenir');
      loadDashboardStats();
      closeEditSouvenirModal();
    } catch (error) {
      alert(`Failed to update souvenir item: ${error.message}`);
    } finally {
      setEditSouvenirSubmitting(false);
    }
  };

  const handleDeleteSouvenirItem = async (mongoId) => {
    if (!window.confirm('Delete this souvenir item?')) return;
    try {
      await fetchJSON(`/api/admin/souvenir-items/${mongoId}`, { method: 'DELETE' });
      loadSection('souvenir');
      loadDashboardStats();
    } catch (error) {
      alert(`Failed to delete souvenir item: ${error.message}`);
    }
  };

  const handleOpenReviewsForMenu = async (menuItem) => {
    await loadSection('reviews', { initialMealId: menuItem.id });
  };

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!sendMessageTarget?.id || !sendMessageSubject?.trim() || !sendMessageBody?.trim()) return;
    setSendMessageSubmitting(true);
    try {
      await fetchJSON('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: sendMessageTarget.id,
          subject: sendMessageSubject.trim(),
          body: sendMessageBody.trim(),
        }),
      });
      setSendMessageTarget(null);
      setSendMessageSubject('');
      setSendMessageBody('');
    } catch (error) {
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setSendMessageSubmitting(false);
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
      const res = await fetch(`${API_BASE}/api/admin/menu-items`, {
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

  const handleEditMenuSubmit = async (e) => {
    e.preventDefault();
    if (!editingMenuItem?.mongoId) return;
    if (!editMenuForm.name?.trim() || editMenuForm.price === '' || !editMenuForm.category) {
      alert('Name, price, and category are required.');
      return;
    }
    setEditMenuSubmitting(true);
    try {
      const formData = new FormData();
      if (editMenuForm.imageFile) formData.append('image', editMenuForm.imageFile);
      formData.append('name', editMenuForm.name.trim());
      formData.append('description', editMenuForm.description.trim());
      formData.append('price', String(editMenuForm.price));
      formData.append('category', editMenuForm.category);

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/menu-items/${editingMenuItem.mongoId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      loadSection('menu');
      loadDashboardStats();
      closeEditMenuModal();
    } catch (error) {
      alert(`Failed to update menu item: ${error.message}`);
    } finally {
      setEditMenuSubmitting(false);
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
                <td>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => navigate(`/profile/${u.id}`)}
                  >
                    {u.username || '-'}
                  </button>
                </td>
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
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setSendMessageTarget(u);
                        setSendMessageSubject('');
                        setSendMessageBody('');
                      }}
                    >
                      Send Message
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
              <th className="admin-menu-center">Review</th>
              <th className="admin-menu-center">Popular</th>
              <th className="admin-menu-center">Edit</th>
              <th className="admin-menu-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {sectionData.map(m => (
              <tr key={m.id}>
                <td>
                  <img src={m.image} alt={m.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => {
                      const slug = m.name.replace(/\s+/g, '_');
                      navigate(`/review/${slug}`);
                    }}
                  >
                    {m.name}
                  </button>
                </td>
                <td>{m.description}</td>
                <td>฿{m.price}</td>
                <td>{m.category}</td>
                    <td className="admin-menu-center">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handleOpenReviewsForMenu(m)}
                      >
                        Review
                      </button>
                    </td>
                <td className="admin-menu-center">{m.isPopular ? 'Yes' : 'No'}</td>
                <td className="admin-menu-center">
                  {m.mongoId ? (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm admin-menu-edit-btn"
                      onClick={(e) => { e.stopPropagation(); openEditMenuModal(m); }}
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
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

  const renderSouvenirTable = () => {
    if (!sectionData || sectionData.length === 0) {
      return <div className="alert alert-info">No souvenir items found.</div>;
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
              <th className="admin-menu-center">View</th>
              <th className="admin-menu-center">Edit</th>
              <th className="admin-menu-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {sectionData.map(s => (
              <tr key={s.id}>
                <td>
                  <img src={s.image} alt={s.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => navigate('/store')}
                  >
                    {s.name}
                  </button>
                </td>
                <td>{s.description}</td>
                <td>฿{s.price}</td>
                <td>{s.category}</td>
                <td className="admin-menu-center">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => navigate('/store')}
                  >
                    View
                  </button>
                </td>
                <td className="admin-menu-center">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={(e) => { e.stopPropagation(); openEditSouvenirModal(s); }}
                  >
                    Edit
                  </button>
                </td>
                <td className="admin-menu-center">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSouvenirItem(s.mongoId); }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReviewsSection = () => {
    const selected = reviewMenus.find((m) => String(m.mealId) === String(selectedMealId));
    return (
      <div>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label"><strong>Menu</strong></label>
            <select
              className="form-select"
              value={selectedMealId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMealId(val);
                setPage(1);
                setQuery('');
                if (val) loadReviews({ mealId: val, q: '', nextPage: 1 });
                else setSectionData([]);
              }}
            >
              <option value="">Select a menu item…</option>
              {reviewMenus.map((m) => (
                <option key={m.mealId} value={m.mealId}>
                  {m.name} ({m.reviewCount})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label"><strong>Search</strong></label>
            <input
              className="form-control"
              placeholder="Username, review text, rating…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!selectedMealId}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end gap-2">
            <button
              className="btn btn-primary w-100"
              disabled={!selectedMealId}
              onClick={() => loadReviews({ nextPage: 1 })}
            >
              Search
            </button>
          </div>
        </div>

        {selected && (
          <div className="alert alert-light">
            <strong>{selected.name}</strong> — Reviews: {selected.reviewCount}{' '}
            {selected.avgRating != null ? `(avg ${selected.avgRating})` : ''}
          </div>
        )}

        {!selectedMealId ? (
          <div className="alert alert-info">Select a menu item to view its reviews.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover admin-table admin-reviews-table">
              <thead className="table-dark">
                <tr>
                  <th>Username</th>
                  <th>Review</th>
                  <th className="admin-menu-center">Rating</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                  <th className="admin-menu-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {(sectionData || []).length === 0 ? (
                  <tr><td colSpan={6} className="text-center">No reviews found.</td></tr>
                ) : (
                  sectionData.map((r) => (
                    <tr key={r.id}>
                      <td>{r.username || '-'}</td>
                      <td style={{ maxWidth: 360 }}>{r.review}</td>
                      <td className="admin-menu-center">{r.rating}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                      <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td>
                      <td className="admin-menu-center">
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteReview(r.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedMealId && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">Total: {total}</div>
            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => loadReviews({ nextPage: page - 1 })}
              >
                Prev
              </button>
              <button className="btn btn-outline-secondary btn-sm" disabled>
                Page {page}
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page * 20 >= total || loading}
                onClick={() => loadReviews({ nextPage: page + 1 })}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransactionsSection = () => {
    return (
      <div>
        <div className="row g-3 mb-3">
          <div className="col-md-9">
            <label className="form-label"><strong>Search</strong></label>
            <input
              className="form-control"
              placeholder="Order ID (ORD-yyyy-nnnnn), email, amount, paymentIntentId, status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button className="btn btn-primary w-100" onClick={() => loadTransactions({ nextPage: 1 })}>
              Search
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered table-hover admin-table">
            <thead className="table-dark">
              <tr>
                <th>Order ID</th>
                <th>Customer Email</th>
                <th>Amount</th>
                <th>paymentIntentId</th>
                <th>Status</th>
                <th>CreatedAt</th>
                <th>UpdatedAt</th>
              </tr>
            </thead>
            <tbody>
              {(sectionData || []).length === 0 ? (
                <tr><td colSpan={7} className="text-center">No transactions found.</td></tr>
              ) : (
                sectionData.map((t) => (
                  <tr key={t.id}>
                    <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>{t.orderId || t.id}</td>
                    <td>{t.customerEmail || '-'}</td>
                    <td>{t.amountTotal} {String(t.currency || '').toUpperCase()}</td>
                    <td style={{ maxWidth: 240, wordBreak: 'break-all' }}>{t.paymentIntentId || '-'}</td>
                    <td>{t.status}</td>
                    <td>{t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</td>
                    <td>{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted">Total: {total}</div>
          <div className="btn-group">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => loadTransactions({ nextPage: page - 1 })}
            >
              Prev
            </button>
            <button className="btn btn-outline-secondary btn-sm" disabled>
              Page {page}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page * 20 >= total || loading}
              onClick={() => loadTransactions({ nextPage: page + 1 })}
            >
              Next
            </button>
          </div>
        </div>
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
              <span className="admin-topbar-separator">|</span>
              <button
                className={`admin-topbar-link ${activeSection === 'souvenir' ? 'active' : ''}`}
                onClick={() => loadSection('souvenir')}
              >
                Souvenir
              </button>
              <span className="admin-topbar-separator">|</span>
              <button
                className={`admin-topbar-link ${activeSection === 'transactions' ? 'active' : ''}`}
                onClick={() => loadSection('transactions')}
              >
                Transactions
              </button>
              {stats && (
                <>
                  <span className="admin-topbar-separator">|</span>
                  <span className="admin-topbar-stat">Total Users: {stats.totalUsers}</span>
                  <span className="admin-topbar-separator">|</span>
                  <span className="admin-topbar-stat">Active Users: {stats.activeUsers}</span>
                  <span className="admin-topbar-separator">|</span>
                  <span className="admin-topbar-stat">Menu Items: {stats.totalMenuItems}</span>
                  <span className="admin-topbar-separator">|</span>
                  <span className="admin-topbar-stat">Souvenirs: {stats.totalSouvenirItems ?? 0}</span>
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
                    <img
                      src={
                        !user.photo || user.photo.trim() === '' || user.photo === 'other_img/default.jpg' || user.photo === 'default.jpg'
                          ? DEFAULT_AVATAR
                          : user.photo.startsWith('http')
                          ? user.photo
                          : `${API_BASE}/api/users/uploads/${user.photo}`
                      }
                      alt="Admin"
                    />
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
              <h4>
                {activeSection === 'users'
                  ? 'Users'
                  : activeSection === 'menu'
                  ? 'Menu Items'
                  : activeSection === 'souvenir'
                  ? 'Souvenir Items'
                  : activeSection === 'reviews'
                  ? 'User Reviews'
                  : 'Transactions'}
              </h4>
              {activeSection === 'users' && (
                <button className="btn btn-primary" onClick={handleAddUser}>
                  Add User
                </button>
              )}
              {activeSection === 'menu' && (
                <>
                  <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/menu')}>
                    View All Menu Items
                  </button>
                  <button className="btn btn-primary" onClick={openAddMenuModal}>
                    Add Menu
                  </button>
                </>
              )}
              {activeSection === 'souvenir' && (
                <>
                  <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/store')}>
                    View All Souvenir Items
                  </button>
                  <button className="btn btn-primary" onClick={openAddSouvenirModal}>
                    Add Souvenir
                  </button>
                </>
              )}
            </div>

            {/* Section Body */}
            <div className="section-body">
              {loading ? (
                <div className="alert alert-info">Loading...</div>
              ) : activeSection === 'users' ? (
                renderUsersTable()
              ) : activeSection === 'menu' ? (
                renderMenuTable()
              ) : activeSection === 'souvenir' ? (
                renderSouvenirTable()
              ) : activeSection === 'reviews' ? (
                renderReviewsSection()
              ) : (
                renderTransactionsSection()
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

      {/* Edit Menu Modal */}
      {showEditMenuModal && editingMenuItem && (
        <div className="admin-modal-overlay" onClick={closeEditMenuModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5>Edit Menu Item</h5>
              <button type="button" className="admin-modal-close" onClick={closeEditMenuModal} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={handleEditMenuSubmit} className="admin-modal-body">
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleEditImageFileSelect}
              />
              <div
                className="admin-add-menu-image-area"
                onClick={() => editFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && editFileInputRef.current?.click()}
              >
                {editMenuForm.imagePreview && !editMenuImageError ? (
                  <img
                    src={editMenuForm.imagePreview}
                    alt="Preview"
                    onError={() => setEditMenuImageError(true)}
                  />
                ) : (
                  <span>Click to change image</span>
                )}
              </div>
              <div className="admin-add-menu-field">
                <label>Name:</label>
                <input
                  type="text"
                  value={editMenuForm.name}
                  onChange={e => handleEditMenuFormChange('name', e.target.value)}
                  placeholder="Menu item name"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Description:</label>
                <textarea
                  value={editMenuForm.description}
                  onChange={e => handleEditMenuFormChange('description', e.target.value)}
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
                  value={editMenuForm.price}
                  onChange={e => handleEditMenuFormChange('price', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Category:</label>
                <select
                  value={editMenuForm.category}
                  onChange={e => handleEditMenuFormChange('category', e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {MENU_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeEditMenuModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editMenuSubmitting}>
                  {editMenuSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Souvenir Modal */}
      {showAddSouvenirModal && (
        <div className="admin-modal-overlay" onClick={closeAddSouvenirModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5>Add Souvenir Item</h5>
              <button type="button" className="admin-modal-close" onClick={closeAddSouvenirModal} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={handleAddSouvenirSubmit} className="admin-modal-body">
              <input
                ref={souvenirFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleSouvenirImageFileSelect}
              />
              <div
                className="admin-add-menu-image-area"
                onClick={() => souvenirFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && souvenirFileInputRef.current?.click()}
              >
                {addSouvenirForm.imagePreview && !addSouvenirImageError ? (
                  <img
                    src={addSouvenirForm.imagePreview}
                    alt="Preview"
                    onError={() => setAddSouvenirImageError(true)}
                  />
                ) : (
                  <span>Click to choose image</span>
                )}
              </div>
              <div className="admin-add-menu-field">
                <label>Name:</label>
                <input
                  type="text"
                  value={addSouvenirForm.name}
                  onChange={e => handleAddSouvenirFormChange('name', e.target.value)}
                  placeholder="Souvenir item name"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Description:</label>
                <textarea
                  value={addSouvenirForm.description}
                  onChange={e => handleAddSouvenirFormChange('description', e.target.value)}
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
                  value={addSouvenirForm.price}
                  onChange={e => handleAddSouvenirFormChange('price', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Category:</label>
                <input
                  type="text"
                  value={addSouvenirForm.category}
                  onChange={e => handleAddSouvenirFormChange('category', e.target.value)}
                  placeholder="souvenir"
                />
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeAddSouvenirModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addSouvenirSubmitting}>
                  {addSouvenirSubmitting ? 'Adding...' : 'Add Souvenir Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Souvenir Modal */}
      {showEditSouvenirModal && editingSouvenirItem && (
        <div className="admin-modal-overlay" onClick={closeEditSouvenirModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5>Edit Souvenir Item</h5>
              <button type="button" className="admin-modal-close" onClick={closeEditSouvenirModal} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={handleEditSouvenirSubmit} className="admin-modal-body">
              <input
                ref={souvenirEditFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleEditSouvenirImageFileSelect}
              />
              <div
                className="admin-add-menu-image-area"
                onClick={() => souvenirEditFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && souvenirEditFileInputRef.current?.click()}
              >
                {editSouvenirForm.imagePreview && !editSouvenirImageError ? (
                  <img
                    src={editSouvenirForm.imagePreview}
                    alt="Preview"
                    onError={() => setEditSouvenirImageError(true)}
                  />
                ) : (
                  <span>Click to change image</span>
                )}
              </div>
              <div className="admin-add-menu-field">
                <label>Name:</label>
                <input
                  type="text"
                  value={editSouvenirForm.name}
                  onChange={e => handleEditSouvenirFormChange('name', e.target.value)}
                  placeholder="Souvenir item name"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Description:</label>
                <textarea
                  value={editSouvenirForm.description}
                  onChange={e => handleEditSouvenirFormChange('description', e.target.value)}
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
                  value={editSouvenirForm.price}
                  onChange={e => handleEditSouvenirFormChange('price', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Category:</label>
                <input
                  type="text"
                  value={editSouvenirForm.category}
                  onChange={e => handleEditSouvenirFormChange('category', e.target.value)}
                  placeholder="souvenir"
                />
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeEditSouvenirModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editSouvenirSubmitting}>
                  {editSouvenirSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {sendMessageTarget && (
        <div className="admin-modal-overlay" onClick={() => !sendMessageSubmitting && setSendMessageTarget(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5>Send Message to {sendMessageTarget.username || 'User'}</h5>
              <button type="button" className="admin-modal-close" onClick={() => !sendMessageSubmitting && setSendMessageTarget(null)} aria-label="Close">&times;</button>
            </div>
            <form onSubmit={handleSendMessageSubmit} className="admin-modal-body">
              <div className="admin-add-menu-field">
                <label>Subject:</label>
                <input
                  type="text"
                  value={sendMessageSubject}
                  onChange={e => setSendMessageSubject(e.target.value)}
                  placeholder="Message subject"
                  required
                  maxLength={200}
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Message:</label>
                <textarea
                  value={sendMessageBody}
                  onChange={e => setSendMessageBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={5}
                  required
                  maxLength={5000}
                />
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => !sendMessageSubmitting && setSendMessageTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sendMessageSubmitting}>
                  {sendMessageSubmitting ? 'Sending...' : 'Send Message'}
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
