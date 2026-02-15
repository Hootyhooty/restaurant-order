// src/components/Header.jsx
import { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Header.css';

const API_BASE = 'http://localhost:5000';
const DEFAULT_AVATAR = `${API_BASE}/display/default.jpg`;

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef(null);
  const { isLoggedIn, user, logout } = useContext(AuthContext);
  const { items, updateQuantity, removeFromCart, getTotalCount, getTotalPrice } = useCart();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    setProfileImgError(false);
  }, [user?.photo]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) {
        setCartOpen(false);
      }
    };
    if (cartOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [cartOpen]);

  const handleAuthAction = () => {
    if (isLoggedIn) {
      logout();
      navigate('/');
    } else {
      navigate('/login', { state: { from: window.location.pathname } });
    }
  };

  const profileImage =
    !user?.photo || user.photo.trim() === '' || profileImgError
      ? DEFAULT_AVATAR
      : user.photo.startsWith('http')
        ? user.photo
        : user.photo === 'other_img/default.jpg' || user.photo === 'default.jpg'
        ? DEFAULT_AVATAR
        : `${API_BASE}/api/users/uploads/${user.photo}`;

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
                  onError={() => setProfileImgError(true)}
                />
              </button>
            )}
            {isLoggedIn && (
              <div className="header-cart-wrap" ref={cartRef}>
                <button
                  type="button"
                  className="header-cart-btn"
                  onClick={() => setCartOpen((o) => !o)}
                  aria-label="Cart"
                >
                  <svg className="header-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  {getTotalCount() > 0 && (
                    <span className="header-cart-badge">{getTotalCount()}</span>
                  )}
                </button>
                {cartOpen && (
                  <div className="header-cart-dropdown">
                    <h3 className="header-cart-title">Cart</h3>
                    {items.length === 0 ? (
                      <p className="header-cart-empty">Your cart is empty.</p>
                    ) : (
                      <>
                        <ul className="header-cart-list">
                          {items.map(({ meal, quantity }) => (
                            <li key={meal.id} className="header-cart-item">
                              <div className="header-cart-item-info">
                                <span className="header-cart-item-name">{meal.name}</span>
                                <span className="header-cart-item-price">฿{meal.price} × {quantity} = ฿{meal.price * quantity}</span>
                              </div>
                              <div className="header-cart-item-actions">
                                <button
                                  type="button"
                                  className="header-cart-qty-btn"
                                  onClick={() => updateQuantity(meal.id, quantity - 1)}
                                >
                                  −
                                </button>
                                <span className="header-cart-qty">{quantity}</span>
                                <button
                                  type="button"
                                  className="header-cart-qty-btn"
                                  onClick={() => updateQuantity(meal.id, quantity + 1)}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  className="header-cart-remove"
                                  onClick={() => removeFromCart(meal.id)}
                                  aria-label="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="header-cart-total">
                          Total: <strong>฿{getTotalPrice().toLocaleString()}</strong>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
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