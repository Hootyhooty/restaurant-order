import './Footer.css';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="footer-brand">PICHA</span>
        <nav className="footer-social">
          <a href="#" className="footer-social-link">Facebook</a>
          <a href="#" className="footer-social-link">Instagram</a>
          <a href="#" className="footer-social-link">Twitter</a>
        </nav>
        <p className="footer-copy">&copy; {year} Picha Restaurant</p>
      </div>
    </footer>
  );
};

export default Footer;
