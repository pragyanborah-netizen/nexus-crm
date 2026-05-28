import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { BookOpen, Users, Truck, TrendingUp, Plus, Calendar } from "lucide-react";

const statusColors = {
  New: "bg-blue-100 text-blue-700",
  Confirmed: "bg-green-100 text-green-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Completed: "bg-gray-100 text-gray-700",
  Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-orange-100 text-orange-700",
};

export default function Dashboard() {
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-created_date", 100),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const today = new Date().toISOString().split("T")[0];
  const todayBookings = bookings.filter((b) => b.move_date === today);
  const newBookings = bookings.filter((b) => b.status === "New");
  const confirmedBookings = bookings.filter((b) => b.status === "Confirmed");
  const recentBookings = bookings.slice(0, 8);

  const totalRevenue = bookings
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Link to="/bookings/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Add New Booking
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={BookOpen} label="Today's Bookings" value={todayBookings.length} color="bg-blue-600" />
        <StatCard icon={BookOpen} label="New Bookings" value={newBookings.length} color="bg-orange-500" />
        <StatCard icon={Users} label="Total Customers" value={customers.length} color="bg-green-600" />
        <StatCard icon={TrendingUp} label="Revenue (Completed)" value={`$${totalRevenue.toLocaleString()}`} color="bg-purple-600" />
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent Bookings</h2>
          <Link to="/bookings" className="text-blue-600 text-sm hover:underline">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Customer</th>
                <th className="text-left px-6 py-3 font-medium">Move Date</th>
                <th className="text-left px-6 py-3 font-medium">Service</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No bookings yet. <Link to="/bookings/new" className="text-blue-600 hover:underline">Add one now</Link></td></tr>
              )}
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link to={`/bookings/${b.id}`} className="text-blue-600 hover:underline font-medium">
                      {b.booking_number || b.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-6 py-3">{b.customer_first_name} {b.customer_last_name}</td>
                  <td className="px-6 py-3">{b.move_date || "—"}</td>
                  <td className="px-6 py-3">{b.service_type || "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || "bg-gray-100 text-gray-600"}`}>
                      {b.status || "New"}
                    </span>
                  </td>
                  <td className="px-6 py-3">{b.price ? `$${b.price}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}