import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../apiConfig';
import { useKitchenStream } from '../../hooks/useKitchenStream';
import './KitchenStock.css';

const KitchenStock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/kitchen/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  useKitchenStream(token, (event) => {
    if (event.type === 'stock_updated') fetchStock();
  });

  const saveRow = async (mealFileId, stock, lowStockThreshold) => {
    setSavingId(mealFileId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/kitchen/stock/${mealFileId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock: Number(stock), lowStockThreshold: Number(lowStockThreshold) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems((prev) => prev.map((row) => (row.mealFileId === mealFileId ? data.item : row)));
    } catch (err) {
      alert(err.message || 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="kitchen-stock">
      <div className="kitchen-stock-toolbar">
        <h2>Meal stock</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={fetchStock} disabled={loading}>
          Refresh
        </button>
      </div>
      {loading && items.length === 0 && <p className="kitchen-stock-msg">Loading stock…</p>}
      {error && <p className="kitchen-stock-error">{error}</p>}
      <div className="table-responsive">
        <table className="table table-bordered table-hover kitchen-stock-table">
          <thead>
            <tr>
              <th>Meal</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Low threshold</th>
              <th>Status</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <StockRow key={row.mealFileId} row={row} saving={savingId === row.mealFileId} onSave={saveRow} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StockRow = ({ row, saving, onSave }) => {
  const [stock, setStock] = useState(row.stock);
  const [threshold, setThreshold] = useState(row.lowStockThreshold);

  useEffect(() => {
    setStock(row.stock);
    setThreshold(row.lowStockThreshold);
  }, [row.stock, row.lowStockThreshold]);

  return (
    <tr className={row.isLowStock ? 'kitchen-stock-row--low' : ''}>
      <td>{row.mealName}</td>
      <td>{row.category}</td>
      <td>
        <input
          type="number"
          min="0"
          className="form-control form-control-sm"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          className="form-control form-control-sm"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </td>
      <td>{row.isLowStock ? 'Low' : 'OK'}</td>
      <td>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={saving}
          onClick={() => onSave(row.mealFileId, stock, threshold)}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  );
};

export default KitchenStock;
