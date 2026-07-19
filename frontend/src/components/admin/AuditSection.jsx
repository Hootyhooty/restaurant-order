import { useEffect, useState } from 'react';
import { adminJson, buildAdminQuery } from './adminApi';

const AuditSection = () => {
  const [items, setItems] = useState([]);
  const [bookingId, setBookingId] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (nextPage = page) => {
    try {
      const data = await adminJson(`/api/admin/audit-logs?${buildAdminQuery({ page: nextPage, limit: 50, bookingId, action })}`);
      setItems(data.items || []);
      setPage(data.page || nextPage);
      setTotal(data.total || 0);
    } catch (error) {
      alert(`Failed to load audit logs: ${error.message}`);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="audit-layout">
      <div className="row g-2 mb-3">
        <div className="col-md-5"><input className="form-control" placeholder="Filter by booking ID (UUID)" value={bookingId} onChange={(e) => setBookingId(e.target.value)} /></div>
        <div className="col-md-4"><input className="form-control" placeholder="Filter by action (e.g. booking.no_show)" value={action} onChange={(e) => setAction(e.target.value)} /></div>
        <div className="col-md-3"><button className="btn btn-primary w-100" onClick={() => load(1)}>Search</button></div>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered table-hover admin-table">
          <thead className="table-dark"><tr><th>When</th><th>Admin</th><th>Action</th><th>Booking</th><th>Status change</th><th>Details</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6} className="text-center">No audit entries found.</td></tr> : items.map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                <td>{row.adminUsername || row.adminId}</td><td><code>{row.action}</code></td>
                <td style={{ fontSize: '12px' }}>{row.bookingId || row.resourceId || '—'}</td>
                <td>{row.previousStatus || '—'} → {row.newStatus || '—'}</td>
                <td style={{ fontSize: '12px', textAlign: 'left' }}>{row.metadata && Object.keys(row.metadata).length ? JSON.stringify(row.metadata) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between align-items-center mt-2">
        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
        <span className="text-muted small">Page {page} · {total} entries</span>
        <button className="btn btn-outline-secondary btn-sm" disabled={page * 50 >= total} onClick={() => load(page + 1)}>Next</button>
      </div>
    </div>
  );
};

export default AuditSection;
