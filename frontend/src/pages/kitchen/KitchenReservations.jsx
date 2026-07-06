import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../apiConfig';
import { getBangkokDateString } from '../../utils/bangkokDate';
import { useKitchenStream } from '../../hooks/useKitchenStream';
import './KitchenReservations.css';

const POLL_MS = 8000;

const formatTimeSlot = (timeSlot) => {
  if (!timeSlot) return '—';
  return String(timeSlot).replace('-', '–');
};

const KitchenReservations = ({ apiBasePath = '/api/kitchen/reservations' }) => {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(getBangkokDateString);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchReservations = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ date });
        const res = await fetch(`${API_BASE}${apiBasePath}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        setError(err.message || 'Failed to load reservations');
        if (!silent) setItems([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiBasePath, date, token]
  );

  useEffect(() => {
    fetchReservations();
    const id = setInterval(() => fetchReservations(true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchReservations]);

  useKitchenStream(token, (event) => {
    if (event.type === 'reservations_updated' || event.type === 'orders_updated') {
      fetchReservations(true);
    }
  });

  return (
    <div className="kitchen-reservations">
      <div className="kitchen-reservations-toolbar">
        <h2>Upcoming reservation pre-orders</h2>
        <div className="kitchen-reservations-controls">
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fetchReservations()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="kitchen-reservations-hint">
        Guests appear here after booking with a pre-order. They move to the live queue when floor staff
        confirms Show Up.
      </p>

      {loading && items.length === 0 && (
        <p className="kitchen-reservations-msg">Loading reservations…</p>
      )}
      {error && <p className="kitchen-reservations-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="kitchen-reservations-msg">No upcoming reservation pre-orders for this date.</p>
      )}

      <div className="kitchen-reservations-grid">
        {items.map((item) => (
          <article key={item.id} className="kitchen-reservation-card">
            <header className="kitchen-reservation-header">
              <span className="kitchen-reservation-time">{formatTimeSlot(item.timeSlot)}</span>
              <span className="kitchen-reservation-table">Table {item.tableId}</span>
              <span className="kitchen-reservation-guests">{item.guestCount} guests</span>
            </header>
            <p className="kitchen-reservation-customer">{item.customerName}</p>
            <ul className="kitchen-reservation-lines">
              {(item.preOrderLines || []).map((line) => (
                <li key={`${item.id}-${line.mealId}-${line.name}`}>
                  <span>{line.name}</span>
                  <span className="kitchen-reservation-qty">×{line.quantity}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
};

export default KitchenReservations;
