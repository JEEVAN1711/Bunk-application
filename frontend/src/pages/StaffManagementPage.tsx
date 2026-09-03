import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Customer, UserRole } from '../types';
import { db } from '../db/db';
import { syncEngine } from '../sync/syncEngine';
import { StaffMonthlyReport } from '../components/StaffMonthlyReport';
import {
  Users,
  UserPlus,
  Shield,
  Phone,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  Trash2,
  Pencil,
  Lock,
  Sparkles,
  KeyRound,
  CalendarDays,
  Clock,
  User as UserIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StaffManagementPage: React.FC = () => {
  const { allUsers, refreshUsers, currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'STAFF' | 'CUSTOMERS' | 'REPORT'>('STAFF');
  const [selectedReportStaffId, setSelectedReportStaffId] = useState<string>('ALL');

  // New User Form State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('CASHIER');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Edit User Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('CASHIER');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editActive, setEditActive] = useState(true);

  // New Customer Form State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState('50000');

  // Edit Customer Form State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustCreditLimit, setEditCustCreditLimit] = useState('50000');
  const [editCustActive, setEditCustActive] = useState(true);

  const loadCustomers = async () => {
    const custs = await db.customers.toArray();
    setCustomers(custs);
  };

  useEffect(() => {
    loadCustomers();
    const interval = setInterval(() => {
      loadCustomers();
      refreshUsers();
    }, 3000);

    const handleSync = () => {
      loadCustomers();
      refreshUsers();
    };
    window.addEventListener('bunk_cloud_synced', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('bunk_cloud_synced', handleSync);
    };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newFullName || !newPhone) return;

    const id = 'u-' + Date.now();
    const newUser: User = {
      id,
      username: newUsername.toLowerCase().trim(),
      password: newPassword || 'password123',
      fullName: newFullName.trim(),
      phone: newPhone.trim(),
      role: newRole,
      photoUrl: newPhotoUrl.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
      synced: false
    };

    await db.users.add(newUser);
    await syncEngine.enqueue('USER', 'CREATE', id, newUser);
    await syncEngine.syncAllLocalDataToCloud();
    await refreshUsers();

    confetti({ particleCount: 30, spread: 50 });
    setShowAddUserModal(false);
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewPhone('');
    setNewPhotoUrl('');
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditPassword(''); // Leave blank if not changing
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditPhotoUrl(user.photoUrl || '');
    setEditActive(user.active !== false);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editFullName || !editUsername || !editPhone) return;

    const updatedUser: User = {
      ...editingUser,
      fullName: editFullName.trim(),
      username: editUsername.toLowerCase().trim(),
      phone: editPhone.trim(),
      role: editRole,
      photoUrl: editPhotoUrl.trim() || undefined,
      active: editActive,
      password: editPassword.trim() ? editPassword.trim() : (editingUser.password || 'password123'),
      synced: false
    };

    await db.users.put(updatedUser);
    await syncEngine.enqueue('USER', 'UPDATE', updatedUser.id, updatedUser);
    await syncEngine.syncAllLocalDataToCloud();
    await refreshUsers();

    confetti({ particleCount: 35, spread: 55 });
    setEditingUser(null);
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete the currently active logged-in user session.');
      return;
    }

    if (confirm(`Are you sure you want to remove user "${user.fullName}" (@${user.username})?`)) {
      await db.users.delete(user.id);
      await syncEngine.enqueue('USER', 'DELETE', user.id, { id: user.id });
      await syncEngine.syncAllLocalDataToCloud();
      await refreshUsers();
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    const id = 'c-' + Date.now();
    const cleanPhone = custPhone.trim();
    const cleanName = custName.trim();
    const username = cleanPhone.replace(/\D/g, '') || cleanName.toLowerCase().replace(/\s+/g, '');

    const newCust: Customer = {
      id,
      name: cleanName,
      phoneNumber: cleanPhone,
      creditLimit: parseFloat(custCreditLimit) || 50000,
      totalCredit: 0,
      totalPaid: 0,
      currentBalance: 0,
      active: true,
      accessStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      synced: false
    };

    const newCustUser: User = {
      id: 'u-cust-' + id,
      username: username,
      password: 'Customer@123',
      fullName: cleanName,
      phone: cleanPhone,
      role: 'CUSTOMER',
      active: true,
      createdAt: new Date().toISOString(),
      synced: false
    };

    await db.customers.put(newCust);
    await db.users.put(newCustUser);
    await syncEngine.enqueue('CUSTOMER', 'CREATE', id, newCust);
    await syncEngine.enqueue('USER', 'CREATE', newCustUser.id, newCustUser);
    await syncEngine.syncAllLocalDataToCloud();
    await loadCustomers();
    await refreshUsers();

    confetti({ particleCount: 30, spread: 50 });
    setShowAddCustomerModal(false);
    setCustName('');
    setCustPhone('');
    setCustCreditLimit('50000');
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditCustName(cust.name);
    setEditCustPhone(cust.phoneNumber);
    setEditCustCreditLimit(cust.creditLimit ? cust.creditLimit.toString() : '50000');
    setEditCustActive(cust.active !== false);
  };

  const handleSaveEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editCustName || !editCustPhone) return;

    const updatedCust: Customer = {
      ...editingCustomer,
      name: editCustName.trim(),
      phoneNumber: editCustPhone.trim(),
      creditLimit: parseFloat(editCustCreditLimit) || 50000,
      active: editCustActive,
      synced: false
    };

    await db.customers.put(updatedCust);
    await syncEngine.enqueue('CUSTOMER', 'UPDATE', updatedCust.id, updatedCust);
    await syncEngine.syncAllLocalDataToCloud();
    await loadCustomers();

    confetti({ particleCount: 35, spread: 55 });
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (confirm(`Are you sure you want to remove customer "${cust.name}"?`)) {
      await db.customers.delete(cust.id);
      await db.users.delete('u-cust-' + cust.id);
      await syncEngine.enqueue('CUSTOMER', 'DELETE', cust.id, { id: cust.id });
      await syncEngine.enqueue('USER', 'DELETE', 'u-cust-' + cust.id, { id: 'u-cust-' + cust.id });
      await syncEngine.syncAllLocalDataToCloud();
      await loadCustomers();
      await refreshUsers();
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto my-12 border border-slate-200 bg-white/95 shadow-lg space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="font-black text-slate-900 text-lg">Admin Permission Required</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Staff management, user enrollment, and setting customer <strong>Credit Limits</strong> can only be accessed and modified by <strong>Admin (Jeevan)</strong>. Cashiers are restricted from this area.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
              Security & Identity Administration
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            User, Staff & Customer Management
          </h1>
          <p className="text-xs text-slate-400">
            Edit existing staff details, manage roles, passwords, and synchronize all user data with the cloud
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={async () => {
              const res = await syncEngine.syncAllLocalDataToCloud();
              if (res.success) {
                confetti({ particleCount: 40, spread: 60 });
                alert(`All ${allUsers.length} users and station records synced to cloud successfully!`);
              } else {
                alert(`Cloud sync failed: ${res.error}`);
              }
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Sync All to Cloud</span>
          </button>

          <button
            onClick={() => {
              setNewRole('ADMIN');
              setShowAddUserModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
          >
            <Shield className="w-4 h-4" />
            Create New Admin
          </button>

          {activeTab === 'STAFF' ? (
            <button
              onClick={() => {
                setNewRole('CASHIER');
                setShowAddUserModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff / Cashier
            </button>
          ) : (
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Add Credit Customer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'STAFF'
              ? 'bg-sky-950/80 border border-sky-600 text-sky-300'
              : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Staff & System Users ({allUsers.length})
        </button>
        <button
          onClick={() => {
            setSelectedReportStaffId('ALL');
            setActiveTab('REPORT');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'REPORT'
              ? 'bg-blue-950/80 border border-blue-500 text-blue-300 shadow-md shadow-blue-950/50'
              : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-400" />
          <span>Monthly Duty & Hours Report</span>
        </button>
        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CUSTOMERS'
              ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
              : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Registered Credit Customers ({customers.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'REPORT' ? (
        <StaffMonthlyReport initialStaffId={selectedReportStaffId} />
      ) : activeTab === 'STAFF' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allUsers.map(u => (
            <div
              key={u.id}
              className="glass-card rounded-3xl p-5 border border-slate-200 bg-white/95 shadow-sm flex flex-col justify-between gap-4 hover:border-slate-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  {u.photoUrl ? (
                    <img
                      src={u.photoUrl}
                      alt={u.fullName}
                      className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-slate-900 truncate">{u.fullName}</h4>
                    <p className="text-xs text-slate-600 font-mono-numbers font-medium">{u.phone}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase shadow-sm ${
                        u.role === 'ADMIN' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        u.role === 'CASHIER' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        u.role === 'SUPPORT_CASHIER' ? 'bg-sky-100 text-sky-900 border-sky-300' :
                        'bg-purple-100 text-purple-900 border-purple-300'
                      }`}>
                        {u.role}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">@{u.username}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Edit Button */}
                <button
                  type="button"
                  onClick={() => handleOpenEditUser(u)}
                  title="Edit Staff Details"
                  className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 hover:text-blue-700 transition-all flex-shrink-0 shadow-sm"
                >
                  <Pencil className="w-4 h-4 text-slate-700" />
                </button>
              </div>

              {/* Monthly Work & Duty Report Shortcut */}
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                  <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
                  <span>Work & Timesheet</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedReportStaffId(u.id);
                    setActiveTab('REPORT');
                  }}
                  className="text-xs font-black text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                >
                  <span>View Report &rarr;</span>
                </button>
              </div>

              {/* Security & Action Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Security:</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-900 font-bold bg-white px-2.5 py-1 rounded-xl border border-slate-300 text-[10px] shadow-sm">
                    {u.role === 'ADMIN' ? 'Password + 2FA OTP' : 'Encrypted Password'}
                  </span>
                  <button
                    onClick={() => handleOpenEditUser(u)}
                    className="text-xs font-black text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => (
            <div
              key={c.id}
              className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{c.name}</h4>
                  <p className="text-xs text-slate-400 font-mono-numbers flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {c.phoneNumber}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditCustomer(c)}
                    title="Edit Customer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 border border-slate-700 hover:border-emerald-600 text-slate-300 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c)}
                    title="Remove Customer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-600 text-slate-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs shadow-sm">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Credit Limit:</span>
                  <span className="font-mono-numbers font-black text-slate-900">₹{(c.creditLimit || 50000).toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      (c.currentBalance / (c.creditLimit || 50000)) > 0.9 ? 'bg-rose-600' :
                      (c.currentBalance / (c.creditLimit || 50000)) > 0.7 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (c.currentBalance / (c.creditLimit || 50000)) * 100))}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Outstanding Due</span>
                    <p className={`font-mono-numbers font-black ${c.currentBalance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      ₹{c.currentBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Available Limit</span>
                    <p className="font-mono-numbers font-black text-emerald-700">
                      ₹{Math.max(0, (c.creditLimit || 50000) - c.currentBalance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Edit Existing Staff User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg glass-panel rounded-3xl shadow-2xl border border-sky-500/50 overflow-hidden space-y-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Edit Staff / User: {editingUser.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 lowercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="ADMIN">Admin / Owner (Full Control + 2FA)</option>
                    <option value="CASHIER">Cashier (Shift Lead)</option>
                    <option value="SUPPORT_CASHIER">Support Cashier</option>
                    <option value="CUSTOMER">Customer View</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <label className="block font-semibold text-slate-200">
                  Update Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="Enter new password to update..."
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editPhotoUrl}
                  onChange={e => setEditPhotoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="font-bold text-slate-200 block">Account Active Status</span>
                  <span className="text-[10px] text-slate-400">Deactivated users cannot log in</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={e => setEditActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteUser(editingUser)}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-bold transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save & Sync to Cloud</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass-panel rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h3 className="font-bold text-slate-100 text-sm">
                {newRole === 'ADMIN' ? 'Create New Admin / Owner' : 'Create New Staff User'}
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh1"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 lowercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. Pass@123"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="CASHIER">Cashier (Shift Lead)</option>
                    <option value="SUPPORT_CASHIER">Support Cashier</option>
                    <option value="ADMIN">Admin / Owner</option>
                    <option value="CUSTOMER">Customer View</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Sync to Cloud</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Customer (Admin Editable Credit Limit) */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-slate-900 text-sm">
                Edit Customer Account: {editingCustomer.name}
              </h3>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditCustomer} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer / Fleet Name</label>
                <input
                  type="text"
                  required
                  value={editCustName}
                  onChange={e => setEditCustName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={editCustPhone}
                  onChange={e => setEditCustPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Credit Limit (₹)</label>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Admin Controlled
                  </span>
                </div>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  required
                  placeholder="₹50000"
                  value={editCustCreditLimit}
                  onChange={e => setEditCustCreditLimit(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono-numbers font-bold focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800">Customer Active Status</span>
                <input
                  type="checkbox"
                  checked={editCustActive}
                  onChange={e => setEditCustActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md"
                >
                  Save Customer Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Customer (Admin Sets Credit Limit) */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-slate-900 text-sm">Register New Customer / Fleet</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer / Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Logistics Fleet"
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98111 55443"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Credit Limit (₹)</label>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Admin Set
                  </span>
                </div>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  required
                  placeholder="₹50000"
                  value={custCreditLimit}
                  onChange={e => setCustCreditLimit(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono-numbers font-bold focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all shadow-md"
                >
                  Save Customer Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
