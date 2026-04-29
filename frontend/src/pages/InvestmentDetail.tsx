import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, TrendingUp, Calendar, Clock, User,
  Mail, Home, CheckCircle, RefreshCw, Trash2
} from 'lucide-react';
import { investmentsAPI } from '../api/client';
import { formatCurrency, formatDate, formatDateTime, getDaysLabel } from '../utils/formatters';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmModal from '../components/ui/ConfirmModal';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useBackgroundFetch, invalidateCache, clearCache } from '../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

interface ExtendFormData {
  new_duration: string;
  new_interest_rate: string;
  new_principal: string;
}

export default function InvestmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdminOrAbove, isSuperAdmin } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [extendForm, setExtendForm] = useState<ExtendFormData>({ new_duration: '6 months', new_interest_rate: '', new_principal: '' });

  const { data: investment, loading, refreshing, error, refresh } = useBackgroundFetch<any>(
    `investment:${id}`,
    () => investmentsAPI.get(id!).then(r => r.data)
  );

  useEffect(() => {
    if (error) toast.error('Failed to load investment');
  }, [error]);

  const afterMutation = () => {
    invalidateCache(`investment:${id}`);
    clearCache('investments:');
    invalidateCache('dashboard');
    refresh();
  };

  const handleMarkPaymentInitiated = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.markPaymentInitiated(id!);
      toast.success('Payment marked as initiated');
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaymentCompleted = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.markPaymentCompleted(id!);
      toast.success('Payment marked as completed');
      setShowCompleteModal(false);
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await investmentsAPI.extend(id!, extendForm);
      toast.success('Investment extended successfully');
      setShowExtendModal(false);
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to extend');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.delete(id!);
      toast.success('Investment deleted');
      clearCache('investments:');
      invalidateCache('dashboard');
      navigate('/investments');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!investment) return <div className="text-center py-20 text-gray-500">Investment not found</div>;

  const days = investment.daysUntilMaturity;
  const isActive = investment.status === 'active' || investment.status === 'extended';
  const canComplete = isAdminOrAbove && investment.status === 'payment_initiated';
  const canInitiate = investment.status !== 'completed' && investment.status !== 'payment_initiated';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2 flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">{investment.clientName}</h1>
              <StatusBadge status={investment.status} daysUntilMaturity={days} />
              {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" title="Updating..." />}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">Plot: {investment.plotNumber} • Created {formatDate(investment.createdAt)}</p>
          </div>
        </div>

        {/* Action buttons — wrap on mobile */}
        <div className="flex gap-2 flex-wrap">
          {canInitiate && (
            <button onClick={handleMarkPaymentInitiated} disabled={actionLoading} className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircle size={15} /> <span className="hidden sm:inline">Mark </span>Payment Initiated
            </button>
          )}
          {canComplete && (
            <button onClick={() => setShowCompleteModal(true)} className="btn-success flex items-center gap-2 text-sm">
              <CheckCircle size={15} /> Complete Payment
            </button>
          )}
          {investment.status !== 'completed' && (
            <button onClick={() => setShowExtendModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw size={15} /> Extend
            </button>
          )}
          {isAdminOrAbove && investment.status !== 'completed' && (
            <Link to={`/investments/${id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
              <Edit size={15} /> Edit
            </Link>
          )}
          {isSuperAdmin && (
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger flex items-center gap-2 text-sm">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-600" /> Financial Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {[
                { label: 'Principal Amount', value: formatCurrency(Number(investment.principal)), highlight: false },
                { label: 'Interest Rate', value: `${investment.interestRate}%`, highlight: false },
                { label: 'ROI Amount', value: formatCurrency(Number(investment.roiAmount)), highlight: false },
                { label: 'Upfront Payment', value: investment.upfrontPayment ? formatCurrency(Number(investment.upfrontPayment)) : '—', highlight: false },
                { label: 'Maturity Amount', value: formatCurrency(Number(investment.maturityAmount)), highlight: true },
                { label: 'Duration', value: investment.duration, highlight: false },
              ].map(item => (
                <div key={item.label} className={`rounded-lg p-3 ${item.highlight ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className={`font-semibold mt-0.5 ${item.highlight ? 'text-blue-700 text-lg' : 'text-gray-900'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-600" /> Timeline</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Transaction Date</span>
                <span className="font-medium text-sm">{formatDate(investment.transactionDate)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Maturity Date</span>
                <span className="font-medium text-sm">{formatDate(investment.maturityDate)}</span>
              </div>
              {isActive && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 text-sm">Days Until Maturity</span>
                  <span className={`font-semibold text-sm ${days < 0 ? 'text-red-600' : days <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                    {getDaysLabel(days)}
                  </span>
                </div>
              )}
              {investment.paymentInitiatedAt && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 text-sm">Payment Initiated</span>
                  <span className="font-medium text-sm">{formatDateTime(investment.paymentInitiatedAt)}</span>
                </div>
              )}
              {investment.paymentCompletedAt && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 text-sm">Payment Completed</span>
                  <span className="font-medium text-sm text-green-600">{formatDateTime(investment.paymentCompletedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Extensions */}
          {investment.extensions?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><RefreshCw size={18} className="text-yellow-600" /> Extension History</h2>
              <div className="space-y-3">
                {investment.extensions.map((ext: any, i: number) => (
                  <div key={ext.id} className="bg-yellow-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-yellow-800">Extension #{i + 1}</div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div><span className="text-gray-500">Added Duration:</span> {ext.newDuration}</div>
                      <div><span className="text-gray-500">New Rate:</span> {Number(ext.newInterestRate)}%</div>
                      <div><span className="text-gray-500">New Maturity:</span> {formatDate(ext.newMaturityDate)}</div>
                      <div><span className="text-gray-500">Extended:</span> {formatDate(ext.extendedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log */}
          {investment.auditLogs?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Activity Log</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {investment.auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-gray-50">
                    <span className="text-gray-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                    <span className="font-medium text-gray-700">{log.user?.fullName || 'System'}</span>
                    <span className="text-gray-500">{log.actionType.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar details */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={18} className="text-blue-600" /> Client Info</h2>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium ml-1">{investment.clientName}</span></div>
              {investment.clientEmail && (
                <div className="flex items-center gap-1">
                  <Mail size={13} className="text-gray-400" />
                  <a href={`mailto:${investment.clientEmail}`} className="text-blue-600 hover:underline">{investment.clientEmail}</a>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Home size={18} className="text-blue-600" /> Realtor Info</h2>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium ml-1">{investment.realtorName}</span></div>
              <div className="flex items-center gap-1">
                <Mail size={13} className="text-gray-400" />
                <a href={`mailto:${investment.realtorEmail}`} className="text-blue-600 hover:underline">{investment.realtorEmail}</a>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">Created By</h2>
            <div className="text-sm">
              <div className="font-medium">{investment.createdByUser?.fullName}</div>
              <div className="text-gray-500 text-xs">{formatDateTime(investment.createdAt)}</div>
            </div>
          </div>

          {investment.documentUrl && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">Source Document</h2>
              <a href={investment.documentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
                View Document
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Extend Modal */}
      <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="Extend Investment">
        <form onSubmit={handleExtend} className="space-y-4">
          {investment.clientIntention && (
            <div className={`rounded-lg p-3 text-sm border ${
              investment.clientIntention === 'extend' ? 'bg-blue-50 border-blue-200 text-blue-800' :
              investment.clientIntention === 'partial' ? 'bg-orange-50 border-orange-200 text-orange-800' :
              'bg-green-50 border-green-200 text-green-800'
            }`}>
              <p className="font-semibold mb-0.5">Client's Response: {investment.clientIntention === 'extend' ? 'Wants to Extend' : investment.clientIntention === 'partial' ? 'Partial Withdrawal' : 'Wants Full Payout'}</p>
              {investment.clientIntentionMessage && <p className="text-xs opacity-80">"{investment.clientIntentionMessage}"</p>}
            </div>
          )}
          <div>
            <label className="label">New Duration *</label>
            <select className="input" value={extendForm.new_duration} onChange={e => setExtendForm(p => ({ ...p, new_duration: e.target.value }))}>
              {['1 month', '2 months', '3 months', '6 months', '9 months', '12 months'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">New Interest Rate (%) — leave blank to keep current ({investment.interestRate}%)</label>
            <input
              type="number" className="input" placeholder={String(investment.interestRate)}
              step="0.01" min="0" max="100"
              value={extendForm.new_interest_rate}
              onChange={e => setExtendForm(p => ({ ...p, new_interest_rate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">New Principal (₦) — for partial withdrawal</label>
            <input
              type="number" className="input"
              placeholder={`Full reinvestment: ${formatCurrency(Number(investment.maturityAmount))}`}
              step="1000" min="0"
              value={extendForm.new_principal}
              onChange={e => setExtendForm(p => ({ ...p, new_principal: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Current maturity amount: <strong>{formatCurrency(Number(investment.maturityAmount))}</strong>.
              Leave blank to reinvest in full. Enter a lower amount if client is withdrawing some.
            </p>
          </div>
          {extendForm.new_principal && parseFloat(extendForm.new_principal) < Number(investment.maturityAmount) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              Client will withdraw <strong>{formatCurrency(Number(investment.maturityAmount) - parseFloat(extendForm.new_principal))}</strong> and reinvest <strong>{formatCurrency(parseFloat(extendForm.new_principal))}</strong>.
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowExtendModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Extending...' : 'Extend Investment'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showCompleteModal}
        title="Complete Payment"
        message={`Mark payment of ${formatCurrency(Number(investment.maturityAmount))} as completed for ${investment.clientName}? This action is irreversible.`}
        confirmLabel="Complete Payment"
        confirmClass="btn-success"
        onConfirm={handleMarkPaymentCompleted}
        onCancel={() => setShowCompleteModal(false)}
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Investment"
        message={`Are you sure you want to delete this investment for ${investment.clientName}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        loading={actionLoading}
      />
    </div>
  );
}
