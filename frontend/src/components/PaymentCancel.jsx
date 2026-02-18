import { Link } from 'react-router-dom';

const PaymentCancel = () => {
  return (
    <section className="meals-section">
      <div className="container">
        <h2>Payment canceled</h2>
        <p>No charge was made. You can try again anytime.</p>
        <Link to="/menu" className="btn btn-primary">Back to menu</Link>
      </div>
    </section>
  );
};

export default PaymentCancel;

