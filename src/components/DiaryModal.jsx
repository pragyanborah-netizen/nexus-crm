import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, ChevronLeft, ChevronRight, Truck, Clock, MapPin, Users } from "lucide-react";

const statusColors = {
  New: "bg-blue-100 text-blue-700",
  Confirmed: "bg-green-100 text-green-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-orange-100 text-orange-700",
};

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function DiaryModal({ onClose, initialDate }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(initialDate || today);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings-diary-modal"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  const dayBookings = bookings.filter((b) => b.move_date === date);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Diary</h2>
            <p className="text-sm text-gray-500">{formatDate(date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(addDays(date, -1))} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
            />
            <button onClick={() => setDate(addDays(date, 1))} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setDate(today)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
              Today
            </button>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading && <p className="text-center text-gray-400 py-8">Loading...</p>}

          {!isLoading && dayBookings.length === 0 && (
            <div className="text-center py-12">
              <Truck size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No bookings for this day</p>
            </div>
          )}

          {dayBookings.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{dayBookings.length} job{dayBookings.length !== 1 ? "s" : ""} on this day</p>
              {dayBookings.map((b) => (
                <div key={b.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{b.customer_first_name} {b.customer_last_name}</p>
                      <p className="text-xs text-gray-400">{b.booking_number || b.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] || "bg-gray-100 text-gray-600"}`}>
                      {b.status || "New"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                    {b.move_time && <span className="flex items-center gap-1"><Clock size={11} />{b.move_time}</span>}
                    {b.truck_size && <span className="flex items-center gap-1"><Truck size={11} />{b.truck_size}</span>}
                    {b.num_movers && <span className="flex items-center gap-1"><Users size={11} />{b.num_movers} movers</span>}
                    {b.pickup_suburb && <span className="flex items-center gap-1"><MapPin size={11} />{b.pickup_suburb} → {b.delivery_suburb || "?"}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}