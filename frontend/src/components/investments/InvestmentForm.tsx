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
  upfrontPayment?: string;
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
    clientEmail: '',
    realtorName: '',
    realtorEmail: '',
    ...initialData,
  });
  const [wantsUpfront, setWantsUpfront] = useState(() => {
    const up = parseFloat(initialData?.upfrontPayment || '0');
    return up > 0;
  });
  const [loading, setLoading] = useState(false);

  const principal = parseFloat(form.principal) || 0;
  const interestRate = parseFloat(form.interestRate) || 0;
  const roi = principal * (interestRate / 100);
  const calculatedUpfront = wantsUpfront ? roi * 0.5 : 0;
  const maturityAmount = principal + roi - calculatedUpfront;

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
      const payload = { ...form, upfrontPayment: wantsUpfront ? String(calculatedUpfront) : '' };
      const res = investmentId
        ? await investmentsAPI.update(investmentId, payload)
        : await investmentsAPI.create(payload);
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
        <div className={`bg-blue-50 rounded-lg p-4 text-sm grid gap-4 ${wantsUpfront ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <div className="text-blue-600 font-medium">ROI Amount</div>
            <div className="font-bold text-blue-900">{formatCurrency(roi)}</div>
          </div>
          {wantsUpfront && (
            <div>
              <div className="text-orange-600 font-medium">Upfront (after 6 wks)</div>
              <div className="font-bold text-orange-700">{formatCurrency(calculatedUpfront)}</div>
            </div>
          )}
          <div>
            <div className="text-blue-600 font-medium">Amount at Maturity</div>
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
          <select
            className="input"
            value={DURATION_OPTIONS.includes(form.duration) ? form.duration : 'custom'}
            onChange={e => {
              if (e.target.value !== 'custom') set('duration')(e as any);
              else setForm(prev => ({ ...prev, duration: '' }));
            }}
            required
          >
            {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
            <option value="custom">Custom...</option>
          </select>
          {!DURATION_OPTIONS.includes(form.duration) && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                className="input"
                placeholder="e.g. 4"
                min="1"
                value={form.duration.replace(/\D/g, '')}
                onChange={e => {
                  const n = e.target.value;
                  setForm(prev => ({ ...prev, duration: n ? `${n} months` : '' }));
                }}
                required
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">months</span>
            </div>
          )}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Principal Amount (₦) *</label>
          <input type="number" className="input" placeholder="5000000" min="0" value={form.principal} onChange={set('principal')} required />
        </div>
        <div>
          <label className="label">Interest Rate (%) *</label>
          <input type="number" className="input" placeholder="15" min="0" max="100" step="0.01" value={form.interestRate} onChange={set('interestRate')} required />
        </div>
      </div>

      <div className="border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-800">Upfront Payment</div>
            <div className="text-xs text-gray-500 mt-0.5">50% of profit paid after 6 weeks</div>
          </div>
          <button
            type="button"
            onClick={() => setWantsUpfront(w => !w)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
              wantsUpfront
                ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
          >
            {wantsUpfront ? 'Yes — With Upfront' : 'No Upfront'}
          </button>
        </div>
        {wantsUpfront && principal > 0 && (
          <div className="mt-3 pt-3 border-t text-sm text-orange-700">
            Upfront amount: <strong>{formatCurrency(calculatedUpfront)}</strong>
            <span className="text-gray-400 ml-2">· Amount at maturity: {formatCurrency(maturityAmount)}</span>
          </div>
        )}
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
