import { useEffect, useState } from 'react';
import { adminForm, adminJson } from './adminApi';
import './Promotions.css';

const emptyForm = {
  title: '',
  description: '',
  code: '',
  discountPercent: '',
  active: true,
  startsAt: '',
  endsAt: '',
  coverFile: null,
  coverPreview: '',
};

const AdminPromotionsSection = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coverUploadId, setCoverUploadId] = useState(null);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const data = await adminJson('/api/admin/promotions');
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

  const onCoverSelect = (event, { forPromoId } = {}) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (forPromoId) {
      setCoverUploadId(forPromoId);
      uploadCover(forPromoId, file);
      event.target.value = '';
      return;
    }
    setForm((prev) => ({ ...prev, coverFile: file, coverPreview: preview }));
  };

  const uploadCover = async (promoId, file) => {
    try {
      const data = new FormData();
      data.append('cover', file);
      await adminForm(`/api/admin/promotions/${promoId}`, data, { method: 'PATCH' });
      await loadPromotions();
    } catch (err) {
      alert(err.message || 'Failed to update cover');
    } finally {
      setCoverUploadId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required.');
      return;
    }
    if (!form.coverFile) {
      alert('Please select a cover image.');
      return;
    }
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('cover', form.coverFile);
      data.append('title', form.title.trim());
      data.append('description', form.description.trim());
      if (form.code.trim()) data.append('code', form.code.trim());
      if (form.discountPercent !== '') data.append('discountPercent', String(form.discountPercent));
      data.append('active', String(form.active));
      if (form.startsAt) data.append('startsAt', form.startsAt);
      if (form.endsAt) data.append('endsAt', form.endsAt);
      await adminForm('/api/admin/promotions', data, { method: 'POST' });
      if (form.coverPreview) URL.revokeObjectURL(form.coverPreview);
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
      await adminJson(`/api/admin/promotions/${promo.id}`, {
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
      await adminJson(`/api/admin/promotions/${promo.id}`, { method: 'DELETE' });
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
          <div className="col-md-4">
            <input
              type="date"
              className="form-control"
              value={form.startsAt}
              onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
            />
          </div>
          <div className="col-md-4">
            <input
              type="date"
              className="form-control"
              value={form.endsAt}
              onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
            />
          </div>
          <div className="col-md-4">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="form-control"
              onChange={onCoverSelect}
              required={!form.coverFile}
            />
          </div>
          {form.coverPreview && (
            <div className="col-12">
              <img src={form.coverPreview} alt="Cover preview" className="admin-promo-cover-preview" />
            </div>
          )}
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
                <th>Cover</th>
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
                  <td colSpan={6}>No promotions yet.</td>
                </tr>
              ) : (
                items.map((promo) => (
                  <tr key={promo.id}>
                    <td className="admin-promo-cover-cell">
                      {promo.coverImage ? (
                        <img src={promo.coverImage} alt={promo.title} className="admin-promo-cover-thumb" />
                      ) : (
                        <span className="text-muted small">No cover</span>
                      )}
                      <label className="btn btn-outline-secondary btn-sm mt-1 mb-0">
                        {coverUploadId === promo.id ? 'Uploading…' : 'Change cover'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          hidden
                          disabled={coverUploadId === promo.id}
                          onChange={(e) => onCoverSelect(e, { forPromoId: promo.id })}
                        />
                      </label>
                    </td>
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
