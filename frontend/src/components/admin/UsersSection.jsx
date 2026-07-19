import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminModal from './AdminModal';
import { adminJson } from './adminApi';

const emptyUser = { username: '', email: '', phone: '', password: '', role: 'USER' };

const UsersSection = ({ audience, onAudienceChange }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyUser);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messageSubmitting, setMessageSubmitting] = useState(false);

  const load = async (nextAudience = audience) => {
    setLoading(true);
    try {
      const data = await adminJson(`/api/admin/users?limit=100&audience=${encodeURIComponent(nextAudience)}`);
      setItems(data.items || []);
    } catch (error) {
      alert(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => { load(audience); }, [audience]);

  const changeRole = async (user, role) => {
    if (role === user.role || !window.confirm(`Change ${user.username}'s role to ${role}?`)) return;
    setRoleUpdatingId(user.id);
    try {
      await adminJson(`/api/admin/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      const nextAudience = role === 'USER' ? 'customers' : 'staff';
      if (nextAudience === audience) await load(); else onAudienceChange(nextAudience);
    } catch (error) { alert(`Failed to update role: ${error.message}`); }
    finally { setRoleUpdatingId(null); }
  };
  const toggle = async (id) => {
    try { await adminJson(`/api/admin/users/${id}/toggle`, { method: 'POST' }); load(); }
    catch (error) { alert(`Failed to toggle user: ${error.message}`); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await adminJson(`/api/admin/users/${id}`, { method: 'DELETE' }); load(); }
    catch (error) { alert(`Failed to delete user: ${error.message}`); }
  };
  const create = async (event) => {
    event.preventDefault();
    setAddSubmitting(true);
    try {
      await adminJson('/api/admin/users', { method: 'POST', body: JSON.stringify(addForm) });
      setAddOpen(false);
      const nextAudience = addForm.role === 'USER' ? 'customers' : 'staff';
      setAddForm(emptyUser);
      if (nextAudience === audience) load(); else onAudienceChange(nextAudience);
    } catch (error) { alert(`Failed to create user: ${error.message}`); }
    finally { setAddSubmitting(false); }
  };
  const sendMessage = async (event) => {
    event.preventDefault();
    setMessageSubmitting(true);
    try {
      await adminJson('/api/messages', { method: 'POST', body: JSON.stringify({ recipientId: messageTarget.id, subject: subject.trim(), body: body.trim() }) });
      setMessageTarget(null); setSubject(''); setBody('');
    } catch (error) { alert(`Failed to send message: ${error.message}`); }
    finally { setMessageSubmitting(false); }
  };
  const openMessage = (user) => { setMessageTarget(user); setSubject(''); setBody(''); };

  return (
    <>
      <div className="section-header"><h4>{audience === 'staff' ? 'Staffs' : 'Users'}</h4><button type="button" className="btn btn-primary" onClick={() => { setAddForm({ ...emptyUser, role: audience === 'staff' ? 'STAFF' : 'USER' }); setAddOpen(true); }}>{audience === 'staff' ? 'Add Staff' : 'Add User'}</button></div>
      <div className="section-body">
        <div className="admin-users-subtabs">
          <button type="button" className={`admin-users-subtab ${audience === 'customers' ? 'active' : ''}`} onClick={() => onAudienceChange('customers')}>User</button>
          <button type="button" className={`admin-users-subtab ${audience === 'staff' ? 'active' : ''}`} onClick={() => onAudienceChange('staff')}>Staffs</button>
        </div>
        {loading ? <div className="alert alert-info">Loading...</div> : items.length === 0 ? <div className="alert alert-info">No {audience === 'staff' ? 'staff' : 'customer'} accounts found.</div> : <div className="table-responsive"><table className="table table-bordered table-hover text-center admin-table">
          <thead className="table-dark"><tr><th>Username</th><th>Email</th><th>Phone</th><th>Role</th>{audience === 'staff' && <th>Account</th>}<th>Active</th><th>Actions</th></tr></thead>
          <tbody>{items.map((user) => <tr key={user.id}>
            <td><button type="button" className="btn btn-link p-0" onClick={() => navigate(`/profile/${user.profileId || user.id}`)}>{user.username || '-'}</button></td>
            <td>{user.email || '-'}</td><td>{user.phone || '-'}</td>
            <td><select className="form-select form-select-sm admin-role-select" value={user.role || (audience === 'staff' ? 'STAFF' : 'USER')} disabled={roleUpdatingId === user.id} onChange={(event) => changeRole(user, event.target.value)}><option value="USER">USER</option><option value="STAFF">STAFF</option><option value="KITCHEN">KITCHEN</option><option value="ADMIN">ADMIN</option></select></td>
            {audience === 'staff' && <td><span className="badge bg-secondary">{user.accountType === 'staff-linked' ? 'Linked customer' : 'Staff only'}</span></td>}
            <td>{user.active ? 'Yes' : 'No'}</td>
            <td><div className="btn-group btn-group-sm"><button className="btn btn-outline-secondary" onClick={() => toggle(user.id)}>{user.active ? 'Deactivate' : 'Activate'}</button>{(audience !== 'staff' || user.customerId) && <button className="btn btn-outline-primary" onClick={() => openMessage(audience === 'staff' ? { ...user, id: user.customerId } : user)}>Send Message</button>}<button className="btn btn-outline-danger" onClick={() => remove(user.id)}>Delete</button></div></td>
          </tr>)}</tbody>
        </table></div>}
      </div>
      {addOpen && <AdminModal title={audience === 'staff' ? 'Add Staff' : 'Add User'} onClose={() => setAddOpen(false)} closeDisabled={addSubmitting}><form onSubmit={create} className="admin-modal-body">
        {['username', 'email', 'phone'].map((field) => <div className="admin-add-menu-field" key={field}><label>{field === 'phone' ? 'Phone (optional)' : field[0].toUpperCase() + field.slice(1)}</label><input type={field === 'email' ? 'email' : 'text'} value={addForm[field]} onChange={(event) => setAddForm((previous) => ({ ...previous, [field]: event.target.value }))} required={field !== 'phone'} /></div>)}
        <div className="admin-add-menu-field"><label>Role</label><select value={addForm.role} onChange={(event) => setAddForm((previous) => ({ ...previous, role: event.target.value }))}>{audience === 'staff' ? <><option value="STAFF">STAFF</option><option value="KITCHEN">KITCHEN</option><option value="ADMIN">ADMIN</option></> : <option value="USER">USER</option>}</select></div>
        <div className="admin-add-menu-field"><label>Password</label><input type="password" value={addForm.password} onChange={(event) => setAddForm((previous) => ({ ...previous, password: event.target.value }))} required minLength={8} /></div>
        <div className="admin-modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setAddOpen(false)} disabled={addSubmitting}>Cancel</button><button type="submit" className="btn btn-primary" disabled={addSubmitting}>{addSubmitting ? 'Creating…' : `Create ${audience === 'staff' ? 'Staff' : 'User'}`}</button></div>
      </form></AdminModal>}
      {messageTarget && <AdminModal title={`Send Message to ${messageTarget.username || 'User'}`} onClose={() => setMessageTarget(null)} closeDisabled={messageSubmitting}><form onSubmit={sendMessage} className="admin-modal-body">
        <div className="admin-add-menu-field"><label>Subject:</label><input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Message subject" required maxLength={200} /></div>
        <div className="admin-add-menu-field"><label>Message:</label><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your message..." rows={5} required maxLength={5000} /></div>
        <div className="admin-modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setMessageTarget(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={messageSubmitting}>{messageSubmitting ? 'Sending...' : 'Send Message'}</button></div>
      </form></AdminModal>}
    </>
  );
};

export default UsersSection;
