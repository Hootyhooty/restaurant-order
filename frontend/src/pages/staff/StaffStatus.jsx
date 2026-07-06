import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE } from '../../apiConfig';
import { getBangkokDateString } from '../../utils/bangkokDate';
import { useKitchenStream } from '../../hooks/useKitchenStream';
import './StaffStatus.css';

const POLL_MS = 8000;
const TERMINAL = new Set(['served', 'cancelled']);

const StaffStatus = () => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [date, setDate] = useState(getBangkokDateString);
  const [tableId, setTableId] = useState(searchParams.get('tableId') || '');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const etagRef = useRef(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ date });
      if (tableId.trim()) params.set('tableId', tableId.trim());
      if (search.trim()) params.set('q', search.trim());
      const headers = { Authorization: `Bearer ${token}` };
      if (etagRef.current) headers['If-None-Match'] = etagRef.current;

      const res = await fetch(`${API_BASE}/api/staff/orders?${params}`, { headers });
      if (res.status === 304) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const nextEtag = res.headers.get('etag');
      if (nextEtag) etagRef.current = nextEtag;
      const data = await res.json();
      setOrders(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
      if (!silent) setOrders([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [date, tableId, search, token]);

  useEffect(() => {
    etagRef.current = null;
    fetchOrders();
    const id = setInterval(() => fetchOrders(true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  useKitchenStream(token, () => {
    etagRef.current = null;
    fetchOrders(true);
  });

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  return (
    <div className="staff-status">
      <h2>Order status</h2>

      <form className="staff-status-filters" onSubmit={handleFilterSubmit}>
        <label>
          Date
          <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Table
          <input
            type="number"
            min="1"
            max="12"
            className="form-control"
            placeholder="All"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
          />
        </label>
        <label>
          Search
          <input
            type="text"
            className="form-control"
            placeholder="Customer, slip #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary">Search</button>
        <button type="button" className="btn btn-secondary" onClick={fetchOrders} disabled={loading}>
          Refresh
        </button>
      </form>

      {loading && orders.length === 0 && <p className="staff-status-msg">Loading…</p>}
      {error && <p className="staff-status-error">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="staff-status-msg">No orders found.</p>
      )}

      <div className="staff-status-list">
        {orders.map((order) => {
          const expanded = expandedId === order.id;
          return (
            <article key={order.id} className="staff-status-card">
              <button
                type="button"
                className="staff-status-card-header"
                onClick={() => setExpandedId(expanded ? null : order.id)}
              >
                <span className="staff-status-slip">#{order.ticketNumber}</span>
                <span className="staff-status-source">{order.sourceLabel}</span>
                {order.tableId != null && <span>Table {order.tableId}</span>}
                <span className="staff-status-customer">{order.customerName}</span>
                <span className={`staff-status-badge staff-status-badge--${order.status}`}>
                  {order.status}
                </span>
              </button>
              {expanded && (
                <ul className="staff-status-lines">
                  {(order.lines || []).map((line, idx) => (
                    <li
                      key={`${order.id}-${idx}`}
                      className={TERMINAL.has(line.lineStatus) ? 'staff-status-line--terminal' : ''}
                    >
                      <span>{line.name}</span>
                      <span className="staff-status-line-status">{line.lineStatus}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default StaffStatus;
