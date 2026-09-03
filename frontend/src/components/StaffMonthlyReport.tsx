import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import { User, DutyShift, DutyClosing } from '../types';
import {
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Sparkles,
  Award,
  TrendingUp,
  FileSpreadsheet,
  ArrowUpRight,
  X,
  Building2,
  Phone,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';

interface StaffMonthlyReportProps {
  initialStaffId?: string;
}

interface StaffMonthStats {
  user: User;
  totalDays: number;
  uniqueDates: string[];
  totalMinutesWorked: number;
  totalHoursWorked: number;
  leadShiftsCount: number;
  supportShiftsCount: number;
  totalShiftsCount: number;
  averageShiftMinutes: number;
  totalSalesAmount: number;
  matchedClosingsCount: number;
  shifts: {
    shift: DutyShift;
    closing?: DutyClosing;
    role: 'LEAD_CASHIER' | 'SUPPORT_CASHIER';
    durationMinutes: number;
  }[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const StaffMonthlyReport: React.FC<StaffMonthlyReportProps> = ({ initialStaffId }) => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>(initialStaffId || 'ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CASHIER' | 'SUPPORT_CASHIER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Raw data from DB
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<DutyShift[]>([]);
  const [closings, setClosings] = useState<DutyClosing[]>([]);
  const [stationName, setStationName] = useState('Bharat Petroleum Highway Hub');

  // Modal inspection state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [printableModalOpen, setPrintableModalOpen] = useState(false);
  const [selectedStaffForTimesheet, setSelectedStaffForTimesheet] = useState<StaffMonthStats | null>(null);

  const loadReportData = async () => {
    const users = await db.users.toArray();
    const allShifts = await db.dutyShifts.toArray();
    const allClosings = await db.dutyClosings.toArray();
    const pricingObj = await db.pricing.get('current');
    if (pricingObj?.stationName) {
      setStationName(pricingObj.stationName);
    }

    setAllUsers(users);
    setShifts(allShifts);
    setClosings(allClosings);
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Filter shifts belonging to the selected Month & Year
  const monthlyShifts = useMemo(() => {
    return shifts.filter(s => {
      if (!s.startTime) return false;
      const shiftDate = new Date(s.startTime);
      return (
        shiftDate.getFullYear() === selectedYear &&
        shiftDate.getMonth() === selectedMonth
      );
    });
  }, [shifts, selectedYear, selectedMonth]);

  // Create a quick lookup for closings by dutyId
  const closingsMap = useMemo(() => {
    const map = new Map<string, DutyClosing>();
    closings.forEach(c => map.set(c.dutyId, c));
    return map;
  }, [closings]);

  // Compute stats per staff member (cashiers & support cashiers)
  const staffStatsList: StaffMonthStats[] = useMemo(() => {
    const targetUsers = allUsers.filter(u => u.role === 'CASHIER' || u.role === 'SUPPORT_CASHIER' || u.role === 'ADMIN');

    return targetUsers.map(user => {
      const userShifts: {
        shift: DutyShift;
        closing?: DutyClosing;
        role: 'LEAD_CASHIER' | 'SUPPORT_CASHIER';
        durationMinutes: number;
      }[] = [];

      const activeDatesSet = new Set<string>();
      let totalMinutes = 0;
      let leadCount = 0;
      let supportCount = 0;
      let totalSales = 0;
      let matchedCount = 0;

      monthlyShifts.forEach(shift => {
        const isLead = shift.cashierId === user.id;
        const isSupport = shift.supportCashierId === user.id;

        if (isLead || isSupport) {
          const role: 'LEAD_CASHIER' | 'SUPPORT_CASHIER' = isLead ? 'LEAD_CASHIER' : 'SUPPORT_CASHIER';
          if (isLead) leadCount++;
          if (isSupport) supportCount++;

          const dateStr = shift.startTime.slice(0, 10);
          activeDatesSet.add(dateStr);

          // Calculate duration
          const startMs = new Date(shift.startTime).getTime();
          const endMs = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();
          const durationMin = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));
          totalMinutes += durationMin;

          const closing = closingsMap.get(shift.id);
          if (closing) {
            totalSales += closing.grossFuelSalesAmount || 0;
            if (closing.closingStatus === 'MATCHED') {
              matchedCount++;
            }
          }

          userShifts.push({
            shift,
            closing,
            role,
            durationMinutes: durationMin
          });
        }
      });

      // Sort shifts descending by startTime
      userShifts.sort((a, b) => new Date(b.shift.startTime).getTime() - new Date(a.shift.startTime).getTime());

      const totalHours = Number((totalMinutes / 60).toFixed(1));
      const totalShifts = leadCount + supportCount;
      const avgMinutes = totalShifts > 0 ? Math.round(totalMinutes / totalShifts) : 0;

      return {
        user,
        totalDays: activeDatesSet.size,
        uniqueDates: Array.from(activeDatesSet),
        totalMinutesWorked: totalMinutes,
        totalHoursWorked: totalHours,
        leadShiftsCount: leadCount,
        supportShiftsCount: supportCount,
        totalShiftsCount: totalShifts,
        averageShiftMinutes: avgMinutes,
        totalSalesAmount: totalSales,
        matchedClosingsCount: matchedCount,
        shifts: userShifts
      };
    });
  }, [allUsers, monthlyShifts, closingsMap]);

  // Filtered staff list based on filters
  const filteredStaffStats = useMemo(() => {
    return staffStatsList.filter(item => {
      if (selectedStaffFilter !== 'ALL' && item.user.id !== selectedStaffFilter) {
        return false;
      }
      if (roleFilter !== 'ALL' && item.user.role !== roleFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.user.fullName.toLowerCase().includes(q);
        const matchUser = item.user.username.toLowerCase().includes(q);
        const matchPhone = (item.user.phone || '').includes(q);
        if (!matchName && !matchUser && !matchPhone) return false;
      }
      return true;
    });
  }, [staffStatsList, selectedStaffFilter, roleFilter, searchQuery]);

  // Overall Totals for Header KPI
  const overallKPIs = useMemo(() => {
    const totalWorkingHours = filteredStaffStats.reduce((sum, s) => sum + s.totalHoursWorked, 0);
    const totalWorkingMinutes = filteredStaffStats.reduce((sum, s) => sum + s.totalMinutesWorked, 0);
    const totalShiftsAssigned = filteredStaffStats.reduce((sum, s) => sum + s.totalShiftsCount, 0);
    const totalLeadShifts = filteredStaffStats.reduce((sum, s) => sum + s.leadShiftsCount, 0);
    const totalSupportShifts = filteredStaffStats.reduce((sum, s) => sum + s.supportShiftsCount, 0);
    const totalSales = filteredStaffStats.reduce((sum, s) => sum + s.totalSalesAmount, 0);

    // Unique active days across all filtered staff
    const allUniqueDays = new Set<string>();
    filteredStaffStats.forEach(s => s.uniqueDates.forEach(d => allUniqueDays.add(d)));

    const hours = Math.floor(totalWorkingMinutes / 60);
    const mins = totalWorkingMinutes % 60;

    return {
      uniqueDaysCount: allUniqueDays.size,
      totalHoursFormatted: `${hours}h ${mins}m`,
      totalHoursDecimal: totalWorkingHours,
      totalShiftsAssigned,
      totalLeadShifts,
      totalSupportShifts,
      totalSales
    };
  }, [filteredStaffStats]);

  // Calendar Day Map for the selected month
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun

    const days = [];
    // Padding before 1st of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ dayNumber: 0, dateStr: '', shifts: [] });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayShifts = monthlyShifts.filter(s => s.startTime.slice(0, 10) === dateStr);
      days.push({
        dayNumber: day,
        dateStr,
        shifts: dayShifts
      });
    }

    return days;
  }, [selectedYear, selectedMonth, monthlyShifts]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // CSV Exporter
  const exportTimesheetCSV = () => {
    let csv = `\uFEFF"Monthly Staff Attendance & Working Hours Report - ${MONTH_NAMES[selectedMonth]} ${selectedYear}"\n`;
    csv += `"Station:","${stationName}"\n`;
    csv += `"Generated At:","${new Date().toLocaleString('en-IN')}"\n\n`;

    // Staff Summary Table
    csv += `"STAFF ATTENDANCE & HOURS SUMMARY"\n`;
    csv += `"Staff Name","Username","Role","Phone","Working Days","Total Hours Worked","Lead Shifts","Support Shifts","Total Shifts","Avg Shift Duration (Mins)","Total Sales Closed (INR)"\n`;

    filteredStaffStats.forEach(s => {
      csv += `"${s.user.fullName}","@${s.user.username}","${s.user.role}","${s.user.phone || ''}",${s.totalDays},${s.totalHoursWorked},${s.leadShiftsCount},${s.supportShiftsCount},${s.totalShiftsCount},${s.averageShiftMinutes},${s.totalSalesAmount.toFixed(2)}\n`;
    });

    csv += `\n"DETAILED CHRONOLOGICAL SHIFT LOGS"\n`;
    csv += `"Date","Shift Number","Staff Name","Assigned Role","Clock-in Time (Start)","Clock-out Time (End)","Duration (HH:MM)","Duration (Hours)","Status","Closing Status","Gross Sales (INR)","Expected Cash (INR)","Actual Cash (INR)","Notes"\n`;

    monthlyShifts.forEach(shift => {
      const closing = closingsMap.get(shift.id);
      const start = new Date(shift.startTime);
      const end = shift.endTime ? new Date(shift.endTime) : null;
      const durMin = end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60))) : 0;
      const durFormatted = `${Math.floor(durMin / 60)}h ${durMin % 60}m`;
      const durDec = (durMin / 60).toFixed(2);

      // Add row for Lead Cashier
      csv += `"${shift.startTime.slice(0, 10)}","${shift.shiftNumber}","${shift.cashierName}","LEAD_CASHIER","${start.toLocaleTimeString()}","${end ? end.toLocaleTimeString() : 'ACTIVE'}","${durFormatted}",${durDec},"${shift.status}","${closing?.closingStatus || 'N/A'}",${closing?.grossFuelSalesAmount || 0},${closing?.expectedCashBalance || 0},${closing?.actualCashInHand || 0},"${shift.notes || ''}"\n`;

      // Add row for Support Cashier if exists
      if (shift.supportCashierId && shift.supportCashierName) {
        csv += `"${shift.startTime.slice(0, 10)}","${shift.shiftNumber}","${shift.supportCashierName}","SUPPORT_CASHIER","${start.toLocaleTimeString()}","${end ? end.toLocaleTimeString() : 'ACTIVE'}","${durFormatted}",${durDec},"${shift.status}","${closing?.closingStatus || 'N/A'}",${closing?.grossFuelSalesAmount || 0},${closing?.expectedCashBalance || 0},${closing?.actualCashInHand || 0},"${shift.notes || ''}"\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Staff_Monthly_Report_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = (staff?: StaffMonthStats) => {
    const adminPhone = '9159054084';
    let text = `📊 *BHARAT PETROLEUM - MONTHLY STAFF WORK & HOURS REPORT* 📊\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 *Period:* ${MONTH_NAMES[selectedMonth]} ${selectedYear}\n`;
    text += `📍 *Station:* ${stationName}\n\n`;

    if (staff) {
      text += `👤 *Staff Member:* ${staff.user.fullName} (@${staff.user.username})\n`;
      text += `💼 *Role:* ${staff.user.role}\n`;
      text += `📱 *Phone:* ${staff.user.phone || 'N/A'}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🗓️ *Total Working Days:* ${staff.totalDays} Days\n`;
      text += `⏱️ *Total Working Time:* ${Math.floor(staff.totalMinutesWorked / 60)} hrs ${staff.totalMinutesWorked % 60} mins (${staff.totalHoursWorked} hrs)\n`;
      text += `👑 *Lead Cashier Shifts:* ${staff.leadShiftsCount} shifts\n`;
      text += `🤝 *Support Cashier Shifts:* ${staff.supportShiftsCount} shifts\n`;
      text += `⏱️ *Avg Shift Duration:* ${Math.floor(staff.averageShiftMinutes / 60)}h ${staff.averageShiftMinutes % 60}m\n`;
      text += `💰 *Total Sales Handled:* ₹${staff.totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
      text += `✅ *Perfect Reconciliations:* ${staff.matchedClosingsCount} shifts\n`;
    } else {
      text += `👥 *MONTHLY STAFF DUTY SUMMARY:*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      filteredStaffStats.forEach(s => {
        text += `• *${s.user.fullName}* (${s.user.role}):\n`;
        text += `   ↳ Days: *${s.totalDays} days* | Hours: *${s.totalHoursWorked} hrs* | Lead: ${s.leadShiftsCount} | Support: ${s.supportShiftsCount}\n`;
      });
      text += `\n📈 *Station Totals:* ${overallKPIs.uniqueDaysCount} Active Days | ${overallKPIs.totalHoursFormatted} Worked\n`;
    }

    text += `\n👑 *Generated by BunkPro Admin Control*`;
    const waUrl = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="bg-white/95 p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-sky-700 uppercase tracking-widest bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                Staff Attendance & Working Time
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Monthly Cashier & Support Cashier Report
            </h2>
            <p className="text-xs text-slate-500">
              Track working days count, exact clock-in/out hours, lead vs support duties, and shift settlements
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportTimesheetCSV}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-300 flex items-center gap-1.5 shadow-sm"
              title="Export all staff timesheet logs to CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                setSelectedStaffForTimesheet(null);
                setPrintableModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all border border-blue-200 flex items-center gap-1.5 shadow-sm"
              title="Generate printable monthly timesheet"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Print Timesheet</span>
            </button>
            <button
              onClick={() => handleShareWhatsApp()}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all border border-emerald-200 flex items-center gap-1.5 shadow-sm"
              title="Send monthly overview to WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Summary</span>
            </button>
          </div>
        </div>

        {/* Month Selector Bar & Filter Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 items-center">
          {/* Month/Year Navigation */}
          <div className="md:col-span-6 flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-white text-slate-700 hover:text-slate-900 transition-all"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-white text-slate-700 hover:text-slate-900 transition-all"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleCurrentMonth}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
            >
              Current Month
            </button>

            {/* Quick Month Select Dropdown */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Filters: Staff Member & Role */}
          <div className="md:col-span-6 flex items-center gap-2 justify-start md:justify-end flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-600">Filter Staff:</span>
            </div>

            <select
              value={selectedStaffFilter}
              onChange={e => setSelectedStaffFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="ALL">All Staff Members ({staffStatsList.length})</option>
              {staffStatsList.map(s => (
                <option key={s.user.id} value={s.user.id}>
                  {s.user.fullName} ({s.user.role})
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="ALL">All Roles</option>
              <option value="CASHIER">Cashiers Only</option>
              <option value="SUPPORT_CASHIER">Support Cashiers Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards: High Level Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Working Days in Month */}
        <div className="glass-card rounded-3xl p-5 border border-sky-200 bg-white/95 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
            Total Working Days
          </p>
          <h3 className="text-3xl font-black text-sky-900 font-mono-numbers">
            {overallKPIs.uniqueDaysCount} <span className="text-sm font-bold text-slate-500">Days Active</span>
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>Across {filteredStaffStats.length} staff member(s)</span>
          </div>
        </div>

        {/* Total Working Hours */}
        <div className="glass-card rounded-3xl p-5 border border-emerald-200 bg-white/95 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
            Total Working Time
          </p>
          <h3 className="text-3xl font-black text-emerald-900 font-mono-numbers">
            {overallKPIs.totalHoursFormatted}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{overallKPIs.totalHoursDecimal} Total Billable Hours</span>
          </div>
        </div>

        {/* Lead vs Support Shifts */}
        <div className="glass-card rounded-3xl p-5 border border-amber-200 bg-white/95 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
            Shifts Completed
          </p>
          <h3 className="text-3xl font-black text-amber-900 font-mono-numbers">
            {overallKPIs.totalShiftsAssigned} <span className="text-sm font-bold text-slate-500">Shifts</span>
          </h3>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-700 font-bold">
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              👑 {overallKPIs.totalLeadShifts} Lead
            </span>
            <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">
              🤝 {overallKPIs.totalSupportShifts} Support
            </span>
          </div>
        </div>

        {/* Total Sales Reconciled */}
        <div className="glass-card rounded-3xl p-5 border border-purple-200 bg-white/95 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
            Total Fuel Sales Handled
          </p>
          <h3 className="text-2xl font-black text-purple-900 font-mono-numbers truncate">
            ₹{overallKPIs.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Audited & Reconciled with Admin</span>
          </div>
        </div>
      </div>

      {/* Staff Attendance Summary Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Staff Monthly Performance & Timesheet Summary</span>
          </h3>
          <span className="text-xs text-slate-500">
            Showing <strong>{filteredStaffStats.length}</strong> staff member(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaffStats.map(s => {
            const hours = Math.floor(s.totalMinutesWorked / 60);
            const mins = s.totalMinutesWorked % 60;
            const avgHours = Math.floor(s.averageShiftMinutes / 60);
            const avgMins = s.averageShiftMinutes % 60;

            return (
              <div
                key={s.user.id}
                className="glass-card rounded-3xl p-5 border border-slate-200 bg-white/95 shadow-sm space-y-4 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Staff Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {s.user.photoUrl ? (
                        <img
                          src={s.user.photoUrl}
                          alt={s.user.fullName}
                          className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                          {s.user.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-sm text-slate-900 truncate">{s.user.fullName}</h4>
                        <p className="text-xs text-slate-600 font-mono-numbers font-medium">{s.user.phone || '--'}</p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase shadow-sm ${
                            s.user.role === 'ADMIN' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            s.user.role === 'CASHIER' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                            'bg-sky-100 text-sky-900 border-sky-300'
                          }`}>
                            {s.user.role}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold">@{s.user.username}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance & Hours Badges */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4">
                    <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100">
                      <span className="text-[10px] font-black text-sky-800 uppercase tracking-wider block">
                        Working Days
                      </span>
                      <p className="text-xl font-black text-sky-950 font-mono-numbers mt-0.5">
                        {s.totalDays} <span className="text-xs font-bold text-slate-500">Days</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                        Working Hours
                      </span>
                      <p className="text-xl font-black text-emerald-950 font-mono-numbers mt-0.5">
                        {hours}h {mins}m
                      </p>
                    </div>
                  </div>

                  {/* Shift Role Details */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-bold">👑 Shifts as Lead Cashier:</span>
                      <span className="font-mono-numbers font-black text-slate-900">{s.leadShiftsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-bold">🤝 Shifts as Support Cashier:</span>
                      <span className="font-mono-numbers font-black text-slate-900">{s.supportShiftsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
                      <span className="text-slate-600 font-bold">⏱️ Avg Duration / Shift:</span>
                      <span className="font-mono-numbers font-black text-slate-900">{avgHours}h {avgMins}m</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-bold">💰 Fuel Sales Reconciled:</span>
                      <span className="font-mono-numbers font-black text-emerald-700">₹{s.totalSalesAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedStaffForTimesheet(s);
                      setPrintableModalOpen(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-black transition-all flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View Timesheet</span>
                  </button>
                  <button
                    onClick={() => handleShareWhatsApp(s)}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all shadow-sm"
                    title="Send individual summary to WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Monthly Attendance Calendar Heatmap Grid */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 bg-white/95 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Monthly Attendance Calendar: {MONTH_NAMES[selectedMonth]} {selectedYear}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Click any active date to view shifts, clock-in/out timestamps, and staff on duty
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Lead Shift
            </span>
            <span className="flex items-center gap-1.5 text-sky-700">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              Support Shift
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
              No Duty
            </span>
          </div>
        </div>

        {/* 7-column Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[11px] font-black text-slate-500 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}

          {calendarDays.map((item, idx) => {
            if (item.dayNumber === 0) {
              return (
                <div key={`empty-${idx}`} className="h-24 rounded-2xl bg-slate-50/40 border border-transparent"></div>
              );
            }

            const hasShifts = item.shifts.length > 0;
            const isToday =
              today.getFullYear() === selectedYear &&
              today.getMonth() === selectedMonth &&
              today.getDate() === item.dayNumber;

            return (
              <div
                key={item.dateStr}
                onClick={() => hasShifts && setSelectedCalendarDate(item.dateStr)}
                className={`min-h-[100px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                  hasShifts
                    ? 'bg-sky-50/40 hover:bg-sky-50 border-sky-200 cursor-pointer shadow-sm hover:border-sky-400'
                    : 'bg-slate-50/60 border-slate-100 text-slate-400'
                } ${isToday ? 'ring-2 ring-blue-500 font-black' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${hasShifts ? 'text-slate-900' : 'text-slate-400'}`}>
                    {item.dayNumber}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                      Today
                    </span>
                  )}
                  {hasShifts && (
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-full">
                      {item.shifts.length} {item.shifts.length === 1 ? 'shift' : 'shifts'}
                    </span>
                  )}
                </div>

                {/* Shift Staff Badges inside Date Cell */}
                <div className="space-y-1 mt-1">
                  {item.shifts.slice(0, 2).map(s => (
                    <div
                      key={s.id}
                      className="text-[10px] p-1 rounded-xl bg-white border border-slate-200 shadow-2xs truncate space-y-0.5"
                    >
                      <div className="font-bold text-slate-800 truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span className="truncate">{s.cashierName}</span>
                      </div>
                      {s.supportCashierName && (
                        <div className="font-medium text-slate-600 truncate flex items-center gap-1 text-[9px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0"></span>
                          <span className="truncate">{s.supportCashierName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {item.shifts.length > 2 && (
                    <p className="text-[9px] font-bold text-sky-700 text-center">
                      +{item.shifts.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Chronological Shifts Timesheet Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 bg-white/95 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Detailed Shift Duty Timesheet Log</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of shift clock-in / clock-out times and assigned cashiers
            </p>
          </div>
          <div className="text-xs text-slate-600 font-medium">
            Total Shifts Logged: <strong className="text-slate-900">{monthlyShifts.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Date & Shift ID</th>
                <th className="pb-3 px-3">Lead Cashier</th>
                <th className="pb-3 px-3">Support Cashier</th>
                <th className="pb-3 px-3">Clock-In (Start)</th>
                <th className="pb-3 px-3">Clock-Out (End)</th>
                <th className="pb-3 px-3 text-right">Working Duration</th>
                <th className="pb-3 px-3 text-center">Shift Status</th>
                <th className="pb-3 px-3 text-right">Gross Sales</th>
                <th className="pb-3 px-3 text-center">Reconciliation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {monthlyShifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    No shifts logged in {MONTH_NAMES[selectedMonth]} {selectedYear}. Start and close shifts to view duty records.
                  </td>
                </tr>
              ) : (
                monthlyShifts.map(shift => {
                  const closing = closingsMap.get(shift.id);
                  const start = new Date(shift.startTime);
                  const end = shift.endTime ? new Date(shift.endTime) : null;
                  const durMin = end
                    ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60)))
                    : Math.max(1, Math.round((Date.now() - start.getTime()) / (1000 * 60)));
                  const hours = Math.floor(durMin / 60);
                  const mins = durMin % 60;

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-3 px-3">
                        <span className="font-mono-numbers font-black text-slate-900 block">
                          {shift.shiftNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono-numbers">
                          {shift.startTime.slice(0, 10)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-bold text-slate-900">{shift.cashierName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {shift.supportCashierName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                            <span className="font-bold text-slate-700">{shift.supportCashierName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">--</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-mono-numbers">
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-mono-numbers">
                        {end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                          <span className="text-emerald-600 font-bold animate-pulse">ACTIVE NOW</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-black text-slate-900">
                        {hours}h {mins}m
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                          shift.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-800 border-slate-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                        }`}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900">
                        {closing ? `₹${closing.grossFuelSalesAmount.toFixed(2)}` : '--'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {closing ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                            closing.closingStatus === 'MATCHED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : closing.closingStatus === 'EXTRA'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {closing.closingStatus}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending Close</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Single Calendar Date Inspection Drawer */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Shifts on Date: {selectedCalendarDate}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Exact working hours and cashier assignments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCalendarDate(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {monthlyShifts.filter(s => s.startTime.slice(0, 10) === selectedCalendarDate).map(shift => {
                const closing = closingsMap.get(shift.id);
                const start = new Date(shift.startTime);
                const end = shift.endTime ? new Date(shift.endTime) : null;
                const durMin = end
                  ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60)))
                  : Math.max(1, Math.round((Date.now() - start.getTime()) / (1000 * 60)));

                return (
                  <div key={shift.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-numbers font-black text-sm text-slate-900">
                          {shift.shiftNumber}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                          shift.status === 'CLOSED'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {shift.status}
                        </span>
                      </div>
                      <span className="font-mono-numbers font-black text-sm text-sky-900">
                        {Math.floor(durMin / 60)}h {durMin % 60}m Total
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase block">Lead Cashier</span>
                        <p className="font-black text-slate-900 mt-0.5">{shift.cashierName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase block">Support Cashier</span>
                        <p className="font-black text-slate-900 mt-0.5">{shift.supportCashierName || 'None assigned'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase block">Clock In (Start)</span>
                        <p className="font-mono-numbers font-bold text-slate-700 mt-0.5">{start.toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase block">Clock Out (End)</span>
                        <p className="font-mono-numbers font-bold text-slate-700 mt-0.5">{end ? end.toLocaleTimeString() : 'In Progress'}</p>
                      </div>
                    </div>

                    {closing && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-slate-500 font-medium">Gross Fuel Sales: </span>
                          <strong className="text-slate-900">₹{closing.grossFuelSalesAmount.toFixed(2)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Reconciliation: </span>
                          <strong className={closing.closingStatus === 'MATCHED' ? 'text-emerald-700' : 'text-amber-700'}>
                            {closing.closingStatus}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Printable Timesheet View */}
      {printableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-sm">
                  Monthly Work Timesheet & Attendance Slip
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setPrintableModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Body Content */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 text-xs font-sans">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  {stationName}
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Fuel Dispensing Station & Petroleum Outlet Management
                </p>
                <div className="inline-block bg-slate-100 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest text-slate-900 mt-2 border border-slate-300">
                  Official Staff Monthly Attendance & Timesheet: {MONTH_NAMES[selectedMonth]} {selectedYear}
                </div>
              </div>

              {/* Individual Staff or Station Summary Header */}
              {selectedStaffForTimesheet ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Staff Name</span>
                    <strong className="text-sm font-black text-slate-900">{selectedStaffForTimesheet.user.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Staff Role</span>
                    <strong className="text-sm font-black text-slate-900">{selectedStaffForTimesheet.user.role}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Working Days</span>
                    <strong className="text-sm font-black text-sky-900">{selectedStaffForTimesheet.totalDays} Days</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Hours Worked</span>
                    <strong className="text-sm font-black text-emerald-900">{selectedStaffForTimesheet.totalHoursWorked} Hours</strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Staff Count</span>
                    <strong className="text-sm font-black text-slate-900">{filteredStaffStats.length} Members</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Station Active Days</span>
                    <strong className="text-sm font-black text-sky-900">{overallKPIs.uniqueDaysCount} Days</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Staff Hours</span>
                    <strong className="text-sm font-black text-emerald-900">{overallKPIs.totalHoursFormatted}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Shifts Run</span>
                    <strong className="text-sm font-black text-amber-900">{overallKPIs.totalShiftsAssigned} Shifts</strong>
                  </div>
                </div>
              )}

              {/* Timesheet Table in Print */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-black text-slate-800">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Shift Number</th>
                      <th className="p-2.5">Staff Name</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Clock In</th>
                      <th className="p-2.5">Clock Out</th>
                      <th className="p-2.5 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(selectedStaffForTimesheet
                      ? selectedStaffForTimesheet.shifts
                      : monthlyShifts.map(shift => ({
                          shift,
                          role: 'LEAD_CASHIER' as const,
                          durationMinutes: shift.endTime
                            ? Math.max(1, Math.round((new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60)))
                            : 0
                        }))
                    ).map((item, idx) => {
                      const start = new Date(item.shift.startTime);
                      const end = item.shift.endTime ? new Date(item.shift.endTime) : null;
                      const hours = Math.floor(item.durationMinutes / 60);
                      const mins = item.durationMinutes % 60;

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono-numbers">{item.shift.startTime.slice(0, 10)}</td>
                          <td className="p-2.5 font-mono font-bold">{item.shift.shiftNumber}</td>
                          <td className="p-2.5 font-bold">
                            {item.role === 'LEAD_CASHIER' ? item.shift.cashierName : (item.shift.supportCashierName || item.shift.cashierName)}
                          </td>
                          <td className="p-2.5 font-bold">{item.role}</td>
                          <td className="p-2.5 font-mono-numbers">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-2.5 font-mono-numbers">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</td>
                          <td className="p-2.5 text-right font-mono-numbers font-black">{hours}h {mins}m</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures Area */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-black text-slate-900">Cashier / Staff Signature</p>
                  <p className="text-[10px] text-slate-500">I confirm the recorded duty hours are accurate</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-black text-slate-900">Station Owner / Admin Authorization</p>
                  <p className="text-[10px] text-slate-500">Verified for Bunk Operations & Payroll</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
