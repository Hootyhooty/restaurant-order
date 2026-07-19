import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../apiClient';
import { API_BASE } from '../apiConfig';
import './VerifyEmail.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Check the link in your email or request a new one from the login page.');
      return;
    }

    const verify = async () => {
      try {
        const response = await apiClient.post(`${API_BASE}/api/auth/verify-email`, { token });
        setStatus('success');
        setMessage(response.data?.message || 'Email verified successfully.');
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
            'Verification failed. The link may be invalid or expired.',
        );
      }
    };

    verify();
  }, [searchParams]);

  return (
    <section className="verify-email-section">
      <div className="container">
        <div className="verify-email-content">
          <h2 className="verify-email-title">Email Verification</h2>
          {status === 'loading' && <p className="verify-email-message">Verifying your email…</p>}
          {status !== 'loading' && (
            <p className={`verify-email-message ${status === 'error' ? 'error-message' : 'success-message'}`}>
              {message}
            </p>
          )}
          <div className="verify-email-actions">
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerifyEmail;
