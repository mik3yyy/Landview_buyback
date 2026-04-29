import React, { useEffect, useState } from 'react';
import { usersAPI } from '../../api/client';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { UserPlus, Edit, Trash2, CheckCircle, XCircle, Shield } from 'lucide-react';
import { useBackgroundFetch } from '../../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  accountant: 'bg-gray-100 text-gray-700',
};

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accountant',
};

interface UserFormData {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

const defaultForm: UserFormData = { email: '', password: '', fullName: '', role: 'accountant' };

export default function UserManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isSuperAdmin, user: currentUser } = useAuth();

  const { data, loading, refreshing, error, refresh } = useBackgroundFetch<any[]>(
    'users',
    () => usersAPI.list().then(r => r.data)
  );

  useEffect(() => {
    if (error) toast.error('Failed to load users');
  }, [error]);

  const users = data ?? [];

  const openCreate = () => { setForm(defaultForm); setShowCreateModal(true); };
  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({ email: u.email, password: '', fullName: u.fullName, role: u.role });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const payload: any = { fullName: form.fullName, role: form.role };
        if (form.password) payload.password = form.password;
        await usersAPI.update(editingUser.id, payload);
        toast.success('User updated');
        setEditingUser(null);
      } else {
        await usersAPI.create(form);
        toast.success('User created');
        setShowCreateModal(false);
      }
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: any) => {
    try {
      await usersAPI.update(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
      refresh();
    } catch { toast.error('Failed to update user'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await usersAPI.delete(deletingUser.id);
      toast.success('User deactivated');
      setDeletingUser(null);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setDeleting(false);
    }
  };

  const setF = (key: keyof UserFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield size={24} className="text-blue-600" /> User Management
            </h1>
            {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" title="Updating..." />}
          </div>
          <p className="text-gray-500 text-sm">{users.length} system users</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Created</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${refreshing ? 'opacity-75' : ''}`}>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{u.fullName}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {u.isActive ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={13} /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-xs"><XCircle size={13} /> Inactive</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                <td className="px-5 py-3">
                  {u.id !== currentUser?.id && (isSuperAdmin || u.role !== 'super_admin') && (
                    <div className="flex items-center gap-2">
                      {(isSuperAdmin || u.role !== 'super_admin') && (
                        <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit size={15} />
                        </button>
                      )}
                      {(isSuperAdmin || u.role !== 'super_admin') && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded ${u.isActive ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {u.isActive ? <XCircle size={15} /> : <CheckCircle size={15} />}
                        </button>
                      )}
                      {isSuperAdmin && u.role !== 'super_admin' && (
                        <button onClick={() => setDeletingUser(u)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!editingUser}
        onClose={() => { setShowCreateModal(false); setEditingUser(null); }}
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editingUser && (
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={setF('email')} required />
            </div>
          )}
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className="input" value={form.fullName} onChange={setF('fullName')} required />
          </div>
          <div>
            <label className="label">{editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
            <input
              type="password" className="input" value={form.password} onChange={setF('password')}
              minLength={editingUser ? 0 : 12}
              required={!editingUser}
              placeholder="Minimum 12 characters"
            />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={setF('role')} disabled={editingUser?.role === 'super_admin' && !isSuperAdmin}>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowCreateModal(false); setEditingUser(null); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingUser}
        title="Deactivate User"
        message={`Deactivate account for ${deletingUser?.fullName}? They won't be able to log in.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        onCancel={() => setDeletingUser(null)}
        loading={deleting}
      />
    </div>
  );
}
