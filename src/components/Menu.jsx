// src/components/Menu.jsx
import { useState, useEffect } from 'react';
import './MealsSection.css';
import MealCard from './MealCard';
import { meals, categories } from '../data/meals';

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [hasUserClicked, setHasUserClicked] = useState(false);

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