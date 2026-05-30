import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Calendar, Users, ChevronLeft, ChevronRight, Plus, X, Check, AlertCircle,
  Clock, MapPin, Truck, DollarSign, Star, Phone, Mail, Edit2, Save
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, isSameDay, parseISO } from "date-fns";

const STATUS_COLORS = {
  "Enquiry": "bg-sky-100 text-sky-700 border-sky-200",
  "Quoted": "bg-purple-100 text-purple-700 border-purple-200",
  "Tentative Booking": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Confirmed": "bg-blue-100 text-blue-700 border-blue-200",
  "Booked Job": "bg-green-100 text-green-700 border-green-200",
  "Completed": "bg-gray-100 text-gray-600 border-gray-200",
  "Cancelled": "bg-red-100 text-red-700 border-red-200",
  "No Show": "bg-orange-100 text-orange-700 border-orange-200",
};

export default function Scheduling() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedMovers, setSelectedMovers] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-scheduling"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  const { data: movers = [] } = useQuery({
    queryKey: ["movers-list"],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role !== 'admin');
    },
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks-list"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const { data: availability = [] } = useQuery({
    queryKey: ["mover-availability"],
    queryFn: () => base44.entities.MoverAvailability.list(),
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await base44.entities.Booking.update(id, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings-scheduling"] });
      setShowAssignmentModal(false);
      setSelectedBooking(null);
      setSelectedMovers([]);
      setSelectedTruck(null);
    },
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getBookingsForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(b => b.move_date === dateStr && 
      ["Confirmed", "Booked Job", "Tentative Booking"].includes(b.status));
  };

  const isMoverAvailable = (mover, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const unavailable = availability.some(req => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      const checkDate = new Date(dateStr);
      return checkDate >= start && checkDate <= end && req.status === "Approved";
    });
    return !unavailable;
  };

  const getAssignedMovers = (booking) => {
    const movers = [];
    if (booking.agent_booked) movers.push(booking.agent_booked);
    if (booking.agent_inquired) movers.push(booking.agent_inquired);
    if (booking.agent_quoted) movers.push(booking.agent_quoted);
    return [...new Set(movers)];
  };

  const handleAssignMovers = () => {
    if (!selectedBooking) return;
    
    const updateData = {
      agent_booked: selectedMovers[0] || null,
      agent_inquired: selectedMovers[1] || null,
      agent_quoted: selectedMovers[2] || null,
      truck_assigned: selectedTruck,
    };

    updateBookingMutation.mutate({ id: selectedBooking.id, data: updateData });
  };

  const openAssignmentModal = (booking) => {
    setSelectedBooking(booking);
    setSelectedMovers(getAssignedMovers(booking));
    setSelectedTruck(booking.truck_assigned || null);
    setShowAssignmentModal(true);
  };

  const getMoverAssignmentsCount = (moverName, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(b => {
      if (b.move_date !== dateStr) return false;
      const movers = getAssignedMovers(b);
      return movers.includes(moverName);
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mover Scheduling</h1>
          <p className="text-sm text-gray-500 mt-1">Assign movers to bookings and manage shifts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-800">
              {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM yyyy")}
            </p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {bookings.filter(b => 
                  b.move_date >= format(weekStart, "yyyy-MM-dd") &&
                  b.move_date <= format(weekEnd, "yyyy-MM-dd") &&
                  ["Confirmed", "Booked Job"].includes(b.status)
                ).length}
              </p>
              <p className="text-xs text-gray-500">Jobs This Week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{movers.length}</p>
              <p className="text-xs text-gray-500">Available Movers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {trucks.filter(t => t.status === "Available").length}
              </p>
              <p className="text-xs text-gray-500">Trucks Available</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
              <AlertCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {bookings.filter(b => 
                  b.move_date >= format(weekStart, "yyyy-MM-dd") &&
                  b.move_date <= format(weekEnd, "yyyy-MM-dd") &&
                  ["Confirmed", "Booked Job"].includes(b.status) &&
                  !b.agent_booked
                ).length}
              </p>
              <p className="text-xs text-gray-500">Unassigned Jobs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Calendar View */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Weekly Schedule</h2>
        </div>
        <div className="grid grid-cols-7 divide-x divide-gray-200">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayBookings = getBookingsForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div key={dateStr} className="min-h-[400px] p-2">
                <div className={`text-center py-2 mb-2 rounded ${
                  isToday ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  <p className="text-xs font-semibold">{format(day, "EEE")}</p>
                  <p className="text-lg font-bold">{format(day, "d")}</p>
                  <p className="text-xs opacity-70">{format(day, "MMM")}</p>
                </div>

                <div className="space-y-2">
                  {dayBookings.map((booking) => {
                    const assignedMovers = getAssignedMovers(booking);
                    const needsAssignment = assignedMovers.length === 0;

                    return (
                      <div
                        key={booking.id}
                        onClick={() => openAssignmentModal(booking)}
                        className={`p-2 rounded border cursor-pointer transition-all hover:shadow-md ${
                          STATUS_COLORS[booking.status]
                        } ${needsAssignment ? "ring-2 ring-red-400" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-semibold truncate">
                            {booking.customer_first_name} {booking.customer_last_name}
                          </p>
                          {needsAssignment && (
                            <AlertCircle size={12} className="text-red-500 flex-shrink-0 ml-1" />
                          )}
                        </div>
                        
                        {booking.move_time && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <Clock size={10} />
                            <span>{booking.move_time}</span>
                          </div>
                        )}

                        {assignedMovers.length > 0 ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Users size={10} className="text-gray-500" />
                            <span className="truncate">{assignedMovers.length} mover{assignedMovers.length !== 1 ? 's' : ''}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-red-600 font-medium">No movers assigned</p>
                        )}

                        {booking.truck_assigned && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                            <Truck size={10} />
                            <span>{booking.truck_assigned}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {dayBookings.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No jobs</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mover Availability Grid */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          Mover Availability & Assignments
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mover</th>
                {weekDays.map((day) => (
                  <th key={format(day, "yyyy-MM-dd")} className="text-center px-2 py-3 font-medium text-gray-600">
                    <div className="text-xs">{format(day, "EEE")}</div>
                    <div className="font-bold">{format(day, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movers.map((mover) => (
                <tr key={mover.email} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-800">{mover.full_name || mover.email}</p>
                      <p className="text-xs text-gray-500">{mover.email}</p>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const available = isMoverAvailable(mover, day);
                    const assignmentCount = getMoverAssignmentsCount(mover.full_name || mover.email, day);
                    const isUnavailable = !available;

                    return (
                      <td key={format(day, "yyyy-MM-dd")} className="text-center px-2 py-3">
                        {isUnavailable ? (
                          <div className="flex items-center justify-center gap-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            <X size={12} />
                            <span>Unavailable</span>
                          </div>
                        ) : assignmentCount > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                            <Check size={12} />
                            <span>{assignmentCount} job{assignmentCount !== 1 ? 's' : ''}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded px-2 py-1">
                            <span>Free</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Edit2 size={18} />
                Assign Movers & Truck
              </h2>
              <button onClick={() => setShowAssignmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Booking Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Customer:</span>
                    <p className="font-medium">{selectedBooking.customer_first_name} {selectedBooking.customer_last_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedBooking.status]}`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date & Time:</span>
                    <p className="font-medium">
                      {new Date(selectedBooking.move_date).toLocaleDateString()} {selectedBooking.move_time}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Movers Needed:</span>
                    <p className="font-medium">{selectedBooking.num_movers || 2}</p>
                  </div>
                  {selectedBooking.pickup_suburb && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Route:</span>
                      <p className="font-medium">{selectedBooking.pickup_suburb} → {selectedBooking.delivery_suburb}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mover Selection */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  Select Movers
                </h3>
                <div className="space-y-3">
                  {["Lead Mover", "Mover 2", "Mover 3"].map((role, idx) => (
                    <div key={role}>
                      <label className="block text-sm text-gray-600 mb-2">{role}</label>
                      <select
                        value={selectedMovers[idx] || ""}
                        onChange={(e) => {
                          const newMovers = [...selectedMovers];
                          newMovers[idx] = e.target.value;
                          setSelectedMovers(newMovers);
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select mover...</option>
                        {movers.map((mover) => {
                          const moverName = mover.full_name || mover.email;
                          const isAvailable = isMoverAvailable(mover, selectedBooking.move_date);
                          return (
                            <option 
                              key={mover.email} 
                              value={moverName}
                              disabled={!isAvailable}
                            >
                              {moverName} {!isAvailable ? "(Unavailable)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Truck Selection */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Truck size={18} className="text-purple-600" />
                  Assign Truck
                </h3>
                <select
                  value={selectedTruck || ""}
                  onChange={(e) => setSelectedTruck(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select truck...</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.name}>
                      {truck.name} - {truck.size} ({truck.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignMovers}
                disabled={updateBookingMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {updateBookingMutation.isPending ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}