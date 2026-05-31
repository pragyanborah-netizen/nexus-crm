import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Truck, MapPin, Check, Bell, Clock, User, Phone, Mail, Calendar, Package, AlertTriangle, XCircle, Image } from "lucide-react";

const StatusBadge = ({ status }) => {
  const colors = {
    "Idle": "bg-gray-100 text-gray-600",
    "En Route to Pickup": "bg-blue-100 text-blue-700",
    "At Pickup": "bg-yellow-100 text-yellow-700",
    "En Route to Delivery": "bg-purple-100 text-purple-700",
    "At Delivery": "bg-orange-100 text-orange-700",
    "Completed": "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
};

const ConditionIcon = ({ condition }) => {
  if (condition === "Damaged") return <AlertTriangle size={12} className="text-orange-500" />;
  if (condition === "Missing") return <XCircle size={12} className="text-red-500" />;
  return <Check size={12} className="text-green-500" />;
};

const BookingCard = ({ booking, truckLocation }) => {
  const [sendingMilestone, setSendingMilestone] = useState(null);
  const [showInventory, setShowInventory] = useState(false);

  const { data: inventoryCheck } = useQuery({
    queryKey: ["inv-check", booking.id],
    queryFn: async () => {
      const results = await base44.entities.DriverInventoryCheck.filter({ booking_id: booking.id });
      return results[0] || null;
    },
  });

  const handleSendMilestone = async (milestone) => {
    setSendingMilestone(milestone);
    try {
      await base44.functions.invoke('triggerMilestoneNotification', {
        booking_id: booking.id,
        milestone,
      });
      alert(`✓ ${milestone} notification sent`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setSendingMilestone(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">{booking.booking_number}</h3>
            <p className="text-blue-100 text-sm">{booking.customer_first_name} {booking.customer_last_name}</p>
          </div>
          <StatusBadge status={truckLocation?.status || "Scheduled"} />
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <MapPin size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Pickup</p>
            <p className="text-sm font-medium text-gray-800">{booking.pickup_address}, {booking.pickup_suburb}</p>
            <p className="text-xs text-gray-500 mt-1">→</p>
            <p className="text-xs text-gray-500 mb-1">Delivery</p>
            <p className="text-sm font-medium text-gray-800">{booking.delivery_address}, {booking.delivery_suburb}</p>
          </div>
        </div>

        {truckLocation && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Truck size={20} className="text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{truckLocation.truck_name}</p>
                <p className="text-xs text-gray-500">Driver: {truckLocation.driver_name || "TBA"}</p>
              </div>
            </div>
            {truckLocation.last_update && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock size={12} />
                <span>Last update: {new Date(truckLocation.last_update).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-3">
            <Phone size={16} className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-sm font-medium text-gray-800">{booking.customer_mobile}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3">
            <Mail size={16} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-800 truncate">{booking.customer_email}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Bell size={16} className="text-blue-600" />
            Send Milestone Notification
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSendMilestone('dispatched')}
              disabled={sendingMilestone === 'dispatched' || booking.notification_dispatched_sent}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                booking.notification_dispatched_sent
                  ? 'border-green-300 bg-green-50 text-green-700 cursor-default'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } disabled:opacity-50`}
            >
              {sendingMilestone === 'dispatched' ? (
                <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              ) : booking.notification_dispatched_sent ? (
                <Check size={16} />
              ) : (
                <Truck size={16} />
              )}
              <span className="text-xs font-medium">Dispatched</span>
            </button>

            <button
              onClick={() => handleSendMilestone('nearby')}
              disabled={sendingMilestone === 'nearby' || booking.notification_nearby_sent}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                booking.notification_nearby_sent
                  ? 'border-green-300 bg-green-50 text-green-700 cursor-default'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } disabled:opacity-50`}
            >
              {sendingMilestone === 'nearby' ? (
                <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              ) : booking.notification_nearby_sent ? (
                <Check size={16} />
              ) : (
                <MapPin size={16} />
              )}
              <span className="text-xs font-medium">Nearby</span>
            </button>

            <button
              onClick={() => handleSendMilestone('delivered')}
              disabled={sendingMilestone === 'delivered' || booking.notification_delivered_sent}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                booking.notification_delivered_sent
                  ? 'border-green-300 bg-green-50 text-green-700 cursor-default'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } disabled:opacity-50`}
            >
              {sendingMilestone === 'delivered' ? (
                <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              ) : booking.notification_delivered_sent ? (
                <Check size={16} />
              ) : (
                <Check size={16} />
              )}
              <span className="text-xs font-medium">Delivered</span>
            </button>
          </div>
          {(booking.notification_dispatched_sent || booking.notification_nearby_sent || booking.notification_delivered_sent) && (
            <p className="text-xs text-gray-400 mt-2">
              ✓ Notifications sent: 
              {booking.notification_dispatched_sent && " Dispatched"}
              {booking.notification_nearby_sent && " Nearby"}
              {booking.notification_delivered_sent && " Delivered"}
            </p>
          )}
        </div>

        {(inventoryCheck?.items?.length > 0 || booking.items_to_move?.length > 0) && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowInventory(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Package size={15} className="text-blue-600" />
                Inventory
                {inventoryCheck && (
                  <span className="text-xs font-normal text-gray-400">· {inventoryCheck.status}</span>
                )}
              </p>
              <span className="text-xs text-blue-600">{showInventory ? "Hide" : "Show"}</span>
            </button>

            {showInventory && (
              <div className="mt-3 space-y-2">
                {(inventoryCheck?.items || booking.items_to_move?.map(name => ({ name, condition: "OK" })) || []).map((item, idx) => (
                  <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                    item.condition === "Damaged" ? "bg-orange-50" :
                    item.condition === "Missing" ? "bg-red-50" : "bg-gray-50"
                  }`}>
                    <ConditionIcon condition={item.condition || "OK"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium text-xs">{item.name}</p>
                      {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                    </div>
                    {item.photo_url && (
                      <a href={item.photo_url} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 w-10 h-10 rounded overflow-hidden border border-gray-200">
                        <img src={item.photo_url} alt="damage" className="w-full h-full object-cover" />
                      </a>
                    )}
                  </div>
                ))}
                {inventoryCheck?.driver_notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                    <span className="font-semibold">Driver notes:</span> {inventoryCheck.driver_notes}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="border-t pt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={12} /> Move Date
            </p>
            <p className="text-sm font-medium text-gray-800">{booking.move_date || "TBA"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Truck</p>
            <p className="text-sm font-medium text-gray-800">{booking.truck_assigned || booking.truck_size || "TBA"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AgentMoverPortal() {
  const { user, isLoadingAuth } = useAuth();
  const [filter, setFilter] = useState("all");

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["agent-bookings", user?.email],
    queryFn: async () => {
      const allBookings = await base44.entities.Booking.list();
      return allBookings.filter(b => 
        b.agent_booked === user?.full_name || 
        b.agent_inquired === user?.full_name ||
        b.agent_quoted === user?.full_name ||
        b.agent_pending === user?.full_name
      );
    },
    enabled: !!user,
  });

  const { data: truckLocations = [] } = useQuery({
    queryKey: ["truck-locations"],
    queryFn: () => base44.entities.TruckLocation.list(),
    enabled: !!user,
  });

  const filteredBookings = bookings.filter(booking => {
    if (filter === "active") return !["Completed", "Cancelled", "No Show"].includes(booking.status);
    if (filter === "completed") return booking.status === "Completed";
    return true;
  });

  const getTruckLocation = (booking) => {
    return truckLocations.find(tl => tl.booking_id === booking.id);
  };

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => !["Completed", "Cancelled", "No Show"].includes(b.status)).length,
    completed: bookings.filter(b => b.status === "Completed").length,
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Agent & Mover Portal</h1>
              <p className="text-sm text-gray-500 mt-1">Welcome, {user?.full_name} ({user?.role})</p>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              <p className="text-xs text-blue-600">Total Bookings</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
              <p className="text-xs text-green-600">Active Jobs</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{stats.completed}</p>
              <p className="text-xs text-purple-600">Completed</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "active"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "completed"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Completed ({stats.completed})
          </button>
        </div>

        {bookingsLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <User size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium">No bookings found</p>
            <p className="text-gray-400 text-sm mt-1">You don't have any bookings assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                truckLocation={getTruckLocation(booking)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}