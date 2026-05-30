import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, Users, Clock, TrendingUp, Download, Calendar, Star, FileText } from "lucide-react";
import { jsPDF } from "jspdf";

const StatCard = ({ icon: Icon, label, value, sublabel, color }) => (
  <div className="bg-white rounded-lg shadow p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
    {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
  </div>
);

export default function Payroll() {
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculatePayrollMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await base44.functions.invoke('calculatePayroll', payload);
      return response.data;
    },
    onSuccess: (data) => {
      setPayrollData(data);
      setLoading(false);
    },
    onError: (error) => {
      console.error('Error calculating payroll:', error);
      alert('Error calculating payroll: ' + error.message);
      setLoading(false);
    }
  });

  const handleCalculate = () => {
    setLoading(true);
    calculatePayrollMutation.mutate({ start_date: startDate, end_date: endDate });
  };

  const handleExportPDF = () => {
    if (!payrollData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYROLL SUMMARY', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${new Date(payrollData.period.start_date).toLocaleDateString()} - ${new Date(payrollData.period.end_date).toLocaleDateString()}`, pageWidth / 2, 25, { align: 'center' });

    let y = 40;

    // Summary Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      ['Total Payroll:', `$${payrollData.summary.total_payroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Total Jobs:', payrollData.summary.total_jobs.toString()],
      ['Total Hours:', payrollData.summary.total_hours.toFixed(1)],
      ['Base Wages:', `$${payrollData.summary.total_base_wages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Hourly Wages:', `$${payrollData.summary.total_hourly_wages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Performance Bonuses:', `$${payrollData.summary.total_bonuses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Number of Movers:', payrollData.summary.mover_count.toString()]
    ];

    summaryData.forEach(([label, value]) => {
      doc.text(label, 14, y);
      doc.text(value, 100, y, { align: 'right' });
      y += 6;
    });

    y += 10;

    // Mover Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Mover Breakdown', 14, y);
    y += 8;

    // Table headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, pageWidth - 28, 7, 'F');
    doc.text('Mover', 16, y);
    doc.text('Jobs', 70, y, { align: 'right' });
    doc.text('Hours', 90, y, { align: 'right' });
    doc.text('Base Wage', 115, y, { align: 'right' });
    doc.text('Bonus', 145, y, { align: 'right' });
    doc.text('Total', 170, y, { align: 'right' });
    y += 2;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    payrollData.payroll_data.forEach((mover, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const rowY = y;
      doc.text(mover.mover_name, 16, rowY);
      doc.text(mover.jobs_completed.toString(), 70, rowY, { align: 'right' });
      doc.text(mover.total_hours.toFixed(1), 90, rowY, { align: 'right' });
      doc.text(`$${mover.base_wage.toFixed(2)}`, 115, rowY, { align: 'right' });
      doc.text(`$${mover.performance_bonus.toFixed(2)}`, 145, rowY, { align: 'right' });
      doc.text(`$${mover.total_wage.toFixed(2)}`, 170, rowY, { align: 'right' });
      
      y += 6;
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on ${new Date(payrollData.generated_at).toLocaleDateString()} at ${new Date(payrollData.generated_at).toLocaleTimeString()}`, pageWidth / 2, footerY, { align: 'center' });

    doc.save(`Payroll_Summary_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-1">Calculate mover wages, bonuses, and export payroll summaries</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          Select Payroll Period
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <DollarSign size={16} />
              {loading ? 'Calculating...' : 'Calculate Payroll'}
            </button>
            {payrollData && (
              <button
                onClick={handleExportPDF}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} />
                Export PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Calculating payroll...</p>
          </div>
        </div>
      )}

      {payrollData && !loading && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              label="Total Payroll"
              value={`$${payrollData.summary.total_payroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sublabel="Total wages + bonuses"
              color="bg-blue-500"
            />
            <StatCard
              icon={Users}
              label="Movers Paid"
              value={payrollData.summary.mover_count}
              sublabel={`For ${payrollData.summary.total_jobs} jobs`}
              color="bg-green-500"
            />
            <StatCard
              icon={Clock}
              label="Total Hours"
              value={payrollData.summary.total_hours.toFixed(1)}
              sublabel="Logged hours"
              color="bg-purple-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Bonuses"
              value={`$${payrollData.summary.total_bonuses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sublabel="Performance bonuses"
              color="bg-yellow-500"
            />
          </div>

          {/* Wage Breakdown */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Wage Breakdown
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(payrollData.period.start_date).toLocaleDateString()} - {new Date(payrollData.period.end_date).toLocaleDateString()}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Mover</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Jobs</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Hours</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Base Wage (30%)</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Hourly ($25/hr)</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Performance Bonus</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.payroll_data.map((mover) => (
                    <tr key={mover.mover_name} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">{mover.mover_name}</p>
                          <p className="text-xs text-gray-500">{mover.jobs_completed} job{mover.jobs_completed !== 1 ? 's' : ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-gray-700">{mover.jobs_completed}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-600">{mover.total_hours.toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-blue-600">${mover.base_wage.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-purple-600">${(mover.hourly_wage || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {mover.performance_bonus > 0 && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                          <span className={`font-medium ${mover.performance_bonus > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            ${mover.performance_bonus.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-green-600 text-base">${mover.total_wage.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payrollData.payroll_data.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <DollarSign size={40} className="mx-auto mb-3 opacity-50" />
                <p>No payroll data for this period</p>
              </div>
            )}
          </div>

          {/* Detailed Breakdown per Mover */}
          <div className="space-y-4">
            {payrollData.payroll_data.map((mover) => (
              <div key={mover.mover_name} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">{mover.mover_name}</h3>
                      <p className="text-sm text-gray-500">
                        {mover.jobs_completed} jobs · {mover.total_hours.toFixed(1)} hours
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Wage</p>
                    <p className="text-2xl font-bold text-green-600">${mover.total_wage.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Base Wage (30% of jobs)</p>
                    <p className="text-lg font-bold text-blue-700">${mover.base_wage.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Hourly Wage</p>
                    <p className="text-lg font-bold text-purple-700">${(mover.hourly_wage || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs text-yellow-600 font-medium">Performance Bonus</p>
                    <p className="text-lg font-bold text-yellow-700">${mover.performance_bonus.toFixed(2)}</p>
                  </div>
                </div>

                {mover.bookings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Jobs Completed</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Booking #</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Customer</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Job Value</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Mover Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mover.bookings.map((booking, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-gray-700">{booking.booking_number}</td>
                              <td className="px-3 py-2 text-gray-600">{new Date(booking.date).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-gray-600">{booking.customer}</td>
                              <td className="px-3 py-2 text-right text-gray-700">${booking.job_value.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-medium text-blue-600">${booking.mover_share.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!payrollData && !loading && (
        <div className="text-center py-12 text-gray-400">
          <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-gray-600 font-medium">Select a date range and calculate payroll</p>
          <p className="text-gray-400 text-sm mt-1">Wages are calculated based on completed jobs, logged hours, and performance bonuses</p>
        </div>
      )}
    </div>
  );
}