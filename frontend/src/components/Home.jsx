// src/components/Home.jsx
import './Hero.css';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-overlay"></div>
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Picha</h1>
            <p className="hero-subtitle">Discover the flavors you love with our menu</p>
            <div className="hero-actions">
              <button className="btn btn-primary hero-btn">Booking</button>
              <Link to="/menu" className="btn btn-secondary hero-btn">
                View All Menu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;