import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, FileText, CheckCircle, Clock,
  ArrowRight, PlusCircle, Flame, CalendarCheck, List,
  Bell, CalendarRange, ChevronDown, ChevronRight as ChevronRightIcon,
  Banknote,
} from 'lucide-react';
import { investmentsAPI, responseAPI } from '../api/client';
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

interface UpfrontRow extends InvestmentRow {
  upfrontPayment: number;
  transactionDate: string;
  upfrontPaidAt?: string;
  clientEmail?: string;
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
  maturingToday: InvestmentRow[];
  upfrontDueToday: UpfrontRow[];
  upfrontDueThisWeek: UpfrontRow[];
}

const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  extended: 'bg-blue-100 text-blue-700',
  payment_initiated: 'bg-orange-100 text-orange-700',
};
const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending Approval', active: 'Active', completed: 'Completed', extended: 'Extended', payment_initiated: 'Payment Initiated',
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

function UpfrontTable({ rows, onMarkPaid }: { rows: any[]; onMarkPaid: (id: string) => void }) {
  if (!rows.length) return <p className="text-gray-400 text-sm text-center py-4">None this week</p>;
  return (
    <div className="space-y-2">
      {rows.map(inv => {
        const dueDate = upfrontDueDate(inv.transactionDate);
        return (
          <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-yellow-50 rounded-lg p-3 gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/investments/${inv.id}`} className="font-medium text-gray-900 text-sm hover:text-blue-600">{inv.clientName}</Link>
                {inv.upfrontPaidAt && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Paid</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Plot {inv.plotNumber} · Upfront: <span className="font-medium text-yellow-700">{formatCurrency(Number(inv.upfrontPayment))}</span>
                · Due {dueDate.toLocaleDateString()} · {daysUntilUpfront(inv.transactionDate)}
              </div>
            </div>
            {!inv.upfrontPaidAt && (
              <button onClick={() => onMarkPaid(inv.id)}
                className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg font-medium flex-shrink-0">
                Mark Paid
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollapsibleSection({
  icon, title, subtitle, count, borderColor, badgeColor, defaultOpen = false, children, viewAllTo,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count: number;
  borderColor: string;
  badgeColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  viewAllTo?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`card border-l-4 ${borderColor}`}>
      <button
        className="w-full flex items-center justify-between gap-2 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <span className="text-base sm:text-lg font-semibold text-gray-900">{title}</span>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {count > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeColor}`}>
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {viewAllTo && open && (
            <Link
              to={viewAllTo}
              onClick={e => e.stopPropagation()}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          )}
          {open ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRightIcon size={18} className="text-gray-400" />}
        </div>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function upfrontDueDate(txDate: string) {
  const d = new Date(txDate);
  d.setDate(d.getDate() + 42);
  return d;
}

function daysUntilUpfront(txDate: string) {
  const due = upfrontDueDate(txDate);
  const diff = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="text-red-600 font-medium text-xs">{Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="text-orange-600 font-medium text-xs">Due Today</span>;
  return <span className="text-orange-500 text-xs">{diff}d left</span>;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, loading, refreshing, error, refresh } = useBackgroundFetch<Stats>(
    'dashboard',
    () => investmentsAPI.dashboard().then(r => r.data)
  );

  useEffect(() => {
    if (error) toast.error('Failed to load dashboard');
  }, [error]);

  const handleMarkUpfrontPaid = async (id: string) => {
    try {
      await responseAPI.markUpfrontPaid(id);
      toast.success('Upfront marked as paid');
      refresh();
    } catch {
      toast.error('Failed to update');
    }
  };

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
          <Link to="/maturity-reminders" className="btn-secondary flex items-center gap-2 text-sm border-orange-300 text-orange-700 hover:bg-orange-50">
            <Bell size={15} /> Maturity &amp; Reminders
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
        <CollapsibleSection
          icon={<Flame size={18} className="text-red-500" />}
          title="Urgent — Needs Immediate Action"
          count={stats!.urgentInvestments.length}
          borderColor="border-red-500"
          badgeColor="bg-red-100 text-red-700"
          defaultOpen
          viewAllTo="/investments"
        >
          <InvestmentTable rows={stats!.urgentInvestments} emptyMsg="No urgent investments" />
        </CollapsibleSection>
      )}

      {/* Maturing Today */}
      {(stats?.maturingToday?.length ?? 0) > 0 && (
        <div className="card border-l-4 border-red-400">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck size={18} className="text-red-500" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Maturing Today</h2>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{stats!.maturingToday.length}</span>
            </div>
            <Link to="/investments" className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 flex-shrink-0">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <InvestmentTable rows={stats!.maturingToday} emptyMsg="" />
        </div>
      )}

      {/* Upfront Due Today */}
      {(stats?.upfrontDueToday?.length ?? 0) > 0 && (
        <div className="card border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 mb-4">
            <Banknote size={18} className="text-yellow-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Upfront Payment Due Today</h2>
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{stats!.upfrontDueToday.length}</span>
          </div>
          <UpfrontTable rows={stats!.upfrontDueToday} onMarkPaid={handleMarkUpfrontPaid} />
        </div>
      )}

      {/* Upfront Due This Week */}
      <CollapsibleSection
        icon={<Banknote size={18} className="text-yellow-500" />}
        title="Upfront Payments Due This Week"
        subtitle="6 weeks after transaction date"
        count={stats?.upfrontDueThisWeek?.length ?? 0}
        borderColor="border-yellow-300"
        badgeColor="bg-yellow-100 text-yellow-700"
      >
        <UpfrontTable rows={stats?.upfrontDueThisWeek ?? []} onMarkPaid={handleMarkUpfrontPaid} />
      </CollapsibleSection>

      {/* Today */}
      <CollapsibleSection
        icon={<CalendarCheck size={18} className="text-indigo-500" />}
        title="Investments Today"
        count={stats?.investmentsToday?.length ?? 0}
        borderColor="border-indigo-400"
        badgeColor="bg-indigo-100 text-indigo-700"
        defaultOpen
        viewAllTo="/investments"
      >
        <InvestmentTable rows={stats?.investmentsToday ?? []} emptyMsg="No investments created or maturing today" />
      </CollapsibleSection>

      {/* Maturing in 7 Days */}
      <CollapsibleSection
        icon={<Bell size={18} className="text-orange-500" />}
        title="Maturing in 7 Days"
        count={stats?.maturingIn7Days?.length ?? 0}
        borderColor="border-orange-400"
        badgeColor="bg-orange-100 text-orange-700"
        viewAllTo="/investments"
      >
        <InvestmentTable
          rows={stats?.maturingIn7Days ?? []}
          emptyMsg="No investments maturing in the next 7 days"
          showRealtor
        />
      </CollapsibleSection>

      {/* Maturing Next Month */}
      <CollapsibleSection
        icon={<CalendarRange size={18} className="text-blue-500" />}
        title={`Maturing in ${nextMonthName}`}
        subtitle="Check if clients wish to extend"
        count={stats?.maturingNextMonth?.length ?? 0}
        borderColor="border-blue-400"
        badgeColor="bg-blue-100 text-blue-700"
        viewAllTo="/investments"
      >
        <InvestmentTable
          rows={stats?.maturingNextMonth ?? []}
          emptyMsg={`No investments maturing in ${nextMonthName}`}
          showRealtor
        />
      </CollapsibleSection>

      {/* Recent Investments */}
      <CollapsibleSection
        icon={<List size={18} className="text-gray-500" />}
        title="Recent Investments"
        count={stats?.recentInvestments?.length ?? 0}
        borderColor="border-gray-200"
        badgeColor="bg-gray-100 text-gray-600"
        viewAllTo="/investments"
      >
        <InvestmentTable rows={stats?.recentInvestments ?? []} emptyMsg="No investments yet" />
      </CollapsibleSection>
    </div>
  );
}
