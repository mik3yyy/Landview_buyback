import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { aiUploadAPI, investmentsAPI } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

interface ExtractedData {
  clientName?: string;
  plotNumber?: string;
  principal?: number;
  interestRate?: number;
  duration?: string;
  transactionDate?: string;
  clientEmail?: string;
  realtorName?: string;
  realtorEmail?: string;
  upfrontPayment?: number;
  confidence: Record<string, number>;
}

function ConfidenceDot({ score }: { score?: number }) {
  if (score === undefined) return null;
  const color = score >= 0.8 ? 'bg-green-500' : score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span title={`Confidence: ${Math.round((score || 0) * 100)}%`} className={`inline-block w-2 h-2 rounded-full ${color} ml-2`} />
  );
}

export default function AIUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(selectedFile.type)) {
      toast.error('Only PDF, PNG, and JPG files are allowed');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    setFile(selectedFile);
    setExtracted(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const res = await aiUploadAPI.upload(file);
      const data = res.data.extracted_data;
      setExtracted(data);
      setDocumentUrl(res.data.document_url);
      setForm({
        clientName: data.clientName || '',
        plotNumber: data.plotNumber || '',
        principal: data.principal ? String(data.principal) : '',
        interestRate: data.interestRate ? String(data.interestRate) : '',
        duration: data.duration || '6 months',
        transactionDate: data.transactionDate || new Date().toISOString().split('T')[0],
        clientEmail: data.clientEmail || '',
        realtorName: data.realtorName || '',
        realtorEmail: data.realtorEmail || '',
        upfrontPayment: data.upfrontPayment ? String(data.upfrontPayment) : '',
      });
      toast.success('Document extracted successfully! Please review the data.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, documentUrl };
      const res = await investmentsAPI.create(payload);
      toast.success('Investment created from document!');
      navigate(`/investments/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create investment');
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const principal = parseFloat(form.principal) || 0;
  const interestRate = parseFloat(form.interestRate) || 0;
  const roi = principal * (interestRate / 100);
  const upfront = parseFloat(form.upfrontPayment) || 0;
  const maturityAmount = principal + roi - upfront;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Document Upload</h1>
          <p className="text-gray-500 text-sm">Upload a client buyback form to auto-extract investment data</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="card">
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          } ${!file ? 'cursor-pointer' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={32} className="text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); setExtracted(null); }} className="ml-4 text-red-500 hover:text-red-700 text-sm">
                Remove
              </button>
            </div>
          ) : (
            <div>
              <Upload size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Drop your document here or click to browse</p>
              <p className="text-gray-400 text-sm mt-1">PDF, PNG, JPG — max 10MB</p>
            </div>
          )}
        </div>

        {file && !extracted && (
          <div className="mt-4 flex justify-center">
            <button onClick={handleExtract} disabled={extracting} className="btn-primary px-8 flex items-center gap-2">
              {extracting ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Extracting with AI...</>
              ) : (
                <><Upload size={16} /> Extract Data with AI</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Extracted Form */}
      {extracted && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle size={20} className="text-green-600" />
            <h2 className="font-semibold text-gray-900">Extracted Data — Please Review</h2>
            <div className="ml-auto flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> High confidence</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Low — verify</span>
            </div>
          </div>

          {/* Preview */}
          {principal > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm mb-5">
              <div><div className="text-blue-600 font-medium">ROI</div><div className="font-bold text-blue-900">{formatCurrency(roi)}</div></div>
              <div><div className="text-blue-600 font-medium">Maturity Amount</div><div className="font-bold text-blue-900">{formatCurrency(maturityAmount)}</div></div>
              <div><div className="text-blue-600 font-medium">Interest Rate</div><div className="font-bold text-blue-900">{interestRate}%</div></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center">Transaction Date <ConfidenceDot score={extracted.confidence?.transactionDate} /></label>
                <input type="date" className="input" value={form.transactionDate} onChange={setField('transactionDate')} required />
              </div>
              <div>
                <label className="label flex items-center">Duration <ConfidenceDot score={extracted.confidence?.duration} /></label>
                <input type="text" className="input" value={form.duration} onChange={setField('duration')} placeholder="e.g. 6 months" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center">Client Name <ConfidenceDot score={extracted.confidence?.clientName} /></label>
                <input type="text" className="input" value={form.clientName} onChange={setField('clientName')} required />
              </div>
              <div>
                <label className="label flex items-center">Client Email <ConfidenceDot score={extracted.confidence?.clientEmail} /></label>
                <input type="email" className="input" value={form.clientEmail} onChange={setField('clientEmail')} />
              </div>
            </div>
            <div>
              <label className="label flex items-center">Plot Number <ConfidenceDot score={extracted.confidence?.plotNumber} /></label>
              <input type="text" className="input" value={form.plotNumber} onChange={setField('plotNumber')} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label flex items-center">Principal (₦) <ConfidenceDot score={extracted.confidence?.principal} /></label>
                <input type="number" className="input" value={form.principal} onChange={setField('principal')} required />
              </div>
              <div>
                <label className="label flex items-center">Interest Rate (%) <ConfidenceDot score={extracted.confidence?.interestRate} /></label>
                <input type="number" className="input" value={form.interestRate} onChange={setField('interestRate')} step="0.01" required />
              </div>
              <div>
                <label className="label flex items-center">Upfront Payment (₦) <ConfidenceDot score={extracted.confidence?.upfrontPayment} /></label>
                <input type="number" className="input" value={form.upfrontPayment} onChange={setField('upfrontPayment')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center">Realtor Name <ConfidenceDot score={extracted.confidence?.realtorName} /></label>
                <input type="text" className="input" value={form.realtorName} onChange={setField('realtorName')} required />
              </div>
              <div>
                <label className="label flex items-center">Realtor Email <ConfidenceDot score={extracted.confidence?.realtorEmail} /></label>
                <input type="email" className="input" value={form.realtorEmail} onChange={setField('realtorEmail')} required />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <button type="button" onClick={() => { setFile(null); setExtracted(null); }} className="btn-secondary">
                Start Over
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Investment Record'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
