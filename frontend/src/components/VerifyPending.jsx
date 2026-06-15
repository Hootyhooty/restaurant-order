import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../apiConfig';
import './VerifyPending.css';

const VerifyPending = () => {
  const location = useLocation();
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleResend = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter the email you registered with.');
      return;
    }

    setSending(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/auth/resend-verification`,
        { email: trimmed },
        { headers: { 'Content-Type': 'application/json' } },
      );
      setStatus(
        response.data?.message ||
          'If your registration is still pending, a new verification email is on its way.',
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not resend the email. Please try again in a moment.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="verify-pending-section">
      <div className="container">
        <div className="verify-pending-content">
          <div className="verify-pending-icon" aria-hidden="true">✉️</div>
          <h2 className="verify-pending-title">Check your email</h2>
          <p className="verify-pending-text">
            We sent a verification link
            {emailFromState ? (
              <>
                {' '}
                to <strong>{emailFromState}</strong>
              </>
            ) : null}
            . Open it to activate your account, then log in.
          </p>
          <p className="verify-pending-hint">
            Didn&rsquo;t get it? It can take a minute to arrive &mdash; also check your spam or
            junk folder. You can resend the link below.
          </p>

          <form onSubmit={handleResend} className="verify-pending-form">
            {!emailFromState && (
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="form-input"
                />
              </div>
            )}
            {status && <p className="info-message">{status}</p>}
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Resend verification email'}
            </button>
          </form>

          <div className="verify-pending-actions">
            <Link to="/login" className="btn btn-secondary">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerifyPending;
