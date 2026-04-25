import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import InvestmentForm from '../components/investments/InvestmentForm';
import { investmentsAPI } from '../api/client';
import toast from 'react-hot-toast';

export default function EditInvestment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [investment, setInvestment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    investmentsAPI.get(id!)
      .then(res => setInvestment(res.data))
      .catch(() => toast.error('Failed to load investment'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const initialData = investment ? {
    transactionDate: new Date(investment.transactionDate).toISOString().split('T')[0],
    clientName: investment.clientName,
    plotNumber: investment.plotNumber,
    duration: investment.duration,
    principal: String(investment.principal),
    interestRate: String(investment.interestRate),
    upfrontPayment: investment.upfrontPayment ? String(investment.upfrontPayment) : '',
    clientEmail: investment.clientEmail || '',
    realtorName: investment.realtorName,
    realtorEmail: investment.realtorEmail,
  } : undefined;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Investment</h1>
          <p className="text-gray-500 text-sm">{investment?.clientName} — {investment?.plotNumber}</p>
        </div>
      </div>
      <div className="card">
        <InvestmentForm
          initialData={initialData}
          investmentId={id}
          onSuccess={(inv) => navigate(`/investments/${inv.id}`)}
          onCancel={() => navigate(`/investments/${id}`)}
        />
      </div>
    </div>
  );
}
