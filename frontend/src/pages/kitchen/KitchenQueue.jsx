import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../apiConfig';
import { getBangkokDateString } from '../../utils/bangkokDate';
import './KitchenQueue.css';

const POLL_MS = 20000;
const TERMINAL = new Set(['served', 'cancelled']);

const KitchenQueue = () => {
  const [orders, setOrders] = useState([]);
  const [date, setDate] = useState(getBangkokDateString);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ date });
      const res = await fetch(`${API_BASE}/api/kitchen/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setOrders(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load queue');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const patchLines = async (orderId, lineIndexes, lineStatus) => {
    setUpdating(`${orderId}-${lineIndexes.join(',')}-${lineStatus}`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/kitchen/orders/${orderId}/lines`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineIndexes, lineStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      await fetchOrders();
    } catch (err) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const startPreparing = async (orderId) => {
    setUpdating(`${orderId}-start`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/kitchen/orders/${orderId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      await fetchOrders();
    } catch (err) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const completeAllPending = async (order) => {
    const indexes = (order.lines || [])
      .map((line, idx) => (!TERMINAL.has(line.lineStatus) ? idx : -1))
      .filter((idx) => idx >= 0);
    if (!indexes.length) return;
    await patchLines(order.id, indexes, 'served');
  };

  const activeOrders = orders.filter((o) => o.status !== 'served' && o.status !== 'cancelled');

  return (
    <div className="kitchen-queue">
      <div className="kitchen-queue-toolbar">
        <h2>Order queue</h2>
        <div className="kitchen-queue-controls">
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={fetchOrders} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {loading && orders.length === 0 && <p className="kitchen-queue-msg">Loading queue…</p>}
      {error && <p className="kitchen-queue-error">{error}</p>}
      {!loading && !error && activeOrders.length === 0 && (
        <p className="kitchen-queue-msg">No active orders for this date.</p>
      )}

      <div className="kitchen-queue-grid">
        {activeOrders.map((order) => {
          const hasPending = (order.lines || []).some((l) => l.lineStatus === 'pending');
          const allTerminal = (order.lines || []).every((l) => TERMINAL.has(l.lineStatus));
          return (
            <article key={order.id} className="kitchen-ticket">
              <header className="kitchen-ticket-header">
                <span className="kitchen-ticket-number">#{order.ticketNumber}</span>
                <span className={`kitchen-ticket-badge kitchen-ticket-badge--${order.source}`}>
                  {order.sourceLabel}
                </span>
                {order.tableId != null && (
                  <span className="kitchen-ticket-table">Table {order.tableId}</span>
                )}
              </header>
              <p className="kitchen-ticket-customer">{order.customerName}</p>
              <ul className="kitchen-ticket-lines">
                {(order.lines || []).map((line, idx) => {
                  const terminal = TERMINAL.has(line.lineStatus);
                  const busy = updating?.startsWith(order.id);
                  return (
                    <li
                      key={`${order.id}-${idx}`}
                      className={`kitchen-line${terminal ? ' kitchen-line--terminal' : ''}`}
                    >
                      <label className="kitchen-line-label">
                        <input
                          type="checkbox"
                          checked={line.lineStatus === 'served'}
                          disabled={terminal || busy}
                          onChange={() => patchLines(order.id, [idx], 'served')}
                        />
                        <span>{line.name}</span>
                        <span className="kitchen-line-status">{line.lineStatus}</span>
                      </label>
                      {!terminal && (
                        <button
                          type="button"
                          className="kitchen-line-cancel"
                          disabled={busy}
                          onClick={() => patchLines(order.id, [idx], 'cancelled')}
                        >
                          Cancel
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <footer className="kitchen-ticket-footer">
                {hasPending && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!!updating}
                    onClick={() => startPreparing(order.id)}
                  >
                    Start preparing
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!!updating || allTerminal}
                  onClick={() => completeAllPending(order)}
                >
                  Complete ticket
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenQueue;
