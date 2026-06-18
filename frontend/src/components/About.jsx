import { Link } from 'react-router-dom';
import './About.css';

const STORY_SECTIONS = [
  {
    id: 'roots',
    title: 'Where it began',
    text: 'Picha started as a small family kitchen with a simple promise: serve honest food with warmth, and treat every guest like family. What began around a single table has grown into a place where generations return for the flavors they grew up with.',
    imageLeft: true,
    blankImage: true,
  },
  {
    id: 'craft',
    title: 'Food with heart',
    text: 'We blend classic Thai recipes with international favorites, using fresh ingredients prepared daily. Every dish is made to order — whether you dine in, book a table for a celebration, or order from our menu online.',
    imageLeft: false,
    blankImage: true,
  },
  {
    id: 'today',
    title: 'More than a meal',
    text: 'Today Picha is a gathering place for birthdays, quiet lunches, and late dinners with friends. We believe great restaurants are built on great memories — and we are proud to be part of yours.',
    imageLeft: true,
    blankImage: false,
  },
];

const About = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container about-hero-inner">
          <span className="about-eyebrow">Our story</span>
          <h1 className="about-hero-title">A table for everyone</h1>
          <p className="about-hero-text">
            For over five decades, Picha has welcomed guests with the aromas of home-style cooking,
            thoughtful service, and a space made for connection.
          </p>
        </div>
      </section>

      {STORY_SECTIONS.map((section) => (
        <section key={section.id} className="about-story-section">
          <div className="container about-story-grid">
            {section.imageLeft && section.blankImage && (
              <div className="about-image-placeholder" aria-hidden="true">
                <span>Image coming soon</span>
              </div>
            )}
            <div className="about-story-copy">
              <h2 className="about-story-title">{section.title}</h2>
              <p className="about-story-text">{section.text}</p>
            </div>
            {!section.imageLeft && section.blankImage && (
              <div className="about-image-placeholder" aria-hidden="true">
                <span>Image coming soon</span>
              </div>
            )}
          </div>
        </section>
      ))}

      <section className="about-values">
        <div className="container">
          <h2 className="about-values-title">What we stand for</h2>
          <div className="about-values-grid">
            <div className="about-value-card">
              <h3>Fresh daily</h3>
              <p>Ingredients sourced with care for every service.</p>
            </div>
            <div className="about-value-card">
              <h3>Warm hospitality</h3>
              <p>A team that remembers your name and your favorite dish.</p>
            </div>
            <div className="about-value-card">
              <h3>Made for sharing</h3>
              <p>Plates meant to pass around the table and stories meant to last.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="container about-cta-inner">
          <h2>Come dine with us</h2>
          <p>Book a table or explore what&rsquo;s cooking tonight.</p>
          <div className="about-cta-actions">
            <Link to="/booking" className="about-btn about-btn-primary">
              Book a table
            </Link>
            <Link to="/menu" className="about-btn about-btn-secondary">
              View menu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
