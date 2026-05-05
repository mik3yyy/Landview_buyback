import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, User, Phone, Mail,
  Home, TrendingUp, CreditCard, Users, FileText, Clock, Eye,
} from 'lucide-react';
import { applicationsAPI } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/ui/Modal';
import { useBackgroundFetch, invalidateCache } from '../../hooks/useBackgroundFetch';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const DURATION_RATES: Record<string, number> = {
  '6 months': 20,
  '12 months': 45,
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0 && value !== false) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">{icon} {title}</h3>
      {children}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending Review',          color: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Reviewed — Awaiting Approval', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved',                color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected',                color: 'bg-red-100 text-red-700' },
  converted:{ label: 'Converted to Investment', color: 'bg-blue-100 text-blue-700' },
};

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Approve form
  const [approveForm, setApproveForm] = useState({
    plotNumber: '',
    transactionDate: new Date().toISOString().split('T')[0],
    clientName: '',
    realtorName: '',
    realtorEmail: '',
    duration: '',
    principal: '',
    interestRate: '',
    wantsUpfront: false,
  });

  const { data: app, loading, refreshing, error, refresh } = useBackgroundFetch<any>(
    `application:${id}`,
    () => applicationsAPI.get(id!).then(r => r.data)
  );

  useEffect(() => {
    if (error) toast.error('Failed to load application');
  }, [error]);

  // Pre-fill approve form from application data
  useEffect(() => {
    if (!app) return;
    const rate = DURATION_RATES[app.duration] ?? 20;
    setApproveForm(f => ({
      ...f,
      clientName: `${app.title ? app.title + ' ' : ''}${app.surname} ${app.otherNames}`,
      realtorName: app.realtorName || '',
      realtorEmail: app.realtorEmail || '',
      duration: app.duration,
      principal: String(app.principal),
      interestRate: String(rate),
      wantsUpfront: app.wantsUpfront || false,
    }));
  }, [app]);

  const principalNum = parseFloat(approveForm.principal) || 0;
  const rateNum = parseFloat(approveForm.interestRate) || 0;
  const roi = principalNum * (rateNum / 100);
  const upfront = approveForm.wantsUpfront ? roi * 0.5 : 0;
  const maturityAmount = principalNum + (roi - upfront);

  const handleReview = async () => {
    setActionLoading(true);
    try {
      await applicationsAPI.review(id!);
      toast.success('Application marked as reviewed — awaiting super admin approval');
      invalidateCache(`application:${id}`);
      invalidateCache('applications:');
      refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to mark as reviewed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await applicationsAPI.reject(id!, rejectReason);
      toast.success('Application rejected');
      setShowRejectModal(false);
      invalidateCache(`application:${id}`);
      invalidateCache('applications:');
      refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveForm.plotNumber.trim()) { toast.error('Plot number is required'); return; }
    if (!approveForm.transactionDate) { toast.error('Transaction date is required'); return; }
    setActionLoading(true);
    try {
      const payload = {
        ...approveForm,
        upfrontPayment: approveForm.wantsUpfront ? String(upfront) : '',
      };
      const res = await applicationsAPI.approve(id!, payload);
      toast.success('Application approved! Investment created.');
      setShowApproveModal(false);
      invalidateCache(`application:${id}`);
      invalidateCache('applications:');
      invalidateCache('dashboard');
      navigate(`/investments/${res.data.investmentId}`);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to approve');
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (!app) return <div className="text-center py-20 text-gray-500">Application not found</div>;

  const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
  const sourceOfFunds = app.sourceOfFunds ? JSON.parse(app.sourceOfFunds) : [];

  // Admin (non-super) can mark pending/rejected as reviewed
  const canReview = !isSuperAdmin && (app.status === 'pending' || app.status === 'rejected');
  // Super admin can approve/reject reviewed applications (or pending ones directly)
  const canFinalise = isSuperAdmin && (app.status === 'reviewed' || app.status === 'pending' || app.status === 'rejected');

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2 flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              {app.title} {app.surname} {app.otherNames}
            </h1>
            {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">Submitted {new Date(app.submittedAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Admin — mark as reviewed */}
      {canReview && (
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={handleReview}
            disabled={actionLoading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Eye size={15} /> Mark as Reviewed
          </button>
          <p className="text-xs text-gray-400">Review the details above, then mark as reviewed for super admin approval.</p>
        </div>
      )}

      {/* Super admin — final approval */}
      {canFinalise && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowApproveModal(true)} className="btn-success flex items-center gap-2 text-sm">
            <CheckCircle size={15} /> Approve &amp; Create Investment
          </button>
          <button onClick={() => setShowRejectModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <XCircle size={15} /> Reject
          </button>
        </div>
      )}

      {/* Rejection reason */}
      {app.status === 'rejected' && app.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
          <p className="text-sm text-red-600">{app.rejectionReason}</p>
          {app.reviewer && <p className="text-xs text-red-400 mt-2">Reviewed by {app.reviewer.fullName}</p>}
        </div>
      )}

      {/* Linked investment */}
      {app.investment && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-800">Converted to Investment</p>
            <p className="text-xs text-blue-500">Plot {app.investment.plotNumber}</p>
          </div>
          <Link to={`/investments/${app.investment.id}`} className="btn-primary text-sm">
            View Investment →
          </Link>
        </div>
      )}

      {/* Client message */}
      {app.clientMessage && (
        <div className="bg-gray-50 border rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Message from Client</p>
          <p className="text-sm text-gray-700">{app.clientMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal */}
        <Section title="Personal Information" icon={<User size={16} className="text-blue-500" />}>
          <InfoRow label="Title" value={app.title} />
          <InfoRow label="Surname" value={app.surname} />
          <InfoRow label="Other Names" value={app.otherNames} />
          <InfoRow label="Date of Birth" value={app.dateOfBirth} />
          <InfoRow label="Sex" value={app.sex} />
          <InfoRow label="Marital Status" value={app.maritalStatus} />
          <InfoRow label="Nationality" value={app.nationality} />
          <InfoRow label="Country" value={app.countryOfResidence} />
          {app.isCorporate && <InfoRow label="Corporate Name" value={app.corporateName} />}
        </Section>

        {/* Contact */}
        <Section title="Contact Details" icon={<Phone size={16} className="text-green-500" />}>
          <InfoRow label="Phone" value={app.phoneNumber} />
          <InfoRow label="Alternative Phone" value={app.alternativePhone} />
          <InfoRow label="Email" value={app.clientEmail} />
          <InfoRow label="Correspondence Address" value={app.correspondenceAddress} />
          <InfoRow label="City / State" value={[app.correspondenceCity, app.correspondenceState].filter(Boolean).join(', ')} />
          <InfoRow label="Permanent Address" value={app.permanentAddress} />
          <InfoRow label="Perm. City / State" value={[app.permanentCity, app.permanentState].filter(Boolean).join(', ')} />
        </Section>

        {/* Next of Kin */}
        <Section title="Next of Kin" icon={<Users size={16} className="text-purple-500" />}>
          <InfoRow label="Name" value={app.nextOfKinName} />
          <InfoRow label="Email" value={app.nextOfKinEmail} />
          <InfoRow label="Phone" value={app.nextOfKinPhone} />
        </Section>

        {/* Investment */}
        <Section title="Investment Details" icon={<TrendingUp size={16} className="text-blue-500" />}>
          <InfoRow label="Duration" value={app.duration} />
          <InfoRow label="Principal" value={formatCurrency(Number(app.principal))} />
          <InfoRow label="Wants Upfront" value={app.wantsUpfront ? 'Yes' : 'No'} />
          <InfoRow label="Interest Rate" value={`${DURATION_RATES[app.duration] ?? '—'}%`} />
          <InfoRow label="Est. ROI" value={formatCurrency(Number(app.principal) * ((DURATION_RATES[app.duration] ?? 0) / 100))} />
        </Section>

        {/* Payment */}
        <Section title="Payment Details" icon={<CreditCard size={16} className="text-orange-500" />}>
          <InfoRow label="Payment Mode" value={app.paymentMode} />
          <InfoRow label="Account Name" value={app.accountName} />
          <InfoRow label="Account Number" value={app.accountNumber} />
          <InfoRow label="Bank" value={app.bankName} />
        </Section>

        {/* Realtor */}
        <Section title="Realtor Information" icon={<Home size={16} className="text-indigo-500" />}>
          <InfoRow label="Name" value={app.realtorName || '—'} />
          <InfoRow label="Email" value={app.realtorEmail} />
          <InfoRow label="Phone" value={app.realtorPhone} />
        </Section>

        {/* Source of funds */}
        {sourceOfFunds.length > 0 && (
          <Section title="Source of Funds" icon={<FileText size={16} className="text-gray-500" />}>
            <div className="flex flex-wrap gap-2 mt-1">
              {sourceOfFunds.map((s: string) => (
                <span key={s} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Timeline */}
        <Section title="Timeline" icon={<Clock size={16} className="text-gray-400" />}>
          <InfoRow label="Submitted" value={new Date(app.submittedAt).toLocaleString()} />
          {app.reviewedAt && <InfoRow label="Reviewed" value={new Date(app.reviewedAt).toLocaleString()} />}
          {app.reviewer && <InfoRow label="Reviewed by" value={app.reviewer.fullName} />}
        </Section>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Application">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Rejecting the application for <strong>{app.surname} {app.otherNames}</strong>. The client will see your reason and can resubmit.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={4}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why the application is being rejected (optional but recommended)..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve & Create Investment">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Confirm or adjust the investment details before creating.</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plot Number</label>
              <input className="input" placeholder="e.g. A12" value={approveForm.plotNumber}
                onChange={e => setApproveForm(f => ({ ...f, plotNumber: e.target.value }))} />
            </div>
            <div>
              <label className="label">Transaction Date *</label>
              <input type="date" className="input" value={approveForm.transactionDate}
                onChange={e => setApproveForm(f => ({ ...f, transactionDate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Client Name</label>
            <input className="input" value={approveForm.clientName}
              onChange={e => setApproveForm(f => ({ ...f, clientName: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duration</label>
              <select className="input" value={approveForm.duration}
                onChange={e => {
                  const rate = DURATION_RATES[e.target.value] ?? 20;
                  setApproveForm(f => ({ ...f, duration: e.target.value, interestRate: String(rate) }));
                }}>
                <option value="6 months">6 Months</option>
                <option value="12 months">12 Months</option>
              </select>
            </div>
            <div>
              <label className="label">Interest Rate (%)</label>
              <input type="number" className="input" value={approveForm.interestRate} step="0.01"
                onChange={e => setApproveForm(f => ({ ...f, interestRate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Principal (₦)</label>
            <input type="number" className="input" value={approveForm.principal}
              onChange={e => setApproveForm(f => ({ ...f, principal: e.target.value }))} />
          </div>

          <div className="border rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800">Upfront Payment</div>
                <div className="text-xs text-gray-500 mt-0.5">50% of profit paid after 6 weeks</div>
              </div>
              <button
                type="button"
                onClick={() => setApproveForm(f => ({ ...f, wantsUpfront: !f.wantsUpfront }))}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                  approveForm.wantsUpfront
                    ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {approveForm.wantsUpfront ? 'Yes — With Upfront' : 'No Upfront'}
              </button>
            </div>
            {approveForm.wantsUpfront && principalNum > 0 && (
              <div className="mt-2 pt-2 border-t text-sm text-orange-700">
                Upfront: <strong>{formatCurrency(upfront)}</strong>
                <span className="text-gray-400 ml-2">· At maturity: {formatCurrency(maturityAmount)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Realtor Name</label>
              <input className="input" value={approveForm.realtorName}
                onChange={e => setApproveForm(f => ({ ...f, realtorName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Realtor Email</label>
              <input type="email" className="input" value={approveForm.realtorEmail}
                onChange={e => setApproveForm(f => ({ ...f, realtorEmail: e.target.value }))} />
            </div>
          </div>

          {/* Calculated preview */}
          {principalNum > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Principal</span>
                <span className="font-medium">{formatCurrency(principalNum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Profit ({rateNum}%)</span>
                <span className="font-medium text-green-700">+ {formatCurrency(roi)}</span>
              </div>
              {upfront > 0 && (
                <>
                  <div className="flex justify-between text-orange-600">
                    <span>Upfront paid after 6 weeks</span>
                    <span className="font-medium">- {formatCurrency(upfront)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Remaining profit at maturity</span>
                    <span>{formatCurrency(roi - upfront)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t pt-1.5 mt-1">
                <span className="font-semibold">Amount at Maturity</span>
                <span className="font-bold text-blue-700">{formatCurrency(maturityAmount)}</span>
              </div>
              {upfront > 0 && (
                <div className="text-xs text-gray-400 pt-0.5">
                  Total payout = {formatCurrency(upfront)} (upfront) + {formatCurrency(maturityAmount)} (maturity) = {formatCurrency(upfront + maturityAmount)}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowApproveModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleApprove} disabled={actionLoading} className="btn-success">
              {actionLoading ? 'Creating...' : 'Approve & Create Investment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
