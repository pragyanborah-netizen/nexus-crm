import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Truck, Clock, AlertCircle, CheckCircle, Calendar } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, sublabel, color }) => (
  <div className="bg-white rounded-lg shadow p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        {Icon && <Icon size={24} className="text-white" />}
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
    {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
  </div>
);

export default function NotificationMonitoring() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ['bookings-notifications', selectedDate],
    queryFn: async () => {
      const allBookings = await base44.entities.Booking.list();
      return allBookings.filter(b => b.move_date === selectedDate);
    },
  });

  const { data: truckLocations = [] } = useQuery({
    queryKey: ['truck-locations'],
    queryFn: () => base44.entities.TruckLocation.list('-last_update', 50),
  });

  const stats = {
    total: bookings.length,
    dispatched: bookings.filter(b => b.notification_dispatched_sent).length,
    nearby: bookings.filter(b => b.notification_nearby_sent).length,
    delivered: bookings.filter(b => b.notification_delivered_sent).length,
    pending: bookings.filter(b => !b.notification_dispatched_sent && b.status === 'Booked Job').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notification Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time tracking of automated customer notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            Refresh
          </button>
        </div>
      </div>

      {/* Automated Workflows Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Bell size={18} className="text-blue-600" />
          Automated Workflows
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Auto Milestone Notifications", type: "entity", active: true },
            { name: "Auto Delay Notifications", type: "scheduled", active: true },
          ].map((auto, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{auto.name}</p>
                <p className="text-xs text-gray-500 capitalize">{auto.type} automation</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                <span className="text-sm text-green-600 font-medium">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard icon={Calendar} label="Total Jobs Today" value={stats.total} color="bg-blue-500" />
        <StatCard icon={Truck} label="Dispatched" value={stats.dispatched}
          sublabel={`${stats.total > 0 ? Math.round((stats.dispatched / stats.total) * 100) : 0}% of jobs`} color="bg-purple-500" />
        <StatCard icon={Clock} label="Nearby Sent" value={stats.nearby} sublabel="15min ETA notifications" color="bg-yellow-500" />
        <StatCard icon={CheckCircle} label="Delivered" value={stats.delivered} sublabel="Completed moves" color="bg-green-500" />
        <StatCard icon={AlertCircle} label="Pending Dispatch" value={stats.pending} color="bg-orange-500" />
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Today's Bookings</h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Booking #</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Route</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Dispatched</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Nearby</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{booking.booking_number || booking.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{booking.customer_first_name} {booking.customer_last_name}</p>
                    <p className="text-xs text-gray-500">{booking.customer_mobile}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      <p className="text-gray-700">{booking.pickup_suburb}</p>
                      <p className="text-gray-400">↓</p>
                      <p className="text-gray-700">{booking.delivery_suburb}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'Booked Job' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{booking.status}</span>
                  </td>
                  {[
                    { sent: booking.notification_dispatched_sent, date: booking.notification_dispatched_date },
                    { sent: booking.notification_nearby_sent, date: booking.notification_nearby_date },
                    { sent: booking.notification_delivered_sent, date: booking.notification_delivered_date },
                  ].map((n, i) => (
                    <td key={i} className="px-6 py-4 text-center">
                      {n.sent ? (
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle size={16} className="text-green-500" />
                          <span className="text-xs text-gray-500">
                            {new Date(n.date).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bookings.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Bell size={40} className="mx-auto mb-3 opacity-50" />
            <p>No bookings for {new Date(selectedDate).toLocaleDateString('en-AU')}</p>
          </div>
        )}
      </div>

      {/* Recent Truck Activity */}
      {truckLocations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Truck size={18} className="text-blue-600" />
            Latest Truck Updates
          </h2>
          <div className="space-y-3">
            {truckLocations.slice(0, 5).map((location, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{location.truck_name}</p>
                    <p className="text-xs text-gray-500">{location.status} • {location.speed} km/h</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{new Date(location.last_update).toLocaleString('en-AU')}</p>
                  {location.booking_number && (
                    <p className="text-xs font-medium text-blue-600">Booking #{location.booking_number}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}