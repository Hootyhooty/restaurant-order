import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../apiConfig';
import './ResetPassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!tokenFromUrl) {
      setError('Missing reset token. Open the link from your email or request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/api/auth/reset-password`,
        { token: tokenFromUrl, password },
        { headers: { 'Content-Type': 'application/json' } },
      );
      setSuccess(true);
      setMessage(response.data?.message || 'Password updated successfully.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Reset failed. The link may be invalid or expired.',
      );
    }
  };

  if (success) {
    return (
      <section className="reset-password-section">
        <div className="container">
          <div className="reset-password-content">
            <h2 className="reset-password-title">Reset Password</h2>
            <p className="success-message">{message}</p>
            <div className="reset-password-actions">
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="reset-password-section">
      <div className="container">
        <div className="reset-password-content">
          <h2 className="reset-password-title">Reset Password</h2>
          <p className="reset-password-hint">
            Choose a new password for your account.
          </p>
          {!tokenFromUrl && (
            <p className="reset-password-warning">
              No reset token found. Use the link in your email, or{' '}
              <Link to="/forgot-password">request a new reset link</Link>.
            </p>
          )}
          <form onSubmit={handleSubmit} className="reset-password-form">
            <div className="form-group">
              <label htmlFor="password">New password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="form-input"
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!tokenFromUrl}
            >
              Update password
            </button>
          </form>
          <div className="reset-password-actions">
            <Link to="/forgot-password" className="btn btn-secondary">
              Request new link
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResetPassword;
