// src/components/MealCard.jsx
import { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './MealCard.css';

const MealCard = ({ meal }) => {
  const [quantity, setQuantity] = useState(1);
  const { isLoggedIn } = useContext(AuthContext);
  const location = useLocation();

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    console.log(`Added ${quantity} ${meal.name} to cart`);
    alert(`Added ${meal.name} (${quantity} items) to cart!`);
  };

  return (
    <div className="meal-card">
      {meal.isPopular && (
        <div className="popular-badge">Popular</div>
      )}
      <div className="meal-image">
        <img src={meal.image} alt={meal.name} />
      </div>
      <div className="meal-content">
        <h3 className="meal-name">{meal.name}</h3>
        <p className="meal-description">{meal.description}</p>
        <div className="meal-price">
          <span className="price-amount">฿{meal.price.toLocaleString()}</span>
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
            </>
          ) : (
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="login-prompt"
            >
              Please log in to add items to cart
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealCard;