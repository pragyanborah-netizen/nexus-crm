import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, Users, Clock, TrendingUp, Download, Calendar, FileText, FileSpreadsheet, Plus, Trash2, ChevronDown, ChevronUp, Bell, Briefcase, Receipt } from "lucide-react";
import { jsPDF } from "jspdf";
import { format, startOfWeek, endOfWeek, startOfMonth, subWeeks, subDays } from "date-fns";

const StatCard = ({ icon: Icon, label, value, sublabel, color }) => (
  <div className="bg-white rounded-lg shadow p-5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} mb-3`}>
      <Icon size={20} className="text-white" />
    </div>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
  </div>
);

const today = new Date();
const PERIOD_PRESETS = [
  {
    label: "This Week",
    start: () => format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: () => format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  },
  {
    label: "Last Week",
    start: () => format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: () => format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  },
  {
    label: "This Fortnight",
    start: () => format(subDays(endOfWeek(today, { weekStartsOn: 1 }), 13), "yyyy-MM-dd"),
    end: () => format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  },
  {
    label: "Last Fortnight",
    start: () => format(subDays(startOfWeek(subWeeks(today, 2), { weekStartsOn: 1 }), 0), "yyyy-MM-dd"),
    end: () => format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  },
  {
    label: "This Month",
    start: () => format(startOfMonth(today), "yyyy-MM-dd"),
    end: () => format(today, "yyyy-MM-dd"),
  },
];

export default function Payroll() {
  const [startDate, setStartDate] = useState(format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [payrollData, setPayrollData] = useState(null);
  const [adjustments, setAdjustments] = useState([]); // [{employee_name, description, amount}]
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [notifying, setNotifying] = useState(false);

  const notifyEmployees = async () => {
    if (!payrollData) return;
    setNotifying(true);
    const res = await base44.functions.invoke("notifyPayslipsReady", {
      payroll_data: payrollData.payroll_data,
      start_date: startDate,
      end_date: endDate,
      period_label: `${startDate} to ${endDate}`,
    });
    setNotifying(false);
    const d = res.data;
    const skippedMsg = d.skipped?.length > 0 ? `\n${d.skipped.length} skipped (no email): ${d.skipped.map(s => s.name).join(", ")}` : "";
    alert(`✓ Sent payslip notifications to ${d.sent} employee(s).${skippedMsg}`);
  };

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const activeEmployees = employees.filter(e => e.active !== false);

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("calculatePayroll", {
        start_date: startDate,
        end_date: endDate,
        adjustments,
      });
      return res.data;
    },
    onSuccess: (data) => setPayrollData(data),
    onError: (e) => alert("Error: " + e.message),
  });

  const addAdjustment = () => {
    setAdjustments(prev => [...prev, { employee_name: "", description: "", amount: "" }]);
  };

  const updateAdjustment = (idx, key, val) => {
    setAdjustments(prev => prev.map((a, i) => i === idx ? { ...a, [key]: val } : a));
  };

  const removeAdjustment = (idx) => {
    setAdjustments(prev => prev.filter((_, i) => i !== idx));
  };

  // PDF payslip for one employee
  const exportPayslip = (mover) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("PAYSLIP — Move On Australia", pw / 2, 15, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Period: ${new Date(payrollData.period.start_date).toLocaleDateString("en-AU")} – ${new Date(payrollData.period.end_date).toLocaleDateString("en-AU")}`, pw / 2, 25, { align: "center" });

    let y = 44;
    const row = (label, value, bold = false) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(label, 16, y);
      doc.text(String(value), pw - 16, y, { align: "right" });
      y += 7;
    };
    const line = () => { doc.setDrawColor(226, 232, 240); doc.line(16, y, pw - 16, y); y += 5; };
    const section = (title) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 4, pw - 28, 9, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), 16, y + 2);
      y += 10;
    };

    section("Employee");
    row("Name", mover.mover_name, true);
    if (mover.role) row("Role", mover.role);
    if (mover.employment_type) row("Employment Type", mover.employment_type);
    if (mover.pay_rate) row("Pay Rate", `$${mover.pay_rate}/hr`);
    y += 3;

    section("Earnings");
    if (mover.hourly_wage > 0) {
      row(`Hours Worked (${mover.total_hours.toFixed(1)} hrs × $${mover.pay_rate || 25}/hr)`, `$${mover.hourly_wage.toFixed(2)}`);
    }
    if (mover.base_wage > 0) {
      row(`Job Share — ${mover.jobs_completed} job${mover.jobs_completed !== 1 ? "s" : ""} (30%)`, `$${mover.base_wage.toFixed(2)}`);
    }
    if (mover.performance_bonus > 0) {
      row("Performance Bonus (survey ratings)", `$${mover.performance_bonus.toFixed(2)}`);
    }
    mover.adjustment_items?.forEach(adj => {
      const sign = adj.amount >= 0 ? "+" : "";
      row(adj.description, `${sign}$${Math.abs(adj.amount).toFixed(2)}`);
    });
    line();
    row("TOTAL GROSS PAY", `$${mover.total_wage.toFixed(2)}`, true);
    y += 6;

    if (mover.time_log_entries?.length > 0) {
      section("Time Log Detail");
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      mover.time_log_entries.forEach(t => {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.setTextColor(51, 65, 85);
        doc.text(`${new Date(t.date).toLocaleDateString("en-AU")}`, 16, y);
        doc.text(`${t.hours.toFixed(1)} hrs × $${t.rate}/hr = $${t.amount.toFixed(2)}`, 55, y);
        if (t.booking_ref) doc.text(`Ref: ${t.booking_ref}`, 140, y);
        y += 6;
      });
      y += 2;
    }

    if (mover.bookings?.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      section("Completed Jobs");
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      mover.bookings.forEach((b, i) => {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.setTextColor(51, 65, 85);
        doc.text(`${i + 1}. ${b.booking_number} – ${new Date(b.date).toLocaleDateString("en-AU")} – ${b.customer}`, 16, y);
        doc.text(`$${b.mover_share.toFixed(2)}`, pw - 16, y, { align: "right" });
        y += 5.5;
      });
    }

    const footY = doc.internal.pageSize.getHeight() - 12;
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Generated ${new Date().toLocaleDateString("en-AU")} — Move On Australia`, pw / 2, footY, { align: "center" });

    doc.save(`Payslip_${mover.mover_name.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.pdf`);
  };

  const exportSummaryPDF = () => {
    if (!payrollData) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("PAYROLL SUMMARY", pw / 2, 16, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Period: ${new Date(payrollData.period.start_date).toLocaleDateString("en-AU")} – ${new Date(payrollData.period.end_date).toLocaleDateString("en-AU")}`, pw / 2, 26, { align: "center" });

    let y = 44;
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
    doc.setFillColor(241, 245, 249); doc.rect(14, y - 5, pw - 28, 8, "F");
    doc.text("EMPLOYEE", 16, y); doc.text("HOURS", 70, y, { align: "right" });
    doc.text("JOBS", 90, y, { align: "right" }); doc.text("HOURLY", 115, y, { align: "right" });
    doc.text("JOB SHARE", 140, y, { align: "right" }); doc.text("ADJUSTMENTS", 163, y, { align: "right" });
    doc.text("TOTAL", pw - 16, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
    payrollData.payroll_data.forEach(m => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(m.mover_name, 16, y);
      doc.text(m.total_hours.toFixed(1), 70, y, { align: "right" });
      doc.text(String(m.jobs_completed), 90, y, { align: "right" });
      doc.text(`$${m.hourly_wage.toFixed(2)}`, 115, y, { align: "right" });
      doc.text(`$${m.base_wage.toFixed(2)}`, 140, y, { align: "right" });
      const adj = m.adjustments_total !== 0 ? `${m.adjustments_total >= 0 ? "+" : ""}$${m.adjustments_total.toFixed(2)}` : "—";
      doc.text(adj, 163, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(`$${m.total_wage.toFixed(2)}`, pw - 16, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6;
    });

    doc.setDrawColor(203, 213, 225); doc.line(14, y, pw - 14, y); y += 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("TOTAL PAYROLL", 16, y);
    doc.text(`$${payrollData.summary.total_payroll.toFixed(2)}`, pw - 16, y, { align: "right" });

    doc.save(`Payroll_Summary_${startDate}_to_${endDate}.pdf`);
  };

  const exportCSV = () => {
    if (!payrollData) return;
    const header = ["Employee", "Role", "Pay Rate", "Hours", "Jobs", "Hourly Wages", "Job Share", "Perf Bonus", "Adjustments", "Expenses", "Total"];
    const rows = payrollData.payroll_data.map(m => [
      m.mover_name, m.role || "", m.pay_rate ? `$${m.pay_rate}` : "n/a",
      m.total_hours.toFixed(1), m.jobs_completed,
      m.hourly_wage.toFixed(2), m.base_wage.toFixed(2),
      m.performance_bonus.toFixed(2), m.adjustments_total.toFixed(2),
      m.expense_reimbursements.toFixed(2), m.total_wage.toFixed(2),
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `Payroll_${startDate}_to_${endDate}.csv`;
    a.click();
  };

  const allNames = [
    ...activeEmployees.map(e => `${e.first_name} ${e.last_name}`),
    ...(payrollData?.payroll_data?.map(p => p.mover_name) || []),
  ].filter((v, i, a) => a.indexOf(v) === i).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate payslips from time logs and completed jobs</p>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar size={17} className="text-blue-600" /> Pay Period</h2>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2">
          {PERIOD_PRESETS.map(p => (
            <button key={p.label} type="button"
              onClick={() => { setStartDate(p.start()); setEndDate(p.end()); }}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                startDate === p.start() && endDate === p.end()
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>

      {/* Adjustments (bonuses/deductions) */}
      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><DollarSign size={17} className="text-green-600" /> Flat-Rate Adjustments</h2>
          <button onClick={addAdjustment} className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50">
            <Plus size={14} /> Add Bonus / Deduction
          </button>
        </div>
        {adjustments.length === 0 && (
          <p className="text-sm text-gray-400 italic">No adjustments. Add bonuses (positive) or deductions (negative) per employee.</p>
        )}
        {adjustments.map((adj, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_120px_36px] gap-2 items-center">
            <select value={adj.employee_name} onChange={e => updateAdjustment(idx, "employee_name", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
              <option value="">Select employee...</option>
              {allNames.map(n => <option key={n}>{n}</option>)}
            </select>
            <input value={adj.description} onChange={e => updateAdjustment(idx, "description", e.target.value)}
              placeholder="e.g. Bonus, Travel allowance, Deduction..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input type="number" step="0.01" value={adj.amount} onChange={e => updateAdjustment(idx, "amount", e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-2 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={() => removeAdjustment(idx)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="pt-2">
          <button onClick={() => calculateMutation.mutate()} disabled={calculateMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg text-sm font-semibold">
            <DollarSign size={16} />
            {calculateMutation.isPending ? "Calculating..." : "Calculate Payroll"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {calculateMutation.isPending && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Calculating payroll...</p>
        </div>
      )}

      {/* Results */}
      {payrollData && !calculateMutation.isPending && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Total Payroll" value={`$${payrollData.summary.total_payroll.toFixed(2)}`} sublabel={`${payrollData.summary.mover_count} employees`} color="bg-blue-600" />
            <StatCard icon={Clock} label="Total Hours" value={payrollData.summary.total_hours.toFixed(1)} sublabel="From time logs" color="bg-purple-600" />
            <StatCard icon={Users} label="Jobs Completed" value={payrollData.summary.total_jobs} sublabel="In period" color="bg-green-600" />
            <StatCard icon={TrendingUp} label="Bonuses & Adj." value={`$${(payrollData.summary.total_bonuses + payrollData.summary.total_adjustments).toFixed(2)}`} sublabel="Performance + manual" color="bg-yellow-500" />
            <StatCard icon={Receipt} label="Expense Reimbursements" value={`$${payrollData.summary.total_expenses.toFixed(2)}`} sublabel="Approved expenses" color="bg-teal-600" />
          </div>

          {/* Export bar */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportSummaryPDF} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Download size={15} /> PDF Summary
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <FileSpreadsheet size={15} /> Export CSV
            </button>
            <button onClick={() => payrollData.payroll_data.forEach(m => exportPayslip(m))} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <FileText size={15} /> All Payslips
            </button>
            <button onClick={notifyEmployees} disabled={notifying}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Bell size={15} /> {notifying ? "Sending..." : "Notify Employees"}
            </button>
          </div>

          {/* Per-employee payslips */}
          <div className="space-y-3">
            {payrollData.payroll_data.map(mover => {
              const expanded = expandedEmployee === mover.mover_name;
              const initials = mover.mover_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={mover.mover_name} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedEmployee(expanded ? null : mover.mover_name)}>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{mover.mover_name}</p>
                      <p className="text-xs text-gray-500">
                        {mover.role || "Employee"} · {mover.employment_type || "Casual"}
                        {mover.pay_rate ? ` · $${mover.pay_rate}/hr` : " · rate not set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Hours</p>
                        <p className="font-semibold text-gray-700">{mover.total_hours.toFixed(1)}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Jobs</p>
                        <p className="font-semibold text-gray-700">{mover.jobs_completed}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Total Pay</p>
                        <p className="text-lg font-bold text-green-600">${mover.total_wage.toFixed(2)}</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); exportPayslip(mover); }}
                        className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium">
                        <Download size={12} /> Payslip
                      </button>
                      {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
                      {/* Earnings breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1">Hourly Wages</p>
                          <p className="text-lg font-bold text-purple-700">${mover.hourly_wage.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{mover.total_hours.toFixed(1)} hrs × ${mover.pay_rate || 25}/hr</p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1">Job Share (30%)</p>
                          <p className="text-lg font-bold text-blue-700">${mover.base_wage.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{mover.jobs_completed} job{mover.jobs_completed !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1">Performance Bonus</p>
                          <p className="text-lg font-bold text-yellow-600">${mover.performance_bonus.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">Survey ratings</p>
                        </div>
                        <div className={`rounded-lg border p-3 ${mover.adjustments_total >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                          <p className="text-xs text-gray-500 mb-1">Adjustments</p>
                          <p className={`text-lg font-bold ${mover.adjustments_total >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {mover.adjustments_total >= 0 ? "+" : ""}${mover.adjustments_total.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">{mover.adjustment_items?.length || 0} item{(mover.adjustment_items?.length || 0) !== 1 ? "s" : ""}</p>
                        </div>
                        {mover.expense_reimbursements > 0 && (
                          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Expense Reimbursements</p>
                            <p className="text-lg font-bold text-teal-700">+${mover.expense_reimbursements.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{mover.expense_items?.length || 0} expense{(mover.expense_items?.length || 0) !== 1 ? "s" : ""}</p>
                          </div>
                        )}
                        {mover.roster_wage > 0 && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Roster Shift Earnings</p>
                            <p className="text-lg font-bold text-indigo-700">${mover.roster_wage.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{mover.roster_hours.toFixed(1)} hrs from {mover.roster_shifts?.length || 0} confirmed shift{(mover.roster_shifts?.length || 0) !== 1 ? "s" : ""}</p>
                          </div>
                        )}
                      </div>

                      {/* Adjustment items */}
                      {mover.adjustment_items?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Adjustments Detail</p>
                          <div className="space-y-1">
                            {mover.adjustment_items.map((adj, i) => (
                              <div key={i} className="flex justify-between text-sm text-gray-700 bg-white rounded px-3 py-1.5 border border-gray-200">
                                <span>{adj.description}</span>
                                <span className={`font-semibold ${adj.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                                  {adj.amount >= 0 ? "+" : ""}${adj.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Time log entries */}
                      {mover.time_log_entries?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Time Log ({mover.time_log_entries.length} entries)</p>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Date</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Hours</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Rate</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Amount</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {mover.time_log_entries.map((t, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-700">{new Date(t.date).toLocaleDateString("en-AU")}</td>
                                    <td className="px-3 py-2 text-right">{t.hours.toFixed(1)}</td>
                                    <td className="px-3 py-2 text-right">${t.rate}/hr</td>
                                    <td className="px-3 py-2 text-right font-semibold text-blue-700">${t.amount.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-gray-500 truncate max-w-32">{t.notes || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Jobs */}
                      {mover.bookings?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Completed Jobs</p>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Booking #</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Date</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Customer</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Job Value</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Share (30%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {mover.bookings.map((b, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-700 font-medium">{b.booking_number}</td>
                                    <td className="px-3 py-2 text-gray-600">{new Date(b.date).toLocaleDateString("en-AU")}</td>
                                    <td className="px-3 py-2 text-gray-600">{b.customer}</td>
                                    <td className="px-3 py-2 text-right text-gray-700">${b.job_value.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-blue-600">${b.mover_share.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Expense reimbursements */}
                      {mover.expense_items?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Expense Reimbursements</p>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Category</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Description</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {mover.expense_items.map((exp, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-700">{exp.category}</td>
                                    <td className="px-3 py-2 text-gray-600">{exp.description}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-teal-700">${exp.amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {mover.total_hours === 0 && mover.jobs_completed === 0 && !mover.expense_items?.length && (
                        <p className="text-sm text-gray-400 italic">No time logs, completed jobs, or expenses found in this period.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {payrollData.payroll_data.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <DollarSign size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">No payroll data for this period</p>
              <p className="text-sm mt-1">Make sure employees have time logs or completed jobs in this date range</p>
            </div>
          )}
        </>
      )}

      {!payrollData && !calculateMutation.isPending && (
        <div className="text-center py-16 text-gray-400">
          <DollarSign size={52} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium text-gray-600">Select a period and calculate payroll</p>
          <p className="text-sm mt-1">Uses employee pay rates from the Employees page · Time logs · Completed jobs</p>
        </div>
      )}
    </div>
  );
}