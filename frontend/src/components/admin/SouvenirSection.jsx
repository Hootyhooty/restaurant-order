import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemEditorModal from './ItemEditorModal';
import { adminForm, adminJson } from './adminApi';

const emptyForm = { imageFile: null, imagePreview: '', name: '', description: '', price: '', category: 'souvenir' };

const SouvenirSection = ({ onStatsChanged }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const data = await adminJson('/api/admin/souvenir-items?limit=100'); setItems(data.items || []); }
    catch (error) { alert(`Failed to load souvenir: ${error.message}`); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const openEdit = (item) => {
    setForm({ imageFile: null, imagePreview: item.image || '', name: item.name || '', description: item.description || '', price: item.price ?? '', category: item.category || 'souvenir' });
    setEditor({ mode: 'edit', item });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || form.price === '') return alert('Name and price are required.');
    if (editor.mode === 'add' && !form.imageFile) return alert('Please select an image for the souvenir item.');
    setSubmitting(true);
    try {
      const data = new FormData();
      if (form.imageFile) data.append('image', form.imageFile);
      data.append('name', form.name.trim()); data.append('description', form.description.trim()); data.append('price', String(form.price)); data.append('category', form.category || 'souvenir');
      await adminForm(editor.mode === 'add' ? '/api/admin/souvenir-items' : `/api/admin/souvenir-items/${editor.item.mongoId}`, data, { method: editor.mode === 'add' ? 'POST' : 'PUT' });
      setEditor(null); await load(); onStatsChanged();
    } catch (error) { alert(`Failed to ${editor.mode === 'add' ? 'add' : 'update'} souvenir item: ${error.message}`); }
    finally { setSubmitting(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this souvenir item?')) return;
    try { await adminJson(`/api/admin/souvenir-items/${id}`, { method: 'DELETE' }); await load(); onStatsChanged(); }
    catch (error) { alert(`Failed to delete souvenir item: ${error.message}`); }
  };
  return (
    <>
      <div className="section-header"><h4>Souvenir Items</h4><div><button className="btn btn-outline-secondary me-2" onClick={() => navigate('/store')}>View All Souvenir Items</button><button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditor({ mode: 'add' }); }}>Add Souvenir</button></div></div>
      <div className="section-body">
        {loading ? <div className="alert alert-info">Loading...</div> : items.length === 0 ? <div className="alert alert-info">No souvenir items found.</div> : <div className="table-responsive"><table className="table table-bordered table-hover admin-table admin-menu-table">
          <thead className="table-dark"><tr><th>Image</th><th>Name</th><th>Description</th><th>Price</th><th>Category</th><th className="admin-menu-center">View</th><th className="admin-menu-center">Edit</th><th className="admin-menu-center">Delete</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td><img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} /></td>
            <td><button type="button" className="btn btn-link p-0" onClick={() => navigate('/store')}>{item.name}</button></td><td>{item.description}</td><td>฿{item.price}</td><td>{item.category}</td>
            <td className="admin-menu-center"><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/store')}>View</button></td>
            <td className="admin-menu-center"><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => openEdit(item)}>Edit</button></td>
            <td className="admin-menu-center"><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => remove(item.mongoId)}>Delete</button></td>
          </tr>)}</tbody>
        </table></div>}
      </div>
      {editor && <ItemEditorModal title={editor.mode === 'add' ? 'Add Souvenir Item' : 'Edit Souvenir Item'} form={form} setForm={setForm} onClose={() => setEditor(null)} onSubmit={submit} submitting={submitting} imageRequired={editor.mode === 'add'} itemLabel="Souvenir" />}
    </>
  );
};

export default SouvenirSection;
