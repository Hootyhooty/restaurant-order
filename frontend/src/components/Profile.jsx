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
  const [activeTab, setActiveTab] = useState('history'); // history | booking | messages | promotion | social
  const [profileImgError, setProfileImgError] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [bookingItems, setBookingItems] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [messagesLimit, setMessagesLimit] = useState(10);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState(null);
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sending, setSending] = useState(false);

  const isOwnProfile = !routeUserId || (authUser && authUser.id === routeUserId);

  const loadMessages = async (nextPage = 1, limitOverride) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setMessagesLoading(true);
      const effectiveLimit = limitOverride || messagesLimit || 10;
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', String(effectiveLimit));
      const res = await fetch(`${API_BASE}/api/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.items) {
        setMessages(data.items);
        setMessagesPage(data.page || nextPage);
        setMessagesTotal(data.total ?? data.items.length ?? 0);
        setMessagesLimit(data.limit || effectiveLimit);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

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

    const loadBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        setBookingLoading(true);
        const res = await fetch(`${API_BASE}/api/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.items) setBookingItems(data.items);
      } catch (err) {
        console.error('Load bookings error:', err);
      } finally {
        setBookingLoading(false);
      }
    };
    loadHistory();
    loadBookings();
    loadMessages(1, messagesLimit);
  }, [isLoggedIn, authUser, routeUserId, isOwnProfile, navigate]);

  const bookingStartAt = (b) => {
    const [start] = String(b.timeSlot || '').split('-');
    if (!start || !b.date) return null;
    return new Date(`${b.date}T${start}:00`);
  };

  const canCancelBooking = (b) => {
    if (!b || b.status !== 'confirmed') return false;
    const startAt = bookingStartAt(b);
    if (!startAt || Number.isNaN(startAt.getTime())) return false;
    const cutoff = new Date(startAt.getTime() - 3 * 60 * 60 * 1000);
    return Date.now() <= cutoff.getTime();
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this reservation? You will NOT get a refund for reservation fee and cost.')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to cancel');
      setBookingItems((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    }
  };

  const handleSendMessage = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/profile/${routeUserId}` } });
      return;
    }
    setComposeRecipient(profileUser);
    setSendSubject('');
    setSendBody('');
    setShowSendModal(true);
  };

  const handleReply = (msg) => {
    setComposeRecipient({
      id: msg.senderId,
      username: msg.senderName,
    });
    setSendSubject(msg.subject.startsWith('Re: ') ? msg.subject : `Re: ${msg.subject}`);
    setSendBody('');
    setShowSendModal(true);
  };

  const handleDeleteMessage = async (msgId, e) => {
    e?.stopPropagation?.();
    if (!window.confirm('Delete this message?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete');
      }
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      alert(err.message || 'Failed to delete message.');
    }
  };

  const submitMessage = async (e) => {
    e.preventDefault();
    if (!composeRecipient?.id || !sendSubject.trim() || !sendBody.trim()) return;
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
          recipientId: composeRecipient.id,
          subject: sendSubject.trim(),
          body: sendBody.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to send message');
      setShowSendModal(false);
      setComposeRecipient(null);
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
                  className={`profile-tab ${activeTab === 'booking' ? 'active' : ''}`}
                  onClick={() => setActiveTab('booking')}
                >
                  Booking
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
            {activeTab === 'booking' && isOwnProfile && (
              <div>
                <h3 className="profile-tab-title">Booking</h3>
                {bookingLoading && bookingItems.length === 0 ? (
                  <p className="profile-text">Loading bookings...</p>
                ) : bookingItems.length === 0 ? (
                  <p className="profile-text">No bookings yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover profile-history-table">
                      <thead>
                        <tr>
                          <th>Booking ID</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Table</th>
                          <th>Guests</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingItems.map((b) => (
                          <tr key={b.id}>
                            <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>{b.id}</td>
                            <td>{b.date}</td>
                            <td>{String(b.timeSlot || '').replace('-', '–')}</td>
                            <td>{b.tableId}</td>
                            <td>{b.guestCount}</td>
                            <td>{b.status}</td>
                            <td>{b.amountTotal != null ? `฿${Number(b.amountTotal).toLocaleString()}` : '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                disabled={!canCancelBooking(b)}
                                onClick={() => cancelBooking(b.id)}
                                title={!canCancelBooking(b) ? 'Cancel is only available until 3 hours before the reservation time.' : undefined}
                              >
                                Cancel
                              </button>
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
                {messagesLoading && messages.length === 0 ? (
                  <p className="profile-text">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="profile-text">No messages yet.</p>
                ) : (
                  <>
                    <div className="profile-messages-list">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`profile-message-card ${msg.read ? 'read' : 'unread'}`}
                          onClick={() => !msg.read && markMessageRead(msg.id)}
                        >
                          <div className="profile-message-format">
                            <div className="profile-message-row">
                              <span className="profile-message-label">From:</span>
                              <span>{msg.senderName}</span>
                            </div>
                            <div className="profile-message-row">
                              <span className="profile-message-label">Title:</span>
                              <span>{msg.subject}</span>
                            </div>
                            <div className="profile-message-row">
                              <span className="profile-message-label">Message:</span>
                              <span className="profile-message-body">
                                {msg.preview || msg.body}
                              </span>
                            </div>
                          </div>
                          <div className="profile-message-actions">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReply(msg);
                              }}
                            >
                              Reply
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={(e) => handleDeleteMessage(msg.id, e)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {messagesTotal > messagesLimit && (
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="text-muted">Total: {messagesTotal}</div>
                        <div className="btn-group">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled={messagesPage <= 1 || messagesLoading}
                            onClick={() => loadMessages(messagesPage - 1)}
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled
                          >
                            Page {messagesPage}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled={messagesPage * messagesLimit >= messagesTotal || messagesLoading}
                            onClick={() => loadMessages(messagesPage + 1)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
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

      {showSendModal && composeRecipient && (
        <div className="modal-overlay" onClick={() => !sending && (setShowSendModal(false), setComposeRecipient(null))}>
          <div className="modal-content profile-send-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send Message to {composeRecipient?.username || 'User'}</h3>
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
                  onClick={() => !sending && (setShowSendModal(false), setComposeRecipient(null))}
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

