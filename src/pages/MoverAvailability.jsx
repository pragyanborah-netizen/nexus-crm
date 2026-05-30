import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, ChevronLeft, ChevronRight, X, Check, Clock, AlertCircle, User, DollarSign, Loader2, Sparkles, Users, Truck } from "lucide-react";

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Approved: "bg-green-100 text-green-700 border-green-300",
  Rejected: "bg-red-100 text-red-700 border-red-300",
};

const statusIcons = {
  Pending: Clock,
  Approved: Check,
  Rejected: X,
};

export default function MoverAvailability() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  
  // Calculate minimum selectable date (48 hours from now)
  const minSelectableDate = new Date();
  minSelectableDate.setHours(minSelectableDate.getHours() + 48);
  const minSelectableDateStr = minSelectableDate.toISOString().split("T")[0];
  const [view, setView] = useState("calendar"); // "calendar", "requests", "earnings", or "ai-scheduler"
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [earningsData, setEarningsData] = useState(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [schedulerDate, setSchedulerDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);

  const { data: availability = [] } = useQuery({
    queryKey: ["mover-availability"],
    queryFn: () => base44.entities.MoverAvailability.list("-requested_date"),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-staffing"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  // Fetch earnings when earnings tab is active
  const fetchEarnings = async () => {
    if (!user?.email) return;
    setLoadingEarnings(true);
    try {
      const response = await base44.functions.invoke('calculateMoverEarnings', {
        mover_email: user.email,
        month: selectedMonth,
        year: selectedYear
      });
      setEarningsData(response.data);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      setEarningsData(null);
    }
    setLoadingEarnings(false);
  };

  // AI Scheduler
  const handleAiSchedule = async () => {
    setScheduling(true);
    setScheduleResult(null);
    try {
      const response = await base44.functions.invoke('aiScheduleMovers', {
        target_date: schedulerDate
      });
      setScheduleResult(response.data);
    } catch (error) {
      console.error('Error in AI scheduling:', error);
      setScheduleResult({ error: error.message });
    }
    setScheduling(false);
  };

  // Calculate staffing levels for each date
  const getStaffingLevel = (dateStr) => {
    const dayBookings = bookings.filter(b => b.move_date === dateStr && 
      ["Confirmed", "Booked Job", "Tentative Booking"].includes(b.status));
    
    // Calculate total movers needed for this day
    const moversNeeded = dayBookings.reduce((sum, b) => sum + (b.num_movers || 2), 0);
    
    // Calculate movers unavailable (on approved leave)
    const unavailableMovers = availability.filter(req => {
      const start = new Date(req.start_date + "T00:00:00");
      const end = new Date(req.end_date + "T00:00:00");
      const checkDate = new Date(dateStr + "T00:00:00");
      return checkDate >= start && checkDate <= end && req.status === "Approved";
    }).length;
    
    // Assume 10 total movers (you can adjust this based on your actual team size)
    const TOTAL_MOVERS = 10;
    const availableMovers = TOTAL_MOVERS - unavailableMovers;
    
    // Calculate if understaffed
    const isUnderstaffed = moversNeeded > availableMovers * 3; // Assume each mover can handle 3 jobs
    const utilizationRate = moversNeeded / (availableMovers * 3);
    
    return { moversNeeded, availableMovers, isUnderstaffed, utilizationRate, jobCount: dayBookings.length };
  };

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('submitAvailabilityRequest', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mover-availability"] });
      setShowRequestModal(false);
      setSelectedDates([]);
      setRequestReason("");
      alert("Availability request submitted successfully!");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('approveAvailabilityRequest', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mover-availability"] });
    },
  });

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay, year, month };
  };

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);

  const isDateUnavailable = (day) => {
    const checkDate = new Date(year, month, day);
    const today = new Date().toISOString().split("T")[0];
    const dateStr = checkDate.toISOString().split("T")[0];
    // Disable dates within 48 hours
    if (dateStr < minSelectableDateStr) return true;
    return availability.some(req => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      return checkDate >= start && checkDate <= end && req.status === 'Approved';
    });
  };

  const getStaffingWarning = (day) => {
    const checkDate = new Date(year, month, day);
    const dateStr = checkDate.toISOString().split("T")[0];
    const staffing = getStaffingLevel(dateStr);
    
    if (staffing.utilizationRate > 1.2) return "critical"; // Over 120% utilization
    if (staffing.utilizationRate > 0.9) return "warning"; // Over 90% utilization
    return null;
  };

  const isDateSelected = (day) => {
    const checkDate = new Date(year, month, day).toISOString().split('T')[0];
    return selectedDates.includes(checkDate);
  };

  const toggleDate = (day) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const handleRequestSubmit = () => {
    if (selectedDates.length === 0) {
      alert("Please select at least one date");
      return;
    }
    submitMutation.mutate({
      start_date: selectedDates[0],
      end_date: selectedDates[selectedDates.length - 1],
      reason: requestReason,
    });
  };

  const pendingRequests = availability.filter(r => r.status === 'Pending');
  const approvedRequests = availability.filter(r => r.status === 'Approved');

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home › Mover Availability</nav>
          <h1 className="text-2xl font-bold text-gray-800">Mover Availability Calendar</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (view === "calendar") setView("requests");
              else if (view === "requests") { setView("earnings"); fetchEarnings(); }
              else if (view === "earnings") { setView("ai-scheduler"); setScheduleResult(null); }
              else setView("calendar");
            }}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            {view === "calendar" ? "View Requests" : view === "requests" ? "View Earnings" : view === "earnings" ? "AI Scheduler" : "View Calendar"}
          </button>
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
          >
            <Calendar size={16} /> Request Time Off
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const unavailable = isDateUnavailable(day);
              const selected = isDateSelected(day);
              const dateStr = new Date(year, month, day).toISOString().split('T')[0];
              const within48Hours = dateStr < minSelectableDateStr;
              const staffingWarning = getStaffingWarning(day);

              return (
                <div
                  key={day}
                  onClick={() => !within48Hours && !unavailable && toggleDate(day)}
                  className={`h-24 border rounded p-2 transition-all ${
                    selected
                      ? "bg-blue-100 border-blue-500"
                      : unavailable
                      ? "bg-red-50 border-red-300"
                      : within48Hours
                      ? "bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed"
                      : staffingWarning === "critical"
                      ? "bg-orange-100 border-orange-400 cursor-pointer hover:shadow-md"
                      : staffingWarning === "warning"
                      ? "bg-yellow-50 border-yellow-300 cursor-pointer hover:shadow-md"
                      : "bg-white border-gray-200 cursor-pointer hover:shadow-md"
                  }`}
                >
                  <div className="text-sm font-semibold mb-1">{day}</div>
                  {unavailable && (
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={10} /> Unavailable
                    </div>
                  )}
                  {within48Hours && !unavailable && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={10} /> Within 48hrs
                    </div>
                  )}
                  {staffingWarning && !unavailable && !within48Hours && (
                    <div className={`text-xs flex items-center gap-1 ${
                      staffingWarning === "critical" ? "text-orange-700 font-medium" : "text-yellow-700"
                    }`}>
                      <AlertCircle size={10} /> 
                      {staffingWarning === "critical" ? "High demand" : "Limited capacity"}
                    </div>
                  )}
                  {selected && (
                    <div className="text-xs text-blue-600 flex items-center gap-1">
                      <Check size={10} /> Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-6 pt-4 border-t flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
              <span className="text-sm text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-500 rounded" />
              <span className="text-sm text-gray-600">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-300 rounded" />
              <span className="text-sm text-gray-600">Unavailable (Approved)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded opacity-50" />
              <span className="text-sm text-gray-600">Unavailable (Within 48hrs)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded" />
              <span className="text-sm text-gray-600">Limited Capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-400 rounded" />
              <span className="text-sm text-gray-600">High Demand</span>
            </div>
          </div>
        </div>
      ) : view === "requests" ? (
        <div className="space-y-4">
          {/* Pending Requests */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-yellow-600" />
              Pending Requests ({pendingRequests.length})
            </h2>
            {pendingRequests.length === 0 ? (
              <p className="text-gray-400 text-sm">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                          <User size={20} className="text-yellow-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{req.employee_name}</p>
                          <p className="text-sm text-gray-600">{req.employee_email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Requested: {new Date(req.requested_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                        Pending
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Start Date:</span>
                        <span className="ml-2 font-medium">{new Date(req.start_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">End Date:</span>
                        <span className="ml-2 font-medium">{new Date(req.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {req.reason && (
                      <div className="mt-2">
                        <span className="text-gray-500 text-sm">Reason:</span>
                        <p className="text-sm text-gray-700 mt-1">{req.reason}</p>
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => approveMutation.mutate({ id: req.id, status: 'Approved' })}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => approveMutation.mutate({ id: req.id, status: 'Rejected' })}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Requests */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Check size={18} className="text-green-600" />
              Approved Time Off ({approvedRequests.length})
            </h2>
            {approvedRequests.length === 0 ? (
              <p className="text-gray-400 text-sm">No approved requests</p>
            ) : (
              <div className="space-y-3">
                {approvedRequests.map(req => (
                  <div key={req.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                          <User size={20} className="text-green-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{req.employee_name}</p>
                          <p className="text-sm text-gray-600">{req.employee_email}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                        Approved
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">From:</span>
                        <span className="ml-2 font-medium">{new Date(req.start_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">To:</span>
                        <span className="ml-2 font-medium">{new Date(req.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : view === "earnings" ? (
        <div className="space-y-4">
          {/* Earnings Header */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign size={18} className="text-green-600" />
                  Monthly Earnings
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {user?.full_name || user?.email} • {monthNames[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); fetchEarnings(); }}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(parseInt(e.target.value)); fetchEarnings(); }}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingEarnings ? (
              <div className="text-center py-12 text-gray-400">
                <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                <p>Loading earnings...</p>
              </div>
            ) : earningsData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Total Earnings</p>
                    <p className="text-3xl font-bold text-green-700 mt-1">
                      ${earningsData.total_earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Jobs Completed</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">{earningsData.job_count}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">Avg per Job</p>
                    <p className="text-3xl font-bold text-purple-700 mt-1">
                      ${earningsData.job_count > 0 ? (earningsData.total_earnings / earningsData.job_count).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </p>
                  </div>
                </div>

                {/* Earnings Breakdown */}
                <h3 className="font-semibold text-gray-800 mb-3">Job Breakdown</h3>
                {earningsData.earnings_breakdown.length === 0 ? (
                  <p className="text-gray-400 text-sm">No completed jobs for this month</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Booking #</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Job Value</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Your Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earningsData.earnings_breakdown.map((job, idx) => (
                          <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700">{job.booking_number || 'N/A'}</td>
                            <td className="px-4 py-3 text-gray-700">{new Date(job.move_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-700">{job.customer}</td>
                            <td className="px-4 py-3 text-right text-gray-700">${job.total_job_value.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-semibold text-green-700">
                              ${job.mover_earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-red-500">
                <AlertCircle size={32} className="mx-auto mb-2" />
                <p>Error loading earnings. Please try again.</p>
                <button
                  onClick={fetchEarnings}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      ) : view === "ai-scheduler" ? (
        <div className="space-y-4">
          {/* AI Scheduler */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-600" />
                  AI-Powered Mover Scheduling
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Automatically assign movers to jobs based on availability, performance, and proximity
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={schedulerDate}
                  onChange={(e) => setSchedulerDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAiSchedule}
                  disabled={scheduling}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-all"
                >
                  {scheduling ? (
                    <><Loader2 size={16} className="animate-spin" /> Optimizing...</>
                  ) : (
                    <><Sparkles size={16} /> Run AI Scheduler</>
                  )}
                </button>
              </div>
            </div>

            {scheduling && (
              <div className="text-center py-16">
                <div className="relative inline-block">
                  <Loader2 size={48} className="animate-spin text-purple-600" />
                  <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-400" />
                </div>
                <p className="text-gray-600 font-medium mt-4">Analyzing bookings and mover availability...</p>
                <p className="text-gray-400 text-sm mt-1">AI is optimizing assignments based on performance and proximity</p>
              </div>
            )}

            {scheduleResult && !scheduling && (
              <div className="space-y-4">
                {scheduleResult.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Scheduling Failed</p>
                      <p className="text-sm text-red-600 mt-1">{scheduleResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Bookings</p>
                        <p className="text-2xl font-bold text-blue-700 mt-1">{scheduleResult.total_bookings}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Assigned</p>
                        <p className="text-2xl font-bold text-green-700 mt-1">{scheduleResult.assigned_bookings}</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium">Available Movers</p>
                        <p className="text-2xl font-bold text-purple-700 mt-1">{scheduleResult.available_movers_count}</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">Unavailable</p>
                        <p className="text-2xl font-bold text-orange-700 mt-1">{scheduleResult.unavailable_movers_count}</p>
                      </div>
                    </div>

                    {/* Assignments */}
                    {scheduleResult.assignments && scheduleResult.assignments.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Users size={18} /> AI Assignments
                        </h3>
                        <div className="space-y-3">
                          {scheduleResult.assignments.map((assignment, idx) => (
                            <div key={idx} className={`border rounded-lg p-4 ${
                              assignment.status === 'assigned' 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-red-200 bg-red-50'
                            }`}>
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {assignment.booking_number || assignment.booking_id?.slice(0, 8)}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Truck: {assignment.truck_size || 'Not specified'}
                                  </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  assignment.status === 'assigned'
                                    ? 'bg-green-200 text-green-800'
                                    : 'bg-red-200 text-red-800'
                                }`}>
                                  {assignment.status === 'assigned' ? '✓ Assigned' : '✗ Failed'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Users size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-600 font-medium">
                                  {assignment.assigned_movers.length} mover{assignment.assigned_movers.length !== 1 ? 's' : ''} assigned:
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {assignment.assigned_movers.map((email, i) => (
                                  <span key={i} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-700">
                                    {email}
                                  </span>
                                ))}
                              </div>
                              {assignment.reasoning && (
                                <div className="bg-white/50 rounded p-2 mt-2">
                                  <p className="text-xs text-gray-500">
                                    <Sparkles size={10} className="inline mr-1 text-purple-500" />
                                    {assignment.reasoning}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {scheduleResult.assignments && scheduleResult.assignments.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <Truck size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No assignments made. All bookings may already be assigned or no pending bookings found.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!scheduleResult && !scheduling && (
              <div className="text-center py-16 text-gray-400">
                <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-gray-600 font-medium">Select a date and run the AI scheduler</p>
                <p className="text-gray-400 text-sm mt-1">AI will automatically assign optimal movers to each job</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={18} /> Request Time Off
              </h2>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Selected dates: {selectedDates.length > 0 ? (
                    <span className="font-medium">
                      {new Date(selectedDates[0]).toLocaleDateString()} to {new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">No dates selected</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">Click dates on the calendar to select your time off</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="e.g. Vacation, Medical appointment, Personal matters..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleRequestSubmit}
                disabled={submitMutation.isPending || selectedDates.length === 0}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}