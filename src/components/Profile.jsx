// src/components/Profile.jsx
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { isLoggedIn, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('history'); // history | messages | promotion | social

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  const profileImage =
    user?.photo && user.photo.trim() !== ''
      ? user.photo.startsWith('http')
        ? user.photo
        : user.photo === 'other_img/default.jpg' || user.photo === 'default.jpg'
        ? '/other_img/default.jpg'
        : `http://localhost:5000/api/users/uploads/${user.photo}`
      : '/other_img/default.jpg';

  const reputationIsGreen = user?.email_verified && user?.phone_verified;

  return (
    <section className="profile-section">
      <div className="container">
        <div className="profile-card">
          <div className="profile-header">
            <img
              src={profileImage}
              alt={user?.username || 'User'}
              className="profile-avatar"
            />
            <div className="profile-header-info">
              <h2 className="profile-username">
                {user?.username || 'New User'}
              </h2>
              <p className="profile-user-id">
                User ID: <span>{user?.id || 'N/A'}</span>
              </p>
              <p className="profile-reputation">
                Reputation Status:{' '}
                <span
                  className={`profile-badge ${
                    reputationIsGreen ? 'badge-green' : 'badge-red'
                  }`}
                >
                  {reputationIsGreen ? 'Green' : 'Red'}
                </span>
              </p>
            </div>
          </div>

          <div className="profile-details">
            <div className="profile-column">
              <h3 className="profile-label">
                Username and Address &amp; Zipcode
              </h3>
              <p className="profile-name">
                {(user?.first_name || '') + ' ' + (user?.last_name || '')}
              </p>
              <p className="profile-text">
                {user?.address_line1 || ''}
                {user?.address_line1 && <br />}
                {(user?.city || user?.state || user?.zipcode) && (
                  <>
                    {user?.city || ''}{' '}
                    {user?.state && user?.city ? ', ' : user?.state || ''}
                    {user?.zipcode && (user?.city || user?.state) ? ', ' : ''}
                    {user?.zipcode || ''}
                  </>
                )}
              </p>
            </div>

            <div className="profile-column">
              <h3 className="profile-label">Email and Phone</h3>
              <p className="profile-text">
                <strong>Email:</strong> {user?.email || 'Not set'}
              </p>
              <p className="profile-text">
                <strong>Phone:</strong>{' '}
                {user?.display_phone === false
                  ? 'Hidden'
                  : user?.phone || 'Not set'}
              </p>
            </div>
          </div>

          <div className="profile-edit-row">
            <button
              type="button"
              className="btn btn-secondary profile-edit-btn"
              onClick={() => navigate('/profile/edit')}
            >
              Edit Profile
            </button>
          </div>

          {/* Tabs */}
          <div className="profile-tabs">
            <button
              type="button"
              className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
            <button
              type="button"
              className={`profile-tab ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              Messages
            </button>
            <button
              type="button"
              className={`profile-tab ${activeTab === 'promotion' ? 'active' : ''}`}
              onClick={() => setActiveTab('promotion')}
            >
              Promotion
            </button>
            <button
              type="button"
              className={`profile-tab ${activeTab === 'social' ? 'active' : ''}`}
              onClick={() => setActiveTab('social')}
            >
              Social medias
            </button>
          </div>

          <div className="profile-tab-content">
            {activeTab === 'history' && (
              <div>
                <h3 className="profile-tab-title">Order / visit history</h3>
                <p className="profile-text">
                  History content coming soon. Here you can show previous orders,
                  reservations, or visits.
                </p>
              </div>
            )}
            {activeTab === 'messages' && (
              <div>
                <h3 className="profile-tab-title">Messages</h3>
                <p className="profile-text">
                  Messages content coming soon. This could include support or
                  restaurant communication.
                </p>
              </div>
            )}
            {activeTab === 'promotion' && (
              <div>
                <h3 className="profile-tab-title">Promotion</h3>
                <p className="profile-text">
                  Promotion content coming soon. You can list personalized deals
                  and coupons for this user.
                </p>
              </div>
            )}
            {activeTab === 'social' && (
              <div>
                <h3 className="profile-tab-title">Social medias</h3>
                <p className="profile-text">
                  Social media links for this profile can go here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Profile;

