import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../apiConfig';
import { apiFetch } from '../apiClient';
import { getBangkokDateString } from '../utils/bangkokDate';
import { useKitchenStream } from '../hooks/useKitchenStream';
import KitchenQueue from '../pages/kitchen/KitchenQueue';
import KitchenReservations from '../pages/kitchen/KitchenReservations';
import './AdminKitchenSection.css';

const AdminKitchenSection = () => {
  const [view, setView] = useState('queue');
  const [stock, setStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  const fetchStock = useCallback(async () => {
    setLoadingStock(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/kitchen/stock`);
      const data = await res.json();
      if (res.ok) setStock(data.items || []);
    } catch (err) {
      console.error('Admin stock load error:', err);
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'stock') fetchStock();
  }, [view, fetchStock]);

  const onKitchenEvent = useCallback(
    (event) => {
      if (event.type === 'stock_updated' && view === 'stock') fetchStock();
    },
    [view, fetchStock],
  );
  useKitchenStream(onKitchenEvent);

  return (
    <div className="admin-kitchen-section">
      <div className="admin-kitchen-subtabs">
        <button
          type="button"
          className={view === 'queue' ? 'active' : ''}
          onClick={() => setView('queue')}
        >
          Live queue
        </button>
        <button
          type="button"
          className={view === 'reservations' ? 'active' : ''}
          onClick={() => setView('reservations')}
        >
          Reservations
        </button>
        <button
          type="button"
          className={view === 'stock' ? 'active' : ''}
          onClick={() => setView('stock')}
        >
          Stock overview
        </button>
      </div>
      {view === 'queue' ? (
        <KitchenQueue />
      ) : view === 'reservations' ? (
        <KitchenReservations apiBasePath="/api/admin/kitchen/reservations" />
      ) : (
        <div className="admin-kitchen-stock">
          <p className="text-muted small">Today: {getBangkokDateString()}</p>
          {loadingStock && <p>Loading stock…</p>}
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead>
                <tr>
                  <th>Meal</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((row) => (
                  <tr key={row.mealFileId} className={row.isLowStock ? 'admin-kitchen-low' : ''}>
                    <td>{row.mealName}</td>
                    <td>{row.category}</td>
                    <td>{row.stock}</td>
                    <td>{row.lowStockThreshold}</td>
                    <td>{row.isLowStock ? 'Low' : 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKitchenSection;
