import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, ChevronLeft, ChevronRight, X, Check, Clock, AlertCircle, User } from "lucide-react";

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
  const [view, setView] = useState("calendar"); // "calendar" or "requests"

  const { data: availability = [] } = useQuery({
    queryKey: ["mover-availability"],
    queryFn: () => base44.entities.MoverAvailability.list("-requested_date"),
  });

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
    return availability.some(req => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      return checkDate >= start && checkDate <= end && req.status === 'Approved';
    });
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
            onClick={() => setView(view === "calendar" ? "requests" : "calendar")}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            {view === "calendar" ? "View Requests" : "View Calendar"}
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
              
              return (
                <div
                  key={day}
                  onClick={() => toggleDate(day)}
                  className={`h-24 border rounded p-2 cursor-pointer transition-all hover:shadow-md ${
                    selected
                      ? "bg-blue-100 border-blue-500"
                      : unavailable
                      ? "bg-red-50 border-red-300"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="text-sm font-semibold mb-1">{day}</div>
                  {unavailable && (
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={10} /> Unavailable
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
          <div className="flex gap-4 mt-6 pt-4 border-t">
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
          </div>
        </div>
      ) : (
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