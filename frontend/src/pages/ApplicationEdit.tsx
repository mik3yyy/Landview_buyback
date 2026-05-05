import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationsAPI } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import { Building2, CheckCircle, Check, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DURATION_OPTIONS = [
  { value: '6 months', label: '6 Months', rate: 20 },
  { value: '12 months', label: '12 Months', rate: 45 },
];

const SOURCE_OPTIONS = [
  'Salaries & Allowance', 'Donations/Grants', 'Personal Income',
  'Cooperative Contribution', 'Sales of Personal Property', 'Gift',
  'Business Income', 'Savings', 'Loans', 'Others',
];

const TOTAL_STEPS = 6;

function StepIndicator({ step }: { step: number }) {
  const labels = ['Personal', 'Address', 'Next of Kin', 'Investment', 'Payment', 'Finalise'];
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? <Check size={14} /> : n}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectCls = inputCls;

export default function ApplicationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState<Record<string, any>>({
    title: '', surname: '', otherNames: '', dateOfBirth: '', sex: '', maritalStatus: '',
    nationality: '', countryOfResidence: 'Nigeria', phoneNumber: '', alternativePhone: '',
    clientEmail: '',
    correspondenceAddress: '', correspondenceCity: '', correspondenceState: '',
    sameAsPermanent: true,
    permanentAddress: '', permanentCity: '', permanentState: '', country: 'Nigeria',
    isCorporate: false, corporateName: '', corporateAddress: '',
    nextOfKinName: '', nextOfKinEmail: '', nextOfKinPhone: '',
    duration: '6 months', principal: '',
    wantsUpfront: false,
    paymentMode: 'transfer', accountName: '', accountNumber: '', bankName: '',
    sourceOfFunds: [] as string[],
    realtorName: '', realtorEmail: '', realtorPhone: '',
    agreedToTerms: false,
    clientMessage: '',
  });

  useEffect(() => {
    if (!id) return;
    applicationsAPI.getStatus(id)
      .then(r => {
        const d = r.data;
        if (!['pending', 'rejected'].includes(d.status)) {
          toast.error('This application cannot be edited');
          navigate(`/application-status/${id}`);
          return;
        }
        setAppStatus(d.status);
        setRejectionReason(d.rejectionReason || '');

        const permanentSame =
          (!d.permanentAddress || d.permanentAddress === d.correspondenceAddress) &&
          (!d.permanentCity || d.permanentCity === d.correspondenceCity) &&
          (!d.permanentState || d.permanentState === d.correspondenceState);

        setForm({
          title: d.title || '',
          surname: d.surname || '',
          otherNames: d.otherNames || '',
          dateOfBirth: d.dateOfBirth ? d.dateOfBirth.slice(0, 10) : '',
          sex: d.sex || '',
          maritalStatus: d.maritalStatus || '',
          nationality: d.nationality || '',
          countryOfResidence: d.countryOfResidence || 'Nigeria',
          phoneNumber: d.phoneNumber || '',
          alternativePhone: d.alternativePhone || '',
          clientEmail: d.clientEmail || '',
          correspondenceAddress: d.correspondenceAddress || '',
          correspondenceCity: d.correspondenceCity || '',
          correspondenceState: d.correspondenceState || '',
          sameAsPermanent: permanentSame,
          permanentAddress: d.permanentAddress || '',
          permanentCity: d.permanentCity || '',
          permanentState: d.permanentState || '',
          country: d.country || 'Nigeria',
          isCorporate: d.isCorporate || false,
          corporateName: d.corporateName || '',
          corporateAddress: d.corporateAddress || '',
          nextOfKinName: d.nextOfKinName || '',
          nextOfKinEmail: d.nextOfKinEmail || '',
          nextOfKinPhone: d.nextOfKinPhone || '',
          duration: d.duration || '6 months',
          principal: d.principal ? String(d.principal) : '',
          wantsUpfront: d.wantsUpfront || false,
          paymentMode: d.paymentMode || 'transfer',
          accountName: d.accountName || '',
          accountNumber: d.accountNumber || '',
          bankName: d.bankName || '',
          sourceOfFunds: d.sourceOfFunds ? JSON.parse(d.sourceOfFunds) : [],
          realtorName: d.realtorName || '',
          realtorEmail: d.realtorEmail || '',
          realtorPhone: d.realtorPhone || '',
          agreedToTerms: d.agreedToTerms || false,
          clientMessage: d.clientMessage || '',
        });
      })
      .catch(() => toast.error('Application not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));
  const inp = (key: string) => ({ value: form[key], onChange: (e: any) => set(key, e.target.value), className: inputCls });

  const selectedDuration = DURATION_OPTIONS.find(d => d.value === form.duration) || DURATION_OPTIONS[0];
  const principal = parseFloat(form.principal) || 0;
  const roi = principal * (selectedDuration.rate / 100);
  const upfrontAmount = roi * 0.5;
  const maturityAmount = form.wantsUpfront ? principal + roi - upfrontAmount : principal + roi;

  const toggleSource = (src: string) => {
    const arr: string[] = form.sourceOfFunds;
    set('sourceOfFunds', arr.includes(src) ? arr.filter((s: string) => s !== src) : [...arr, src]);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.surname.trim()) { toast.error('Surname is required'); return false; }
      if (!form.otherNames.trim()) { toast.error('Other names are required'); return false; }
      if (!form.phoneNumber.trim()) { toast.error('Phone number is required'); return false; }
    }
    if (step === 2) {
      if (!form.correspondenceAddress.trim()) { toast.error('Correspondence address is required'); return false; }
      if (!form.correspondenceCity.trim()) { toast.error('City is required'); return false; }
      if (!form.correspondenceState.trim()) { toast.error('State is required'); return false; }
    }
    if (step === 3) {
      if (!form.nextOfKinName.trim()) { toast.error('Next of kin name is required'); return false; }
      if (!form.nextOfKinPhone.trim()) { toast.error('Next of kin phone number is required'); return false; }
    }
    if (step === 4) {
      if (!form.principal || parseFloat(form.principal) <= 0) { toast.error('Enter a valid principal amount'); return false; }
      if (parseFloat(form.principal) < 1000000) { toast.error('Minimum investment is ₦1,000,000'); return false; }
    }
    if (step === 5) {
      if (!form.realtorName.trim()) { toast.error('Realtor name is required'); return false; }
      if (form.paymentMode === 'transfer') {
        if (!form.accountName.trim()) { toast.error('Account name is required for bank transfer'); return false; }
        if (!form.accountNumber.trim()) { toast.error('Account number is required for bank transfer'); return false; }
        if (!form.bankName.trim()) { toast.error('Bank name is required for bank transfer'); return false; }
      }
    }
    if (step === 6) {
      if (!form.agreedToTerms) { toast.error('You must agree to the terms'); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep() || !id) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        permanentAddress: form.sameAsPermanent ? form.correspondenceAddress : form.permanentAddress,
        permanentCity: form.sameAsPermanent ? form.correspondenceCity : form.permanentCity,
        permanentState: form.sameAsPermanent ? form.correspondenceState : form.permanentState,
      };
      await applicationsAPI.edit(id, payload);
      setDone(true);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {appStatus === 'rejected' ? 'Application Resubmitted!' : 'Application Updated!'}
          </h2>
          <p className="text-gray-500 mb-6">
            {appStatus === 'rejected'
              ? 'Your updated application has been resubmitted and is now under review.'
              : 'Your changes have been saved. Your application is still under review.'}
          </p>
          <button
            onClick={() => navigate(`/application-status/${id}`)}
            className="btn-primary mx-auto"
          >
            View Application Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Building2 size={22} />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Landview Properties</div>
            <div className="text-xs text-blue-300">
              {appStatus === 'rejected' ? 'Edit & Resubmit Application' : 'Edit Application'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Rejection reason banner */}
        {appStatus === 'rejected' && rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Reason for rejection</p>
              <p className="text-sm text-red-600 mt-0.5">{rejectionReason}</p>
              <p className="text-xs text-red-400 mt-1">Please update the relevant sections below and resubmit.</p>
            </div>
          </div>
        )}

        {appStatus === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex gap-3">
            <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-700">Application is under review</p>
              <p className="text-xs text-yellow-600 mt-0.5">You can update your information. Your application will remain under review.</p>
            </div>
          </div>
        )}

        <StepIndicator step={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Title">
                  <select {...inp('title')} className={selectCls}>
                    <option value="">Select...</option>
                    {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Chief', 'Others'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Sex">
                  <select {...inp('sex')} className={selectCls}>
                    <option value="">Select...</option>
                    <option>Male</option><option>Female</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Surname" required><input type="text" {...inp('surname')} /></Field>
                <Field label="Other Names" required><input type="text" {...inp('otherNames')} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date of Birth"><input type="date" {...inp('dateOfBirth')} /></Field>
                <Field label="Marital Status">
                  <select {...inp('maritalStatus')} className={selectCls}>
                    <option value="">Select...</option>
                    <option>Single</option><option>Married</option><option>Others</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nationality"><input type="text" {...inp('nationality')} placeholder="e.g. Nigerian" /></Field>
                <Field label="Country of Residence"><input type="text" {...inp('countryOfResidence')} /></Field>
              </div>
              <Field label="Email Address"><input type="email" {...inp('clientEmail')} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone Number" required><input type="tel" {...inp('phoneNumber')} /></Field>
                <Field label="Alternative Phone"><input type="tel" {...inp('alternativePhone')} /></Field>
              </div>
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600"
                    checked={form.isCorporate} onChange={e => set('isCorporate', e.target.checked)} />
                  <span className="text-sm text-gray-700">This is a corporate/company investment</span>
                </label>
                {form.isCorporate && (
                  <div className="mt-3 space-y-3">
                    <Field label="Corporate Name"><input type="text" {...inp('corporateName')} /></Field>
                    <Field label="Corporate Address"><input type="text" {...inp('corporateAddress')} /></Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — Address */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Address Information</h2>
              <p className="text-sm text-gray-500">Correspondence address (where we'll send documents)</p>
              <Field label="Address" required><input type="text" {...inp('correspondenceAddress')} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" required><input type="text" {...inp('correspondenceCity')} /></Field>
                <Field label="State" required><input type="text" {...inp('correspondenceState')} /></Field>
              </div>
              <div className="mt-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600"
                    checked={form.sameAsPermanent} onChange={e => set('sameAsPermanent', e.target.checked)} />
                  <span className="text-sm text-gray-700">Permanent address same as correspondence address</span>
                </label>
                {!form.sameAsPermanent && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-500">Permanent address</p>
                    <Field label="Permanent Address"><input type="text" {...inp('permanentAddress')} /></Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="City"><input type="text" {...inp('permanentCity')} /></Field>
                      <Field label="State"><input type="text" {...inp('permanentState')} /></Field>
                    </div>
                    <Field label="Country"><input type="text" {...inp('country')} /></Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Next of Kin */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Next of Kin</h2>
              <p className="text-sm text-gray-500">Emergency contact information</p>
              <Field label="Full Name" required><input type="text" {...inp('nextOfKinName')} /></Field>
              <Field label="Email"><input type="email" {...inp('nextOfKinEmail')} /></Field>
              <Field label="Phone Number" required><input type="tel" {...inp('nextOfKinPhone')} /></Field>
            </div>
          )}

          {/* Step 4 — Investment Details */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Investment Details</h2>
              <Field label="Investment Duration" required>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {DURATION_OPTIONS.map(opt => (
                    <label key={opt.value} className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-colors
                      ${form.duration === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <input type="radio" name="duration" value={opt.value} checked={form.duration === opt.value}
                        onChange={() => set('duration', opt.value)} className="sr-only" />
                      <div className="font-bold text-gray-900">{opt.label}</div>
                      <div className="text-blue-600 font-semibold">{opt.rate}% return</div>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Principal Amount (₦)" required>
                <input type="number" {...inp('principal')} placeholder="Minimum ₦1,000,000" min="1000000" step="1000" />
                {form.principal && parseFloat(form.principal) < 1000000 && parseFloat(form.principal) > 0 && (
                  <p className="text-red-500 text-xs mt-1">Minimum investment is ₦1,000,000</p>
                )}
              </Field>
              {principal > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm">
                  <p className="font-semibold text-blue-800 mb-3">Estimated Returns</p>
                  <div className="flex justify-between"><span className="text-gray-600">Principal</span><span className="font-medium">{formatCurrency(principal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Interest Rate</span><span className="font-medium">{selectedDuration.rate}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">ROI (profit)</span><span className="font-medium text-green-700">{formatCurrency(roi)}</span></div>
                  {form.wantsUpfront && (
                    <div className="flex justify-between"><span className="text-gray-600">Upfront (50% of profit, after 6 weeks)</span><span className="font-medium text-orange-600">{formatCurrency(upfrontAmount)}</span></div>
                  )}
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold text-gray-800">Total at Maturity</span>
                    <span className="font-bold text-blue-700 text-base">{formatCurrency(maturityAmount)}</span>
                  </div>
                </div>
              )}
              <div className="border rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600"
                    checked={form.wantsUpfront} onChange={e => set('wantsUpfront', e.target.checked)} />
                  <div>
                    <div className="text-sm font-medium text-gray-800">I want an upfront payment</div>
                    <div className="text-xs text-gray-500 mt-0.5">Receive 50% of your profit after 6 weeks.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 5 — Payment Details */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
              <Field label="Payment Mode">
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {[{ val: 'transfer', label: 'Bank Transfer' }, { val: 'cheque', label: 'Cheque' }].map(opt => (
                    <label key={opt.val} className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-colors
                      ${form.paymentMode === opt.val ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <input type="radio" name="paymentMode" value={opt.val} checked={form.paymentMode === opt.val}
                        onChange={() => set('paymentMode', opt.val)} className="sr-only" />
                      <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    </label>
                  ))}
                </div>
              </Field>
              {form.paymentMode === 'transfer' && (
                <div className="space-y-3 border rounded-xl p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">Bank Account Details</p>
                  <Field label="Account Name" required><input type="text" {...inp('accountName')} /></Field>
                  <Field label="Account Number" required><input type="text" {...inp('accountNumber')} maxLength={10} /></Field>
                  <Field label="Bank Name" required><input type="text" {...inp('bankName')} /></Field>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Realtor / Agent Information <span className="text-red-500">*</span></p>
                  <button type="button"
                    onClick={() => {
                      set('realtorName', `${form.title ? form.title + ' ' : ''}${form.surname} ${form.otherNames}`.trim());
                      set('realtorEmail', form.clientEmail);
                      set('realtorPhone', form.phoneNumber);
                    }}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                  >
                    Same as Client
                  </button>
                </div>
                <div className="space-y-3">
                  <Field label="Realtor Name" required><input type="text" {...inp('realtorName')} /></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Realtor Email"><input type="email" {...inp('realtorEmail')} /></Field>
                    <Field label="Realtor Phone"><input type="tel" {...inp('realtorPhone')} /></Field>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6 — Source of Funds + Agreement */}
          {step === 6 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900">Finalise Application</h2>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Source of Funds</p>
                <p className="text-xs text-gray-500 mb-3">Select all that apply</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SOURCE_OPTIONS.map(src => {
                    const checked = form.sourceOfFunds.includes(src);
                    return (
                      <label key={src} className={`cursor-pointer border rounded-lg px-3 py-2 text-xs text-center transition-colors
                        ${checked ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSource(src)} className="sr-only" />
                        {src}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3 border rounded-xl p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Any message for us? (optional)</p>
                <textarea className={inputCls + ' resize-none'} rows={3}
                  value={form.clientMessage} onChange={e => set('clientMessage', e.target.value)}
                  placeholder="Any additional information or changes you'd like us to know..." />
              </div>
              <div className="border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Declaration</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-blue-600"
                    checked={form.agreedToTerms} onChange={e => set('agreedToTerms', e.target.checked)} />
                  <span className="text-sm text-gray-700">
                    I confirm that all information provided is accurate and complete. I understand the investment terms and agree to the terms and conditions of Landview Properties buyback investment programme.
                  </span>
                </label>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-blue-800">Summary</p>
                <p className="text-gray-700">Name: <strong>{form.title} {form.surname} {form.otherNames}</strong></p>
                <p className="text-gray-700">Phone: <strong>{form.phoneNumber}</strong></p>
                <p className="text-gray-700">Duration: <strong>{form.duration}</strong> · Principal: <strong>{formatCurrency(principal)}</strong></p>
                <p className="text-gray-700">Expected at maturity: <strong className="text-blue-700">{formatCurrency(maturityAmount)}</strong></p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            {step > 1 ? (
              <button onClick={back} className="btn-secondary text-sm">← Back</button>
            ) : (
              <button onClick={() => navigate(`/application-status/${id}`)} className="btn-secondary text-sm">← Cancel</button>
            )}
            {step < TOTAL_STEPS ? (
              <button onClick={next} className="btn-primary text-sm">Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm px-6 flex items-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Saving...' : appStatus === 'rejected' ? 'Update & Resubmit' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
