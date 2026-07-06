import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../apiConfig';
import { getDefaultStaffBookingDate } from '../../utils/bangkokDate';
import './StaffBookings.css';

const StaffBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(getDefaultStaffBookingDate);
  const [confirmBooking, setConfirmBooking] = useState(null);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (search.trim()) params.set('q', search.trim());

      const res = await fetch(`${API_BASE}/api/staff/bookings?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setBookings(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [date, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings();
  };

  const handleCheckIn = async () => {
    if (!confirmBooking) return;
    setCheckInSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/staff/bookings/${confirmBooking.id}/check-in`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      setConfirmBooking(null);
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    } finally {
      setCheckInSubmitting(false);
    }
  };

  const formatTime = (timeSlot) => {
    if (!timeSlot) return '—';
    return String(timeSlot).replace('-', '–');
  };

  const formatCost = (cost) => {
    if (cost == null) return '—';
    return `฿${Number(cost).toLocaleString()}`;
  };

  return (
    <div className="staff-bookings">
      <div className="staff-bookings-header">
        <h2>Bookings</h2>
      </div>

      <form className="staff-bookings-filters" onSubmit={handleSearchSubmit}>
        <div className="staff-bookings-filter">
          <label htmlFor="staff-booking-search">Search</label>
          <input
            id="staff-booking-search"
            type="text"
            className="form-control"
            placeholder="Customer name, table…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="staff-bookings-filter">
          <label htmlFor="staff-booking-date">Date</label>
          <input
            id="staff-booking-date"
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary staff-bookings-search-btn">
          Search
        </button>
      </form>

      {loading && <div className="staff-bookings-message">Loading bookings…</div>}
      {error && <div className="staff-bookings-error">{error}</div>}

      {!loading && !error && bookings.length === 0 && (
        <div className="staff-bookings-message">No bookings found for this date.</div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="table-responsive">
          <table className="table table-bordered staff-bookings-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Table</th>
                <th>Pre-order</th>
                <th>Deposit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.date}</td>
                  <td>{formatTime(b.time || b.timeSlot)}</td>
                  <td>{b.customerName || '—'}</td>
                  <td>{b.table ?? b.tableId ?? '—'}</td>
                  <td>
                    {b.hasPreOrder || b.preOrder ? (
                      <span className="staff-badge staff-badge--preorder">Pre-order</span>
                    ) : (
                      <span className="staff-badge staff-badge--none">No order</span>
                    )}
                  </td>
                  <td>{formatCost(b.reservationCost ?? b.amountTotal)}</td>
                  <td>
                    {b.canCheckIn ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm staff-checkin-btn"
                        onClick={() => setConfirmBooking(b)}
                      >
                        Check in &amp; refund deposit
                      </button>
                    ) : (
                      <span className="staff-status-label" title={b.source === 'intent' ? 'Awaiting payment confirmation' : ''}>
                        {b.status === 'payment_pending'
                          ? 'Awaiting payment'
                          : b.status === 'payment_processing'
                            ? 'Payment processing'
                            : b.status || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmBooking && (
        <div className="staff-modal-overlay" onClick={() => !checkInSubmitting && setConfirmBooking(null)}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="staff-modal-header">
              <h3>Confirm check-in</h3>
              <button
                type="button"
                className="staff-modal-close"
                onClick={() => !checkInSubmitting && setConfirmBooking(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="staff-modal-body">
              <p>
                Check in <strong>{confirmBooking.customerName}</strong> at table{' '}
                <strong>{confirmBooking.table ?? confirmBooking.tableId}</strong>?
              </p>
              <p className="staff-modal-warning">
                The reservation deposit will be refunded to the customer. This action cannot be undone.
              </p>
            </div>
            <div className="staff-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmBooking(null)}
                disabled={checkInSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCheckIn}
                disabled={checkInSubmitting}
              >
                {checkInSubmitting ? 'Processing…' : 'Confirm check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffBookings;
