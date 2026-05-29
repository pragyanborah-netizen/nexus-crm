import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

// Color coding rules (checked in order — first match wins)
const JOB_TYPES = [
  { id: "packing",  label: "Packing",   dot: "bg-yellow-400",  pill: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { id: "5T",       label: "5T Truck",  dot: "bg-orange-500",  pill: "bg-orange-100 text-orange-800 border-orange-300" },
  { id: "6T",       label: "6T Truck",  dot: "bg-green-500",   pill: "bg-green-100 text-green-800 border-green-300" },
  { id: "10T",      label: "10T Truck", dot: "bg-blue-500",    pill: "bg-blue-100 text-blue-800 border-blue-300" },
  { id: "12T",      label: "12T Truck", dot: "bg-gray-800",    pill: "bg-gray-800 text-white border-gray-700" },
];

function getJobType(booking) {
  const isPacking =
    booking.service_type === "Packing" ||
    (booking.selected_services || []).includes("Packing");
  if (isPacking) return JOB_TYPES[0];
  const size = (booking.truck_size || "").toUpperCase();
  if (size.includes("5T")) return JOB_TYPES[1];
  if (size.includes("6T")) return JOB_TYPES[2];
  if (size.includes("10T")) return JOB_TYPES[3];
  if (size.includes("12T")) return JOB_TYPES[4];
  return { id: "other", label: "Other", dot: "bg-gray-300", pill: "bg-gray-100 text-gray-600 border-gray-200" };
}

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Calendars() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState("all");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings-calendar"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const filtered = filter === "all"
    ? bookings
    : bookings.filter(b => getJobType(b).id === filter);

  const byDate = {};
  filtered.forEach(b => {
    if (!b.move_date) return;
    if (!byDate[b.move_date]) byDate[b.move_date] = [];
    byDate[b.move_date].push(b);
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const todayStr = today.toISOString().split("T")[0];

  return (
    <div>
      <div className="mb-6">
        <nav className="text-xs text-gray-400 mb-1">Home › Calendars</nav>
        <h1 className="text-2xl font-bold text-gray-800">Calendars</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
            filter === "all" ? "bg-gray-800 text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          All Jobs
        </button>
        {JOB_TYPES.map(jt => (
          <button
            key={jt.id}
            onClick={() => setFilter(jt.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              filter === jt.id ? "bg-gray-700 text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span className={`w-3 h-3 rounded-full ${jt.dot}`} />
            {jt.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
          <h2 className="text-lg font-bold text-gray-800">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 border-b">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="border-b border-r border-gray-100 min-h-24 bg-gray-50/50" />;
              const dateStr = toDateStr(year, month, day);
              const dayBookings = byDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={dateStr}
                  className={`border-b border-r border-gray-100 min-h-24 p-1.5 ${isToday ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <div className={`text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-blue-600 text-white" : "text-gray-700"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map(b => {
                      const jt = getJobType(b);
                      return (
                        <Link
                          key={b.id}
                          to={`/bookings/${b.id}/edit`}
                          className={`block text-xs px-1.5 py-0.5 rounded border truncate ${jt.pill} hover:opacity-80`}
                          title={`${b.customer_first_name} ${b.customer_last_name} — ${jt.label}`}
                        >
                          {b.customer_first_name} {b.customer_last_name}
                        </Link>
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <p className="text-xs text-gray-400 px-1">+{dayBookings.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
        {JOB_TYPES.map(jt => (
          <div key={jt.id} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${jt.dot}`} />
            <span>{jt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}