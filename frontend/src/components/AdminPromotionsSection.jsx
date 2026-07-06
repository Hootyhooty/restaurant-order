import { useState, useEffect } from 'react';
import { API_BASE } from '../apiConfig';

const emptyForm = {
  title: '',
  description: '',
  code: '',
  discountPercent: '',
  active: true,
  startsAt: '',
  endsAt: '',
};

const AdminPromotionsSection = ({ fetchJSON }) => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON('/api/admin/promotions');
      setItems(data.items || []);
    } catch (err) {
      alert(err.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required.');
      return;
    }
    setSubmitting(true);
    try {
      await fetchJSON('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          code: form.code.trim() || undefined,
          discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
          active: form.active,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
        }),
      });
      setForm(emptyForm);
      await loadPromotions();
    } catch (err) {
      alert(err.message || 'Failed to create promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (promo) => {
    try {
      await fetchJSON(`/api/admin/promotions/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !promo.active }),
      });
      await loadPromotions();
    } catch (err) {
      alert(err.message || 'Update failed');
    }
  };

  const deletePromo = async (promo) => {
    if (!window.confirm(`Delete promotion "${promo.title}"?`)) return;
    try {
      await fetchJSON(`/api/admin/promotions/${promo.id}`, { method: 'DELETE' });
      await loadPromotions();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="admin-promotions-section">
      <form className="admin-promo-form" onSubmit={handleSubmit}>
        <h5>Create promotion</h5>
        <div className="row g-2">
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>
          <div className="col-md-4">
            <input
              className="form-control"
              placeholder="Promo code (optional)"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
          </div>
          <div className="col-md-2">
            <input
              type="number"
              min="0"
              max="100"
              className="form-control"
              placeholder="% off"
              value={form.discountPercent}
              onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))}
            />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add'}
            </button>
          </div>
          <div className="col-12">
            <textarea
              className="form-control"
              rows={2}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>
      </form>

      {loading ? (
        <p className="mt-3">Loading promotions…</p>
      ) : (
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-hover admin-table">
            <thead className="table-dark">
              <tr>
                <th>Title</th>
                <th>Code</th>
                <th>Discount</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>No promotions yet.</td>
                </tr>
              ) : (
                items.map((promo) => (
                  <tr key={promo.id}>
                    <td>
                      <strong>{promo.title}</strong>
                      {promo.description && <div className="small text-muted">{promo.description}</div>}
                    </td>
                    <td>{promo.code || '—'}</td>
                    <td>{promo.discountPercent != null ? `${promo.discountPercent}%` : '—'}</td>
                    <td>{promo.active ? 'Yes' : 'No'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm me-1"
                        onClick={() => toggleActive(promo)}
                      >
                        {promo.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => deletePromo(promo)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPromotionsSection;
