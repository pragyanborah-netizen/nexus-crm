import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Plus, Search, Trash2, Edit, Eye, FileText, CalendarDays, Truck, Users, Clock, Mail } from "lucide-react";

const statusColors = {
  Enquiry: "bg-sky-100 text-sky-700",
  Quoted: "bg-purple-100 text-purple-700",
  "Tentative Booking": "bg-yellow-100 text-yellow-700",
  "Booked Job": "bg-green-100 text-green-700",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-orange-100 text-orange-700",
};

export default function Bookings() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sendingPriceList, setSendingPriceList] = useState(null);

  const handleSendPriceList = async (b) => {
    if (!b.customer_email) { alert('No email on file for this customer.'); return; }
    setSendingPriceList(b.id);
    await base44.functions.invoke('sendPackagingPriceList', {
      customer_email: b.customer_email,
      customer_first_name: b.customer_first_name || '',
    });
    setSendingPriceList(null);
    alert(`Packaging price list sent to ${b.customer_email}`);
  };
  const [statusFilter, setStatusFilter] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-created_date", 200),
  });

  const deleteBooking = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const filtered = bookings.filter((b) => {
    const name = `${b.customer_first_name} ${b.customer_last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (b.customer_email || "").includes(search.toLowerCase()) || (b.booking_number || "").includes(search);
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home &rsaquo; Bookings</nav>
          <h1 className="text-2xl font-bold text-gray-800">Bookings</h1>
        </div>
        <Link to="/bookings/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Add New Booking
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Link to="/bookings/new" className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md rounded-lg p-4 transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Plus size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">New Booking</p>
            <p className="text-xs text-gray-500">Create a booking</p>
          </div>
        </Link>
        <Link to="/calendars" className="bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md rounded-lg p-4 transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <CalendarDays size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Calendar</p>
            <p className="text-xs text-gray-500">View schedule</p>
          </div>
        </Link>
        <Link to="/diary" className="bg-white border border-gray-200 hover:border-green-300 hover:shadow-md rounded-lg p-4 transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <FileText size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Diary</p>
            <p className="text-xs text-gray-500">Daily schedule</p>
          </div>
        </Link>
        <Link to="/truck-tracking" className="bg-white border border-gray-200 hover:border-orange-300 hover:shadow-md rounded-lg p-4 transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Truck size={20} className="text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Truck Tracking</p>
            <p className="text-xs text-gray-500">Live fleet view</p>
          </div>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or booking #..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {["Enquiry", "Quoted", "Tentative Booking", "Booked Job", "Completed", "Cancelled", "No Show"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Booking #</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Mobile</th>
                  <th className="text-left px-4 py-3 font-medium">Move Date</th>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {bookings.length === 0 ? <span>No bookings yet. <Link to="/bookings/new" className="text-blue-600 hover:underline">Add your first booking</Link></span> : "No results match your search."}
                  </td></tr>
                )}
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">
                      <Link to={`/bookings/${b.id}`}>{b.booking_number || b.id.slice(0, 8).toUpperCase()}</Link>
                    </td>
                    <td className="px-4 py-3">{b.customer_first_name} {b.customer_last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{b.customer_mobile || "—"}</td>
                    <td className="px-4 py-3">{b.move_date || "—"}</td>
                    <td className="px-4 py-3">{b.service_type || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || "bg-gray-100"}`}>
                        {b.status || "New"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{b.price ? `$${Number(b.price).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/bookings/${b.id}`} title="View" className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded transition-colors"><Eye size={16} /></Link>
                        <Link to={`/bookings/${b.id}/edit`} title="Edit" className="text-gray-400 hover:text-green-600 p-1 hover:bg-green-50 rounded transition-colors"><Edit size={16} /></Link>
                        <Link to={`/booking/${b.id}/clock`} title="Clock In/Out" className="text-gray-400 hover:text-purple-600 p-1 hover:bg-purple-50 rounded transition-colors"><Clock size={16} /></Link>
                        {b.customer_email && (
                          <button onClick={() => handleSendPriceList(b)} title="Send Packaging Price List" disabled={sendingPriceList === b.id} className="text-gray-400 hover:text-teal-600 p-1 hover:bg-teal-50 rounded transition-colors disabled:opacity-50">
                            <Mail size={16} />
                          </button>
                        )}
                        <button onClick={() => { if (confirm("Delete this booking?")) deleteBooking.mutate(b.id); }} title="Delete" className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {bookings.length} bookings
        </div>
      </div>
    </div>
  );
}