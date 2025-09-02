import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <img
                src="/food_img/Picha.png"
                alt="Picha"
                className="footer-logo-img"
              />
            </div>
            <p className="footer-description">
              Picha - The flavors you love for over 50 years
            </p>
            <div className="social-links">
              <a href="#" className="social-link">Facebook</a>
              <a href="#" className="social-link">Instagram</a>
              <a href="#" className="social-link">Twitter</a>
              <a href="#" className="social-link">YouTube</a>
            </div>
          </div>
          <div className="footer-section">
            <h3 className="footer-title">Menu</h3>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">Rice</a></li>
              <li><a href="#" className="footer-link">Sandwich</a></li>
              <li><a href="#" className="footer-link">Sides</a></li>
              <li><a href="#" className="footer-link">Drinks</a></li>
              <li><a href="#" className="footer-link">Desserts</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3 className="footer-title">Services</h3>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">Online Ordering</a></li>
              <li><a href="#" className="footer-link">Delivery</a></li>
              <li><a href="#" className="footer-link">Pickup</a></li>
              <li><a href="#" className="footer-link">Promotions</a></li>
              <li><a href="#" className="footer-link">Gift Cards</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3 className="footer-title">About Us</h3>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">History</a></li>
              <li><a href="#" className="footer-link">News</a></li>
              <li><a href="#" className="footer-link">Careers</a></li>
              <li><a href="#" className="footer-link">Contact Us</a></li>
              <li><a href="#" className="footer-link">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3 className="footer-title">Contact Us</h3>
            <div className="contact-info">
              <p>Phone: 02-123-4567</p>
              <p>Email: info@picha.co.th</p>
              <p>Address: Bangkok, Thailand</p>
            </div>
            <div className="app-downloads">
              <h4>Download App</h4>
              <div className="app-buttons">
                <button className="app-btn">App Store</button>
                <button className="app-btn">Google Play</button>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; 2024 Picha. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#" className="footer-bottom-link">Terms of Service</a>
              <a href="#" className="footer-bottom-link">Privacy Policy</a>
              <a href="#" className="footer-bottom-link">Sitemap</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;