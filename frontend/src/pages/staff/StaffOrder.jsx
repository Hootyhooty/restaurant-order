import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../apiConfig';
import { apiFetch } from '../../apiClient';
import './StaffOrder.css';

const StaffOrder = () => {
  const navigate = useNavigate();
  const cartKeySeq = useRef(0);
  const [tableId, setTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [meals, setMeals] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: 'All' }]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/api/staff/menu`);
        if (!res.ok) throw new Error('Failed to load menu');
        const data = await res.json();
        setMeals(data.items || []);
        setCategories(data.categories || [{ id: 'all', name: 'All' }]);
      } catch (err) {
        setError(err.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredMeals =
    activeCategory === 'all' ? meals : meals.filter((m) => m.category === activeCategory);

  const addToCart = (meal) => {
    cartKeySeq.current += 1;
    setCart((prev) => [
      ...prev,
      {
        cartKey: cartKeySeq.current,
        mealId: meal.id,
        name: meal.name,
        unitPrice: meal.price,
      },
    ]);
  };

  const toggleSelect = (cartKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(cartKey)) next.delete(cartKey);
      else next.add(cartKey);
      return next;
    });
  };

  const deleteSelected = () => {
    if (!selectedKeys.size) return;
    setCart((prev) => prev.filter((line) => !selectedKeys.has(line.cartKey)));
    setSelectedKeys(new Set());
  };

  const collapseItems = () => {
    const counts = new Map();
    for (const line of cart) {
      counts.set(line.mealId, (counts.get(line.mealId) || 0) + 1);
    }
    return [...counts.entries()].map(([mealId, quantity]) => ({ mealId, quantity }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const table = Number(tableId);
    if (!Number.isInteger(table) || table < 1 || table > 12) {
      alert('Enter a table number between 1 and 12.');
      return;
    }
    if (!cart.length) {
      alert('Add at least one item to the order.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/staff/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableId: table,
          customerName: customerName.trim() || undefined,
          items: collapseItems(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      setCart([]);
      setSelectedKeys(new Set());
      navigate(`/staff/status?tableId=${table}`);
    } catch (err) {
      alert(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((sum, l) => sum + (Number(l.unitPrice) || 0), 0);

  if (loading) {
    return <div className="staff-order-msg">Loading menu…</div>;
  }

  return (
    <div className="staff-order">
      <h2>Table order</h2>
      {error && <p className="staff-order-error">{error}</p>}

      <form className="staff-order-form" onSubmit={handleSubmit}>
        <div className="staff-order-meta">
          <label>
            Table No.
            <input
              type="number"
              min="1"
              max="12"
              className="form-control"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              required
            />
          </label>
          <label>
            Customer name (optional)
            <input
              type="text"
              className="form-control"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Guest name"
            />
          </label>
        </div>

        <div className="staff-order-layout">
          <div className="staff-order-menu">
            <div className="staff-order-categories">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`staff-order-cat${activeCategory === cat.id ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="staff-order-meals">
              {filteredMeals.map((meal) => (
                <div key={meal.id} className="staff-order-meal">
                  <div>
                    <strong>{meal.name}</strong>
                    <span className="staff-order-price">฿{Number(meal.price).toLocaleString()}</span>
                  </div>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => addToCart(meal)}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <aside className="staff-order-summary">
            <h3>Summary</h3>
            {cart.length === 0 && <p className="staff-order-empty">No items yet.</p>}
            <ul className="staff-order-cart">
              {cart.map((line) => (
                <li key={line.cartKey}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(line.cartKey)}
                      onChange={() => toggleSelect(line.cartKey)}
                    />
                    {line.name}
                  </label>
                  <span>฿{Number(line.unitPrice).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            {cart.length > 0 && (
              <>
                <p className="staff-order-total">Total: ฿{cartTotal.toLocaleString()}</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm staff-order-delete"
                  onClick={deleteSelected}
                  disabled={!selectedKeys.size}
                >
                  Delete selected
                </button>
              </>
            )}
            <button
              type="submit"
              className="btn btn-primary staff-order-submit"
              disabled={submitting || !cart.length}
            >
              {submitting ? 'Submitting…' : 'Submit to kitchen'}
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default StaffOrder;
