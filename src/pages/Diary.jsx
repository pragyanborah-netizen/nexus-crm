import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Truck, MapPin, User, Phone, Clock, DollarSign, Users } from "lucide-react";

const statusColors = {
  Enquiry: "bg-sky-100 text-sky-700 border-sky-200",
  Quoted: "bg-purple-100 text-purple-700 border-purple-200",
  "Tentative Booking": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Booked Job": "bg-green-100 text-green-700 border-green-200",
  Completed: "bg-gray-100 text-gray-600 border-gray-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
  "No Show": "bg-orange-100 text-orange-700 border-orange-200",
};

const SECTIONS = [
  { key: "pack",  label: "Pack & Wrap",  color: "bg-yellow-500", match: b => (b.selected_services || []).includes("Packing") || b.service_type === "Packing" },
  { key: "5T",    label: "5T Truck",    color: "bg-orange-500", match: b => (b.truck_size || "") === "5T" },
  { key: "6T",    label: "6T Truck",    color: "bg-green-600",  match: b => (b.truck_size || "") === "6T" },
  { key: "10T",   label: "10T Truck",   color: "bg-blue-600",   match: b => (b.truck_size || "") === "10T" },
  { key: "12T",   label: "12T Truck",   color: "bg-gray-800",   match: b => (b.truck_size || "") === "12T" },
  { key: "unpack",label: "Unpack",      color: "bg-purple-600", match: b => (b.selected_services || []).includes("Unpacking") || b.service_type === "Unpacking" },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function toInputDate(dateStr) {
  return dateStr;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export default function Diary() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings-diary"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  const dayBookings = bookings.filter((b) => b.move_date === selectedDate);

  // Group by sections in defined order
  const grouped = {};
  SECTIONS.forEach(s => { grouped[s.key] = []; });
  dayBookings.forEach((b) => {
    const section = SECTIONS.find(s => s.match(b));
    if (section) grouped[section.key].push(b);
    // bookings that don't match any section are silently skipped
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home › Diary</nav>
          <h1 className="text-2xl font-bold text-gray-800">Diary</h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(selectedDate)}</p>
        </div>
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setSelectedDate(today)}
            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Today
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      )}

      {!isLoading && dayBookings.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center">
          <Truck size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No bookings for this day</p>
          <p className="text-gray-400 text-sm mt-1">Select another date or add a new booking</p>
        </div>
      )}

      {/* Summary bar */}
      {dayBookings.length > 0 && (
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="bg-blue-600 text-white rounded-xl px-5 py-3 text-center min-w-24">
            <p className="text-2xl font-bold">{dayBookings.length}</p>
            <p className="text-xs opacity-80">Total Jobs</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 text-center min-w-24 shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{SECTIONS.filter(s => (grouped[s.key] || []).length > 0).length}</p>
            <p className="text-xs text-gray-400">Active Groups</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 text-center min-w-24 shadow-sm">
            <p className="text-2xl font-bold text-green-600">
              ${dayBookings.reduce((s, b) => s + (b.price || 0), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Total Revenue</p>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const jobs = grouped[section.key] || [];
          return (
            <div key={section.key}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`${section.color} text-white rounded-lg px-4 py-2 flex items-center gap-2`}>
                  <Truck size={16} />
                  <span className="font-semibold text-sm">{section.label}</span>
                </div>
                <span className="text-gray-400 text-sm">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              {jobs.length === 0 ? (
                <p className="text-sm text-gray-400 pl-2">No jobs</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {jobs.map((b) => <BookingCard key={b.id} booking={b} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingCard({ booking: b }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800 text-sm">
            {b.customer_first_name} {b.customer_last_name}
          </p>
          <p className="text-xs text-gray-400">{b.booking_number || b.id?.slice(0, 8).toUpperCase()}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[b.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
          {b.status || "New"}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2">
        {b.move_time && (
          <InfoRow icon={Clock} label="Time" value={b.move_time} />
        )}
        {b.customer_mobile && (
          <InfoRow icon={Phone} label="Mobile" value={b.customer_mobile} />
        )}
        {b.pickup_address && (
          <InfoRow icon={MapPin} label="Pick up" value={`${b.pickup_address}${b.pickup_suburb ? ", " + b.pickup_suburb : ""}${b.pickup_state ? " " + b.pickup_state : ""}`} />
        )}
        {b.delivery_address && (
          <InfoRow icon={MapPin} label="Drop off" value={`${b.delivery_address}${b.delivery_suburb ? ", " + b.delivery_suburb : ""}${b.delivery_state ? " " + b.delivery_state : ""}`} iconClass="text-red-400" />
        )}
        {b.num_movers && (
          <InfoRow icon={Users} label="Movers" value={`${b.num_movers} Movers`} />
        )}
        {b.truck_assigned && (
          <InfoRow icon={Truck} label="Truck" value={b.truck_assigned} />
        )}
        {b.service_type && (
          <InfoRow icon={Truck} label="Service" value={b.service_type} />
        )}
      </div>

      {/* Card footer */}
      {(b.price || b.deposit) && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {b.price && (
            <div className="flex items-center gap-1 text-sm">
              <DollarSign size={13} className="text-gray-400" />
              <span className="font-semibold text-gray-700">${Number(b.price).toLocaleString()}</span>
            </div>
          )}
          {b.deposit && (
            <span className="text-xs text-gray-400">Deposit: ${Number(b.deposit).toLocaleString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, iconClass = "text-gray-400" }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={13} className={`mt-0.5 flex-shrink-0 ${iconClass}`} />
      <div className="min-w-0">
        <span className="text-gray-400 text-xs">{label}: </span>
        <span className="text-gray-700">{value}</span>
      </div>
    </div>
  );
}