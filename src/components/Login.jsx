// src/components/Login.jsx
import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      const from = location.state?.from || '/menu';
      navigate(from);
    } else {
      setError(result.message);
    }
  };

  return (
    <section className="login-section">
      <div className="container">
        <div className="login-content">
          <h2 className="login-title">Login to Picha</h2>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
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
            </div>
            {error && <p className="error-message">{error}</p>}
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