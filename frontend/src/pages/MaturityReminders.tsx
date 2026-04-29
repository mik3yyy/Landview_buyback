import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send, MessageSquare, Bell, ArrowRight, CheckSquare, Square, RefreshCw,
} from 'lucide-react';
import { responseAPI } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useBackgroundFetch } from '../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

const INTENTION_LABELS: Record<string, string> = {
  extend: 'Wants to Extend',
  withdraw: 'Wants Full Payout',
  partial: 'Partial Withdrawal',
};
const INTENTION_COLORS: Record<string, string> = {
  extend: 'bg-blue-100 text-blue-700',
  withdraw: 'bg-green-100 text-green-700',
  partial: 'bg-orange-100 text-orange-700',
};

function daysFromNow(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="text-red-600 font-medium text-xs">{Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="text-orange-600 font-medium text-xs">Today</span>;
  if (diff === 1) return <span className="text-orange-500 font-medium text-xs">Tomorrow</span>;
  return <span className="text-gray-500 text-xs">{diff}d left</span>;
}

interface Candidate {
  id: string;
  clientName: string;
  clientEmail: string;
  plotNumber: string;
  principal: number;
  maturityAmount: number;
  maturityDate: string;
  status: string;
  realtorName?: string;
}

interface Response {
  id: string;
  clientName: string;
  plotNumber: string;
  principal: number;
  maturityAmount: number;
  maturityDate: string;
  status: string;
  clientIntention: string;
  clientIntentionMessage?: string;
  clientIntentionAt?: string;
}

export default function MaturityReminders() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const { data, loading, refreshing, error, refresh } = useBackgroundFetch<{ candidates: Candidate[]; responses: Response[] }>(
    'reminder-candidates',
    () => responseAPI.getReminderCandidates().then(r => r.data)
  );

  useEffect(() => {
    if (error) toast.error('Failed to load reminder data');
  }, [error]);

  const candidates = data?.candidates ?? [];
  const responses = data?.responses ?? [];

  // Pre-select all when candidates load
  useEffect(() => {
    if (candidates.length > 0) {
      setSelected(new Set(candidates.map(c => c.id)));
    }
  }, [data]);

  const allSelected = candidates.length > 0 && candidates.every(c => selected.has(c.id));
  const noneSelected = selected.size === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (noneSelected) { toast('No clients selected'); return; }
    setSending(true);
    try {
      const res = await responseAPI.sendReminders(Array.from(selected));
      toast.success(
        `Sent ${res.data.sent} reminder${res.data.sent !== 1 ? 's' : ''}` +
        (res.data.failed > 0 ? `, ${res.data.failed} failed` : '')
      );
      refresh();
    } catch {
      toast.error('Failed to send reminders');
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
    <div className="space-y-6 max-w-5xl">
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

      {/* Client Responses */}
      <div className="card border-l-4 border-purple-400">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-900">Client Responses</h2>
          {responses.length > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {responses.length}
            </span>
          )}
          <p className="text-xs text-gray-400 ml-1">Clients who replied to maturity reminders</p>
        </div>

        {responses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            No client responses yet. Send reminders below to collect client intentions.
          </p>
        ) : (
          <div className="space-y-2">
            {responses.map(inv => (
              <Link
                key={inv.id}
                to={`/investments/${inv.id}`}
                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{inv.clientName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Plot {inv.plotNumber} · {formatCurrency(Number(inv.maturityAmount))} · {formatDate(inv.maturityDate)}
                  </div>
                  {inv.clientIntentionMessage && (
                    <div className="text-xs text-gray-400 mt-0.5 italic">"{inv.clientIntentionMessage}"</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${INTENTION_COLORS[inv.clientIntention] ?? 'bg-gray-100 text-gray-600'}`}>
                    {INTENTION_LABELS[inv.clientIntention] ?? inv.clientIntention}
                  </span>
                  <ArrowRight size={14} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Send Reminders */}
      <div className="card border-l-4 border-orange-400">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Send Maturity Reminders</h2>
            {candidates.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {candidates.length}
              </span>
            )}
          </div>
          {candidates.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {selected.size} of {candidates.length} selected
              </span>
              <button
                onClick={handleSend}
                disabled={sending || noneSelected}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? 'Sending...' : `Send to ${selected.size}`}
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
            {/* Select all row */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg mb-2">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                {allSelected
                  ? <CheckSquare size={16} className="text-blue-600" />
                  : <Square size={16} className="text-gray-400" />
                }
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-gray-400">Maturing in the next 4 weeks · has email</span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                    <th className="pb-2 pr-3 w-8"></th>
                    <th className="pb-2 pr-4">Client</th>
                    <th className="pb-2 pr-4">Plot</th>
                    <th className="pb-2 pr-4">Maturity Amount</th>
                    <th className="pb-2 pr-4">Maturity Date</th>
                    <th className="pb-2 pr-4">Realtor</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {candidates.map(c => (
                    <tr
                      key={c.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selected.has(c.id) ? '' : 'opacity-50'}`}
                      onClick={() => toggleOne(c.id)}
                    >
                      <td className="py-2.5 pr-3">
                        {selected.has(c.id)
                          ? <CheckSquare size={16} className="text-blue-600" />
                          : <Square size={16} className="text-gray-300" />
                        }
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-gray-800">{c.clientName}</div>
                        <div className="text-xs text-gray-400">{c.clientEmail}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{c.plotNumber}</td>
                      <td className="py-2.5 pr-4 font-medium text-blue-700">{formatCurrency(Number(c.maturityAmount))}</td>
                      <td className="py-2.5 pr-4">
                        <div>{formatDate(c.maturityDate)}</div>
                        <div className="mt-0.5">{daysFromNow(c.maturityDate)}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 text-xs">{c.realtorName || '—'}</td>
                      <td className="py-2.5" onClick={e => e.stopPropagation()}>
                        <Link to={`/investments/${c.id}`} className="text-blue-600 hover:text-blue-700">
                          <ArrowRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {candidates.map(c => (
                <div
                  key={c.id}
                  onClick={() => toggleOne(c.id)}
                  className={`flex items-start gap-3 bg-gray-50 rounded-lg p-3 cursor-pointer transition-colors ${selected.has(c.id) ? 'border border-blue-200' : 'opacity-60'}`}
                >
                  <div className="pt-0.5 flex-shrink-0">
                    {selected.has(c.id)
                      ? <CheckSquare size={16} className="text-blue-600" />
                      : <Square size={16} className="text-gray-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900 text-sm">{c.clientName}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{daysFromNow(c.maturityDate)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Plot {c.plotNumber} · {formatCurrency(Number(c.maturityAmount))} · {formatDate(c.maturityDate)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.clientEmail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Send button repeated at bottom for long lists */}
            {candidates.length > 5 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSend}
                  disabled={sending || noneSelected}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Send size={14} />
                  {sending ? 'Sending...' : `Send Reminders to ${selected.size} Client${selected.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
