import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Download, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { auditLogsAPI } from '../../api/client';
import { formatDateTime, downloadBlob } from '../../utils/formatters';
import { useBackgroundFetch } from '../../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

const ACTION_TYPES = [
  'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'CREATE_INVESTMENT', 'UPDATE_INVESTMENT',
  'DELETE_INVESTMENT', 'EXTEND_INVESTMENT', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED',
  'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'AI_UPLOAD', 'EMAIL_SENT',
];

const actionColors: Record<string, string> = {
  LOGIN: 'text-green-700 bg-green-50',
  LOGOUT: 'text-gray-600 bg-gray-50',
  FAILED_LOGIN: 'text-red-700 bg-red-50',
  CREATE_INVESTMENT: 'text-blue-700 bg-blue-50',
  UPDATE_INVESTMENT: 'text-blue-600 bg-blue-50',
  DELETE_INVESTMENT: 'text-red-600 bg-red-50',
  EXTEND_INVESTMENT: 'text-yellow-700 bg-yellow-50',
  PAYMENT_INITIATED: 'text-orange-700 bg-orange-50',
  PAYMENT_COMPLETED: 'text-green-700 bg-green-50',
  CREATE_USER: 'text-purple-700 bg-purple-50',
  UPDATE_USER: 'text-purple-600 bg-purple-50',
  DELETE_USER: 'text-red-700 bg-red-50',
  AI_UPLOAD: 'text-indigo-700 bg-indigo-50',
  EMAIL_SENT: 'text-teal-700 bg-teal-50',
};

export default function AuditLogs() {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const actionType = searchParams.get('action_type') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const search = searchParams.get('search') || '';
  const limit = 50;

  const cacheKey = `auditlogs:${page}:${actionType}:${startDate}:${endDate}:${search}`;

  const { data, loading, refreshing, error } = useBackgroundFetch<{ logs: any[]; total: number }>(
    cacheKey,
    async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (actionType) params.action_type = actionType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search) params.search = search;
      const res = await auditLogsAPI.list(params);
      return res.data;
    }
  );

  useEffect(() => {
    if (error) toast.error('Failed to load audit logs');
  }, [error]);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (actionType) params.action_type = actionType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search) params.search = search;
      const res = await auditLogsAPI.export(params);
      downloadBlob(res.data, `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={24} className="text-blue-600" /> Audit Logs
            </h1>
            {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" title="Updating..." />}
          </div>
          <p className="text-gray-500 text-sm">{total} total events</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client name, client email, or staff name/email..."
              className="input pl-9 text-sm"
              value={search}
              onChange={e => updateParam('search', e.target.value)}
            />
          </div>
          <Filter size={16} className="text-gray-400" />
          <select className="input w-auto" value={actionType} onChange={e => updateParam('action_type', e.target.value)}>
            <option value="">All Actions</option>
            {ACTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <input type="date" className="input w-auto" value={startDate} onChange={e => updateParam('start_date', e.target.value)} />
          <input type="date" className="input w-auto" value={endDate} onChange={e => updateParam('end_date', e.target.value)} />
          {(search || actionType || startDate || endDate) && (
            <button onClick={() => setSearchParams({})} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
          )}
        </div>
      </div>

      {/* Logs table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Timestamp</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Entity</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">IP</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No audit logs found</td></tr>
            ) : logs.map(log => (
              <React.Fragment key={log.id}>
                <tr
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${refreshing ? 'opacity-75' : ''}`}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-800">{log.user?.fullName || 'System'}</div>
                    <div className="text-xs text-gray-400">{log.user?.email || ''}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.actionType] || 'text-gray-700 bg-gray-50'}`}>
                      {log.actionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    <span className="capitalize">{log.entityType}</span>
                    {log.entityId && <div className="font-mono text-xs text-gray-300 truncate max-w-[80px]">{log.entityId}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{log.ipAddress || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{log.description || '—'}</td>
                </tr>
                {expandedLog === log.id && (log.oldValues || log.newValues) && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {log.oldValues && (
                          <div>
                            <div className="font-semibold text-gray-600 mb-1">Before</div>
                            <pre className="bg-red-50 rounded p-2 text-red-700 overflow-x-auto">
                              {JSON.stringify(log.oldValues, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.newValues && (
                          <div>
                            <div className="font-semibold text-gray-600 mb-1">After</div>
                            <pre className="bg-green-50 rounded p-2 text-green-700 overflow-x-auto">
                              {JSON.stringify(log.newValues, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
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
    </div>
  );
}
