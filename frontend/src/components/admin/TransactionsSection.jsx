import { useEffect, useState } from 'react';
import AdminPagination from './AdminPagination';
import { adminJson, buildAdminQuery } from './adminApi';

const TransactionsSection = () => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async (nextPage = page, q = query) => {
    setLoading(true);
    try {
      const data = await adminJson(`/api/admin/transactions?${buildAdminQuery({ page: nextPage, limit: 20, q })}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (error) {
      alert(`Failed to load transactions: ${error.message}`);
    } finally {
      setLoading(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => { load(1, ''); }, []);

  if (loading && items.length === 0) return <div className="alert alert-info">Loading...</div>;
  return (
    <div>
      <div className="row g-3 mb-3">
        <div className="col-md-9">
          <label className="form-label"><strong>Search</strong></label>
          <input className="form-control" placeholder="Order ID (ORD-yyyy-nnnnn), email, amount, paymentIntentId, status…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <button className="btn btn-primary w-100" onClick={() => load(1)}>Search</button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered table-hover admin-table">
          <thead className="table-dark"><tr><th>Order ID</th><th>Customer Email</th><th>Amount</th><th>paymentIntentId</th><th>Status</th><th>CreatedAt</th><th>UpdatedAt</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={7} className="text-center">No transactions found.</td></tr> : items.map((item) => (
              <tr key={item.id}>
                <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>{item.orderId || item.id}</td>
                <td>{item.customerEmail || '-'}</td>
                <td>{item.amountTotal} {String(item.currency || '').toUpperCase()}</td>
                <td style={{ maxWidth: 240, wordBreak: 'break-all' }}>{item.paymentIntentId || '-'}</td>
                <td>{item.status}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} total={total} pageSize={20} loading={loading} onPageChange={load} />
    </div>
  );
};

export default TransactionsSection;
