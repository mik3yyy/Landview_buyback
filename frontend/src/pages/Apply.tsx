import React, { useState, useRef } from 'react';
import { applicationsAPI, uploadAPI } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import { Building2, CheckCircle, Copy, Check, ChevronDown, ChevronUp, HelpCircle, Upload, X, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const FAQ_ITEMS = [
  {
    q: 'What will Landview Property give me as a guarantee for my subscription to the Buy Back Scheme?',
    a: (
      <ul className="space-y-2 text-sm text-gray-600">
        <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">✓</span><span><strong>Contract of Buyback Scheme</strong> — a signed agreement protecting your investment.</span></li>
        <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">✓</span><span><strong>Post-Dated Cheque</strong> — provided on request at the point of the transaction. Note: if the cheque is returned to the office after being issued, a penalty fee of <strong>₦20,000</strong> will be charged.</span></li>
        <li className="flex items-start gap-2"><span className="text-blue-500 font-bold mt-0.5">✓</span><span><strong>Official Receipt</strong> — issued upon successful payment.</span></li>
      </ul>
    ),
  },
  {
    q: 'Can I get an upfront payment?',
    a: (
      <p className="text-sm text-gray-600">
        Yes. <strong>50% of your profit</strong> can be paid to you after <strong>6 weeks</strong> from the date of investment. The remaining 50% of profit, plus your principal, will be paid at maturity.
        <br /><br />
        <span className="text-xs text-gray-400">Example: ₦1,000,000 at 20% (6 months) = ₦200,000 profit. Upfront = ₦100,000 after 6 weeks. At maturity = ₦1,000,000 + ₦100,000 = ₦1,100,000.</span>
      </p>
    ),
  },
  {
    q: 'Can I pay cash to your agent?',
    a: (
      <p className="text-sm text-gray-600">
        <strong className="text-red-600">We strongly advise that ALL payments be made directly to Landview Property Investments Limited.</strong>
        <br /><br />
        Bank transfer: <strong>Access Bank — 1886130168</strong> (Landview Property Investments Limited)
        <br /><br />
        Alternatively, cheques should be issued in favour of <strong>Landview Property Investments Limited</strong>.
      </p>
    ),
  },
  {
    q: 'Where is your office located?',
    a: (
      <p className="text-sm text-gray-600">
        Our office is located at:<br />
        <strong>Road 12, Block 10B, Plot 8, Lekki Scheme II,<br />
        Off Ogombo Road, Abraham Adesanya,<br />
        Ajah, Lagos.</strong>
      </p>
    ),
  },
  {
    q: 'What is the minimum investment plan?',
    a: (
      <p className="text-sm text-gray-600">
        The minimum investment package is <strong>₦1,000,000 (One Million Naira)</strong> and above.
      </p>
    ),
  },
];

function FAQItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-4 border-t border-gray-100 pt-3">{a}</div>}
    </div>
  );
}

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

type FormData = Record<string, any>;

export default function Apply() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Custom investment terms
  const [hasCustomTerms, setHasCustomTerms] = useState(false);
  const [customMonths, setCustomMonths] = useState('');
  const [customRate, setCustomRate] = useState('');

  // Receipt upload
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));
  const inp = (key: string) => ({ value: form[key], onChange: (e: any) => set(key, e.target.value), className: inputCls });

  // Compute effective duration/rate (custom overrides standard)
  const effectiveDuration = hasCustomTerms && customMonths
    ? `${customMonths} months`
    : form.duration;
  const selectedDuration = DURATION_OPTIONS.find(d => d.value === form.duration) || DURATION_OPTIONS[0];
  const effectiveRate = hasCustomTerms && customRate
    ? parseFloat(customRate) || 0
    : selectedDuration.rate;
  const principal = parseFloat(form.principal) || 0;
  const roi = principal * (effectiveRate / 100);
  const upfrontAmount = roi * 0.5;
  const maturityAmount = form.wantsUpfront ? principal + roi - upfrontAmount : principal + roi;

  const handleReceiptSelect = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Only JPG, PNG, WebP, or PDF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
    setReceiptFile(file);
    setUploadingReceipt(true);
    try {
      const res = await uploadAPI.receipt(file);
      setReceiptUrl(res.data.url);
      toast.success('Receipt uploaded!');
    } catch {
      toast.error('Failed to upload receipt. You can continue without it.');
      setReceiptFile(null);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const toggleSource = (src: string) => {
    const arr: string[] = form.sourceOfFunds;
    set('sourceOfFunds', arr.includes(src) ? arr.filter(s => s !== src) : [...arr, src]);
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
      if (hasCustomTerms) {
        if (!customMonths || parseInt(customMonths) < 1 || parseInt(customMonths) > 48) { toast.error('Custom duration must be between 1 and 48 months'); return false; }
        if (!customRate || parseFloat(customRate) <= 0) { toast.error('Enter a valid custom interest rate'); return false; }
      }
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
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        permanentAddress: form.sameAsPermanent ? form.correspondenceAddress : form.permanentAddress,
        permanentCity: form.sameAsPermanent ? form.correspondenceCity : form.permanentCity,
        permanentState: form.sameAsPermanent ? form.correspondenceState : form.permanentState,
        hasCustomTerms,
        customDuration: hasCustomTerms && customMonths ? `${customMonths} months` : null,
        customInterestRate: hasCustomTerms && customRate ? customRate : null,
        receiptImageUrl: receiptUrl || null,
      };
      const res = await applicationsAPI.submit(payload);
      setSubmitted(res.data.id);
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusUrl = submitted ? `${window.location.origin}/application-status/${submitted}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(statusUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mb-6">
            Thank you. Your application has been received and is under review. Save the link below to check your application status.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-blue-500 font-medium mb-2">Your application reference link</p>
            <p className="text-sm font-mono text-blue-800 break-all mb-3">{statusUrl}</p>
            <button onClick={copyLink} className="btn-primary flex items-center gap-2 mx-auto text-sm">
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
            </button>
          </div>
          <p className="text-xs text-gray-400">Application ID: {submitted}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Building2 size={22} />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Landview Properties</div>
            <div className="text-xs text-blue-300">Client Investment Registration</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
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
              <Field label="Email Address"><input type="email" {...inp('clientEmail')} placeholder="for notifications" /></Field>
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
                    <p className="text-sm text-gray-500">Permanent address (for agreement purposes)</p>
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

              {/* Standard duration options (hidden when using custom terms) */}
              {!hasCustomTerms && (
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
              )}

              {/* Custom/negotiated terms toggle */}
              <div className={`border-2 rounded-xl p-4 transition-colors ${hasCustomTerms ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-purple-600"
                    checked={hasCustomTerms} onChange={e => setHasCustomTerms(e.target.checked)} />
                  <div>
                    <div className="text-sm font-medium text-gray-800">I have different / negotiated investment terms</div>
                    <div className="text-xs text-gray-500 mt-0.5">Use this if your duration or return rate was agreed individually (e.g. 3, 18, 24, or up to 48 months, or a custom ROI).</div>
                  </div>
                </label>

                {hasCustomTerms && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (months) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className={inputCls}
                          placeholder="e.g. 18"
                          min="1"
                          max="48"
                          value={customMonths}
                          onChange={e => setCustomMonths(e.target.value)}
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">months</span>
                      </div>
                      {customMonths && (parseInt(customMonths) < 1 || parseInt(customMonths) > 48) && (
                        <p className="text-red-500 text-xs mt-1">Must be between 1 and 48 months</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interest Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className={inputCls}
                          placeholder="e.g. 25"
                          min="0"
                          max="100"
                          step="0.5"
                          value={customRate}
                          onChange={e => setCustomRate(e.target.value)}
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Principal Amount (₦)" required>
                <input type="number" {...inp('principal')} placeholder="Minimum ₦1,000,000" min="1000000" step="1000" />
                {form.principal && parseFloat(form.principal) < 1000000 && parseFloat(form.principal) > 0 && (
                  <p className="text-red-500 text-xs mt-1">Minimum investment is ₦1,000,000</p>
                )}
              </Field>

              {principal > 0 && effectiveRate > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm">
                  <p className="font-semibold text-blue-800 mb-3">Estimated Returns {hasCustomTerms && <span className="text-purple-600 font-normal">(custom terms)</span>}</p>
                  <div className="flex justify-between"><span className="text-gray-600">Principal</span><span className="font-medium">{formatCurrency(principal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Duration</span><span className="font-medium">{effectiveDuration}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Interest Rate</span><span className="font-medium">{effectiveRate}%</span></div>
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
                    <div className="text-xs text-gray-500 mt-0.5">Receive 50% of your profit after 6 weeks. The remainder is paid at maturity.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 5 — Payment Details */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
              <p className="text-sm text-gray-500">How would you like to receive your payment at maturity?</p>

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
                  <button
                    type="button"
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

              {/* Receipt upload */}
              <div className={`border-2 rounded-xl p-4 ${receiptUrl ? 'border-green-400 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <ImageIcon size={20} className={receiptUrl ? 'text-green-600 flex-shrink-0 mt-0.5' : 'text-gray-400 flex-shrink-0 mt-0.5'} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Payment Receipt <span className="text-orange-500 font-normal text-xs">(highly recommended)</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Attach a photo or scan of your payment receipt to speed up approval. If you haven't paid yet, you can skip this and submit later.
                    </p>
                  </div>
                </div>

                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleReceiptSelect(e.target.files[0])}
                />

                {receiptUrl ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm text-green-700 font-medium flex-1 truncate">{receiptFile?.name || 'Receipt uploaded'}</span>
                    <button
                      type="button"
                      onClick={() => { setReceiptFile(null); setReceiptUrl(''); }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={uploadingReceipt}
                    className="flex items-center gap-2 text-sm text-blue-600 font-medium border border-blue-200 bg-white hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    {uploadingReceipt
                      ? <><div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" /> Uploading...</>
                      : <><Upload size={15} /> Attach Receipt</>}
                  </button>
                )}
              </div>

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
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={3}
                  value={form.clientMessage}
                  onChange={e => set('clientMessage', e.target.value)}
                  placeholder="Any additional information or questions..."
                />
              </div>

              <div className="border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Declaration</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-blue-600"
                    checked={form.agreedToTerms} onChange={e => set('agreedToTerms', e.target.checked)} />
                  <span className="text-sm text-gray-700">
                    I confirm that all information provided is accurate and complete. I understand the investment terms including the early withdrawal penalty clause, and I agree to the terms and conditions of Landview Properties buyback investment programme.
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-blue-800">Summary</p>
                <p className="text-gray-700">Name: <strong>{form.title} {form.surname} {form.otherNames}</strong></p>
                <p className="text-gray-700">Phone: <strong>{form.phoneNumber}</strong></p>
                <p className="text-gray-700">Duration: <strong>{effectiveDuration}</strong>{hasCustomTerms && <span className="text-purple-600 text-xs ml-1">(custom)</span>} · Principal: <strong>{formatCurrency(principal)}</strong></p>
                <p className="text-gray-700">Rate: <strong>{effectiveRate}%</strong> · Expected at maturity: <strong className="text-blue-700">{formatCurrency(maturityAmount)}</strong></p>
                {receiptUrl && <p className="text-gray-700 flex items-center gap-1"><CheckCircle size={13} className="text-green-500" /> <span className="text-green-700">Payment receipt attached</span></p>}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            {step > 1 ? (
              <button onClick={back} className="btn-secondary text-sm">← Back</button>
            ) : <div />}
            {step < TOTAL_STEPS ? (
              <button onClick={next} className="btn-primary text-sm">Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm px-6">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={18} className="text-blue-500" />
            <h3 className="text-base font-semibold text-gray-800">Frequently Asked Questions</h3>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-6">
            For enquiries, visit our office at Road 12, Block 10B, Plot 8, Lekki Scheme II, Ajah, Lagos.
          </p>
        </div>
      </div>
    </div>
  );
}
