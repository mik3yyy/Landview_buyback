import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Send, Bell, ArrowRight, CheckSquare, Square, RefreshCw,
  Search, MessageSquare, Clock, MailCheck, MailX, Filter,
} from 'lucide-react';
import { responseAPI } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useBackgroundFetch } from '../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

const INTENTION_LABEL: Record<string, string> = {
  extend: 'Wants to Extend',
  withdraw: 'Wants Full Payout',
  partial: 'Partial Withdrawal',
};
const INTENTION_COLOR: Record<string, string> = {
  extend: 'bg-blue-100 text-blue-700 border-blue-200',
  withdraw: 'bg-green-100 text-green-700 border-green-200',
  partial: 'bg-orange-100 text-orange-700 border-orange-200',
};

function daysChip(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Today</span>;
  if (diff <= 7) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">{diff}d left</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">{diff}d left</span>;
}

function sentChip(date: string | null) {
  if (!date) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400"><MailX size={11} />Not sent</span>;
  const d = new Date(date);
  const ago = Math.floor((Date.now() - d.getTime()) / 86400000);
  const label = ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : `${ago}d ago`;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><MailCheck size={11} />{label}</span>;
}

interface Candidate {
  id: string; clientName: string; clientEmail: string; plotNumber: string;
  principal: number; maturityAmount: number; maturityDate: string;
  status: string; realtorName?: string; lastReminderSentAt: string | null;
}

interface Response {
  id: string; clientName: string; plotNumber: string; principal: number;
  maturityAmount: number; maturityDate: string; status: string;
  clientIntention: string; clientIntentionMessage?: string; clientIntentionAt?: string;
}

export default function MaturityReminders() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filterUnsent, setFilterUnsent] = useState(false);

  const { data, loading, refreshing, error, refresh } = useBackgroundFetch<{ candidates: Candidate[]; responses: Response[] }>(
    'reminder-candidates',
    () => responseAPI.getReminderCandidates().then(r => r.data)
  );

  useEffect(() => { if (error) toast.error('Failed to load reminder data'); }, [error]);

  const candidates = data?.candidates ?? [];
  const responses = data?.responses ?? [];

  // Pre-select all when candidates load
  useEffect(() => {
    if (candidates.length > 0) setSelected(new Set(candidates.map(c => c.id)));
  }, [data]);

  const filtered = useMemo(() => {
    let list = candidates;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.clientName.toLowerCase().includes(q) ||
        c.clientEmail.toLowerCase().includes(q) ||
        c.plotNumber.toLowerCase().includes(q)
      );
    }
    if (filterUnsent) list = list.filter(c => !c.lastReminderSentAt);
    return list;
  }, [candidates, search, filterUnsent]);

  const unsentCount = candidates.filter(c => !c.lastReminderSentAt).length;
  const sentCount = candidates.filter(c => c.lastReminderSentAt).length;
  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.delete(c.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.add(c.id)); return n; });
    }
  };

  const toggleOne = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const selectUnsent = () => setSelected(new Set(candidates.filter(c => !c.lastReminderSentAt).map(c => c.id)));

  const handleSend = async (ids?: string[]) => {
    const toSend = ids ?? Array.from(selected);
    if (!toSend.length) { toast('No clients selected'); return; }
    setSending(true);
    try {
      const res = await responseAPI.sendReminders(toSend);
      if (res.data.sent > 0) toast.success(`Sent ${res.data.sent} reminder${res.data.sent !== 1 ? 's' : ''} successfully`);
      if (res.data.errors?.length > 0) res.data.errors.forEach((e: string) => toast.error(e, { duration: 8000 }));
      else if (res.data.sent === 0) toast.error('No emails were sent');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Maturity &amp; Reminders</h1>
          {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />}
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2 text-sm self-start sm:self-auto">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Maturing (4 weeks)', value: candidates.length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Reminder Sent', value: sentCount, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Not Yet Sent', value: unsentCount, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Responses Received', value: responses.length, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Client Responses */}
      {responses.length > 0 && (
        <div className="card border-l-4 border-purple-400">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">Client Responses</h2>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{responses.length}</span>
            <p className="text-xs text-gray-400 ml-1 hidden sm:block">Clients who replied to maturity reminders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="pb-2 pr-4">Client</th>
                  <th className="pb-2 pr-4">Plot</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Maturity</th>
                  <th className="pb-2 pr-4">Intention</th>
                  <th className="pb-2 pr-4">Message</th>
                  <th className="pb-2 pr-4">Replied</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {responses.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{r.clientName}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{r.plotNumber}</td>
                    <td className="py-3 pr-4 text-blue-700 font-medium">{formatCurrency(Number(r.maturityAmount))}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(r.maturityDate)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${INTENTION_COLOR[r.clientIntention] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {INTENTION_LABEL[r.clientIntention] ?? r.clientIntention}
                      </span>
                    </td>
                    <td className="py-3 pr-4 max-w-[160px]">
                      {r.clientIntentionMessage
                        ? <span className="text-xs text-gray-500 italic truncate block" title={r.clientIntentionMessage}>"{r.clientIntentionMessage}"</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="py-3 pr-4">
                      {r.clientIntentionAt && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} />{new Date(r.clientIntentionAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <Link to={`/investments/${r.id}`} className="text-blue-500 hover:text-blue-700">
                        <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Send Reminders */}
      <div className="card border-l-4 border-orange-400">
        {/* Card header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Send Maturity Reminders</h2>
            {candidates.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{candidates.length}</span>
            )}
          </div>

          {candidates.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {unsentCount > 0 && (
                <button
                  onClick={() => { selectUnsent(); handleSend(candidates.filter(c => !c.lastReminderSentAt).map(c => c.id)); }}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <MailX size={14} /> Send to {unsentCount} Unsent
                </button>
              )}
              <button
                onClick={() => handleSend()}
                disabled={sending || selected.size === 0}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? 'Sending...' : `Send to ${selected.size} Selected`}
              </button>
            </div>
          )}
        </div>

        {candidates.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            No investments maturing in the next 4 weeks with an email address on file.
          </p>
        ) : (
          <>
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by name, email or plot..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => setFilterUnsent(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  filterUnsent
                    ? 'bg-orange-50 border-orange-300 text-orange-700 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Filter size={13} /> {filterUnsent ? 'Showing unsent only' : 'Show unsent only'}
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-3 w-8">
                      <button onClick={toggleAll}>
                        {allFilteredSelected
                          ? <CheckSquare size={15} className="text-blue-600" />
                          : <Square size={15} className="text-gray-300" />}
                      </button>
                    </th>
                    <th className="px-3 py-3">Client</th>
                    <th className="px-3 py-3 hidden sm:table-cell">Plot</th>
                    <th className="px-3 py-3 hidden md:table-cell">Amount</th>
                    <th className="px-3 py-3">Maturity</th>
                    <th className="px-3 py-3 hidden lg:table-cell">Realtor</th>
                    <th className="px-3 py-3">Last Reminder</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-400 text-sm">No results found</td>
                    </tr>
                  ) : (
                    filtered.map(c => {
                      const isSel = selected.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => toggleOne(c.id)}
                          className={`cursor-pointer transition-colors ${isSel ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-3">
                            {isSel
                              ? <CheckSquare size={15} className="text-blue-600" />
                              : <Square size={15} className="text-gray-300" />}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900">{c.clientName}</div>
                            <div className="text-xs text-gray-400">{c.clientEmail}</div>
                          </td>
                          <td className="px-3 py-3 hidden sm:table-cell font-mono text-xs text-gray-500">{c.plotNumber || '—'}</td>
                          <td className="px-3 py-3 hidden md:table-cell font-medium text-blue-700">{formatCurrency(Number(c.maturityAmount))}</td>
                          <td className="px-3 py-3">
                            <div className="text-gray-700 text-xs">{formatDate(c.maturityDate)}</div>
                            <div className="mt-0.5">{daysChip(c.maturityDate)}</div>
                          </td>
                          <td className="px-3 py-3 hidden lg:table-cell text-gray-500 text-xs">{c.realtorName || '—'}</td>
                          <td className="px-3 py-3">{sentChip(c.lastReminderSentAt)}</td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <Link to={`/investments/${c.id}`} className="text-gray-400 hover:text-blue-600">
                              <ArrowRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>{filtered.length} of {candidates.length} shown · {selected.size} selected</span>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600 underline">
                  Clear selection
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
