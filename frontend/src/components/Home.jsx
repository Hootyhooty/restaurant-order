// src/components/Home.jsx
import './Home.css';
import { Link } from 'react-router-dom';

const CLOUD_BASE = 'https://res.cloudinary.com/dpfypv35h/image/upload';
const LOGO_URL = `${CLOUD_BASE}/v1771868611/restaurant/Picha.png`;
const HERO_BG_URL = `${CLOUD_BASE}/v1781508544/restaurant-interior_btdm4z.jpg`;

const STATS = [
  { value: '50+', label: 'Years of flavor' },
  { value: '100+', label: 'Menu items' },
  { value: '3', label: 'Locations' },
  { value: '4.8★', label: 'Customer rating' },
];

const FEATURES = [
  {
    title: 'Easy booking',
    text: 'Reserve your table online in seconds, anytime.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: 'Fast delivery',
    text: 'Fresh food delivered straight to your door.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Fresh ingredients',
    text: 'Sourced daily for every dish we serve.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9 0 5-1 9-2 11" />
        <path d="M11 20c5 0 9-4 9-9-3 0-5 .5-7 2" />
      </svg>
    ),
  },
  {
    title: 'Weekly promos',
    text: 'Special deals and seasonal offers every week.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </svg>
    ),
  },
];

const Home = () => {
  return (
    <div className="home">
      <section
        className="home-hero"
        style={{ backgroundImage: `url('${HERO_BG_URL}')` }}
      >
        <div className="home-hero-overlay" />
        <div className="container home-hero-inner">
          <img
            src={LOGO_URL}
            alt="Picha"
            className="home-hero-logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="home-badge">Est. 50+ years of flavor</span>
          <h1 className="home-hero-title">
            Good food,
            <br />
            <span className="home-hero-title-accent">great memories</span>
          </h1>
          <p className="home-hero-subtitle">
            From classic Thai dishes to international favorites — dine in, order
            online, or book your table at Picha.
          </p>
          <div className="home-hero-actions">
            <Link to="/booking" className="home-btn home-btn-primary">
              Book a table
            </Link>
            <Link to="/menu" className="home-btn home-btn-secondary">
              View menu
            </Link>
          </div>

          <div className="home-stats">
            {STATS.map((s) => (
              <div key={s.label} className="home-stat">
                <span className="home-stat-value">{s.value}</span>
                <span className="home-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-why">
        <div className="container">
          <h2 className="home-why-title">Why Picha?</h2>
          <p className="home-why-subtitle">Everything you need in one place</p>
          <div className="home-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="home-feature">
                <span className="home-feature-icon">{f.icon}</span>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
