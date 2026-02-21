// src/components/Profile.jsx
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE, DEFAULT_AVATAR } from '../apiConfig';
import './Profile.css';

const Profile = () => {
  const { isLoggedIn, user: authUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams();
  const [activeTab, setActiveTab] = useState('history'); // history | messages | promotion | social
  const [profileImgError, setProfileImgError] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sending, setSending] = useState(false);

  const isOwnProfile = !routeUserId || (authUser && authUser.id === routeUserId);

  useEffect(() => {
    if (!isOwnProfile && !routeUserId) return;
    if (!isOwnProfile && routeUserId) {
      // Public profile view
      const loadPublic = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/users/public/${routeUserId}`);
          const data = await res.json();
          if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load profile');
          setProfileUser(data.user);

          const histRes = await fetch(`${API_BASE}/api/users/${routeUserId}/history`);
          const histData = await histRes.json().catch(() => ({}));
          if (histRes.ok && histData?.items) setHistoryItems(histData.items);
        } catch (err) {
          console.error('Load public profile error:', err);
        }
      };
      loadPublic();
      return;
    }

    // Own profile
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/profile' } });
      return;
    }
    if (authUser) {
      setProfileUser(authUser);
    }

    const loadHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/users/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.items) setHistoryItems(data.items);
      } catch (err) {
        console.error('Load history error:', err);
      }
    };
    const loadMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.items) setMessages(data.items);
      } catch (err) {
        console.error('Load messages error:', err);
      }
    };
    loadHistory();
    loadMessages();
  }, [isLoggedIn, authUser, routeUserId, isOwnProfile, navigate]);

  const handleSendMessage = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/profile/${routeUserId}` } });
      return;
    }
    setSendSubject('');
    setSendBody('');
    setShowSendModal(true);
  };

  const submitMessage = async (e) => {
    e.preventDefault();
    if (!profileUser?.id || !sendSubject.trim() || !sendBody.trim()) return;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: profileUser.id,
          subject: sendSubject.trim(),
          body: sendBody.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to send message');
      setShowSendModal(false);
      setSendSubject('');
      setSendBody('');
    } catch (err) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const markMessageRead = async (msgId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/${msgId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, read: true } : m))
        );
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  useEffect(() => {
    setProfileImgError(false);
  }, [profileUser?.photo]);

  if (!profileUser) {
    return null;
  }

  const profileImage =
    !profileUser?.photo || profileUser.photo.trim() === '' || profileImgError
      ? DEFAULT_AVATAR
      : profileUser.photo.startsWith('http')
        ? profileUser.photo
        : profileUser.photo === 'other_img/default.jpg' || profileUser.photo === 'default.jpg'
        ? DEFAULT_AVATAR
        : `${API_BASE}/api/users/uploads/${profileUser.photo}`;

  const reputationIsGreen =
    profileUser?.role === 'ADMIN' || (profileUser?.email_verified && profileUser?.phone_verified);

  return (
    <section className="profile-section">
      <div className="container">
        <div className="profile-card">
          <div className="profile-header">
            <img
              src={profileImage}
              alt={profileUser?.username || 'User'}
              className="profile-avatar"
              onError={() => setProfileImgError(true)}
            />
            <div className="profile-header-info">
              <h2 className="profile-username">
                {profileUser?.username || 'New User'}
              </h2>
              {isOwnProfile && (
                <p className="profile-user-id">
                  User ID: <span>{profileUser?.id || 'N/A'}</span>
                </p>
              )}
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
            {!isOwnProfile ? (
              <>
                <div className="profile-column">
                  <h3 className="profile-label">Username</h3>
                  <p className="profile-name">
                    {(profileUser?.first_name || '') + ' ' + (profileUser?.last_name || '')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="profile-column">
                  <h3 className="profile-label">
                    Username and Address &amp; Zipcode
                  </h3>
                  <p className="profile-name">
                    {(profileUser?.first_name || '') + ' ' + (profileUser?.last_name || '')}
                  </p>
                  <p className="profile-text">
                    {profileUser?.address_line1 || ''}
                    {profileUser?.address_line1 && <br />}
                    {(profileUser?.city || profileUser?.state || profileUser?.zipcode) && (
                      <>
                        {profileUser?.city || ''}{' '}
                        {profileUser?.state && profileUser?.city ? ', ' : profileUser?.state || ''}
                        {profileUser?.zipcode && (profileUser?.city || profileUser?.state) ? ', ' : ''}
                        {profileUser?.zipcode || ''}
                      </>
                    )}
                  </p>
                </div>

                <div className="profile-column">
                  <h3 className="profile-label">Email and Phone</h3>
                  <p className="profile-text">
                    <strong>Email:</strong>{' '}
                    {profileUser?.email || 'Not set'}
                  </p>
                  <p className="profile-text">
                    <strong>Phone:</strong>{' '}
                    {profileUser?.display_phone === false
                      ? 'Hidden'
                      : profileUser?.phone || 'Not set'}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="profile-edit-row">
            {isOwnProfile ? (
              <>
                {authUser?.role === 'ADMIN' && (
                  <button
                    type="button"
                    className="btn btn-outline-primary profile-edit-btn"
                    onClick={() => navigate('/admin')}
                  >
                    Admin Page
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary profile-edit-btn"
                  onClick={() => navigate('/profile/edit')}
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary profile-edit-btn"
                onClick={handleSendMessage}
              >
                Send Message
              </button>
            )}
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
            {isOwnProfile && (
              <>
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
              </>
            )}
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
                <h3 className="profile-tab-title">History</h3>
                {historyItems.length === 0 ? (
                  <p className="profile-text">No history yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover profile-history-table">
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>Reference</th>
                          <th>Menus</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems
                          .filter((item) => (isOwnProfile ? true : item.type === 'review'))
                          .map((item, idx) => (
                            <tr key={`${item.type}-${item.reference}-${idx}`}>
                              <td>{item.type === 'order' ? 'Order' : 'Review'}</td>
                              <td>
                                {item.type === 'order' ? (
                                  item.reference
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-link p-0"
                                    onClick={() => {
                                      const firstMenu = (item.menus && item.menus[0]) || '';
                                      const slug = firstMenu.replace(/\s+/g, '_');
                                      navigate(`/review/${slug}`);
                                    }}
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                              <td>
                                {(item.menus || []).map((name) => {
                                  const slug = name.replace(/\s+/g, '_');
                                  return (
                                    <button
                                      key={name}
                                      type="button"
                                      className="btn btn-link p-0 me-2"
                                      onClick={() => navigate(`/review/${slug}`)}
                                    >
                                      {name}
                                    </button>
                                  );
                                })}
                              </td>
                              <td>
                                {item.type === 'order' && item.amount != null
                                  ? `฿${item.amount.toLocaleString()}`
                                  : '—'}
                              </td>
                              <td>{item.status || (item.type === 'review' ? '—' : '')}</td>
                              <td>
                                {item.createdAt
                                  ? new Date(item.createdAt).toLocaleString()
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'messages' && (
              <div>
                <h3 className="profile-tab-title">Messages</h3>
                {messages.length === 0 ? (
                  <p className="profile-text">No messages yet.</p>
                ) : (
                  <div className="profile-messages-list">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`profile-message-card ${msg.read ? 'read' : 'unread'}`}
                        onClick={() => !msg.read && markMessageRead(msg.id)}
                      >
                        <div className="profile-message-header">
                          <strong>{msg.senderName}</strong>
                          <span className="profile-message-date">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleString()
                              : '—'}
                          </span>
                        </div>
                        <div className="profile-message-subject">{msg.subject}</div>
                        <div className="profile-message-body">{msg.body}</div>
                      </div>
                    ))}
                  </div>
                )}
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

      {showSendModal && (
        <div className="modal-overlay" onClick={() => !sending && setShowSendModal(false)}>
          <div className="modal-content profile-send-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send Message to {profileUser?.username || 'User'}</h3>
            <form onSubmit={submitMessage}>
              <div className="form-group">
                <label htmlFor="msg-subject">Subject</label>
                <input
                  id="msg-subject"
                  type="text"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                  placeholder="Message subject"
                  required
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label htmlFor="msg-body">Message</label>
                <textarea
                  id="msg-body"
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  placeholder="Write your message..."
                  required
                  rows={5}
                  maxLength={5000}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => !sending && setShowSendModal(false)}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Profile;

