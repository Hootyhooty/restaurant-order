import { Link } from 'react-router-dom';

const BookingPaymentCancel = () => {
  return (
    <section className="meals-section">
      <div className="container">
        <h2>Payment cancelled</h2>
        <p>Your booking payment was cancelled. No reservation was created.</p>
        <Link to="/booking" className="btn btn-primary">Back to Booking</Link>
      </div>
    </section>
  );
};

export default BookingPaymentCancel;

