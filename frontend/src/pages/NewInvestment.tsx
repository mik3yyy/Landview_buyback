import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import InvestmentForm from '../components/investments/InvestmentForm';

export default function NewInvestment() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Investment</h1>
          <p className="text-gray-500 text-sm">Create a new land investment buyback record</p>
        </div>
      </div>
      <div className="card">
        <InvestmentForm
          onSuccess={(inv) => navigate(`/investments/${inv.id}`)}
          onCancel={() => navigate('/investments')}
        />
      </div>
    </div>
  );
}
