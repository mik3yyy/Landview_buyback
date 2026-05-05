import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, Clock, XCircle, Pencil } from 'lucide-react';
import { applicationsAPI } from '../api/client';
import { formatCurrency } from '../utils/formatters';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; desc: string }> = {
  pending: {
    icon: <Clock size={32} className="text-yellow-500" />,
    color: 'bg-yellow-50 border-yellow-200',
    label: 'Under Review',
    desc: 'Your application has been received and is currently being reviewed by our team. You can still edit your information while it is being reviewed.',
  },
  approved: {
    icon: <CheckCircle size={32} className="text-green-500" />,
    color: 'bg-green-50 border-green-200',
    label: 'Approved',
    desc: 'Congratulations! Your application has been approved. Our team will contact you to complete the investment process.',
  },
  converted: {
    icon: <CheckCircle size={32} className="text-blue-500" />,
    color: 'bg-blue-50 border-blue-200',
    label: 'Investment Active',
    desc: 'Your application has been approved and your investment is now active.',
  },
  rejected: {
    icon: <XCircle size={32} className="text-red-500" />,
    color: 'bg-red-50 border-red-200',
    label: 'Not Approved',
    desc: 'Unfortunately, your application was not approved at this time. See the reason below. You may update and resubmit.',
  },
};

export default function ApplicationStatus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appData, setAppData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    applicationsAPI.getStatus(id)
      .then(r => setAppData(r.data))
      .catch(() => setAppData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const cfg = appData ? (STATUS_CONFIG[appData.status] ?? STATUS_CONFIG.pending) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white py-5 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Building2 size={22} />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Landview Properties</div>
            <div className="text-xs text-blue-300">Application Status</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-400 mt-4 text-sm">Loading application...</p>
          </div>
        ) : !appData ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <XCircle size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Application not found. Please check your link.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`bg-white rounded-2xl shadow-sm border-2 ${cfg!.color} p-6`}>
              <div className="flex items-center gap-4 mb-4">
                {cfg!.icon}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{cfg!.label}</h2>
                  <p className="text-xs text-gray-400">Ref: {id}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{cfg!.desc}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
              <h3 className="font-semibold text-gray-800">Application Summary</h3>
              <div className="text-sm space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span className="font-medium text-gray-900">{appData.surname} {appData.otherNames}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span className="font-medium text-gray-900">{appData.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Principal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(Number(appData.principal))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submitted</span>
                  <span className="font-medium text-gray-900">{new Date(appData.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Edit button for pending applications */}
            {appData.status === 'pending' && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <p className="text-sm text-gray-500 mb-3">Need to correct something? You can edit your application while it is under review.</p>
                <button
                  onClick={() => navigate(`/application-edit/${id}`)}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Pencil size={15} /> Edit Application
                </button>
              </div>
            )}

            {appData.status === 'rejected' && appData.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-red-700 mb-1">Reason for rejection</p>
                <p className="text-sm text-red-600">{appData.rejectionReason}</p>
              </div>
            )}

            {appData.status === 'rejected' && (
              <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
                <p className="text-sm text-gray-600">Please review the rejection reason above, update your information, and resubmit.</p>
                <button
                  onClick={() => navigate(`/application-edit/${id}`)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Pencil size={15} /> Edit & Resubmit Application
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
