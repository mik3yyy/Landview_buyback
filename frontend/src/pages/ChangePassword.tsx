import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';

export default function ChangePassword() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setF = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.next.length < 12) { setError('New password must be at least 12 characters'); return; }
    if (form.next !== form.confirm) { setError('New passwords do not match'); return; }
    if (form.current === form.next) { setError('New password must differ from current'); return; }

    setLoading(true);
    try {
      await authAPI.changePassword(form.current, form.next);
      toast.success('Password changed successfully');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound size={24} className="text-blue-600" /> Change Password
        </h1>
        <p className="text-gray-500 text-sm mt-1">Update your account password. Must be at least 12 characters.</p>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input pr-10"
                value={form.current}
                onChange={setF('current')}
                required
                autoFocus
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showNext ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Minimum 12 characters"
                value={form.next}
                onChange={setF('next')}
                required
              />
              <button type="button" onClick={() => setShowNext(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNext ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.next && (
              <ul className="text-xs mt-2 space-y-0.5 text-gray-500">
                <li className={form.next.length >= 12 ? 'text-green-600' : ''}>{form.next.length >= 12 ? '✓' : '○'} At least 12 characters</li>
                <li className={/[A-Z]/.test(form.next) ? 'text-green-600' : ''}>{/[A-Z]/.test(form.next) ? '✓' : '○'} One uppercase letter</li>
                <li className={/[0-9]/.test(form.next) ? 'text-green-600' : ''}>{/[0-9]/.test(form.next) ? '✓' : '○'} One number</li>
              </ul>
            )}
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              type={showNext ? 'text' : 'password'}
              className="input"
              placeholder="Repeat new password"
              value={form.confirm}
              onChange={setF('confirm')}
              required
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary px-8 py-2.5" disabled={loading}>
              {loading ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
