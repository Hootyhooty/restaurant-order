# Restaurant App

A React application that duplicates the KFC Thailand meals page with a modern, responsive design.

## Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Menu**: Category filtering and meal selection
- **Modern UI**: Clean, professional design with KFC branding
- **Quantity Controls**: Add/remove items with quantity controls
- **Shopping Cart**: Add items to cart functionality
- **Thai Language Support**: Full Thai language interface

## Technologies Used

- React 18
- CSS3 with Flexbox and Grid
- Responsive design principles
- Modern JavaScript (ES6+)

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

## Project Structure

```
src/
├── backend/                       # New folder for Node.js backend
│   ├── models/
│   │   └── Customer.js           # Mongoose schema for customers
│   ├── routes/
│   │   └── auth.js              # API routes for register/login
│   ├── .env                     # Environment variables (MongoDB URI)
│   ├── index.js                 # Express server entry point
│   └── package.json             # Backend dependencies
├── components/
│   ├── Register.jsx             # New registration page
│   ├── Register.css             # New styles for registration page
│   ├── Login.jsx                # Updated for "Create Account" button
│   ├── Login.css                # Updated for button styling
│   ├── Header.jsx               # Unchanged
│   ├── MealCard.jsx             # Unchanged
│   ├── MealCard.css             # Unchanged
│   ├── Menu.jsx                 # Unchanged
│   ├── Home.jsx                 # Unchanged
│   ├── Footer.jsx               # Unchanged
├── context/
│   ├── AuthContext.jsx          # Updated for register and backend login
├── App.jsx                      # Updated for /register route
├── App.css                      # Unchanged
├── index.jsx                    # Unchanged
├── index.css                    # Unchanged
public/
└── food_img/                    # Unchanged
```

## Features Breakdown

### Header Component
- Restaurant logo and branding
- Responsive navigation menu
- Mobile hamburger menu
- Login and order buttons

### Hero Section
- Eye-catching banner with gradient background
- Call-to-action buttons
- Responsive design

### Meals Section
- Category filtering (All, Fried Chicken, Burgers, Sides, Drinks, Desserts)
- Grid layout for meal cards
- Responsive grid that adapts to screen size

### Meal Cards
- Product images with hover effects
- Product information (name, description, price)
- Quantity controls
- Add to cart functionality
- Popular item badges

### Footer
- Company information and links
- Social media links
- Contact information
- App download buttons
- Copyright and legal links

## Customization

### Colors
The application uses colors:
- Primary Red: `#e31837`
- Dark Red: `#c41230`
- Background: `#f8f9fa`

### Adding New Meals
To add new meals, edit the `meals` array in `src/components/MealsSection.js`:

```javascript
{
  id: 25,
  name: 'New Meal Name',
  description: 'Meal description',
  price: 299,
  image: 'image-url',
  category: 'chicken',
  isPopular: false
}
```

## License

This project is for educational purposes only.

## Contributing

Feel free to submit issues and enhancement requests! 