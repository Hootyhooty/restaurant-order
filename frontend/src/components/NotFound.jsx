import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <section className="not-found-page">
      <div className="container not-found-inner">
        <p className="not-found-code">404</p>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-text">
          That link doesn’t lead anywhere on Picha. Check the address, or head back to something familiar.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/menu" className="btn btn-secondary">
            View menu
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
