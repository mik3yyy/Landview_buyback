import React, { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { settingsAPI } from '../../api/client';
import toast from 'react-hot-toast';

const SETTING_DEFINITIONS = [
  {
    key: 'company_name',
    label: 'Company Name',
    description: 'The company name displayed in emails and reports',
    type: 'text',
  },
  {
    key: 'default_interest_rate',
    label: 'Default Interest Rate (%)',
    description: 'Default interest rate pre-filled when creating investments',
    type: 'number',
  },
  {
    key: 'notification_days_before_maturity',
    label: 'Notification Days Before Maturity',
    description: 'How many days before maturity to send reminder emails',
    type: 'number',
  },
  {
    key: 'smtp_from_name',
    label: 'Email From Name',
    description: 'The name shown in the "From" field of system emails',
    type: 'text',
  },
  {
    key: 'max_investment_amount',
    label: 'Max Investment Amount (₦)',
    description: 'Maximum allowed principal investment amount',
    type: 'number',
  },
  {
    key: 'system_timezone',
    label: 'System Timezone',
    description: 'Timezone for scheduled jobs and email notifications',
    type: 'text',
    placeholder: 'e.g. Africa/Lagos',
  },
];

export default function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsAPI.get()
      .then(res => { setSettings(res.data); setOriginal(res.data); })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      setOriginal(settings);
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={24} className="text-blue-600" /> System Settings
          </h1>
          <p className="text-gray-500 text-sm">Configure global system behavior</p>
        </div>
        {hasChanges && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="card space-y-6">
        {SETTING_DEFINITIONS.map(def => (
          <div key={def.key} className="pb-5 border-b border-gray-100 last:border-0 last:pb-0">
            <label className="block font-medium text-gray-900 mb-0.5">{def.label}</label>
            <p className="text-sm text-gray-500 mb-2">{def.description}</p>
            <input
              type={def.type}
              className="input max-w-md"
              value={settings[def.key] || ''}
              onChange={e => handleChange(def.key, e.target.value)}
              placeholder={def.placeholder || `Enter ${def.label.toLowerCase()}`}
            />
            {settings[def.key] !== original[def.key] && (
              <span className="ml-2 text-xs text-orange-600">Unsaved change</span>
            )}
          </div>
        ))}
      </div>

      {/* Email configuration note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h3 className="font-semibold text-blue-900 mb-1">Email & SMTP Configuration</h3>
        <p className="text-blue-700">
          SMTP credentials (host, port, username, password) are configured via environment variables
          on the server. Contact your system administrator to update email sending configuration.
        </p>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
