const AdminModal = ({ title, onClose, children, closeDisabled = false }) => (
  <div className="admin-modal-overlay" onClick={() => !closeDisabled && onClose()}>
    <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
      <div className="admin-modal-header">
        <h5>{title}</h5>
        <button
          type="button"
          className="admin-modal-close"
          onClick={() => !closeDisabled && onClose()}
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default AdminModal;
