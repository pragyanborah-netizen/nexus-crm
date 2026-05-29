import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Package, BoxIcon, Truck, PackageOpen } from "lucide-react";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { id: "Packaging Supplies", label: "Packaging Supplies", icon: Package, color: "bg-orange-500", light: "bg-orange-100 text-orange-800 border-orange-200" },
  { id: "Packing", label: "Packing", icon: BoxIcon, color: "bg-blue-500", light: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "Moving", label: "Moving", icon: Truck, color: "bg-green-500", light: "bg-green-100 text-green-800 border-green-200" },
  { id: "Unpacking", label: "Unpacking", icon: PackageOpen, color: "bg-purple-500", light: "bg-purple-100 text-purple-800 border-purple-200" },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Calendars() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [activeCategory, setActiveCategory] = useState("Packaging Supplies");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings-calendar"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const category = CATEGORIES.find(c => c.id === activeCategory);

  // Filter bookings by selected category (service_type OR selected_services includes it)
  const filtered = bookings.filter(b =>
    b.service_type === activeCategory ||
    (b.selected_services || []).includes(activeCategory)
  );

  // Group filtered bookings by date
  const byDate = {};
  filtered.forEach(b => {
    if (!b.move_date) return;
    if (!byDate[b.move_date]) byDate[b.move_date] = [];
    byDate[b.move_date].push(b);
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <nav className="text-xs text-gray-400 mb-1">Home › Calendars</nav>
        <h1 className="text-2xl font-bold text-gray-800">Calendars</h1>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          const count = bookings.filter(b =>
            b.service_type === cat.id || (b.selected_services || []).includes(cat.id)
          ).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                active
                  ? `${cat.color} text-white border-transparent shadow`
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <Icon size={15} />
              {cat.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/30 text-white" : "bg-gray-100 text-gray-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
          <h2 className="text-lg font-bold text-gray-800">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
          ))}
        </div>

        {/* Grid */}
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
                    {dayBookings.slice(0, 3).map(b => (
                      <Link
                        key={b.id}
                        to={`/bookings/${b.id}/edit`}
                        className={`block text-xs px-1.5 py-0.5 rounded border truncate ${category.light} hover:opacity-80`}
                        title={`${b.customer_first_name} ${b.customer_last_name}`}
                      >
                        {b.customer_first_name} {b.customer_last_name}
                      </Link>
                    ))}
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
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${cat.color}`} />
            <span>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}