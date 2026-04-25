import React, { useState, useEffect } from 'react';
import { investmentsAPI } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface FormData {
  transactionDate: string;
  clientName: string;
  plotNumber: string;
  duration: string;
  principal: string;
  interestRate: string;
  upfrontPayment: string;
  clientEmail: string;
  realtorName: string;
  realtorEmail: string;
}

interface Props {
  initialData?: Partial<FormData>;
  investmentId?: string;
  onSuccess: (investment: any) => void;
  onCancel: () => void;
}

const DURATION_OPTIONS = [
  '1 month', '2 months', '3 months', '6 months',
  '9 months', '12 months', '18 months', '24 months',
];

export default function InvestmentForm({ initialData, investmentId, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({
    transactionDate: new Date().toISOString().split('T')[0],
    clientName: '',
    plotNumber: '',
    duration: '6 months',
    principal: '',
    interestRate: '15',
    upfrontPayment: '',
    clientEmail: '',
    realtorName: '',
    realtorEmail: '',
    ...initialData,
  });
  const [loading, setLoading] = useState(false);

  const principal = parseFloat(form.principal) || 0;
  const interestRate = parseFloat(form.interestRate) || 0;
  const upfront = parseFloat(form.upfrontPayment) || 0;
  const roi = principal * (interestRate / 100);
  const maturityAmount = principal + roi - upfront;

  const calcMaturityDate = () => {
    if (!form.transactionDate || !form.duration) return '';
    const date = new Date(form.transactionDate);
    const match = form.duration.match(/(\d+)\s*(month|year)/);
    if (!match) return '';
    const val = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'year') date.setFullYear(date.getFullYear() + val);
    else date.setMonth(date.getMonth() + val);
    return date.toISOString().split('T')[0];
  };

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.plotNumber || !form.principal || !form.interestRate) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = investmentId
        ? await investmentsAPI.update(investmentId, form)
        : await investmentsAPI.create(form);
      toast.success(investmentId ? 'Investment updated!' : 'Investment created!');
      onSuccess(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save investment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Auto-calculated preview */}
      {principal > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-blue-600 font-medium">ROI Amount</div>
            <div className="font-bold text-blue-900">{formatCurrency(roi)}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Maturity Amount</div>
            <div className="font-bold text-blue-900">{formatCurrency(maturityAmount)}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Maturity Date</div>
            <div className="font-bold text-blue-900">{calcMaturityDate() || '—'}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Transaction Date *</label>
          <input type="date" className="input" value={form.transactionDate} onChange={set('transactionDate')} required />
        </div>
        <div>
          <label className="label">Duration *</label>
          <select className="input" value={form.duration} onChange={set('duration')} required>
            {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
            <option value="custom">Custom...</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Client Name *</label>
          <input type="text" className="input" placeholder="Full name" value={form.clientName} onChange={set('clientName')} required />
        </div>
        <div>
          <label className="label">Client Email</label>
          <input type="email" className="input" placeholder="client@example.com" value={form.clientEmail} onChange={set('clientEmail')} />
        </div>
      </div>

      <div>
        <label className="label">Plot Number/Size *</label>
        <input type="text" className="input" placeholder="e.g. PLT-001A or 500sqm" value={form.plotNumber} onChange={set('plotNumber')} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Principal Amount (₦) *</label>
          <input type="number" className="input" placeholder="5000000" min="0" value={form.principal} onChange={set('principal')} required />
        </div>
        <div>
          <label className="label">Interest Rate (%) *</label>
          <input type="number" className="input" placeholder="15" min="0" max="100" step="0.01" value={form.interestRate} onChange={set('interestRate')} required />
        </div>
        <div>
          <label className="label">Upfront Payment (₦)</label>
          <input type="number" className="input" placeholder="0" min="0" value={form.upfrontPayment} onChange={set('upfrontPayment')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Realtor Name *</label>
          <input type="text" className="input" placeholder="Realtor full name" value={form.realtorName} onChange={set('realtorName')} required />
        </div>
        <div>
          <label className="label">Realtor Email *</label>
          <input type="email" className="input" placeholder="realtor@landview.com" value={form.realtorEmail} onChange={set('realtorEmail')} required />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : investmentId ? 'Update Investment' : 'Create Investment'}
        </button>
      </div>
    </form>
  );
}
