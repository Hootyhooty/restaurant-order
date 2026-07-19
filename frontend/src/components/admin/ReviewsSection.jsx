import { useEffect, useState } from 'react';
import AdminPagination from './AdminPagination';
import { adminJson, buildAdminQuery } from './adminApi';

const ReviewsSection = ({ initialMealId = '' }) => {
  const [menus, setMenus] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState(String(initialMealId || ''));
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadReviews = async (nextPage = page, mealId = selectedMealId, q = query) => {
    if (!mealId) return;
    setLoading(true);
    try {
      const data = await adminJson(`/api/admin/reviews?${buildAdminQuery({ page: nextPage, limit: 20, mealId, q })}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (error) {
      alert(`Failed to load reviews: ${error.message}`);
    } finally {
      setLoading(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const initialise = async () => {
      try {
        const data = await adminJson('/api/admin/review-menus');
        setMenus(data.items || []);
        if (initialMealId) await loadReviews(1, String(initialMealId), '');
      } catch (error) {
        alert(`Failed to load reviews: ${error.message}`);
      }
    };
    initialise();
  }, [initialMealId]);

  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await adminJson(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      loadReviews(1);
    } catch (error) {
      alert(`Failed to delete review: ${error.message}`);
    }
  };
  const selected = menus.find((menu) => String(menu.mealId) === String(selectedMealId));

  return (
    <div>
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label"><strong>Menu</strong></label>
          <select className="form-select" value={selectedMealId} onChange={(e) => {
            const value = e.target.value;
            setSelectedMealId(value); setPage(1); setQuery('');
            if (value) loadReviews(1, value, ''); else setItems([]);
          }}>
            <option value="">Select a menu item…</option>
            {menus.map((menu) => <option key={menu.mealId} value={menu.mealId}>{menu.name} ({menu.reviewCount})</option>)}
          </select>
        </div>
        <div className="col-md-5">
          <label className="form-label"><strong>Search</strong></label>
          <input className="form-control" placeholder="Username, review text, rating…" value={query} onChange={(e) => setQuery(e.target.value)} disabled={!selectedMealId} />
        </div>
        <div className="col-md-3 d-flex align-items-end gap-2"><button className="btn btn-primary w-100" disabled={!selectedMealId} onClick={() => loadReviews(1)}>Search</button></div>
      </div>
      {selected && <div className="alert alert-light"><strong>{selected.name}</strong> — Reviews: {selected.reviewCount} {selected.avgRating != null ? `(avg ${selected.avgRating})` : ''}</div>}
      {!selectedMealId ? <div className="alert alert-info">Select a menu item to view its reviews.</div> : loading && items.length === 0 ? <div className="alert alert-info">Loading...</div> : (
        <div className="table-responsive"><table className="table table-bordered table-hover admin-table admin-reviews-table">
          <thead className="table-dark"><tr><th>Username</th><th>Review</th><th className="admin-menu-center">Rating</th><th>Created At</th><th>Updated At</th><th className="admin-menu-center">Action</th></tr></thead>
          <tbody>{items.length === 0 ? <tr><td colSpan={6} className="text-center">No reviews found.</td></tr> : items.map((review) => <tr key={review.id}><td>{review.username || '-'}</td><td style={{ maxWidth: 360 }}>{review.review}</td><td className="admin-menu-center">{review.rating}</td><td>{review.createdAt ? new Date(review.createdAt).toLocaleString() : '-'}</td><td>{review.updatedAt ? new Date(review.updatedAt).toLocaleString() : '-'}</td><td className="admin-menu-center"><button className="btn btn-outline-danger btn-sm" onClick={() => remove(review.id)}>Delete</button></td></tr>)}</tbody>
        </table></div>
      )}
      {selectedMealId && <AdminPagination page={page} total={total} pageSize={20} loading={loading} onPageChange={loadReviews} />}
    </div>
  );
};

export default ReviewsSection;
