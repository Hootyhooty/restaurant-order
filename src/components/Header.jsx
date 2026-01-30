// src/components/Header.jsx
import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isLoggedIn, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAuthAction = () => {
    if (isLoggedIn) {
      logout();
      navigate('/');
    } else {
      navigate('/login', { state: { from: window.location.pathname } });
    }
  };

  const profileImage =
    user?.photo && user.photo.trim() !== ''
      ? user.photo.startsWith('http')
        ? user.photo
        : user.photo === 'other_img/default.jpg' || user.photo === 'default.jpg'
        ? '/other_img/default.jpg'
        : `http://localhost:5000/api/users/uploads/${user.photo}`
      : '/other_img/default.jpg';

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <img
              src="/food_img/Picha.png"
              alt="Picha"
              className="logo-img"
            />
          </div>
          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <ul className="nav-list">
              <li className="nav-item">
                <Link to="/menu" className="nav-link">Menu</Link>
              </li>
              <li className="nav-item">
                <Link to="#promotions" className="nav-link">Promotions</Link>
              </li>
              <li className="nav-item">
                <Link to="#stores" className="nav-link">Stores</Link>
              </li>
              <li className="nav-item">
                <Link to="#about" className="nav-link">About Us</Link>
              </li>
              <li className="nav-item">
                <Link to="#contact" className="nav-link">Contact</Link>
              </li>
            </ul>
          </nav>
          <div className="header-actions">
            {isLoggedIn && (
              <button
                type="button"
                className="header-profile-btn"
                onClick={() => navigate('/profile')}
              >
                <img
                  src={profileImage}
                  alt={user?.username || 'Profile'}
                  className="header-profile-avatar"
                />
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleAuthAction}
            >
              {isLoggedIn ? 'Logout' : 'Login'}
            </button>
            <button className="btn btn-primary">Order Now</button>
          </div>
          <button className="mobile-menu-btn" onClick={toggleMenu}>
            <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;