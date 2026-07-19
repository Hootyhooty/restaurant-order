import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemEditorModal from './ItemEditorModal';
import { adminForm, adminJson } from './adminApi';

const categories = [{ id: 'rice', name: 'Rice' }, { id: 'sandwich', name: 'Sandwich' }, { id: 'sides', name: 'Sides' }, { id: 'drinks', name: 'Drinks' }, { id: 'desserts', name: 'Desserts' }];
const emptyForm = { imageFile: null, imagePreview: '', name: '', description: '', price: '', category: '' };

const MenuSection = ({ onOpenReviews, onStatsChanged }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminJson('/api/admin/menu-items?limit=100');
      setItems(data.items || []);
    } catch (error) {
      alert(`Failed to load menu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditor({ mode: 'add' }); };
  const openEdit = (item) => {
    setForm({ imageFile: null, imagePreview: item.image || '', name: item.name || '', description: item.description || '', price: item.price ?? '', category: item.category || '' });
    setEditor({ mode: 'edit', item });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || form.price === '' || !form.category) return alert('Name, price, and category are required.');
    if (editor.mode === 'add' && !form.imageFile) return alert('Please select an image for the menu item.');
    setSubmitting(true);
    try {
      const data = new FormData();
      if (form.imageFile) data.append('image', form.imageFile);
      data.append('name', form.name.trim()); data.append('description', form.description.trim()); data.append('price', String(form.price)); data.append('category', form.category);
      await adminForm(editor.mode === 'add' ? '/api/admin/menu-items' : `/api/admin/menu-items/${editor.item.mongoId}`, data, { method: editor.mode === 'add' ? 'POST' : 'PUT' });
      setEditor(null); await load(); onStatsChanged();
    } catch (error) {
      alert(`Failed to ${editor.mode === 'add' ? 'add' : 'update'} menu item: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try { await adminJson(`/api/admin/menu-items/${id}`, { method: 'DELETE' }); await load(); onStatsChanged(); } catch (error) { alert(`Failed to delete menu item: ${error.message}`); }
  };

  return (
    <>
      <div className="section-header"><h4>Menu Items</h4><div><button className="btn btn-outline-secondary me-2" onClick={() => navigate('/menu')}>View All Menu Items</button><button className="btn btn-primary" onClick={openAdd}>Add Menu</button></div></div>
      <div className="section-body">
        {loading ? <div className="alert alert-info">Loading...</div> : items.length === 0 ? <div className="alert alert-info">No menu items found.</div> : <div className="table-responsive"><table className="table table-bordered table-hover admin-table admin-menu-table">
          <thead className="table-dark"><tr><th>Image</th><th>Name</th><th>Description</th><th>Price</th><th>Category</th><th className="admin-menu-center">Review</th><th className="admin-menu-center">Popular</th><th className="admin-menu-center">Edit</th><th className="admin-menu-center">Delete</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td><img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} /></td>
            <td><button type="button" className="btn btn-link p-0" onClick={() => navigate(`/review/${item.name.replace(/\s+/g, '_')}`)}>{item.name}</button></td>
            <td>{item.description}</td><td>฿{item.price}</td><td>{item.category}</td>
            <td className="admin-menu-center"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onOpenReviews(item.id)}>Review</button></td>
            <td className="admin-menu-center">{item.isPopular ? 'Yes' : 'No'}</td>
            <td className="admin-menu-center">{item.mongoId ? <button type="button" className="btn btn-outline-primary btn-sm admin-menu-edit-btn" onClick={() => openEdit(item)}>Edit</button> : <span className="text-muted">—</span>}</td>
            <td className="admin-menu-center">{item.mongoId ? <button type="button" className="btn btn-outline-danger btn-sm admin-menu-delete-btn" onClick={() => remove(item.mongoId)}>Delete</button> : <span className="text-muted">—</span>}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>
      {editor && <ItemEditorModal title={editor.mode === 'add' ? 'Add Menu Item' : 'Edit Menu Item'} form={form} setForm={setForm} onClose={() => setEditor(null)} onSubmit={submit} submitting={submitting} categories={categories} imageRequired={editor.mode === 'add'} itemLabel="Menu" />}
    </>
  );
};

export default MenuSection;
