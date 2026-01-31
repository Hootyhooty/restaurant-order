// Standalone menu item page with review section (per sketch)
import { useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getMealBySlug, categories } from '../data/meals';
import './ReviewPage.css';

const ReviewPage = () => {
  const { menuSlug } = useParams();
  const navigate = useNavigate();
  const meal = getMealBySlug(menuSlug);
  const [quantity, setQuantity] = useState(1);
  const [reviewText, setReviewText] = useState('');
  const { isLoggedIn } = useContext(AuthContext);

  // Placeholder comments until backend exists
  const [comments] = useState([
    { id: 1, text: 'Great dish! Would order again.', author: 'User1' },
    { id: 2, text: 'Loved the flavor and portion size.', author: 'User2' },
  ]);

  const handleQuantityChange = (delta) => {
    setQuantity((q) => Math.max(1, q + delta));
  };

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/review/${menuSlug}` } });
      return;
    }
    alert(`Added ${meal.name} (${quantity} items) to cart!`);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/review/${menuSlug}` } });
      return;
    }
    alert('Review submitted! (Backend wiring coming later)');
    setReviewText('');
  };

  if (!meal) {
    return (
      <section className="review-page">
        <div className="container">
          <p className="review-not-found">Menu item not found.</p>
          <Link to="/menu" className="review-back-link">Back to Menu</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="review-page">
      <div className="container">
        <div className="review-layout">
          <aside className="review-sidebar">
            <div className="category-filter">
              <Link to="/menu" className="category-btn">← Back to Menu</Link>
              {categories.filter((c) => c.id !== 'all').map((cat) => (
                <Link
                  key={cat.id}
                  to="/menu"
                  className="category-btn"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </aside>

          <div className="review-main">
            <div className="review-item-block">
              <div className="review-image-wrap">
                <img src={meal.image} alt={meal.name} />
              </div>
              <h1 className="review-menu-name">{meal.name}</h1>
              <p className="review-description">{meal.description}</p>
              <div className="review-quantity">
                <button
                  type="button"
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="quantity-display">{quantity}</span>
                <button
                  type="button"
                  className="quantity-btn"
                  onClick={() => handleQuantityChange(1)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="add-to-cart-btn"
                onClick={handleAddToCart}
              >
                ADD TO CART
              </button>
            </div>

            <div className="review-section">
              <h2 className="review-section-title">Reviews</h2>
              <div className="review-comments">
                {comments.slice(0, 2).map((c) => (
                  <div key={c.id} className="review-comment-card">
                    <p className="review-comment-text">{c.text}</p>
                    <span className="review-comment-author">— {c.author}</span>
                  </div>
                ))}
              </div>
              <Link to={`/review/${menuSlug}`} className="review-more-link">
                more
              </Link>
              <div className="review-write">
                <textarea
                  className="review-write-area"
                  placeholder="Write your review..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                />
                <button
                  type="button"
                  className="review-submit-btn"
                  onClick={handleSubmitReview}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewPage;
