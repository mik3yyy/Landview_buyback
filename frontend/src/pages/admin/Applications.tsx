import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, ExternalLink, Copy, Check } from 'lucide-react';
import { applicationsAPI } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { useBackgroundFetch } from '../../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-blue-100 text-blue-700',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', converted: 'Invested',
};

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const page   = parseInt(searchParams.get('page') || '1');
  const limit  = 20;

  const cacheKey = `applications:${status}:${search}:${page}`;

  const { data, loading, refreshing, error } = useBackgroundFetch<any>(
    cacheKey,
    async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (status) params.status = status;
      if (search) params.search = search;
      return (await applicationsAPI.list(params)).data;
    }
  );

  useEffect(() => {
    if (error) toast.error('Failed to load applications');
  }, [error]);

  const applications = data?.applications ?? [];
  const total = data?.total ?? 0;
  const pendingCount = data?.pendingCount ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const formUrl = `${window.location.origin}/apply`;
  const copyFormLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Client Applications</h1>
            {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />}
            {pendingCount > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">{total} total submissions</p>
        </div>
        {/* Copyable form link */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm max-w-xs">
          <ExternalLink size={14} className="text-blue-500 flex-shrink-0" />
          <span className="text-blue-700 truncate font-mono text-xs flex-1">{formUrl}</span>
          <button onClick={copyFormLink} className="text-blue-600 hover:text-blue-800 flex-shrink-0 p-1">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card py-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              className="input pl-9"
              value={search}
              onChange={e => updateParam('search', e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['', 'pending', 'approved', 'rejected', 'converted'].map(s => (
              <button
                key={s}
                onClick={() => updateParam('status', s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === '' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 md:hidden">Loading...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400 md:hidden">No applications found</div>
      ) : (
        <div className="space-y-3 md:hidden">
          {applications.map((app: any) => (
            <Link key={app.id} to={`/admin/applications/${app.id}`}
              className="card block p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{app.surname} {app.otherNames}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{app.phoneNumber} · {app.clientEmail || '—'}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[app.status]}`}>
                  {STATUS_LABELS[app.status]}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{app.duration} · {formatCurrency(Number(app.principal))}</span>
                <span>{new Date(app.submittedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div className="card p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Client Name', 'Contact', 'Duration', 'Principal', 'Submitted', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No applications found</td></tr>
              ) : applications.map((app: any) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{app.surname} {app.otherNames}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <div>{app.phoneNumber}</div>
                    <div>{app.clientEmail || '—'}</div>
                  </td>
                  <td className="px-4 py-3">{app.duration}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(Number(app.principal))}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(app.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[app.status]}`}>
                      {STATUS_LABELS[app.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/applications/${app.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-white rounded-xl flex items-center justify-between text-sm text-gray-600">
          <span className="text-xs sm:text-sm">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => updateParam('page', String(page - 1))} disabled={page <= 1} className="btn-secondary px-2 py-1 disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium">{page}</span>
            <button onClick={() => updateParam('page', String(page + 1))} disabled={page >= totalPages} className="btn-secondary px-2 py-1 disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
