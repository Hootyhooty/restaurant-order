// src/components/Login.jsx
import { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getHomeRouteForRole } from '../utils/roleRoutes';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(
    location.state?.registered
      ? 'Check your email and click the verification link to activate your account, then log in.'
      : '',
  );
  const [resendEmail, setResendEmail] = useState(location.state?.email || '');
  const [resendStatus, setResendStatus] = useState('');
  const { login, resendVerification } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setResendStatus('');
    const result = await login(username, password);
    if (result.success) {
      const role = result.user?.role;
      const roleHome = getHomeRouteForRole(role);
      if (role === 'ADMIN' || role === 'STAFF' || role === 'KITCHEN') {
        navigate(roleHome);
      } else {
        navigate(location.state?.from || roleHome);
      }
    } else if (result.code === 'EMAIL_NOT_VERIFIED') {
      setError(result.message);
      if (result.email) setResendEmail(result.email);
    } else {
      setError(result.message);
    }
  };

  const handleResend = async () => {
    const email = resendEmail || (username.includes('@') ? username : '');
    if (!email) {
      setResendStatus('Enter your email address to resend verification.');
      return;
    }
    setResendStatus('');
    const result = await resendVerification(email);
    setResendStatus(result.message);
  };

  return (
    <section className="login-section">
      <div className="container">
        <div className="login-content">
          <h2 className="login-title">Login to Picha</h2>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username or Email</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username or email"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>
            {info && <p className="info-message">{info}</p>}
            {error && <p className="error-message">{error}</p>}
            {error && error.includes('verify') && (
              <div className="resend-verification">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Email for verification resend"
                  className="form-input"
                />
                <button type="button" className="btn btn-secondary" onClick={handleResend}>
                  Resend verification email
                </button>
              </div>
            )}
            {resendStatus && <p className="info-message">{resendStatus}</p>}
            <button type="submit" className="btn btn-primary login-btn">
              Login
            </button>
            <button
              type="button"
              className="btn btn-secondary create-account-btn"
              onClick={() => navigate('/register', { state: { from: location.state?.from || '/menu' } })}
            >
              Create Account
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Login;
