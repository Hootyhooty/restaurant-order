  // src/components/Header.jsx
import { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { API_BASE, DEFAULT_AVATAR } from '../apiConfig';
import { userHasAddress } from '../utils/profileUtils';
import AddressRequiredModal from './AddressRequiredModal';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef(null);
  const { isLoggedIn, user, logout } = useContext(AuthContext);
  const { items, updateQuantity, removeFromCart, clearCart, getTotalCount, getTotalPrice } = useCart();
  const navigate = useNavigate();
  const [isPaying, setIsPaying] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

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

  // If user goes to Stripe and returns via Back (bfcache), reset "redirecting" state
  useEffect(() => {
    const resetPaying = () => setIsPaying(false);
    window.addEventListener('pageshow', resetPaying);
    window.addEventListener('focus', resetPaying);
    return () => {
      window.removeEventListener('pageshow', resetPaying);
      window.removeEventListener('focus', resetPaying);
    };
  }, []);

  const handleAuthAction = () => {
    if (isLoggedIn) {
      clearCart();
      logout();
      navigate('/');
    } else {
      navigate('/login', { state: { from: window.location.pathname } });
    }
  };

  const handleBuy = async () => {
    try {
      if (!isLoggedIn) {
        navigate('/login', { state: { from: window.location.pathname } });
        return;
      }
      if (items.length === 0) {
        alert('Your cart is empty.');
        return;
      }
      if (!userHasAddress(user)) {
        setShowAddressModal(true);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { state: { from: window.location.pathname } });
        return;
      }

      setIsPaying(true);
      const payload = {
        items: items.map(({ meal, quantity }) => ({ id: meal.id, quantity })),
      };

      const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || `Failed to start payment (HTTP ${res.status})`);
      }

      setCartOpen(false);
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Payment start error:', err);
      alert(err.message || 'Failed to start payment.');
      setIsPaying(false);
    }
  };

  const handleCheckout = async () => {
    // If cart is empty, "Order now" should send user to Menu.
    // If cart has items, "Check out" behaves like clicking the cart "Buy" button.
    if (items.length === 0) {
      navigate('/menu');
      return;
    }
    await handleBuy();
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
              src="https://res.cloudinary.com/dpfypv35h/image/upload/v1771868611/restaurant/food/food_img/Picha.png"
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
                <Link to="/booking" className="nav-link">Booking</Link>
              </li>
              <li className="nav-item">
                <Link to="#promotions" className="nav-link">Promotions</Link>
              </li>
              <li className="nav-item">
                <Link to="/store" className="nav-link">Stores</Link>
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
                        <div className="header-cart-buttons">
                          <button
                            type="button"
                            className="header-cart-clear-btn"
                            onClick={() => { clearCart(); setCartOpen(false); }}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="header-cart-buy-btn"
                            onClick={handleBuy}
                            disabled={isPaying || items.length === 0}
                          >
                            {isPaying ? 'Redirecting…' : 'Buy'}
                          </button>
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
            <button type="button" className="btn btn-primary" onClick={handleCheckout} disabled={isPaying}>
              {isPaying ? 'Redirecting…' : items.length === 0 ? 'Order now' : 'Check out'}
            </button>
          </div>
          <button className="mobile-menu-btn" onClick={toggleMenu}>
            <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>
      <AddressRequiredModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
      />
    </header>
  );
};

export default Header;