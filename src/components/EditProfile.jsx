// src/components/EditProfile.jsx
import { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MapModal from './MapModal';
import axios from 'axios';
import './EditProfile.css';

const EditProfile = () => {
  const { isLoggedIn, user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    alternate_email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'United States',
    phone: '',
    display_phone: false,
    photo: '',
    latitude: null,
    longitude: null
  });

  const [showMap, setShowMap] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/profile/edit' } });
      return;
    }
    if (user) {
      setForm((prev) => ({
        ...prev,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        alternate_email: user.alternate_email || '',
        address_line1: user.address_line1 || '',
        address_line2: user.address_line2 || '',
        city: user.city || '',
        state: user.state || '',
        zipcode: user.zipcode || '',
        country: user.country || 'United States',
        phone: user.phone || '',
        display_phone: !!user.display_phone,
        photo: user.photo || '',
        latitude: user.latitude || null,
        longitude: user.longitude || null
      }));
    }
  }, [isLoggedIn, navigate, user]);

  if (!isLoggedIn) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to update your profile.');
        navigate('/login');
        return;
      }

      const response = await axios.put(
        'http://localhost:5000/api/users/profile',
        form,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Update AuthContext with new user data
        if (updateUser && response.data.user) {
          updateUser(response.data.user);
        }
        alert('Profile updated successfully!');
        navigate('/profile');
      } else {
        alert('Error updating profile: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      alert('Only JPEG and PNG formats are supported.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/users/upload-image-to-allimgs',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.status === 'success' && response.data.data?.filename) {
        const filename = response.data.data.filename;
        // Store just the filename - GridFS will serve it via /api/users/uploads/:filename
        setForm((prev) => ({
          ...prev,
          photo: filename
        }));
        alert('Image uploaded successfully!');
      } else {
        alert('Error uploading image: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLocationSelect = (location) => {
    // location: { address_line1, city, state, zipcode, country, latitude, longitude }
    setForm((prev) => ({
      ...prev,
      address_line1: location.address_line1 || prev.address_line1,
      address_line2: location.address_line2 || prev.address_line2,
      city: location.city || prev.city,
      state: location.state || prev.state,
      zipcode: location.zipcode || prev.zipcode,
      country: location.country || prev.country,
      latitude: location.latitude !== undefined ? location.latitude : prev.latitude,
      longitude: location.longitude !== undefined ? location.longitude : prev.longitude
    }));
    setShowMap(false);
  };

  const profileImage =
    form.photo && form.photo.trim() !== ''
      ? form.photo.startsWith('http')
        ? form.photo
        : form.photo === 'other_img/default.jpg' || form.photo === 'default.jpg'
        ? '/other_img/default.jpg'
        : `http://localhost:5000/api/users/uploads/${form.photo}`
      : '/other_img/default.jpg';

  return (
    <section className="edit-profile-section">
      <div className="container">
        <div className="edit-profile-card">
          <h2 className="edit-profile-title">Edit Account Profile</h2>
          <p className="edit-profile-subtitle">
            Please change the fields below to update your account profile.
          </p>

          <form onSubmit={handleSubmit} className="edit-profile-form">
            <div className="edit-profile-photo-row">
              <img
                src={profileImage}
                alt="Profile"
                className="edit-profile-photo"
              />
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? 'Uploading...' : 'Choose Image'}
                </button>
                <p className="edit-profile-help">
                  PNG or JPEG. Updates your account photo.
                </p>
              </div>
            </div>

            <div className="edit-profile-grid">
              <div className="form-group">
                <label>Email Address (read-only)</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Alternate Email</label>
                <input
                  type="email"
                  name="alternate_email"
                  value={form.alternate_email}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="edit-profile-grid">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="edit-profile-address-header">
              <h3>Address information</h3>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setShowMap(true)}
              >
                Pick location on map
              </button>
            </div>

            <div className="form-group">
              <label>Address Line 1</label>
              <input
                type="text"
                name="address_line1"
                value={form.address_line1}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                name="address_line2"
                value={form.address_line2}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="edit-profile-grid">
              <div className="form-group">
                <label>City / Town</label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Zipcode</label>
                <input
                  type="text"
                  name="zipcode"
                  value={form.zipcode}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Country</label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className="form-input"
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Phone number</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group form-group-inline">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="display_phone"
                  checked={form.display_phone}
                  onChange={handleChange}
                />
                <span>Display phone number</span>
              </label>
            </div>

            <div className="edit-profile-actions">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Profile'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/profile')}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {showMap && (
        <MapModal
          onClose={() => setShowMap(false)}
          onConfirm={handleLocationSelect}
          initialLat={form.latitude}
          initialLng={form.longitude}
        />
      )}
    </section>
  );
};

export default EditProfile;

