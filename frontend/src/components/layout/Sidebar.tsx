import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, PlusCircle,
  Users, ClipboardList, Settings, LogOut, Building2,
  FileSpreadsheet, X, Inbox, Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onClose?: () => void;
}

const navItems = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/investments', icon: <FileText size={20} />, label: 'Investments' },
  { to: '/investments/new', icon: <PlusCircle size={20} />, label: 'New Investment' },
  { to: '/maturity-reminders', icon: <Bell size={20} />, label: 'Maturity & Reminders' },
  { to: '/bulk-upload', icon: <FileSpreadsheet size={20} />, label: 'Excel Import' },
];

const adminNavItems = [
  { to: '/admin/applications', icon: <Inbox size={20} />, label: 'Applications', superAdminOnly: false },
  { to: '/admin/users', icon: <Users size={20} />, label: 'User Management', superAdminOnly: false },
  { to: '/admin/audit-logs', icon: <ClipboardList size={20} />, label: 'Audit Logs', superAdminOnly: true },
  { to: '/admin/settings', icon: <Settings size={20} />, label: 'System Settings', superAdminOnly: true },
];

export default function Sidebar({ onClose }: Props) {
  const { user, logout, isSuperAdmin, isAdminOrAbove } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-800 hover:text-white'
    }`;

  return (
    <div className="flex flex-col h-full bg-[#1e3a5f] text-white w-64 min-h-screen">
      {/* Logo + close button on mobile */}
      <div className="px-6 py-5 border-b border-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Building2 size={22} />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Landview</div>
            <div className="text-xs text-blue-300">Buyback System</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-blue-800 text-blue-300">
            <X size={18} />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-blue-800">
        <div className="text-xs text-blue-300 uppercase tracking-wider mb-1">Logged in as</div>
        <div className="font-medium text-sm truncate">{user?.fullName}</div>
        <div className="text-xs text-blue-300 capitalize">{user?.role?.replace('_', ' ')}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {isAdminOrAbove && (
          <>
            <div className="pt-4 pb-2 px-3">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Administration</div>
            </div>
            {adminNavItems
              .filter(item => !item.superAdminOnly || isSuperAdmin)
              .map(item => (
                <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
                  {item.icon}
                  {item.label}
                  {item.superAdminOnly && (
                    <span className="ml-auto text-xs bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded font-semibold">SA</span>
                  )}
                </NavLink>
              ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-blue-800">
        {confirmingLogout ? (
          <div className="bg-blue-900 rounded-lg px-3 py-3 space-y-2">
            <p className="text-sm text-blue-100 font-medium">Are you sure you want to logout?</p>
            <div className="flex gap-2">
              <button
                onClick={logout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
              >
                Yes, logout
              </button>
              <button
                onClick={() => setConfirmingLogout(false)}
                className="flex-1 bg-blue-700 hover:bg-blue-600 text-blue-100 text-xs font-semibold py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingLogout(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-800 hover:text-white transition-colors w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
