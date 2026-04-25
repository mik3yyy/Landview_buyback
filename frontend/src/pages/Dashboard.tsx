import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, FileText, CheckCircle, Clock,
  ArrowRight, PlusCircle, Upload, Flame, CalendarCheck, List,
} from 'lucide-react';
import { investmentsAPI } from '../api/client';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';
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
  recentActivity: any[];
  recentInvestments: InvestmentRow[];
  investmentsToday: InvestmentRow[];
  urgentInvestments: InvestmentRow[];
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  extended: 'bg-blue-100 text-blue-700',
  payment_initiated: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  extended: 'Extended',
  payment_initiated: 'Payment Initiated',
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
  if (diff < 0) return <span className="text-red-600 font-medium">{Math.abs(diff)}d overdue</span>;
  if (diff === 0) return <span className="text-orange-600 font-medium">Today</span>;
  return <span className="text-gray-500">{diff}d left</span>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  link?: string;
}

function StatCard({ title, value, icon, color, link }: StatCardProps) {
  const content = (
    <div className={`card flex items-center gap-4 ${link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function InvestmentTable({ rows, emptyMsg }: { rows: InvestmentRow[]; emptyMsg: string }) {
  if (!rows.length) {
    return <p className="text-gray-400 text-sm text-center py-6">{emptyMsg}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
            <th className="pb-2 pr-4">Client</th>
            <th className="pb-2 pr-4">Plot</th>
            <th className="pb-2 pr-4">Principal</th>
            <th className="pb-2 pr-4">Maturity Amount</th>
            <th className="pb-2 pr-4">Maturity Date</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(inv => (
            <tr key={inv.id} className="hover:bg-gray-50">
              <td className="py-2.5 pr-4 font-medium text-gray-800">{inv.clientName}</td>
              <td className="py-2.5 pr-4 text-gray-500">{inv.plotNumber}</td>
              <td className="py-2.5 pr-4">{formatCurrency(Number(inv.principal))}</td>
              <td className="py-2.5 pr-4 font-medium text-blue-700">{formatCurrency(Number(inv.maturityAmount))}</td>
              <td className="py-2.5 pr-4">
                <div>{formatDate(inv.maturityDate)}</div>
                <div className="text-xs mt-0.5">{daysFromNow(inv.maturityDate)}</div>
              </td>
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
  );
}

const actionTypeLabels: Record<string, string> = {
  LOGIN: 'Logged in', LOGOUT: 'Logged out', FAILED_LOGIN: 'Failed login',
  CREATE_INVESTMENT: 'Created investment', UPDATE_INVESTMENT: 'Updated investment',
  DELETE_INVESTMENT: 'Deleted investment', EXTEND_INVESTMENT: 'Extended investment',
  PAYMENT_INITIATED: 'Payment initiated', PAYMENT_COMPLETED: 'Payment completed',
  CREATE_USER: 'Created user', UPDATE_USER: 'Updated user', DELETE_USER: 'Deleted user',
  AI_UPLOAD: 'AI document upload', EMAIL_SENT: 'Email sent',
};

export default function Dashboard() {
  const { user, isAdminOrAbove } = useAuth();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            {refreshing && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" title="Updating..." />}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user?.fullName}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/ai-upload" className="btn-secondary flex items-center gap-2">
            <Upload size={16} /> AI Upload
          </Link>
          <Link to="/investments/new" className="btn-primary flex items-center gap-2">
            <PlusCircle size={16} /> New Investment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Investments"
          value={stats?.totalActive ?? 0}
          icon={<FileText size={22} className="text-blue-600" />}
          color="bg-blue-50"
          link="/investments?status=active"
        />
        <StatCard
          title="Total Active Value"
          value={formatCurrency(Number(stats?.totalActiveValue ?? 0))}
          icon={<TrendingUp size={22} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Maturing This Week"
          value={stats?.maturingThisWeek ?? 0}
          icon={<Clock size={22} className="text-yellow-600" />}
          color="bg-yellow-50"
          link="/investments"
        />
        <StatCard
          title="Completed"
          value={stats?.totalCompleted ?? 0}
          icon={<CheckCircle size={22} className="text-purple-600" />}
          color="bg-purple-50"
          link="/investments?status=completed"
        />
      </div>

      {/* Urgent Investments */}
      {(stats?.urgentInvestments?.length ?? 0) > 0 && (
        <div className="card border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Urgent — Needs Immediate Action</h2>
              <span className="ml-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats!.urgentInvestments.length}
              </span>
            </div>
            <Link to="/investments" className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <InvestmentTable rows={stats!.urgentInvestments} emptyMsg="No urgent investments" />
        </div>
      )}

      {/* Investments Today */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Investments Today</h2>
            {(stats?.investmentsToday?.length ?? 0) > 0 && (
              <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats!.investmentsToday.length}
              </span>
            )}
          </div>
        </div>
        <InvestmentTable
          rows={stats?.investmentsToday ?? []}
          emptyMsg="No investments created or maturing today"
        />
      </div>

      {/* Recent Investments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <List size={18} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Investments</h2>
          </div>
          <Link to="/investments" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <InvestmentTable rows={stats?.recentInvestments ?? []} emptyMsg="No investments yet" />
      </div>

      {/* Recent Activity — admin and super admin only */}
      {isAdminOrAbove && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/admin/audit-logs" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">
                      {(log.user?.fullName || 'S')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{log.user?.fullName || 'System'}</span>
                      {' '}{actionTypeLabels[log.actionType] || log.actionType}
                      {log.description && <span className="text-gray-500"> — {log.description}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">No recent activity</p>
          )}
        </div>
      )}
    </div>
  );
}
