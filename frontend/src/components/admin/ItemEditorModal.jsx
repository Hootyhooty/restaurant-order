import { useRef, useState } from 'react';
import AdminModal from './AdminModal';

const ItemEditorModal = ({ title, form, setForm, onClose, onSubmit, submitting, categories, imageRequired, itemLabel }) => {
  const inputRef = useRef(null);
  const [imageError, setImageError] = useState(false);
  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setForm((previous) => ({ ...previous, imageFile: file, imagePreview: URL.createObjectURL(file) }));
    setImageError(false);
    event.target.value = '';
  };
  return (
    <AdminModal title={title} onClose={onClose} closeDisabled={submitting}>
      <form onSubmit={onSubmit} className="admin-modal-body">
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={chooseImage} />
        <div className="admin-add-menu-image-area" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}>
          {form.imagePreview && !imageError ? <img src={form.imagePreview} alt="Preview" onError={() => setImageError(true)} /> : <span>{imageRequired ? 'Click to choose image' : 'Click to change image'}</span>}
        </div>
        <div className="admin-add-menu-field"><label>Name:</label><input type="text" value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} placeholder={`${itemLabel} item name`} required /></div>
        <div className="admin-add-menu-field"><label>Description:</label><textarea value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} placeholder="Description" rows={3} /></div>
        <div className="admin-add-menu-field"><label>Price:</label><input type="number" min="0" step="1" value={form.price} onChange={(event) => setForm((previous) => ({ ...previous, price: event.target.value }))} placeholder="0" required /></div>
        <div className="admin-add-menu-field">
          <label>Category:</label>
          {categories ? <select value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))} required><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : <input type="text" value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))} placeholder="souvenir" />}
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? (imageRequired ? 'Adding...' : 'Saving...') : (imageRequired ? `Add ${itemLabel} Item` : 'Save Changes')}</button>
        </div>
      </form>
    </AdminModal>
  );
};

export default ItemEditorModal;
