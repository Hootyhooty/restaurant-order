// src/components/SouvenirCard.jsx
// Card for souvenir items on the Store page (shares styling with MealCard)
import { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './MealCard.css';

const SouvenirCard = ({ souvenir }) => {
  const [quantity, setQuantity] = useState(1);
  const { isLoggedIn } = useContext(AuthContext);
  const { addToCart } = useCart();
  const location = useLocation();

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1) setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    addToCart(souvenir, quantity);
  };

  const reviewSlug = souvenir.name.replace(/\s+/g, '_');

  return (
    <div className="souvenir-card">
      {souvenir.isPopular && (
        <div className="popular-badge">Popular</div>
      )}
      <div className="souvenir-image">
        <img src={souvenir.image} alt={souvenir.name} />
      </div>
      <div className="meal-content">
        <h3 className="meal-name">{souvenir.name}</h3>
        <p className="meal-description">{souvenir.description}</p>
        <div className="meal-price">
          <span className="price-amount">฿{souvenir.price.toLocaleString()}</span>
        </div>
        <div className="meal-actions">
          {isLoggedIn ? (
            <>
              <div className="quantity-controls">
                <button
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="quantity-display">{quantity}</span>
                <button
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                className="add-to-cart-btn"
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
              <Link to={`/review/${reviewSlug}`} className="review-btn">
                Review
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                state={{ from: location.pathname }}
                className="login-btn meal-card-login-btn"
              >
                Login
              </Link>
              <Link to={`/review/${reviewSlug}`} className="review-btn">
                Review
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SouvenirCard;

