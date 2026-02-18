import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const PaymentSuccess = () => {
  const { clearCart } = useCart();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <section className="meals-section">
      <div className="container">
        <h2>Payment successful</h2>
        <p>Thanks! Your payment was completed.</p>
        {sessionId && <p><strong>Session:</strong> {sessionId}</p>}
        <Link to="/menu" className="btn btn-primary">Back to menu</Link>
      </div>
    </section>
  );
};

export default PaymentSuccess;

