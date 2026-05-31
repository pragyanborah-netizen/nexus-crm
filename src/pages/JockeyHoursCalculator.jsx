import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, DollarSign, Calendar, Users, TrendingUp, Download, AlertTriangle, CheckCircle, MapPin } from "lucide-react";
import { jsPDF } from "jspdf";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";

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
];

export default function JockeyHoursCalculator() {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [startDate, setStartDate] = useState(format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [calcData, setCalcData] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const jockeys = employees.filter(e => 
    (e.role === 'Driver' || e.role === 'Mover') && e.active !== false
  );

  const calculateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) throw new Error("Please select an employee");
      const res = await base44.functions.invoke("calculateJockeyHours", {
        employee_email: selectedEmployee,
        start_date: startDate,
        end_date: endDate,
      });
      return res.data;
    },
    onSuccess: (data) => setCalcData(data),
    onError: (e) => alert("Error: " + e.message),
  });

  const exportPDF = () => {
    if (!calcData) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pw, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("JOCKEY HOURS REPORT", pw / 2, 15, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${new Date(calcData.period.start_date).toLocaleDateString("en-AU")} – ${new Date(calcData.period.end_date).toLocaleDateString("en-AU")}`, pw / 2, 25, { align: "center" });

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
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), 16, y + 2);
      y += 10;
    };

    // Employee Info
    section("Employee");
    row("Name", calcData.employee_name, true);
    row("Email", calcData.employee_email);
    row("Pay Rate", `$${calcData.pay_rate}/hr`);
    y += 3;

    // Summary
    section("Hours Summary");
    row("Total Paid Hours", `${calcData.total_paid_hours.toFixed(2)} hrs`, true);
    row("Total Unpaid Travel", `${calcData.total_unpaid_travel_hours.toFixed(2)} hrs`);
    row("Total Pay", `$${calcData.total_pay.toFixed(2)}`, true);
    y += 3;

    // Policy Info
    section("Payment Policy Applied");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const policyLines = [
      `• Paid from: ${calcData.policy_summary.paid_from}`,
      `• Paid until: ${calcData.policy_summary.paid_until}`,
      `• Unpaid travel: ${calcData.policy_summary.unpaid_travel}`,
      `• Extended travel: ${calcData.policy_summary.extended_travel}`,
    ];
    policyLines.forEach(line => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 16, y);
      y += 6;
    });
    y += 5;

    // Shift Details
    if (calcData.shifts.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      section("Shift Details");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      calcData.shifts.forEach((shift, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. Booking ${shift.booking_number} — ${new Date(shift.date).toLocaleDateString("en-AU")}`, 16, y);
        y += 6;
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(`Clock In: ${shift.clock_in} · Clock Out: ${shift.clock_out}`, 20, y);
        y += 5;
        doc.text(`On-site: ${shift.on_site_hours} hrs · Paid: ${shift.paid_hours} hrs · Unpaid Travel: ${shift.unpaid_travel_hours} hrs`, 20, y);
        y += 5;
        if (shift.location) {
          doc.text(`Location: ${shift.location}`, 20, y);
          y += 6;
        }
        y += 2;
      });
    }

    // Footer
    const footY = doc.internal.pageSize.getHeight() - 12;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated ${new Date().toLocaleDateString("en-AU")} — Move On Australia`, pw / 2, footY, { align: "center" });

    doc.save(`Jockey_Hours_${calcData.employee_name.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Jockey Hours Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Calculate paid hours based on customer sign-on/sign-off policy</p>
      </div>

      {/* Selection */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Calendar size={17} className="text-blue-600" /> Select Period & Employee
        </h2>

        <div className="flex flex-wrap gap-2">
          {PERIOD_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setStartDate(p.start()); setEndDate(p.end()); }}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                startDate === p.start() && endDate === p.end()
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-600 hover:border-blue-400"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Employee</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
              <option value="">Select jockey...</option>
              {jockeys.map(e => (
                <option key={e.id} value={e.email}>
                  {e.first_name} {e.last_name} ({e.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending || !selectedEmployee}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg text-sm font-semibold">
          <Clock size={16} />
          {calculateMutation.isPending ? "Calculating..." : "Calculate Paid Hours"}
        </button>
      </div>

      {/* Loading */}
      {calculateMutation.isPending && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Calculating paid hours based on policy...</p>
        </div>
      )}

      {/* Results */}
      {calcData && !calculateMutation.isPending && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Clock} label="Paid Hours" value={`${calcData.total_paid_hours.toFixed(1)} hrs`} sublabel="On-site time" color="bg-green-600" />
            <StatCard icon={MapPin} label="Unpaid Travel" value={`${calcData.total_unpaid_travel_hours.toFixed(1)} hrs`} sublabel="Estimated" color="bg-gray-500" />
            <StatCard icon={DollarSign} label="Hourly Rate" value={`$${calcData.pay_rate}/hr`} sublabel="From employee record" color="bg-blue-600" />
            <StatCard icon={TrendingUp} label="Total Pay" value={`$${calcData.total_pay.toFixed(2)}`} sublabel={`${calcData.shifts.length} shift${calcData.shifts.length !== 1 ? "s" : ""}`} color="bg-purple-600" />
          </div>

          {/* Policy Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Payment Policy Applied</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span><strong>Paid from:</strong> {calcData.policy_summary.paid_from}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span><strong>Paid until:</strong> {calcData.policy_summary.paid_until}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span><strong>Unpaid travel:</strong> {calcData.policy_summary.unpaid_travel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span><strong>Extended travel:</strong> {calcData.policy_summary.extended_travel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export */}
          <button onClick={exportPDF}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Download size={15} /> Export PDF Report
          </button>

          {/* Shift Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Shift Details ({calcData.shifts.length} shifts)</h3>
            {calcData.shifts.map((shift, i) => (
              <div key={i} className="bg-white rounded-xl shadow border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800">Booking #{shift.booking_number}</p>
                    <p className="text-sm text-gray-500">{new Date(shift.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                    Paid: {shift.paid_hours} hrs
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Clock In</p>
                    <p className="font-semibold">{shift.clock_in}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Clock Out</p>
                    <p className="font-semibold">{shift.clock_out}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">On-site</p>
                    <p className="font-semibold">{shift.on_site_hours} hrs</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Unpaid Travel</p>
                    <p className="font-semibold text-gray-600">{shift.unpaid_travel_hours} hrs</p>
                  </div>
                </div>

                {shift.location && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <MapPin size={12} />
                    <span>{shift.location}</span>
                  </div>
                )}
              </div>
            ))}

            {calcData.shifts.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Clock size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-gray-600">No completed shifts found in this period</p>
                <p className="text-sm mt-1">Make sure the jockey has clocked in and out for jobs</p>
              </div>
            )}
          </div>
        </>
      )}

      {!calcData && !calculateMutation.isPending && (
        <div className="text-center py-16 text-gray-400">
          <Clock size={52} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium text-gray-600">Select an employee and period to calculate paid hours</p>
          <p className="text-sm mt-1">Policy: Paid from customer sign-on to sign-off · Travel ≤30 min unpaid</p>
        </div>
      )}
    </div>
  );
}