import { Fragment, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE, DEFAULT_AVATAR } from '../apiConfig';
import AdminKitchenSection from './AdminKitchenSection';
import AdminPromotionsSection from './AdminPromotionsSection';
import AnalysisSection from './admin/AnalysisSection';
import AuditSection from './admin/AuditSection';
import BookingsSection from './admin/BookingsSection';
import MenuSection from './admin/MenuSection';
import ReviewsSection from './admin/ReviewsSection';
import SouvenirSection from './admin/SouvenirSection';
import TransactionsSection from './admin/TransactionsSection';
import UsersSection from './admin/UsersSection';
import MfaSecuritySection from './admin/MfaSecuritySection';
import { adminJson } from './admin/adminApi';
import './AdminDashboard.css';

const tabs = [
  ['users', 'Users'], ['menu', 'Menu'], ['souvenir', 'Souvenir'],
  ['transactions', 'Transactions'], ['booking', 'Booking'], ['kitchen', 'Kitchen'],
  ['promotions', 'Promotions'], ['analysis', 'Analysis'], ['audit', 'Audit'], ['security', 'Security'],
];

const titles = {
  reviews: 'User Reviews', booking: 'Booking', kitchen: 'Kitchen',
  promotions: 'Promotions', analysis: 'Analysis', audit: 'Audit Trail',
  security: 'Security',
  transactions: 'Transactions',
};

const AdminDashboard = () => {
  const { user, logout, isAuthLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('users');
  const [usersAudience, setUsersAudience] = useState('customers');
  const [reviewMealId, setReviewMealId] = useState('');
  const [stats, setStats] = useState(null);

  const loadStats = async () => {
    try {
      const data = await adminJson('/api/admin/stats');
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    loadStats();
  }, [isAuthLoading, user, navigate]);

  if (isAuthLoading || !user || user.role !== 'ADMIN') return null;

  const selectSection = (section) => {
    setActiveSection(section);
    if (section !== 'reviews') setReviewMealId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openReviews = (mealId) => {
    setReviewMealId(String(mealId));
    setActiveSection('reviews');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const avatar = !user.photo || user.photo.trim() === '' || ['other_img/default.jpg', 'default.jpg'].includes(user.photo)
    ? DEFAULT_AVATAR
    : user.photo.startsWith('http') ? user.photo : `${API_BASE}/api/users/uploads/${user.photo}`;

  const renderSection = () => {
    if (activeSection === 'users') return <UsersSection audience={usersAudience} onAudienceChange={setUsersAudience} />;
    if (activeSection === 'menu') return <MenuSection onOpenReviews={openReviews} onStatsChanged={loadStats} />;
    if (activeSection === 'souvenir') return <SouvenirSection onStatsChanged={loadStats} />;
    if (activeSection === 'reviews') return <ReviewsSection initialMealId={reviewMealId} />;
    if (activeSection === 'booking') return <BookingsSection />;
    if (activeSection === 'kitchen') return <AdminKitchenSection />;
    if (activeSection === 'promotions') return <AdminPromotionsSection fetchJSON={adminJson} />;
    if (activeSection === 'analysis') return <AnalysisSection />;
    if (activeSection === 'audit') return <AuditSection />;
    if (activeSection === 'security') return <MfaSecuritySection />;
    return <TransactionsSection />;
  };

  const sectionOwnsHeader = ['users', 'menu', 'souvenir'].includes(activeSection);
  return (
    <section className="admin-dashboard">
      <div className="container-fluid"><div className="row">
        <div className="col-12">
          <div className="admin-info mb-4">
            <div className="d-flex align-items-center">
              <div className="admin-avatar"><img src={avatar} alt="Admin" /></div>
              <div><div><strong>Username:</strong> {user.username}</div><div><strong>Email:</strong> {user.email}</div><div><span className="badge bg-danger">ADMIN</span></div></div>
            </div>
          </div>
          <div className="admin-topbar">
            {tabs.map(([id, label], index) => (
              <Fragment key={id}>
                {index > 0 && <span className="admin-topbar-separator">|</span>}
                <button className={`admin-topbar-link ${activeSection === id ? 'active' : ''}`} onClick={() => selectSection(id)}>{label}</button>
              </Fragment>
            ))}
            {stats && <><span className="admin-topbar-separator">|</span><span className="admin-topbar-stat">Total Users: {stats.totalUsers}</span><span className="admin-topbar-separator">|</span><span className="admin-topbar-stat">Active Users: {stats.activeUsers}</span><span className="admin-topbar-separator">|</span><span className="admin-topbar-stat">Menu Items: {stats.totalMenuItems}</span><span className="admin-topbar-separator">|</span><span className="admin-topbar-stat">Souvenirs: {stats.totalSouvenirItems ?? 0}</span></>}
            <span className="admin-topbar-separator">|</span>
            <button className="admin-topbar-link admin-topbar-logout" onClick={async () => { await logout(); navigate('/'); }}>Logout</button>
          </div>
        </div>
        <div className="col-12">
          {!sectionOwnsHeader && <div className="section-header"><h4>{titles[activeSection]}</h4></div>}
          {sectionOwnsHeader ? renderSection() : <div className="section-body">{renderSection()}</div>}
        </div>
      </div></div>
    </section>
  );
};

export default AdminDashboard;
