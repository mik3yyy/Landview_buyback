import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, TrendingUp, Calendar, User,
  Mail, Home, CheckCircle, RefreshCw, Trash2, FileText, MessageSquare, XCircle
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

interface TerminateFormData {
  reason: string;
  exitAmount: string;
}

export default function InvestmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdminOrAbove, isSuperAdmin } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [extendForm, setExtendForm] = useState<ExtendFormData>({ new_duration: '6 months', new_interest_rate: '', new_principal: '' });
  const [terminateForm, setTerminateForm] = useState<TerminateFormData>({ reason: '', exitAmount: '' });

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
      setShowInitiateModal(false);
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
      const res = await investmentsAPI.extend(id!, extendForm);
      if (res.data.pendingApproval) {
        toast.success('Extension request submitted — awaiting super admin approval');
      } else {
        toast.success('Investment extended successfully');
      }
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
      const res = await investmentsAPI.delete(id!);
      if (res.data.pendingApproval) {
        toast.success('Deletion request submitted — awaiting super admin approval');
        setShowDeleteModal(false);
        afterMutation();
      } else {
        toast.success('Investment deleted');
        clearCache('investments:');
        invalidateCache('dashboard');
        navigate('/investments');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!investment) return <div className="text-center py-20 text-gray-500">Investment not found</div>;

  const days = investment.daysUntilMaturity;
  const isPendingReview = investment.status === 'pending_review';
  const isPendingTermination = investment.status === 'pending_termination';
  const isPendingExtension = investment.status === 'pending_extension';
  const isPendingDeletion = investment.status === 'pending_deletion';
  const isActive = investment.status === 'active' || investment.status === 'extended';
  const canComplete = isAdminOrAbove && investment.status === 'payment_initiated';
  const canInitiate = isActive && investment.status !== 'payment_initiated';
  const isAnyPendingState = isPendingReview || isPendingTermination || isPendingExtension || isPendingDeletion;

  const handleApproveInvestment = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.approveInvestment(id!);
      toast.success('Investment approved and is now active');
      setShowApproveModal(false);
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await investmentsAPI.terminate(id!, {
        reason: terminateForm.reason || undefined,
        exitAmount: terminateForm.exitAmount || undefined,
      });
      if (res.data.pendingApproval) {
        toast.success('Termination request submitted — awaiting super admin approval');
      } else {
        toast.success('Investment terminated');
      }
      setShowTerminateModal(false);
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to terminate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmTermination = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.confirmTermination(id!);
      toast.success('Termination confirmed');
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to confirm termination');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTermination = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.cancelTermination(id!);
      toast.success('Pending termination cancelled — investment restored');
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel termination');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmExtension = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.confirmExtension(id!);
      toast.success('Extension confirmed — investment extended');
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to confirm extension');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelExtension = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.cancelExtension(id!);
      toast.success('Pending extension cancelled — investment restored');
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel extension');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.confirmDeletion(id!);
      toast.success('Investment deleted');
      clearCache('investments:');
      invalidateCache('dashboard');
      navigate('/investments');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
      setActionLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setActionLoading(true);
    try {
      await investmentsAPI.cancelDeletion(id!);
      toast.success('Pending deletion cancelled — investment restored');
      afterMutation();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel deletion');
    } finally {
      setActionLoading(false);
    }
  };

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

        {/* Pending review banner + approve button for super admin */}
        {isPendingReview && (
          <div className="flex items-center justify-between gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-purple-800">Pending Super Admin Approval</p>
              <p className="text-xs text-purple-500 mt-0.5">This investment was submitted by an admin and is awaiting your approval before it becomes active.</p>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={actionLoading}
                className="btn-success flex items-center gap-2 text-sm flex-shrink-0"
              >
                <CheckCircle size={15} /> Approve
              </button>
            )}
          </div>
        )}

        {/* Pending termination banner */}
        {isPendingTermination && (
          <div className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-orange-800">Termination Pending Super Admin Approval</p>
              <p className="text-xs text-orange-500 mt-0.5">
                An admin requested early termination
                {investment.terminationReason && `: "${investment.terminationReason}"`}.
                {investment.terminationExitAmount && ` Exit amount: ${investment.terminationExitAmount}.`}
              </p>
            </div>
            {isSuperAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleCancelTermination}
                  disabled={actionLoading}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTermination}
                  disabled={actionLoading}
                  className="btn-danger text-sm flex items-center gap-1"
                >
                  <XCircle size={14} /> Confirm Terminate
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pending extension banner */}
        {isPendingExtension && (
          <div className="flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-yellow-800">Extension Pending Super Admin Approval</p>
              <p className="text-xs text-yellow-600 mt-0.5">
                An admin requested an extension
                {investment.pendingExtensionData?.new_duration && `: ${investment.pendingExtensionData.new_duration}`}.
              </p>
            </div>
            {isSuperAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleCancelExtension} disabled={actionLoading} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleConfirmExtension} disabled={actionLoading} className="btn-primary text-sm flex items-center gap-1">
                  <CheckCircle size={14} /> Confirm Extension
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pending deletion banner */}
        {isPendingDeletion && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-red-800">Deletion Pending Super Admin Approval</p>
              <p className="text-xs text-red-500 mt-0.5">An admin requested this investment be deleted.</p>
            </div>
            {isSuperAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleCancelDeletion} disabled={actionLoading} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleConfirmDeletion} disabled={actionLoading} className="btn-danger text-sm flex items-center gap-1">
                  <Trash2 size={14} /> Confirm Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action buttons — only shown for active investments */}
        {!isAnyPendingState && (
          <div className="flex gap-2 flex-wrap">
            {canInitiate && (
              <button onClick={() => setShowInitiateModal(true)} disabled={actionLoading} className="btn-primary flex items-center gap-2 text-sm">
                <CheckCircle size={15} /> <span className="hidden sm:inline">Mark </span>Payment Initiated
              </button>
            )}
            {canComplete && (
              <button onClick={() => setShowCompleteModal(true)} className="btn-success flex items-center gap-2 text-sm">
                <CheckCircle size={15} /> Complete Payment
              </button>
            )}
            {investment.status !== 'completed' && investment.status !== 'terminated' && (
              <button onClick={() => setShowExtendModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
                <RefreshCw size={15} /> Extend
              </button>
            )}
            {isAdminOrAbove && investment.status !== 'completed' && investment.status !== 'terminated' && (
              <Link to={`/investments/${id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
                <Edit size={15} /> Edit
              </Link>
            )}
            {isAdminOrAbove && investment.status !== 'completed' && investment.status !== 'terminated' && (
              <button onClick={() => setShowTerminateModal(true)} className="btn-danger flex items-center gap-2 text-sm">
                <XCircle size={15} /> {isSuperAdmin ? 'Terminate' : 'Request Termination'}
              </button>
            )}
            {isAdminOrAbove && (
              <button onClick={() => setShowDeleteModal(true)} className="btn-danger flex items-center gap-2 text-sm" title={isSuperAdmin ? 'Delete' : 'Request Deletion'}>
                <Trash2 size={15} />{!isSuperAdmin && <span className="hidden sm:inline text-xs">Request Delete</span>}
              </button>
            )}
          </div>
        )}
        {isPendingReview && (
          <div className="flex gap-2">
            {isAdminOrAbove && (
              <Link to={`/investments/${id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
                <Edit size={15} /> Edit
              </Link>
            )}
            {isAdminOrAbove && (
              <button onClick={() => setShowDeleteModal(true)} className="btn-danger flex items-center gap-2 text-sm">
                <Trash2 size={15} />{!isSuperAdmin && <span className="hidden sm:inline text-xs">Request Delete</span>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Client Intention Banner */}
      {investment.clientIntention && (
        <div className={`rounded-xl border-2 px-5 py-4 flex items-start gap-4 ${
          investment.clientIntention === 'extend'
            ? 'bg-blue-50 border-blue-300'
            : investment.clientIntention === 'partial'
            ? 'bg-orange-50 border-orange-300'
            : 'bg-green-50 border-green-300'
        }`}>
          <MessageSquare size={22} className={
            investment.clientIntention === 'extend' ? 'text-blue-500 flex-shrink-0 mt-0.5' :
            investment.clientIntention === 'partial' ? 'text-orange-500 flex-shrink-0 mt-0.5' :
            'text-green-500 flex-shrink-0 mt-0.5'
          } />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-sm font-bold uppercase tracking-wide ${
                investment.clientIntention === 'extend' ? 'text-blue-700' :
                investment.clientIntention === 'partial' ? 'text-orange-700' :
                'text-green-700'
              }`}>Client Response Received</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                investment.clientIntention === 'extend' ? 'bg-blue-200 text-blue-800' :
                investment.clientIntention === 'partial' ? 'bg-orange-200 text-orange-800' :
                'bg-green-200 text-green-800'
              }`}>
                {investment.clientIntention === 'extend' ? 'Wants to Extend' :
                 investment.clientIntention === 'partial' ? 'Partial Withdrawal' :
                 'Full Payout'}
              </span>
              {investment.clientIntentionAt && (
                <span className="text-xs text-gray-400">{formatDateTime(investment.clientIntentionAt)}</span>
              )}
            </div>
            {investment.clientIntentionMessage && (
              <p className="text-sm text-gray-700 italic">"{investment.clientIntentionMessage}"</p>
            )}
          </div>
        </div>
      )}

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

          {investment.application?.id && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <FileText size={15} className="text-blue-500" /> Online Registration
              </h2>
              <Link
                to={`/admin/applications/${investment.application.id}`}
                className="btn-secondary text-sm w-full text-center justify-center flex items-center gap-2"
              >
                <FileText size={14} /> View Registration Details
              </Link>
            </div>
          )}

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
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">New Principal (₦)</label>
              <button
                type="button"
                onClick={() => setExtendForm(p => ({ ...p, new_principal: String(Number(investment.maturityAmount)) }))}
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
              >
                Use full maturity: {formatCurrency(Number(investment.maturityAmount))}
              </button>
            </div>
            <input
              type="number" className="input"
              placeholder={`Leave blank to reinvest ${formatCurrency(Number(investment.maturityAmount))} in full`}
              step="1000" min="0"
              value={extendForm.new_principal}
              onChange={e => setExtendForm(p => ({ ...p, new_principal: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave blank to reinvest the full maturity amount. Enter a lower amount if client is withdrawing some.
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
              {actionLoading
                ? (isSuperAdmin ? 'Extending...' : 'Submitting...')
                : (isSuperAdmin ? 'Extend Investment' : 'Submit Extension Request')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Termination info card */}
      {investment.status === 'terminated' && (
        <div className="card border-2 border-red-200 bg-red-50">
          <h2 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><XCircle size={18} className="text-red-600" /> Termination Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Terminated On:</span> <span className="font-medium">{investment.terminatedAt ? formatDateTime(investment.terminatedAt) : '—'}</span></div>
            {investment.terminationExitAmount && (
              <div className="flex justify-between"><span className="text-gray-500">Exit Amount:</span> <span className="font-semibold text-red-700">{formatCurrency(Number(investment.terminationExitAmount))}</span></div>
            )}
            {investment.terminationReason && (
              <div><span className="text-gray-500">Reason:</span> <span className="font-medium ml-1 italic">"{investment.terminationReason}"</span></div>
            )}
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      <Modal isOpen={showTerminateModal} onClose={() => setShowTerminateModal(false)} title="Terminate Investment Early">
        <form onSubmit={handleTerminate} className="space-y-4">
          <div className={`border rounded-lg p-3 text-sm ${isSuperAdmin ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
            <p className="font-semibold">This will end the investment before its maturity date.</p>
            <p className="text-xs mt-0.5">
              {isSuperAdmin
                ? 'Status will be set to Terminated immediately. This cannot be undone.'
                : 'A termination request will be sent to the super admin for approval.'}
            </p>
          </div>
          <div>
            <label className="label">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Client requested early exit, financial hardship..."
              value={terminateForm.reason}
              onChange={e => setTerminateForm(p => ({ ...p, reason: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Exit Amount (₦) <span className="text-gray-400 font-normal">(optional — amount paid to client on exit)</span></label>
            <input
              type="number"
              className="input"
              placeholder={`Full maturity would be ${formatCurrency(Number(investment.maturityAmount))}`}
              step="1000"
              min="0"
              value={terminateForm.exitAmount}
              onChange={e => setTerminateForm(p => ({ ...p, exitAmount: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowTerminateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-danger" disabled={actionLoading}>
              {actionLoading
                ? (isSuperAdmin ? 'Terminating...' : 'Submitting...')
                : (isSuperAdmin ? 'Terminate Investment' : 'Submit Termination Request')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showInitiateModal}
        title="Mark Payment Initiated"
        message={`Confirm that payment of ${formatCurrency(Number(investment.maturityAmount))} has been initiated for ${investment.clientName}?`}
        confirmLabel="Mark Initiated"
        confirmClass="btn-primary"
        onConfirm={handleMarkPaymentInitiated}
        onCancel={() => setShowInitiateModal(false)}
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={showApproveModal}
        title="Approve Investment"
        message={`Approve this investment for ${investment.clientName} (${formatCurrency(Number(investment.principal))})? It will become active immediately.`}
        confirmLabel="Approve"
        confirmClass="btn-success"
        onConfirm={handleApproveInvestment}
        onCancel={() => setShowApproveModal(false)}
        loading={actionLoading}
      />

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
        title={isSuperAdmin ? 'Delete Investment' : 'Request Deletion'}
        message={isSuperAdmin
          ? `Are you sure you want to permanently delete this investment for ${investment.clientName}? This cannot be undone.`
          : `Submit a deletion request for ${investment.clientName}'s investment? A super admin will need to confirm before it is deleted.`}
        confirmLabel={isSuperAdmin ? 'Delete' : 'Submit Request'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        loading={actionLoading}
      />
    </div>
  );
}
