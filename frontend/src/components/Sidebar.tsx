import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Fuel,
  FileCheck,
  CreditCard,
  Users,
  History,
  Shield,
  Layers,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'CASHIER';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Admin Overview',
      icon: LayoutDashboard,
      roles: ['ADMIN']
    },
    {
      id: 'cashier',
      label: 'Shift POS & Pump',
      icon: Fuel,
      roles: ['ADMIN', 'CASHIER', 'SUPPORT_CASHIER']
    },
    {
      id: 'closing',
      label: 'Shift Closing & Audit',
      icon: FileCheck,
      roles: ['ADMIN']
    },
    {
      id: 'customer',
      label: 'Customer Passbook',
      icon: CreditCard,
      roles: ['ADMIN', 'CUSTOMER']
    },
    {
      id: 'staff',
      label: 'Staff & Accounts',
      icon: Users,
      roles: ['ADMIN']
    },
    {
      id: 'history',
      label: 'Audit History & Logs',
      icon: History,
      roles: ['ADMIN', 'CASHIER']
    },
    {
      id: 'settings',
      label: 'Settings & Theme',
      icon: Layers,
      roles: ['ADMIN']
    }
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-full md:w-64 glass-panel border-r border-slate-800/80 p-4 flex md:flex-col justify-between flex-shrink-0">
      <div className="space-y-6 w-full">
        <div className="hidden md:block px-2">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
            Station Navigation
          </p>
        </div>

        <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible w-full">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="hidden md:block pt-6 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Offline-First Engine
          </div>
          <p className="text-slate-400 leading-relaxed">
            Data persists safely to local IndexedDB. Automatic zero-loss sync when online.
          </p>
        </div>
      </div>
    </aside>
  );
};
