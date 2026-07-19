import { useEffect, useState } from 'react';
import AdminPagination from './AdminPagination';
import { adminJson, buildAdminQuery } from './adminApi';

const BookingsSection = () => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async (nextPage = page, q = query) => {
    setLoading(true);
    try {
      const data = await adminJson(`/api/admin/bookings?${buildAdminQuery({ page: nextPage, limit: 20, q })}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (error) {
      alert(`Failed to load bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => { load(1, ''); }, []);

  const bookingAction = async (bookingId, action) => {
    const label = action === 'check-in' ? 'Show Up' : action === 'no-show' ? 'No show' : 'Cancel';
    if (!window.confirm(`${label} this booking?`)) return;
    try {
      await adminJson(`/api/admin/bookings/${bookingId}/${action}`, { method: 'POST' });
      load(1);
    } catch (error) {
      alert(`Failed: ${error.message}`);
    }
  };

  if (loading && items.length === 0) return <div className="alert alert-info">Loading...</div>;
  return (
    <div>
      <div className="row g-3 mb-3">
        <div className="col-md-9">
          <label className="form-label"><strong>Search</strong></label>
          <input className="form-control" placeholder="bookingId, userId, date, time slot, table, guests, status…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="col-md-3 d-flex align-items-end"><button className="btn btn-primary w-100" onClick={() => load(1)}>Search</button></div>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered table-hover admin-table">
          <thead className="table-dark"><tr><th>Booking ID</th><th>User ID</th><th>Date</th><th>Time</th><th>Table</th><th>Guests</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={9} className="text-center">No bookings found.</td></tr> : items.map((booking) => (
              <tr key={booking.id}>
                <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>{booking.id}</td>
                <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>{booking.userId}</td>
                <td>{booking.date}</td><td>{String(booking.timeSlot || '').replace('-', '–')}</td>
                <td>{booking.tableId}</td><td>{booking.guestCount}</td><td>{booking.status}</td>
                <td>{booking.amountTotal != null ? `฿${Number(booking.amountTotal).toLocaleString()}` : '—'}</td>
                <td><div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-success" disabled={booking.status !== 'confirmed'} onClick={() => bookingAction(booking.id, 'check-in')}>Show Up</button>
                  <button className="btn btn-outline-warning" disabled={booking.status !== 'confirmed'} onClick={() => bookingAction(booking.id, 'no-show')}>No show</button>
                  <button className="btn btn-outline-danger" disabled={booking.status !== 'confirmed'} onClick={() => bookingAction(booking.id, 'cancel')}>Cancel</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} total={total} pageSize={20} loading={loading} onPageChange={load} />
    </div>
  );
};

export default BookingsSection;
