const AdminPagination = ({
  page,
  total,
  pageSize,
  loading = false,
  onPageChange,
  previousLabel = 'Prev',
  summary,
}) => (
  <div className="d-flex justify-content-between align-items-center mt-3">
    <div className="text-muted">{summary || `Total: ${total}`}</div>
    <div className="btn-group">
      <button
        className="btn btn-outline-secondary btn-sm"
        disabled={page <= 1 || loading}
        onClick={() => onPageChange(page - 1)}
      >
        {previousLabel}
      </button>
      <button className="btn btn-outline-secondary btn-sm" disabled>
        Page {page}
      </button>
      <button
        className="btn btn-outline-secondary btn-sm"
        disabled={page * pageSize >= total || loading}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  </div>
);

export default AdminPagination;
