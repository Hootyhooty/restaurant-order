// src/components/Menu.jsx
import { useState, useEffect } from 'react';
import './MealsSection.css';
import MealCard from './MealCard';
import { API_BASE } from '../apiConfig';

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [hasUserClicked, setHasUserClicked] = useState(false);
  const [meals, setMeals] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: 'All' }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/api/meals`);
        if (!res.ok) {
          throw new Error('Failed to load menu');
        }

        const data = await res.json();
        setMeals(data.items || []);
        setCategories(data.categories || [{ id: 'all', name: 'All' }]);
      } catch (err) {
        console.error('Menu fetch error:', err);
        setError(err.message || 'Error loading menu');
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, []);

  useEffect(() => {
    if (hasUserClicked) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [activeCategory, hasUserClicked]);

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    setHasUserClicked(true);
  };

  const filteredMeals = activeCategory === 'all'
    ? meals
    : meals.filter((meal) => meal.category === activeCategory);

  if (loading) {
    return (
      <section className="meals-section">
        <div className="container">
          <div className="meals-layout">
            <div className="meals-content">
              <div className="menu-header">
                <span className="menu-category">Loading menu...</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="meals-section">
        <div className="container">
          <div className="meals-layout">
            <div className="meals-content">
              <div className="menu-header">
                <span className="menu-category">Error: {error}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="meals-section">
      <div className="container">
        <div className="meals-layout">
          <div className="sidebar">
            <div className="category-filter">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="meals-content">
            <div className="menu-header">
              <span className="menu-category">
                {activeCategory === 'all'
                  ? 'All Categories'
                  : categories.find((cat) => cat.id === activeCategory)?.name}
              </span>
            </div>
            <div className="meals-grid">
              {filteredMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Menu;