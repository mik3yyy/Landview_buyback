import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle, X, Loader2 } from 'lucide-react';
import { bulkAPI } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

interface ParsedRow {
  rowNum: number;
  transactionDate: string;
  clientName: string;
  plotNumber: string;
  duration: string;
  principal: number;
  interestRate: number;
  upfrontPayment: number | null;
  clientEmail: string;
  realtorName: string;
  realtorEmail: string;
  error?: string;
  upfrontWarning?: string;
}

function findHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i].map(c => String(c ?? '').toUpperCase().trim());
    if (row.includes('CLIENT NAME') || row.includes('CLIENT EMAIL')) return i;
  }
  return -1;
}

function buildColMap(headerRow: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const s = String(h ?? '').toUpperCase().trim();
    if (s.includes('TRANSACTION DATE')) map.transactionDate = i;
    else if (s === 'CLIENT NAME') map.clientName = i;
    else if (s === 'PLOT') map.plotNumber = i;
    else if (s === 'DURATION') map.duration = i;
    else if (s === 'PRINCIPAL') map.principal = i;
    else if (s === 'UPFRONT') map.upfrontPayment = i;
    else if (s === 'CLIENT EMAIL') map.clientEmail = i;
    else if (s === 'REALTOR NAME') map.realtorName = i;
    else if (s === 'REALTOR EMAIL') map.realtorEmail = i;
    else if (s === '%') map.interestRate = i;
  });
  return map;
}

function excelDateToISO(val: any): string {
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return '';
}

function parseRows(rows: any[][], colMap: Record<string, number>, headerIdx: number): ParsedRow[] {
  const result: ParsedRow[] = [];
  const required = ['transactionDate', 'clientName', 'plotNumber', 'duration', 'principal', 'interestRate', 'realtorName', 'realtorEmail'];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    if (!row || row.every(c => c == null || c === '')) continue;
    // Skip if clientName is empty (end of data)
    const clientNameVal = row[colMap.clientName];
    if (!clientNameVal) continue;

    const clientEmail = String(row[colMap.clientEmail] ?? '').trim();
    const realtorEmailRaw = String(row[colMap.realtorEmail] ?? '').trim();
    const realtorEmail = realtorEmailRaw.toLowerCase() === 'same' ? clientEmail : realtorEmailRaw;

    const principalVal = parseFloat(row[colMap.principal]) || 0;
    const rateVal = parseFloat(row[colMap.interestRate]) || 0;

    // Compute upfront: nil/empty → no upfront; any value → our formula (50% of ROI)
    let upfrontPayment: number | null = null;
    let upfrontWarning: string | undefined;
    const rawUpfront = colMap.upfrontPayment !== undefined ? row[colMap.upfrontPayment] : undefined;
    if (rawUpfront != null && rawUpfront !== '') {
      const excelUpfront = parseFloat(rawUpfront);
      if (!isNaN(excelUpfront) && excelUpfront > 0) {
        const ourUpfront = (principalVal * rateVal / 100) * 0.5;
        upfrontPayment = ourUpfront;
        if (ourUpfront > 0 && Math.abs(excelUpfront - ourUpfront) / ourUpfront > 0.01) {
          upfrontWarning = `Sheet: ₦${excelUpfront.toLocaleString()} → using ₦${ourUpfront.toLocaleString()}`;
        }
      }
    }

    const parsed: ParsedRow = {
      rowNum: i + 1,
      transactionDate: excelDateToISO(row[colMap.transactionDate]),
      clientName: String(clientNameVal).trim(),
      plotNumber: String(row[colMap.plotNumber] ?? '').trim(),
      duration: String(row[colMap.duration] ?? '').trim(),
      principal: principalVal,
      interestRate: rateVal,
      upfrontPayment,
      upfrontWarning,
      clientEmail,
      realtorName: String(row[colMap.realtorName] ?? '').trim(),
      realtorEmail,
    };

    // Validate
    const missing = required.filter(f => {
      const v = (parsed as any)[f];
      return v === '' || v === 0 || v == null;
    });
    if (missing.length) {
      parsed.error = `Missing: ${missing.join(', ')}`;
    } else if (!parsed.transactionDate) {
      parsed.error = 'Invalid transaction date';
    } else if (parsed.principal <= 0) {
      parsed.error = 'Principal must be > 0';
    } else if (parsed.interestRate <= 0) {
      parsed.error = 'Interest rate must be > 0';
    }

    result.push(parsed);
  }
  return result;
}

export default function BulkUpload() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an .xlsx or .xls file');
      return;
    }
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'YYYY-MM-DD' });

        const headerIdx = findHeaderRow(allRows);
        if (headerIdx === -1) {
          toast.error('Could not find header row. Expected columns: CLIENT NAME, PRINCIPAL, etc.');
          return;
        }

        // Re-read with raw for numbers, dates handled separately
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
        const colMap = buildColMap(rawRows[headerIdx]);

        const missingCols = ['clientName', 'transactionDate', 'principal', 'interestRate'].filter(k => colMap[k] === undefined);
        if (missingCols.length) {
          toast.error(`Missing required columns in sheet`);
          return;
        }

        const parsed = parseRows(rawRows, colMap, headerIdx);
        setRows(parsed);
        if (parsed.length === 0) toast.error('No data rows found');
      } catch (err) {
        toast.error('Failed to parse file. Make sure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setUploading(true);
    try {
      const res = await bulkAPI.create(validRows);
      setResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Successfully imported ${res.data.created} investment${res.data.created !== 1 ? 's' : ''}`);
        setRows([]);
        setFileName('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet size={24} className="text-green-600" /> Excel Bulk Import
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload your Excel file to import multiple investments at once.
        </p>
      </div>

      {/* Expected format notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="font-semibold text-blue-900 mb-1">Expected column headers (in any order):</p>
        <p className="text-blue-700 font-mono text-xs">
          S/N · TRANSACTION DATE · CLIENT NAME · PLOT · DURATION · MATURITY DATE · PRINCIPAL · ROI · UPFRONT · MATURITY AMOUNT · CLIENT EMAIL · REALTOR NAME · REALTOR EMAIL · %
        </p>
        <p className="text-blue-600 mt-2 text-xs">
          Tip: If REALTOR EMAIL is <strong>"same"</strong>, the client's email will be used automatically.
        </p>
      </div>

      {/* Drop zone */}
      {rows.length === 0 && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">Drop your .xlsx file here or click to browse</p>
          <p className="text-gray-400 text-sm mt-1">Supports .xlsx and .xls files</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${result.errors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">{result.created} investment{result.created !== 1 ? 's' : ''} imported successfully</p>
            {result.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                {result.errors.map((e: any, i: number) => (
                  <p key={i} className="text-sm text-red-700">Row {e.row} ({e.clientName}): {e.message}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">{fileName}</span>
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                {validRows.length} valid
              </span>
              {errorRows.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {errorRows.length} with errors
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => { setRows([]); setFileName(''); setResult(null); }}
              >
                <X size={15} /> Clear
              </button>
              <button
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={validRows.length === 0 || uploading}
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading ? 'Importing...' : `Import ${validRows.length} Investment${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Upfront mismatch notice */}
          {rows.some(r => r.upfrontWarning) && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Upfront mismatch detected</strong> on some rows — the sheet value differs from our calculation (50% of ROI). Our calculated values will be used. Hover the <AlertTriangle size={11} className="inline text-yellow-500" /> icon to see the difference.
              </span>
            </div>
          )}

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['#', 'Status', 'Client Name', 'Plot', 'Date', 'Duration', 'Principal', 'Rate %', 'Upfront', 'Realtor', 'Realtor Email'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(row => (
                    <tr key={row.rowNum} className={row.error ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-400">{row.rowNum}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="flex items-center gap-1 text-red-700">
                            <AlertCircle size={12} />
                            <span className="truncate max-w-[140px]" title={row.error}>{row.error}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-700">
                            <CheckCircle size={12} /> Valid
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{row.clientName}</td>
                      <td className="px-3 py-2 font-mono">{row.plotNumber}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.transactionDate}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.duration}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.principal ? formatCurrency(row.principal) : '—'}</td>
                      <td className="px-3 py-2">{row.interestRate || '—'}%</td>
                      <td className="px-3 py-2">
                        {row.upfrontPayment ? (
                          <span className="flex items-center gap-1">
                            {formatCurrency(row.upfrontPayment)}
                            {row.upfrontWarning && (
                              <span title={`Mismatch: ${row.upfrontWarning}`}>
                                <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0" />
                              </span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.realtorName}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{row.realtorEmail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
