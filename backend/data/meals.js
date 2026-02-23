// src/backend/data/meals.js
// Source of truth for menu categories and meals data (backend only)

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
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853650/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853650/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853650/restaurant/migrated/food_img/Lemon-Chicken-and-Rice.jpg',
    category: 'rice',
    isPopular: true,
  },
  {
    id: 2,
    name: 'Southwestern Rice',
    description: 'Savory southwestern rice with mixed vegetables',
    price: 79,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853660/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853660/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853660/restaurant/migrated/food_img/Southwestern-Rice.jpg',
    category: 'rice',
    isPopular: true,
  },
  {
    id: 3,
    name: 'Shrimp Rice Casserole',
    description: 'Fresh shrimp rice casserole with green onions',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853651/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853651/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853651/restaurant/migrated/food_img/Makeover-Shrimp-Rice-Casserole.jpg',
    category: 'rice',
  },
  {
    id: 4,
    name: 'Jambalaya',
    description: 'Spicy jambalaya rice with sausage and chicken',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853647/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853647/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853647/restaurant/migrated/food_img/Jambalaya.jpg',
    category: 'rice',
  },
  {
    id: 5,
    name: 'Turkey Club Sandwich',
    description: 'Classic turkey club sandwich with bacon',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853662/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853662/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853662/restaurant/migrated/food_img/Turkey-Club-Sandwich.jpg',
    category: 'sandwich',
  },
  {
    id: 6,
    name: 'Copycat Panera Bacon Turkey Bravo',
    description: 'Premium bacon turkey sandwich with special sauce',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853639/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853639/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853639/restaurant/migrated/food_img/Copycat-Panera-Bacon-Turkey-Bravo.jpg',
    category: 'sandwich',
  },
  {
    id: 7,
    name: 'Sloppy Joes Burger',
    description: 'Delicious sloppy joes burger with sauce',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853659/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853659/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853659/restaurant/migrated/food_img/Sloppy-Joes-Burger.jpg',
    category: 'sandwich',
  },
  {
    id: 8,
    name: 'Feta Bruschetta',
    description: 'Fresh feta bruschetta with tomatoes',
    price: 69,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853641/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853641/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853641/restaurant/migrated/food_img/Feta-Bruschetta.jpg',
    category: 'sides',
  },
  {
    id: 9,
    name: 'Kenai Dip',
    description: 'Creamy Kenai dip with chips',
    price: 69,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853648/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853648/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853648/restaurant/migrated/food_img/Kenai-Dip.jpg',
    category: 'sides',
  },
  {
    id: 10,
    name: 'Perfect Bite Fruit Salad',
    description: 'Fresh fruit salad with perfect bites',
    price: 69,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853655/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853655/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853655/restaurant/migrated/food_img/Perfect-Bite-Fruit-Salad.jpg',
    category: 'sides',
  },
  {
    id: 11,
    name: 'Frozen Whipped Lemonade',
    description: 'Refreshing frozen whipped lemonade',
    price: 69,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853642/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853642/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853642/restaurant/migrated/food_img/Frozen-Whipped-Lemonade.jpg',
    category: 'drinks',
  },
  {
    id: 12,
    name: 'Sgroppino',
    description: 'Italian sgroppino cocktail',
    price: 79,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853658/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853658/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853658/restaurant/migrated/food_img/Sgroppino.jpg',
    category: 'drinks',
  },
  {
    id: 13,
    name: 'Carajillo',
    description: 'Spanish carajillo coffee cocktail',
    price: 79,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853638/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853638/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853638/restaurant/migrated/food_img/Carajillo.jpg',
    category: 'drinks',
  },
  {
    id: 14,
    name: 'Homemade Chocolate Pudding',
    description: 'Rich homemade chocolate pudding',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853646/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853646/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853646/restaurant/migrated/food_img/Homemade-Chocolate-Pudding.jpg',
    category: 'desserts',
  },
  {
    id: 15,
    name: 'Orange Creamsicle Bars',
    description: 'Delicious orange creamsicle bars',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853654/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853654/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853654/restaurant/migrated/food_img/Orange-Creamsicle-Bars.jpg',
    category: 'desserts',
  },
  {
    id: 16,
    name: 'Lemon Whipped Lemonade',
    description: 'Fresh lemon whipped lemonade',
    price: 99,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853642/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853642/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853642/restaurant/migrated/food_img/Frozen-Whipped-Lemonade.jpg',
    category: 'drinks',
  },
  {
    id: 17,
    name: 'Chicken Bacon Ranch',
    description: 'Featuring a favorite combination of flavors, our Chicken Bacon Ranch with Sweet Potatoes is High in protein and fiber, this dish is both nutritious and delicious.',
    price: 89,
    image: 'https://res.cloudinary.com/dpfypv35h/image/upload/v1771853652/restaurant/migrated/https://res.cloudinary.com/dpfypv35h/image/upload/v1771853652/restaurant/migratedhttps://res.cloudinary.com/dpfypv35h/image/upload/v1771853652/restaurant/migrated/food_img/menu_1771062917406.jpg',
    category: 'sides',
  },
];

function getMealBySlug(slug) {
  const safeSlug = (slug || '').replace(/_/g, ' ');
  return (
    meals.find(
      (m) =>
        m.name.replace(/\s+/g, '_') === slug ||
        m.name === safeSlug
    ) || null
  );
}

module.exports = {
  categories,
  meals,
  getMealBySlug,
};

