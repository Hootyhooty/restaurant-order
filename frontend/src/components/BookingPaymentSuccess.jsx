import { Link, useSearchParams } from 'react-router-dom';

const BookingPaymentSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <section className="meals-section">
      <div className="container">
        <h2>Payment received</h2>
        <p>
          Thanks! Your booking payment was completed. If the table was still available, your reservation will be confirmed
          shortly and you’ll receive an Admin message in your Profile.
        </p>
        {sessionId && <p><strong>Session:</strong> {sessionId}</p>}
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/profile" className="btn btn-primary">Go to Profile</Link>
          <Link to="/booking" className="btn btn-outline-secondary">Back to Booking</Link>
        </div>
      </div>
    </section>
  );
};

export default BookingPaymentSuccess;

