import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../../apiConfig';
import { apiFetch } from '../../apiClient';
import { getBangkokDateString } from '../../utils/bangkokDate';
import { useKitchenStream } from '../../hooks/useKitchenStream';
import './KitchenQueue.css';

const POLL_MS = 8000;
const TERMINAL = new Set(['served', 'cancelled']);

const formatBangkokTime = (isoString) => {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
};

const formatTimeSlot = (timeSlot) => {
  if (!timeSlot) return '—';
  return String(timeSlot).replace('-', '–');
};

const KitchenQueue = () => {
  const [orders, setOrders] = useState([]);
  const [date, setDate] = useState(getBangkokDateString);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const etagRef = useRef(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ date });
      const headers = {};
      if (etagRef.current) headers['If-None-Match'] = etagRef.current;

      const res = await apiFetch(`${API_BASE}/api/kitchen/orders?${params}`, { headers });
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
      setError(err.message || 'Failed to load queue');
      if (!silent) setOrders([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    etagRef.current = null;
    fetchOrders();
    const id = setInterval(() => fetchOrders(true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const onKitchenEvent = useCallback(() => {
    fetchOrders(true);
  }, [fetchOrders]);
  useKitchenStream(onKitchenEvent);

  const patchLines = async (orderId, lineIndexes, lineStatus) => {
    setUpdating(`${orderId}-${lineIndexes.join(',')}-${lineStatus}`);
    try {
      const res = await apiFetch(`${API_BASE}/api/kitchen/orders/${orderId}/lines`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineIndexes, lineStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      etagRef.current = null;
      await fetchOrders(true);
    } catch (err) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const startPreparing = async (orderId) => {
    setUpdating(`${orderId}-start`);
    try {
      const res = await apiFetch(`${API_BASE}/api/kitchen/orders/${orderId}`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      etagRef.current = null;
      await fetchOrders(true);
    } catch (err) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const markAllReady = async (order) => {
    const indexes = (order.lines || [])
      .map((line, idx) => (line.lineStatus === 'preparing' ? idx : -1))
      .filter((idx) => idx >= 0);
    if (!indexes.length) return;
    await patchLines(order.id, indexes, 'ready');
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
          <button type="button" className="btn btn-primary" onClick={() => fetchOrders()} disabled={loading}>
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
          const hasPreparing = (order.lines || []).some((l) => l.lineStatus === 'preparing');
          const hasReady = (order.lines || []).some((l) => l.lineStatus === 'ready');
          const allTerminal = (order.lines || []).every((l) => TERMINAL.has(l.lineStatus));
          const isReservation = order.source === 'booking_preorder';
          const ticketLabel = isReservation
            ? `Reserved #${order.reservedTicketNumber ?? order.displayNumber ?? '—'}`
            : `#${order.ticketNumber ?? order.displayNumber ?? '—'}`;
          const timeLabel = isReservation
            ? `Visit ${formatTimeSlot(order.visitTimeSlot)} · Arrived ${formatBangkokTime(order.createdAt)}`
            : `Ordered ${formatBangkokTime(order.createdAt)}`;
          return (
            <article key={order.id} className="kitchen-ticket">
              <header className="kitchen-ticket-header">
                <span className="kitchen-ticket-number">{ticketLabel}</span>
                <span className={`kitchen-ticket-badge kitchen-ticket-badge--${order.source}`}>
                  {order.sourceLabel}
                </span>
                {order.tableId != null && (
                  <span className="kitchen-ticket-table">Table {order.tableId}</span>
                )}
              </header>
              <p className="kitchen-ticket-time">{timeLabel}</p>
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
                      <div className="kitchen-line-main">
                        <span>{line.name}</span>
                        <span className="kitchen-line-status">{line.lineStatus}</span>
                      </div>
                      {!terminal && (
                        <div className="kitchen-line-actions">
                          {line.lineStatus === 'preparing' && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              disabled={busy}
                              onClick={() => patchLines(order.id, [idx], 'ready')}
                            >
                              Mark ready
                            </button>
                          )}
                          {line.lineStatus === 'ready' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busy}
                              onClick={() => patchLines(order.id, [idx], 'served')}
                            >
                              Served
                            </button>
                          )}
                          <button
                            type="button"
                            className="kitchen-line-cancel"
                            disabled={busy}
                            onClick={() => patchLines(order.id, [idx], 'cancelled')}
                          >
                            Cancel
                          </button>
                        </div>
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
                {hasPreparing && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!!updating}
                    onClick={() => markAllReady(order)}
                  >
                    Mark all ready
                  </button>
                )}
                {(hasReady || hasPreparing) && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!!updating || allTerminal}
                    onClick={() => completeAllPending(order)}
                  >
                    Complete ticket
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenQueue;
