import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, FileText, CheckCircle, Clock,
  ArrowRight, PlusCircle, Upload, Flame, CalendarCheck, List,
  Bell, CalendarRange,
} from 'lucide-react';
import { investmentsAPI } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useBackgroundFetch } from '../hooks/useBackgroundFetch';
import toast from 'react-hot-toast';

interface InvestmentRow {
  id: string;
  clientName: string;
  plotNumber: string;
  principal: number;
  maturityAmount: number;
  maturityDate: string;
  transactionDate?: string;
  status: string;
  realtorName?: string;
  createdAt?: string;
}

interface Stats {
  totalActive: number;
  totalCompleted: number;
  totalExtended: number;
  pendingPayment: number;
  maturingThisWeek: number;
  overdueInvestments: number;
  totalActiveValue: number;
  recentInvestments: InvestmentRow[];
  investmentsToday: InvestmentRow[];
  urgentInvestments: InvestmentRow[];
  maturingIn7Days: InvestmentRow[];
  maturingNextMonth: InvestmentRow[];
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  extended: 'bg-blue-100 text-blue-700',
  payment_initiated: 'bg-orange-100 text-orange-700',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Active', completed: 'Completed', extended: 'Extended', payment_initiated: 'Payment Initiated',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function daysFromNow(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="text-red-600 font-medium text-xs">{Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="text-orange-600 font-medium text-xs">Today</span>;
  if (diff === 1) return <span className="text-orange-500 font-medium text-xs">Tomorrow</span>;
  return <span className="text-gray-500 text-xs">{diff}d left</span>;
}

function StatCard({ title, value, icon, color, link }: {
  title: string; value: string | number; icon: React.ReactNode; color: string; link?: string;
}) {
  const content = (
    <div className={`card flex items-center gap-4 ${link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`p-3 rounded-xl flex-shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function InvestmentTable({ rows, emptyMsg, showRealtor }: {
  rows: InvestmentRow[];
  emptyMsg: string;
  showRealtor?: boolean;
}) {
  if (!rows.length) return <p className="text-gray-400 text-sm text-center py-6">{emptyMsg}</p>;

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {rows.map(inv => (
          <Link key={inv.id} to={`/investments/${inv.id}`} className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-gray-900 text-sm">{inv.clientName}</span>
              <StatusBadge status={inv.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Plot {inv.plotNumber} · {formatCurrency(Number(inv.maturityAmount))}</span>
              {daysFromNow(inv.maturityDate)}
            </div>
            {showRealtor && inv.realtorName && (
              <div className="text-xs text-gray-400 mt-1">Realtor: {inv.realtorName}</div>
            )}
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="pb-2 pr-4">Client</th>
              <th className="pb-2 pr-4">Plot</th>
              <th className="pb-2 pr-4">Principal</th>
              <th className="pb-2 pr-4">Maturity Amount</th>
              <th className="pb-2 pr-4">Maturity Date</th>
              {showRealtor && <th className="pb-2 pr-4">Realtor</th>}
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-800">{inv.clientName}</td>
                <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{inv.plotNumber}</td>
                <td className="py-2.5 pr-4">{formatCurrency(Number(inv.principal))}</td>
                <td className="py-2.5 pr-4 font-medium text-blue-700">{formatCurrency(Number(inv.maturityAmount))}</td>
                <td className="py-2.5 pr-4">
                  <div>{formatDate(inv.maturityDate)}</div>
                  <div className="mt-0.5">{daysFromNow(inv.maturityDate)}</div>
                </td>
                {showRealtor && <td className="py-2.5 pr-4 text-gray-500 text-xs">{inv.realtorName || '—'}</td>}
                <td className="py-2.5 pr-4"><StatusBadge status={inv.status} /></td>
                <td className="py-2.5">
                  <Link to={`/investments/${inv.id}`} className="text-blue-600 hover:text-blue-700">
                    <ArrowRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, loading, refreshing, error } = useBackgroundFetch<Stats>(
    'dashboard',
    () => investmentsAPI.dashboard().then(r => r.data)
  );

  useEffect(() => {
    if (error) toast.error('Failed to load dashboard');
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Next month name for the section header
  const nextMonthName = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" title="Updating..." />}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user?.fullName}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/ai-upload" className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={15} /> AI Upload
          </Link>
          <Link to="/investments/new" className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle size={15} /> New Investment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Active Investments"
          value={stats?.totalActive ?? 0}
          icon={<FileText size={20} className="text-blue-600" />}
          color="bg-blue-50"
          link="/investments?status=active"
        />
        <StatCard
          title="Total Active Value"
          value={formatCurrency(Number(stats?.totalActiveValue ?? 0))}
          icon={<TrendingUp size={20} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Maturing This Week"
          value={stats?.maturingThisWeek ?? 0}
          icon={<Clock size={20} className="text-yellow-600" />}
          color="bg-yellow-50"
          link="/investments"
        />
        <StatCard
          title="Completed"
          value={stats?.totalCompleted ?? 0}
          icon={<CheckCircle size={20} className="text-purple-600" />}
          color="bg-purple-50"
          link="/investments?status=completed"
        />
      </div>

      {/* Urgent */}
      {(stats?.urgentInvestments?.length ?? 0) > 0 && (
        <div className="card border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-red-500" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Urgent — Needs Immediate Action</h2>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats!.urgentInvestments.length}
              </span>
            </div>
            <Link to="/investments" className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 flex-shrink-0">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <InvestmentTable rows={stats!.urgentInvestments} emptyMsg="No urgent investments" />
        </div>
      )}

      {/* Maturing in 7 Days */}
      <div className="card border-l-4 border-orange-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-orange-500" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Maturing in 7 Days</h2>
            {(stats?.maturingIn7Days?.length ?? 0) > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats!.maturingIn7Days.length}
              </span>
            )}
          </div>
          <Link to="/investments" className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1 flex-shrink-0">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <InvestmentTable
          rows={stats?.maturingIn7Days ?? []}
          emptyMsg="No investments maturing in the next 7 days"
          showRealtor
        />
      </div>

      {/* Maturing Next Month */}
      <div className="card border-l-4 border-blue-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className="text-blue-500" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Maturing in {nextMonthName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Check if clients wish to extend</p>
            </div>
            {(stats?.maturingNextMonth?.length ?? 0) > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats!.maturingNextMonth.length}
              </span>
            )}
          </div>
          <Link to="/investments" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 flex-shrink-0">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <InvestmentTable
          rows={stats?.maturingNextMonth ?? []}
          emptyMsg={`No investments maturing in ${nextMonthName}`}
          showRealtor
        />
      </div>

      {/* Investments Today */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-indigo-500" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Investments Today</h2>
            {(stats?.investmentsToday?.length ?? 0) > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats!.investmentsToday.length}
              </span>
            )}
          </div>
        </div>
        <InvestmentTable rows={stats?.investmentsToday ?? []} emptyMsg="No investments created or maturing today" />
      </div>

      {/* Recent Investments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <List size={18} className="text-gray-500" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Investments</h2>
          </div>
          <Link to="/investments" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <InvestmentTable rows={stats?.recentInvestments ?? []} emptyMsg="No investments yet" />
      </div>
    </div>
  );
}
