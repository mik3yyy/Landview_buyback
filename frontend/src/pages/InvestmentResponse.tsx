import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, CheckCircle, TrendingUp, RefreshCw, DollarSign } from 'lucide-react';
import { responseAPI } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

type Intention = 'extend' | 'withdraw' | 'partial';

const INTENTIONS: { value: Intention; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'extend',
    label: 'Yes, I want to extend my investment',
    desc: 'Reinvest the full maturity amount for another term and earn more.',
    icon: <RefreshCw size={22} className="text-blue-600" />,
    color: 'border-blue-500 bg-blue-50',
  },
  {
    value: 'partial',
    label: 'Partial withdrawal — reinvest the rest',
    desc: 'Withdraw some of your payout and reinvest the remainder.',
    icon: <TrendingUp size={22} className="text-orange-500" />,
    color: 'border-orange-400 bg-orange-50',
  },
  {
    value: 'withdraw',
    label: 'No, please pay me my full amount',
    desc: 'Collect your full principal + profit at maturity. We will contact you to arrange payment.',
    icon: <DollarSign size={22} className="text-green-600" />,
    color: 'border-green-500 bg-green-50',
  },
];

export default function InvestmentResponse() {
  const { token } = useParams<{ token: string }>();
  const [investment, setInvestment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Intention | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    responseAPI.getByToken(token)
      .then(r => setInvestment(r.data))
      .catch(() => setInvestment(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!selected) { toast.error('Please select an option'); return; }
    setSubmitting(true);
    try {
      await responseAPI.submit(token!, { intention: selected, message });
      setDone(true);
    } catch {
      toast.error('Failed to submit. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white py-5 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg"><Building2 size={22} /></div>
          <div>
            <div className="font-bold text-base leading-tight">Landview Properties</div>
            <div className="text-xs text-blue-300">Investment Maturity Response</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : !investment ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <p className="text-gray-500">This link is invalid or has expired. Please contact us directly.</p>
          </div>
        ) : done ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you, {investment.clientName.split(' ')[0]}!</h2>
            <p className="text-gray-500 text-sm">
              We've received your response. Our team will be in touch with you before your maturity date of{' '}
              <strong>{formatDate(investment.maturityDate)}</strong>.
            </p>
          </div>
        ) : investment.clientIntention ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <CheckCircle size={36} className="text-blue-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Response Already Recorded</h2>
            <p className="text-gray-500 text-sm">
              You have already responded to this investment. Our team will contact you before maturity on{' '}
              <strong>{formatDate(investment.maturityDate)}</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Investment summary */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Your Investment</p>
              <p className="text-lg font-bold text-gray-900">{investment.clientName}</p>
              <p className="text-sm text-gray-500 mb-4">Plot {investment.plotNumber} · {investment.duration}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Principal</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{formatCurrency(Number(investment.principal))}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="text-xs text-blue-500">Total at Maturity</div>
                  <div className="font-bold text-blue-700 mt-0.5">{formatCurrency(Number(investment.maturityAmount))}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <div className="text-xs text-gray-400">Maturity Date</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{formatDate(investment.maturityDate)}</div>
                </div>
              </div>
            </div>

            {/* Choice */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <p className="font-semibold text-gray-900 mb-1">What would you like to do?</p>
              <p className="text-sm text-gray-500 mb-4">Select one option below. Our team will contact you to finalise the details.</p>
              <div className="space-y-3">
                {INTENTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      selected === opt.value ? opt.color : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input type="radio" name="intention" value={opt.value} className="sr-only"
                      checked={selected === opt.value} onChange={() => setSelected(opt.value)} />
                    <div className="mt-0.5 flex-shrink-0">{opt.icon}</div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {selected && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selected === 'partial'
                      ? 'How much would you like to withdraw? Tell us and we\'ll work out the rest.'
                      : 'Any additional message or instructions? (optional)'}
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={
                      selected === 'partial'
                        ? 'e.g. I\'d like to withdraw ₦500,000 and reinvest the rest for 6 months'
                        : 'Any notes for our team...'
                    }
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit My Response'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center px-4">
              Our team will contact you to confirm details before your maturity date. For urgent enquiries call us or visit Road 12, Block 10B, Plot 8, Lekki Scheme II, Ajah, Lagos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
