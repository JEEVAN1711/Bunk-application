import React, { useState, useEffect } from 'react';
import { syncEngine } from '../sync/syncEngine';
import {
  Database,
  Cloud,
  RefreshCw,
  X,
  Users,
  Building2,
  Fuel,
  Receipt,
  CreditCard,
  Banknote,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CloudDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CloudTab = 'USERS' | 'CUSTOMERS' | 'DUTIES' | 'READINGS' | 'CREDITS' | 'PAYMENTS' | 'CLOSINGS';

export const CloudDatabaseModal: React.FC<CloudDatabaseModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<CloudTab>('USERS');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<any>(null);
  const [cloudData, setCloudData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastFetched, setLastFetched] = useState<string>('');

  const fetchCloudData = async () => {
    setLoading(true);
    try {
      const [statusRes, dataRes] = await Promise.all([
        syncEngine.getCloudStatus(),
        syncEngine.getAllCloudData()
      ]);
      if (statusRes.connected) {
        setCloudStatus(statusRes.statusData);
      }
      if (dataRes.success && dataRes.data) {
        setCloudData(dataRes.data);
      }
      setLastFetched(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCloudData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const res = await syncEngine.syncAllLocalDataToCloud();
      if (res.success) {
        confetti({ particleCount: 30, spread: 50 });
        await fetchCloudData();
      }
    } finally {
      setSyncing(false);
    }
  };

  const users: any[] = cloudData?.users || [];
  const customers: any[] = cloudData?.customers || [];
  const duties: any[] = cloudData?.dutyShifts || [];
  const readings: any[] = cloudData?.readings || [];
  const credits: any[] = cloudData?.creditEntries || [];
  const payments: any[] = cloudData?.paymentEntries || [];
  const closings: any[] = cloudData?.dutyClosings || [];

  const filterList = (items: any[]) => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => JSON.stringify(item).toLowerCase().includes(term));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-5xl glass-panel rounded-3xl shadow-2xl border border-sky-500/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Cloud className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-100">Live Cloud Database Explorer</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Spring Boot Cloud JPA Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect real-time synchronized cloud database tables, user records, readings & ledgers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerSync}
              disabled={syncing}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Pushing Data...' : 'Sync Local to Cloud'}</span>
            </button>

            <button
              onClick={fetchCloudData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Overview Banner */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Cloud Status:</span>
              <span className="font-bold text-emerald-400">
                {cloudStatus?.status || 'ONLINE (Connected)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Cloud Records:</span>
              <span className="font-bold text-sky-300 font-mono-numbers">
                {cloudStatus?.databaseStats?.totalRecords ||
                  users.length + customers.length + duties.length + readings.length + credits.length + payments.length}
              </span>
            </div>
            {lastFetched && (
              <div className="text-[11px] text-slate-500">
                Last queried: <span className="font-mono text-slate-400">{lastFetched}</span>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search in cloud table..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Cloud Tables Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto flex-shrink-0 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-sky-950 text-sky-300 border border-sky-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cloud Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CUSTOMERS'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Cloud Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DUTIES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DUTIES'
                ? 'bg-amber-950 text-amber-300 border border-amber-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Duty Shifts ({duties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('READINGS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'READINGS'
                ? 'bg-purple-950 text-purple-300 border border-purple-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Pump Meter Readings ({readings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CREDITS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CREDITS'
                ? 'bg-blue-950 text-blue-300 border border-blue-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Credit Entries ({credits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PAYMENTS'
                ? 'bg-teal-950 text-teal-300 border border-teal-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Payments Collected ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CLOSINGS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CLOSINGS'
                ? 'bg-rose-950 text-rose-300 border border-rose-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Duty Closings ({closings.length})</span>
          </button>
        </div>

        {/* Table Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto"></div>
              <p className="font-semibold text-xs">Querying Cloud Database Tables...</p>
            </div>
          ) : (
            <>
              {activeTab === 'USERS' && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">User ID</th>
                        <th className="p-3">Full Name</th>
                        <th className="p-3">Username</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Cloud Persistence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filterList(users).map((u, i) => (
                        <tr key={u.id || i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{u.id}</td>
                          <td className="p-3 font-bold text-slate-100">{u.fullName}</td>
                          <td className="p-3 font-mono text-emerald-400">@{u.username}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 font-mono-numbers">{u.phone || 'N/A'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.active !== false ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}>
                              {u.active !== false ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Cloud Synced
                            </span>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No cloud users found. Click 'Sync Local to Cloud' to upload.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'CUSTOMERS' && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Customer ID</th>
                        <th className="p-3">Business / Fleet Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Total Credit</th>
                        <th className="p-3">Total Paid</th>
                        <th className="p-3">Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filterList(customers).map((c, i) => (
                        <tr key={c.id || i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{c.id}</td>
                          <td className="p-3 font-bold text-slate-100">{c.name}</td>
                          <td className="p-3 font-mono-numbers">{c.phoneNumber}</td>
                          <td className="p-3 font-mono-numbers font-bold text-slate-200">₹{(c.totalCredit || 0).toFixed(2)}</td>
                          <td className="p-3 font-mono-numbers font-bold text-emerald-400">₹{(c.totalPaid || 0).toFixed(2)}</td>
                          <td className="p-3 font-mono-numbers font-extrabold text-rose-400">₹{(c.currentBalance || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {customers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            No customers found in cloud database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'DUTIES' && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Duty ID</th>
                        <th className="p-3">Cashier</th>
                        <th className="p-3">Shift Type</th>
                        <th className="p-3">Start Time</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filterList(duties).map((d, i) => (
                        <tr key={d.id || i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{d.id}</td>
                          <td className="p-3 font-bold text-slate-100">{d.cashierName}</td>
                          <td className="p-3">{d.shiftType}</td>
                          <td className="p-3 text-[11px] text-slate-400">{d.startTime}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300">
                              {d.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono-numbers font-bold text-emerald-400">
                            ₹{(d.totalSales || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {duties.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            No shift duty records in cloud database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'READINGS' && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Reading ID</th>
                        <th className="p-3">Pump #</th>
                        <th className="p-3">Fuel Type</th>
                        <th className="p-3">Opening Meter</th>
                        <th className="p-3">Closing Meter</th>
                        <th className="p-3">Total Liters</th>
                        <th className="p-3">Gross Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filterList(readings).map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{r.id}</td>
                          <td className="p-3 font-bold text-slate-100">Pump #{r.pumpNumber}</td>
                          <td className="p-3 font-bold text-sky-400">{r.fuelType}</td>
                          <td className="p-3 font-mono-numbers text-slate-300">{r.startReading}</td>
                          <td className="p-3 font-mono-numbers text-slate-300">{r.endReading || '-'}</td>
                          <td className="p-3 font-mono-numbers font-bold text-emerald-400">{(r.totalLiters || 0).toFixed(2)} L</td>
                          <td className="p-3 font-mono-numbers font-bold text-amber-300">₹{(r.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {readings.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No meter readings in cloud database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'CREDITS' && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Credit ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Bill / Slip #</th>
                        <th className="p-3">Vehicle #</th>
                        <th className="p-3">Fuel</th>
                        <th className="p-3">Liters</th>
                        <th className="p-3">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filterList(credits).map((c, i) => (
                        <tr key={c.id || i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{c.id}</td>
                          <td className="p-3 font-bold text-slate-100">{c.customerName}</td>
                          <td className="p-3 font-mono text-slate-300">{c.billNumber}</td>
                          <td className="p-3 font-mono uppercase text-sky-400">{c.vehicleNumber}</td>
                          <td className="p-3">{c.fuelType}</td>
                          <td className="p-3 font-mono-numbers">{c.liters} L</td>
                          <td className="p-3 font-mono-numbers font-bold text-rose-400">₹{(c.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {credits.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No credit transactions found in cloud.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'PAYMENTS' && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Payment ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3">Reference / Txn #</th>
                        <th className="p-3">Recorded At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filterList(payments).map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{p.id}</td>
                          <td className="p-3 font-bold text-slate-100">{p.customerName}</td>
                          <td className="p-3 font-mono-numbers font-bold text-emerald-400">₹{(p.amount || 0).toFixed(2)}</td>
                          <td className="p-3 font-bold text-slate-200">{p.paymentMode}</td>
                          <td className="p-3 font-mono text-slate-400">{p.referenceNumber || '-'}</td>
                          <td className="p-3 text-[11px] text-slate-400">{p.recordedAt}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            No payment records found in cloud database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'CLOSINGS' && (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Closing ID</th>
                        <th className="p-3">Duty ID</th>
                        <th className="p-3">Cashier</th>
                        <th className="p-3">Total Sales</th>
                        <th className="p-3">Cash Submitted</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filterList(closings).map((cl, i) => (
                        <tr key={cl.id || i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-400">{cl.id}</td>
                          <td className="p-3 font-mono text-slate-400">{cl.dutyId}</td>
                          <td className="p-3 font-bold text-slate-100">{cl.cashierName}</td>
                          <td className="p-3 font-mono-numbers font-bold text-slate-200">₹{(cl.totalSales || 0).toFixed(2)}</td>
                          <td className="p-3 font-mono-numbers font-bold text-emerald-400">₹{(cl.cashSubmitted || 0).toFixed(2)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300">
                              {cl.closingStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {closings.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            No shift closings recorded in cloud.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
