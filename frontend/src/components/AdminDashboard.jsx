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
  const [usersAudience, setUsersAudience] = useState('customers');
  const [sectionData, setSectionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [analysisRange, setAnalysisRange] = useState('day');
  const [auditBookingFilter, setAuditBookingFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
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
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'USER',
  });
  const [addUserSubmitting, setAddUserSubmitting] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
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

  const loadUsersSection = async (audience = usersAudience) => {
    setLoading(true);
    try {
      const data = await fetchJSON(`/api/admin/users?limit=100&audience=${encodeURIComponent(audience)}`);
      setUsersAudience(audience);
      setSectionData(data.items);
      setTotal(data.items?.length || 0);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
    scrollToTop();
  };

  const switchUsersAudience = (audience) => {
    if (audience === usersAudience && activeSection === 'users' && sectionData) return;
    setUsersAudience(audience);
    loadUsersSection(audience);
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
        const data = await fetchJSON(`/api/admin/users?limit=100&audience=${encodeURIComponent(usersAudience)}`);
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
      } else if (section === 'booking') {
        const data = await fetchJSON('/api/admin/bookings?page=1&limit=20');
        setSectionData(data.items || []);
        setTotal(data.total || 0);
      } else if (section === 'analysis') {
        const data = await fetchJSON(`/api/admin/analysis?range=${encodeURIComponent(analysisRange)}`);
        setSectionData(data.analysis || null);
        setTotal(0);
      } else if (section === 'audit') {
        await loadAuditLogs({ nextPage: 1, bookingId: '', action: '' });
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

  const loadAuditLogs = async ({
    bookingId = auditBookingFilter,
    action = auditActionFilter,
    nextPage = page,
  } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '50',
      });
      if (bookingId) params.set('bookingId', bookingId);
      if (action) params.set('action', action);
      const data = await fetchJSON(`/api/admin/audit-logs?${params.toString()}`);
      setSectionData(data.items || []);
      setPage(data.page || nextPage);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      alert(`Failed to load audit logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async ({ q = query, nextPage = page } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', '20');
      if (q) params.set('q', q);
      const data = await fetchJSON(`/api/admin/bookings?${params.toString()}`);
      setSectionData(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      alert(`Failed to load bookings: ${error.message}`);
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
      loadUsersSection(usersAudience);
    } catch (error) {
      alert(`Failed to toggle user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await fetchJSON(`/api/admin/users/${userId}`, { method: 'DELETE' });
      loadUsersSection(usersAudience);
    } catch (error) {
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  const handleAddUser = async (e) => {
    e?.preventDefault?.();
    const { username, email, phone, password, role } = addUserForm;
    if (!username?.trim() || !email?.trim() || !password) {
      alert('Username, email, and password are required.');
      return;
    }

    setAddUserSubmitting(true);
    try {
      await fetchJSON('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, email, phone, role, password }),
      });
      setShowAddUserModal(false);
      const defaultRole = usersAudience === 'staff' ? 'STAFF' : 'USER';
      setAddUserForm({ username: '', email: '', phone: '', password: '', role: defaultRole });
      const reloadAudience = role === 'USER' ? 'customers' : 'staff';
      if (reloadAudience !== usersAudience) {
        setUsersAudience(reloadAudience);
      }
      loadUsersSection(reloadAudience);
    } catch (error) {
      alert(`Failed to create user: ${error.message}`);
    } finally {
      setAddUserSubmitting(false);
    }
  };

  const handleRoleChange = async (userRow, newRole) => {
    if (!userRow || newRole === userRow.role) return;
    if (!window.confirm(`Change ${userRow.username}'s role to ${newRole}?`)) return;

    setRoleUpdatingId(userRow.id);
    try {
      await fetchJSON(`/api/admin/users/${userRow.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      const reloadAudience = newRole === 'USER' ? 'customers' : 'staff';
      if (reloadAudience !== usersAudience) {
        setUsersAudience(reloadAudience);
      }
      loadUsersSection(reloadAudience);
    } catch (error) {
      alert(`Failed to update role: ${error.message}`);
    } finally {
      setRoleUpdatingId(null);
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

  const renderUsersSection = () => (
    <>
      <div className="admin-users-subtabs">
        <button
          type="button"
          className={`admin-users-subtab ${usersAudience === 'customers' ? 'active' : ''}`}
          onClick={() => switchUsersAudience('customers')}
        >
          User
        </button>
        <button
          type="button"
          className={`admin-users-subtab ${usersAudience === 'staff' ? 'active' : ''}`}
          onClick={() => switchUsersAudience('staff')}
        >
          Staffs
        </button>
      </div>
      {usersAudience === 'staff' ? renderStaffTable() : renderCustomersTable()}
    </>
  );

  const renderCustomersTable = () => {
    if (!sectionData || sectionData.length === 0) {
      return <div className="alert alert-info">No customer accounts found.</div>;
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
            {sectionData.map((u) => (
              <tr key={u.id}>
                <td>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => navigate(`/profile/${u.profileId || u.id}`)}
                  >
                    {u.username || '-'}
                  </button>
                </td>
                <td>{u.email || '-'}</td>
                <td>{u.phone || '-'}</td>
                <td>
                  <select
                    className="form-select form-select-sm admin-role-select"
                    value={u.role || 'USER'}
                    disabled={roleUpdatingId === u.id}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                  >
                    <option value="USER">USER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="KITCHEN">KITCHEN</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
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

  const renderStaffTable = () => {
    if (!sectionData || sectionData.length === 0) {
      return <div className="alert alert-info">No staff accounts found.</div>;
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
              <th>Account</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sectionData.map((u) => (
              <tr key={u.id}>
                <td>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => navigate(`/profile/${u.profileId || u.id}`)}
                  >
                    {u.username || '-'}
                  </button>
                </td>
                <td>{u.email || '-'}</td>
                <td>{u.phone || '-'}</td>
                <td>
                  <select
                    className="form-select form-select-sm admin-role-select"
                    value={u.role || 'STAFF'}
                    disabled={roleUpdatingId === u.id}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                  >
                    <option value="USER">USER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="KITCHEN">KITCHEN</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>
                  <span className="badge bg-secondary">
                    {u.accountType === 'staff-linked' ? 'Linked customer' : 'Staff only'}
                  </span>
                </td>
                <td>{u.active ? 'Yes' : 'No'}</td>
                <td>
                  <div className="btn-group btn-group-sm">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => handleToggleUserActive(u.id)}
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                    {u.customerId && (
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => {
                          setSendMessageTarget({ ...u, id: u.customerId });
                          setSendMessageSubject('');
                          setSendMessageBody('');
                        }}
                      >
                        Send Message
                      </button>
                    )}
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

  const openAddUserModal = () => {
    const defaultRole = usersAudience === 'staff' ? 'STAFF' : 'USER';
    setAddUserForm({ username: '', email: '', phone: '', password: '', role: defaultRole });
    setShowAddUserModal(true);
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

  const bookingAction = async (bookingId, action) => {
    if (!bookingId) return;
    const label = action === 'check-in' ? 'Check In' : action === 'no-show' ? 'No show' : 'Cancel';
    if (!window.confirm(`${label} this booking?`)) return;
    try {
      await fetchJSON(`/api/admin/bookings/${bookingId}/${action}`, { method: 'POST' });
      loadBookings({ nextPage: 1, q: query });
    } catch (error) {
      alert(`Failed: ${error.message}`);
    }
  };

  const renderAuditSection = () => {
    const items = sectionData || [];
    return (
      <div className="audit-layout">
        <div className="row g-2 mb-3">
          <div className="col-md-5">
            <input
              className="form-control"
              placeholder="Filter by booking ID (UUID)"
              value={auditBookingFilter}
              onChange={(e) => setAuditBookingFilter(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Filter by action (e.g. booking.no_show)"
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-primary w-100"
              onClick={() => loadAuditLogs({ nextPage: 1 })}
            >
              Search
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-bordered table-hover admin-table">
            <thead className="table-dark">
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Booking</th>
                <th>Status change</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">No audit entries found.</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                    <td>{row.adminUsername || row.adminId}</td>
                    <td><code>{row.action}</code></td>
                    <td style={{ fontSize: '12px' }}>{row.bookingId || row.resourceId || '—'}</td>
                    <td>
                      {row.previousStatus || '—'} → {row.newStatus || '—'}
                    </td>
                    <td style={{ fontSize: '12px', textAlign: 'left' }}>
                      {row.metadata && Object.keys(row.metadata).length > 0
                        ? JSON.stringify(row.metadata)
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => loadAuditLogs({ nextPage: page - 1 })}
          >
            Previous
          </button>
          <span className="text-muted small">Page {page} · {total} entries</span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={page * 50 >= total}
            onClick={() => loadAuditLogs({ nextPage: page + 1 })}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderBookingSection = () => {
    return (
      <div>
        <div className="row g-3 mb-3">
          <div className="col-md-9">
            <label className="form-label"><strong>Search</strong></label>
            <input
              className="form-control"
              placeholder="bookingId, userId, date, time slot, table, guests, status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button className="btn btn-primary w-100" onClick={() => loadBookings({ nextPage: 1 })}>
              Search
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered table-hover admin-table">
            <thead className="table-dark">
              <tr>
                <th>Booking ID</th>
                <th>User ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Table</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(sectionData || []).length === 0 ? (
                <tr><td colSpan={9} className="text-center">No bookings found.</td></tr>
              ) : (
                sectionData.map((b) => (
                  <tr key={b.id}>
                    <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>{b.id}</td>
                    <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>{b.userId}</td>
                    <td>{b.date}</td>
                    <td>{String(b.timeSlot || '').replace('-', '–')}</td>
                    <td>{b.tableId}</td>
                    <td>{b.guestCount}</td>
                    <td>{b.status}</td>
                    <td>{b.amountTotal != null ? `฿${Number(b.amountTotal).toLocaleString()}` : '—'}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-success"
                          disabled={b.status !== 'confirmed'}
                          onClick={() => bookingAction(b.id, 'check-in')}
                        >
                          Check In
                        </button>
                        <button
                          className="btn btn-outline-warning"
                          disabled={b.status !== 'confirmed'}
                          onClick={() => bookingAction(b.id, 'no-show')}
                        >
                          No show
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          disabled={b.status !== 'confirmed'}
                          onClick={() => bookingAction(b.id, 'cancel')}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
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
              onClick={() => loadBookings({ nextPage: page - 1 })}
            >
              Prev
            </button>
            <button className="btn btn-outline-secondary btn-sm" disabled>
              Page {page}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page * 20 >= total || loading}
              onClick={() => loadBookings({ nextPage: page + 1 })}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  const buildSparklinePoints = (values, width = 260, height = 80) => {
    if (!Array.isArray(values) || values.length === 0) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
      .map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const renderSparkline = (values, color = '#c0892f') => {
    const points = buildSparklinePoints(values);
    if (!points) {
      return <div className="analysis-empty">No data</div>;
    }
    return (
      <svg viewBox="0 0 260 80" className="analysis-sparkline">
        <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
      </svg>
    );
  };

  const renderAnalysisSection = () => {
    const analysis = sectionData || {};
    const payments = analysis.payments || {};
    const transactions = analysis.transactions || {};
    const refunds = analysis.refunds || {};
    const latency = analysis.apiLatency || {};
    const ops = analysis.ops || {};
    const bookings = ops.bookings || {};
    const webhooks = ops.webhooks || {};
    const alerts = Array.isArray(analysis.alerts) ? analysis.alerts : [];

    const paymentVals = (payments.series || []).map((x) => Number(x.amount || 0));
    const txVals = (transactions.series || []).map((x) => Number(x.total || 0));
    const refundVals = (refunds.series || []).map((x) => Number(x.total || 0));
    const latencyVals = [latency.p50, latency.p75, latency.p90, latency.p95].filter((n) => Number.isFinite(n));

    return (
      <div className="analysis-layout">
        <div className="analysis-tab-header">
          <div className="analysis-current-tab">Analysis</div>
          <select
            className="form-select analysis-range-select"
            value={analysisRange}
            onChange={async (e) => {
              const next = e.target.value;
              setAnalysisRange(next);
              try {
                setLoading(true);
                const data = await fetchJSON(`/api/admin/analysis?range=${encodeURIComponent(next)}`);
                setSectionData(data.analysis || null);
              } catch (error) {
                alert(`Failed to reload analysis: ${error.message}`);
              } finally {
                setLoading(false);
              }
            }}
            title="Aggregation range"
          >
            <option value="day">day</option>
            <option value="week">week</option>
            <option value="month">month</option>
          </select>
        </div>

        <div className="analysis-grid">
          <div className="analysis-card">
            <h6>Payments</h6>
            {renderSparkline(paymentVals, '#198754')}
            <div className="analysis-meta">
              <div>Total (all time): ฿{Number(payments.totalAllTime || 0).toLocaleString()}</div>
              <div>This month: ฿{Number(payments.totalThisMonth || 0).toLocaleString()}</div>
              <div>This week: ฿{Number(payments.totalThisWeek || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="analysis-card">
            <h6>Transactions</h6>
            {renderSparkline(txVals, '#0d6efd')}
            <div className="analysis-meta">
              <div>Total: {transactions.total || 0}</div>
              <div>Success: {transactions.success || 0}</div>
              <div>Fail: {transactions.fail || 0}</div>
            </div>
          </div>

          <div className="analysis-card">
            <h6>Refund</h6>
            {renderSparkline(refundVals, '#fd7e14')}
            <div className="analysis-meta">
              <div>Total: {refunds.total || 0}</div>
              <div>Success: {refunds.success || 0}</div>
              <div>Fail: {refunds.fail || 0}</div>
            </div>
          </div>

          <div className="analysis-card">
            <h6>API Latency (ms)</h6>
            {renderSparkline(latencyVals, '#6f42c1')}
            <div className="analysis-meta">
              <div>p50: {Number(latency.p50 || 0).toLocaleString()}</div>
              <div>p75: {Number(latency.p75 || 0).toLocaleString()}</div>
              <div>p90: {Number(latency.p90 || 0).toLocaleString()}</div>
              <div>p95: {Number(latency.p95 || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="analysis-card">
            <h6>Booking Checkout</h6>
            {renderSparkline(
              [bookings.attempts, bookings.success, bookings.fail, bookings.conflict].filter((n) =>
                Number.isFinite(n),
              ),
              '#20c997',
            )}
            <div className="analysis-meta">
              <div>Attempts: {bookings.attempts || 0}</div>
              <div>Success: {bookings.success || 0} ({bookings.successRatePct || 0}%)</div>
              <div>Fail: {bookings.fail || 0} ({bookings.failRatePct || 0}%)</div>
              <div>Conflict: {bookings.conflict || 0} ({bookings.conflictRatePct || 0}%)</div>
            </div>
          </div>

          <div className="analysis-card">
            <h6>Webhooks</h6>
            {renderSparkline([webhooks.p50, webhooks.p95, webhooks.p99].filter((n) => Number.isFinite(n)), '#dc3545')}
            <div className="analysis-meta">
              <div>Processed: {webhooks.count || 0}</div>
              <div>Failures: {webhooks.fail || 0}</div>
              <div>p95 duration: {Number(webhooks.p95 || 0).toLocaleString()} ms</div>
            </div>
          </div>

          <div className="analysis-card">
            <h6>Refund Backlog</h6>
            {renderSparkline([ops.refundBacklog], '#ffc107')}
            <div className="analysis-meta">
              <div>Total refund_pending: {ops.refundBacklog || 0}</div>
              <div>Bookings: {ops.refundBacklogBookings || 0}</div>
              <div>Intents: {ops.refundBacklogIntents || 0}</div>
            </div>
          </div>
        </div>

        <div className="analysis-alerts">
          <h6>Active Alerts</h6>
          {alerts.length === 0 ? (
            <div className="analysis-alert analysis-alert-ok">All monitored thresholds are within range.</div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`analysis-alert ${
                  alert.severity === 'critical' ? 'analysis-alert-critical' : 'analysis-alert-warning'
                }`}
              >
                <strong>{alert.severity === 'critical' ? 'Critical' : 'Warning'}:</strong> {alert.message}
              </div>
            ))
          )}
        </div>

        <div className="analysis-endpoints">
          <h6>Top API Endpoints by Request Volume (24h)</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-hover admin-table">
              <thead className="table-dark">
                <tr>
                  <th>Endpoint</th>
                  <th>Count</th>
                  <th>p50</th>
                  <th>p75</th>
                  <th>p90</th>
                  <th>p95</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(latency.endpoints) && latency.endpoints.length > 0 ? (
                  latency.endpoints.map((e) => (
                    <tr key={e.endpoint}>
                      <td style={{ textAlign: 'left' }}>{e.endpoint}</td>
                      <td>{e.count}</td>
                      <td>{e.p50}</td>
                      <td>{e.p75}</td>
                      <td>{e.p90}</td>
                      <td>{e.p95}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center">No latency samples yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
          <div className="col-12">
            {/* Admin profile block above tabs */}
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

            {/* Top tabs bar */}
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
              <span className="admin-topbar-separator">|</span>
              <button
                className={`admin-topbar-link ${activeSection === 'booking' ? 'active' : ''}`}
                onClick={() => loadSection('booking')}
              >
                Booking
              </button>
              <span className="admin-topbar-separator">|</span>
              <button
                className={`admin-topbar-link ${activeSection === 'analysis' ? 'active' : ''}`}
                onClick={() => loadSection('analysis')}
              >
                Analysis
              </button>
              <span className="admin-topbar-separator">|</span>
              <button
                className={`admin-topbar-link ${activeSection === 'audit' ? 'active' : ''}`}
                onClick={() => loadSection('audit')}
              >
                Audit
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
            {/* Section Header */}
            <div className="section-header">
              <h4>
                {activeSection === 'users'
                  ? (usersAudience === 'staff' ? 'Staffs' : 'Users')
                  : activeSection === 'menu'
                  ? 'Menu Items'
                  : activeSection === 'souvenir'
                  ? 'Souvenir Items'
                  : activeSection === 'reviews'
                  ? 'User Reviews'
                  : activeSection === 'booking'
                  ? 'Booking'
                  : activeSection === 'analysis'
                  ? 'Analysis'
                  : activeSection === 'audit'
                  ? 'Audit Trail'
                  : 'Transactions'}
              </h4>
              {activeSection === 'users' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openAddUserModal}
                >
                  {usersAudience === 'staff' ? 'Add Staff' : 'Add User'}
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
                renderUsersSection()
              ) : activeSection === 'menu' ? (
                renderMenuTable()
              ) : activeSection === 'souvenir' ? (
                renderSouvenirTable()
              ) : activeSection === 'reviews' ? (
                renderReviewsSection()
              ) : activeSection === 'booking' ? (
                renderBookingSection()
              ) : activeSection === 'analysis' ? (
                renderAnalysisSection()
              ) : activeSection === 'audit' ? (
                renderAuditSection()
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="admin-modal-overlay" onClick={() => !addUserSubmitting && setShowAddUserModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h5>{usersAudience === 'staff' ? 'Add Staff' : 'Add User'}</h5>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => !addUserSubmitting && setShowAddUserModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddUser} className="admin-modal-body">
              <div className="admin-add-menu-field">
                <label>Username</label>
                <input
                  type="text"
                  value={addUserForm.username}
                  onChange={(e) => setAddUserForm((prev) => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Email</label>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Phone (optional)</label>
                <input
                  type="text"
                  value={addUserForm.phone}
                  onChange={(e) => setAddUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="admin-add-menu-field">
                <label>Role</label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  {usersAudience === 'staff' ? (
                    <>
                      <option value="STAFF">STAFF</option>
                      <option value="KITCHEN">KITCHEN</option>
                      <option value="ADMIN">ADMIN</option>
                    </>
                  ) : (
                    <option value="USER">USER</option>
                  )}
                </select>
              </div>
              <div className="admin-add-menu-field">
                <label>Password</label>
                <input
                  type="password"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowAddUserModal(false)}
                  disabled={addUserSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addUserSubmitting}>
                  {addUserSubmitting ? 'Creating…' : (usersAudience === 'staff' ? 'Create Staff' : 'Create User')}
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
