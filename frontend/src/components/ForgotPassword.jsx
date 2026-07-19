import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../apiClient';
import { API_BASE } from '../apiConfig';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    try {
      const response = await apiClient.post(
        `${API_BASE}/api/auth/forgot-password`,
        { email: email.trim() },
        { headers: { 'Content-Type': 'application/json' } },
      );
      setSubmitted(true);
      setStatus(response.data?.message || 'If an account with that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset email. Please try again.');
    }
  };

  return (
    <section className="forgot-password-section">
      <div className="container">
        <div className="forgot-password-content">
          <h2 className="forgot-password-title">Forgot Password</h2>
          <p className="forgot-password-hint">
            Enter your account email and we will send you a link to reset your password.
          </p>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="forgot-password-form">
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
              {error && <p className="error-message">{error}</p>}
              <button type="submit" className="btn btn-primary">
                Send reset link
              </button>
            </form>
          ) : (
            <>
              <p className="info-message">{status}</p>
              <p className="forgot-password-next-step">
                Check your inbox and open the reset link. That page lets you enter a new password.
              </p>
            </>
          )}
          <div className="forgot-password-actions">
            <Link to="/login" className="btn btn-secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;
