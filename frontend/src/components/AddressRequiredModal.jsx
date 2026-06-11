import { useNavigate } from 'react-router-dom';
import './AddressRequiredModal.css';

const AddressRequiredModal = ({ open, onClose }) => {
  const navigate = useNavigate();

  if (!open) return null;

  const handleEditProfile = () => {
    onClose();
    navigate('/profile/edit');
  };

  return (
    <div className="address-required-overlay" onClick={onClose}>
      <div
        className="address-required-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="address-required-title"
        aria-modal="true"
      >
        <h3 id="address-required-title">Address required</h3>
        <p>
          Please add your address in Edit Profile before making a purchase.
        </p>
        <div className="address-required-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleEditProfile}>
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressRequiredModal;
