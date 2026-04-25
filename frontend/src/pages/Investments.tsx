import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, Eye, Edit, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { investmentsAPI, bulkAPI } from '../api/client';
import { formatCurrency, formatDate, getDaysLabel, downloadBlob } from '../utils/formatters';
import StatusBadge from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useBackgroundFetch, clearCache } from '../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

export default function Investments() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [duplicates, setDuplicates] = useState<any[] | null>(null);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdminOrAbove } = useAuth();

  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') || 'desc';
  const limit = 20;

  const cacheKey = `investments:${status}:${search}:${page}:${sort}:${order}`;

  const { data, loading, refreshing, error, refresh } = useBackgroundFetch<{ investments: any[]; total: number }>(
    cacheKey,
    async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (status) params.status = status;
      if (search) params.search = search;
      if (sort) params.sort_by = sort;
      if (order) params.order = order;
      const res = await investmentsAPI.list(params);
      return res.data;
    }
  );

  useEffect(() => {
    if (error) toast.error('Failed to load investments');
  }, [error]);

  const investments = data?.investments ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const toggleSort = (field: string) => {
    if (sort === field) {
      updateParam('order', order === 'asc' ? 'desc' : 'asc');
    } else {
      const p = new URLSearchParams(searchParams);
      p.set('sort', field);
      p.set('order', 'desc');
      p.set('page', '1');
      setSearchParams(p);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await investmentsAPI.delete(confirmDelete.id);
      toast.success('Investment deleted');
      setConfirmDelete(null);
      clearCache('investments:');
      clearCache('dashboard');
      refresh();
    } catch {
      toast.error('Failed to delete investment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFindDuplicates = async () => {
    setLoadingDuplicates(true);
    try {
      const res = await bulkAPI.duplicates();
      setDuplicates(res.data.groups);
      if (res.data.groups.length === 0) toast.success('No duplicates found');
    } catch {
      toast.error('Failed to check duplicates');
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const res = await investmentsAPI.export(params);
      downloadBlob(res.data, 'investments.csv');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
            {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" title="Updating..." />}
          </div>
          <p className="text-gray-500 text-sm">{total} total records</p>
        </div>
        <div className="flex gap-3">
          {isAdminOrAbove && (
            <>
              <button
                onClick={handleFindDuplicates}
                disabled={loadingDuplicates}
                className="btn-secondary flex items-center gap-2"
              >
                <Copy size={16} /> {loadingDuplicates ? 'Checking...' : 'Find Duplicates'}
              </button>
              <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                <Download size={16} /> Export CSV
              </button>
            </>
          )}
          <Link to="/investments/new" className="btn-primary flex items-center gap-2">
            + New Investment
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search client, plot..."
              className="input pl-9"
              value={search}
              onChange={e => updateParam('search', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              className="input w-auto"
              value={status}
              onChange={e => updateParam('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="extended">Extended</option>
              <option value="payment_initiated">Payment Initiated</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  { label: 'Client', field: 'clientName' },
                  { label: 'Plot', field: 'plotNumber' },
                  { label: 'Principal', field: 'principal' },
                  { label: 'Maturity Amount', field: null },
                  { label: 'Maturity Date', field: 'maturityDate' },
                  { label: 'Status', field: null },
                  { label: 'Days Left', field: null },
                  { label: 'Actions', field: null },
                ].map(col => (
                  <th key={col.label} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    {col.field ? (
                      <button onClick={() => toggleSort(col.field!)} className="flex items-center gap-1 hover:text-gray-900">
                        {col.label} <ArrowUpDown size={14} />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : investments.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No investments found</td></tr>
              ) : investments.map(inv => {
                const days = inv.daysUntilMaturity;
                const isOverdue = (inv.status === 'active' || inv.status === 'extended') && days < 0;
                return (
                  <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${refreshing ? 'opacity-75' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.clientName}</div>
                      <div className="text-xs text-gray-400">{inv.clientEmail || '—'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs bg-gray-50 rounded">{inv.plotNumber}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(Number(inv.principal))}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{formatCurrency(Number(inv.maturityAmount))}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(inv.maturityDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} daysUntilMaturity={days} />
                    </td>
                    <td className="px-4 py-3">
                      {inv.status !== 'completed' ? (
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : days <= 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {getDaysLabel(days)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/investments/${inv.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        {isAdminOrAbove && inv.status !== 'completed' && (
                          <Link to={`/investments/${inv.id}/edit`} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                            <Edit size={16} />
                          </Link>
                        )}
                        {isAdminOrAbove && (
                          <button
                            onClick={() => setConfirmDelete({ id: inv.id, name: inv.clientName })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => updateParam('page', String(page - 1))}
                disabled={page <= 1}
                className="btn-secondary px-2 py-1 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium">{page}</span>
              <button
                onClick={() => updateParam('page', String(page + 1))}
                disabled={page >= totalPages}
                className="btn-secondary px-2 py-1 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Duplicates Modal */}
      {duplicates !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Copy size={20} className="text-orange-500" /> Duplicate Investment Check
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {duplicates.length === 0
                    ? 'No potential duplicates found.'
                    : `${duplicates.length} duplicate group${duplicates.length !== 1 ? 's' : ''} detected — review and delete as needed.`}
                </p>
              </div>
              <button onClick={() => setDuplicates(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {duplicates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Copy size={28} className="text-green-600" />
                  </div>
                  <p className="text-gray-600 font-medium">All clear — no duplicates detected</p>
                </div>
              ) : duplicates.map((group: any, gi: number) => (
                <div key={gi} className="border border-orange-200 rounded-lg overflow-hidden">
                  <div className="bg-orange-50 px-4 py-2.5 flex items-center gap-2">
                    <span className="bg-orange-200 text-orange-900 text-xs font-bold px-2 py-0.5 rounded-full">
                      {group.investments.length} entries
                    </span>
                    <span className="text-sm font-medium text-orange-900">{group.reason}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Client Name', 'Plot', 'Principal', 'Transaction Date', 'Maturity Date', 'Status', ''].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.investments.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{inv.clientName}</td>
                            <td className="px-3 py-2 font-mono">{inv.plotNumber}</td>
                            <td className="px-3 py-2">{formatCurrency(Number(inv.principal))}</td>
                            <td className="px-3 py-2">{formatDate(inv.transactionDate)}</td>
                            <td className="px-3 py-2">{formatDate(inv.maturityDate)}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={inv.status} />
                            </td>
                            <td className="px-3 py-2">
                              <Link
                                to={`/investments/${inv.id}`}
                                className="text-blue-600 hover:underline font-medium"
                                onClick={() => setDuplicates(null)}
                              >
                                View →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Investment</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete the investment for{' '}
              <span className="font-semibold text-gray-900">{confirmDelete.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary" disabled={!!deletingId}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                disabled={!!deletingId}
              >
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
