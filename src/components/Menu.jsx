// src/components/Menu.jsx
import { useState, useEffect } from 'react';
import './MealsSection.css';
import MealCard from './MealCard';

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

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'rice', name: 'Rice' },
    { id: 'sandwich', name: 'Sandwich' },
    { id: 'sides', name: 'Sides' },
    { id: 'drinks', name: 'Drinks' },
    { id: 'desserts', name: 'Desserts' },
  ];

  const meals = [
    {
      id: 1,
      name: 'Lemon Chicken and Rice',
      description: 'Delicious lemon chicken with rice and vegetables',
      price: 89,
      image: '/food_img/Lemon-Chicken-and-Rice.jpg',
      category: 'rice',
      isPopular: true,
    },
    {
      id: 2,
      name: 'Southwestern Rice',
      description: 'Savory southwestern rice with mixed vegetables',
      price: 79,
      image: '/food_img/Southwestern-Rice.jpg',
      category: 'rice',
      isPopular: true,
    },
    {
      id: 3,
      name: 'Shrimp Rice Casserole',
      description: 'Fresh shrimp rice casserole with green onions',
      price: 99,
      image: '/food_img/Makeover-Shrimp-Rice-Casserole.jpg',
      category: 'rice',
    },
    {
      id: 4,
      name: 'Jambalaya',
      description: 'Spicy jambalaya rice with sausage and chicken',
      price: 99,
      image: '/food_img/Jambalaya.jpg',
      category: 'rice',
    },
    {
      id: 5,
      name: 'Turkey Club Sandwich',
      description: 'Classic turkey club sandwich with bacon',
      price: 99,
      image: '/food_img/Turkey-Club-Sandwich.jpg',
      category: 'sandwich',
    },
    {
      id: 6,
      name: 'Copycat Panera Bacon Turkey Bravo',
      description: 'Premium bacon turkey sandwich with special sauce',
      price: 99,
      image: '/food_img/Copycat-Panera-Bacon-Turkey-Bravo.jpg',
      category: 'sandwich',
    },
    {
      id: 7,
      name: 'Sloppy Joes Burger',
      description: 'Delicious sloppy joes burger with sauce',
      price: 99,
      image: '/food_img/Sloppy-Joes-Burger.jpg',
      category: 'sandwich',
    },
    {
      id: 8,
      name: 'Feta Bruschetta',
      description: 'Fresh feta bruschetta with tomatoes',
      price: 69,
      image: '/food_img/Feta-Bruschetta.jpg',
      category: 'sides',
    },
    {
      id: 9,
      name: 'Kenai Dip',
      description: 'Creamy Kenai dip with chips',
      price: 69,
      image: '/food_img/Kenai-Dip.jpg',
      category: 'sides',
    },
    {
      id: 10,
      name: 'Perfect Bite Fruit Salad',
      description: 'Fresh fruit salad with perfect bites',
      price: 69,
      image: '/food_img/Perfect-Bite-Fruit-Salad.jpg',
      category: 'sides',
    },
    {
      id: 11,
      name: 'Frozen Whipped Lemonade',
      description: 'Refreshing frozen whipped lemonade',
      price: 69,
      image: '/food_img/Frozen-Whipped-Lemonade.jpg',
      category: 'drinks',
    },
    {
      id: 12,
      name: 'Sgroppino',
      description: 'Italian sgroppino cocktail',
      price: 79,
      image: '/food_img/Sgroppino.jpg',
      category: 'drinks',
    },
    {
      id: 13,
      name: 'Carajillo',
      description: 'Spanish carajillo coffee cocktail',
      price: 79,
      image: '/food_img/Carajillo.jpg',
      category: 'drinks',
    },
    {
      id: 14,
      name: 'Homemade Chocolate Pudding',
      description: 'Rich homemade chocolate pudding',
      price: 99,
      image: '/food_img/Homemade-Chocolate-Pudding.jpg',
      category: 'desserts',
    },
    {
      id: 15,
      name: 'Orange Creamsicle Bars',
      description: 'Delicious orange creamsicle bars',
      price: 99,
      image: '/food_img/Orange-Creamsicle-Bars.jpg',
      category: 'desserts',
    },
    {
      id: 16,
      name: 'Lemon Whipped Lemonade',
      description: 'Fresh lemon whipped lemonade',
      price: 99,
      image: '/food_img/Frozen-Whipped-Lemonade.jpg',
      category: 'drinks',
    },
  ];

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