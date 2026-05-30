import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Link } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, addWeeks, subMonths, subWeeks,
  format, isSameMonth, isSameDay, isToday, parseISO,
} from "date-fns";

const STATUS_COLORS = {
  "Enquiry":          { bg: "bg-sky-100",    text: "text-sky-800",    dot: "bg-sky-500" },
  "Quoted":           { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  "Tentative Booking":{ bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" },
  "Booked Job":       { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-600" },
  "Completed":        { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400" },
  "Cancelled":        { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  "No Show":          { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
};

function statusStyle(status) {
  return STATUS_COLORS[status] || { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
}

function BookingChip({ booking, index, compact }) {
  const s = statusStyle(booking.status);
  return (
    <Draggable draggableId={booking.id} index={index}>
      {(provided, snapshot) => (
        <RouterLink
          to={`/bookings/${booking.id}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => { if (snapshot.isDragging) e.preventDefault(); }}
          className={`block rounded px-1.5 py-0.5 text-xs font-medium truncate select-none cursor-grab active:cursor-grabbing transition-shadow
            ${s.bg} ${s.text}
            ${snapshot.isDragging ? "shadow-lg ring-2 ring-blue-400 opacity-90" : "hover:brightness-95"}
            ${compact ? "text-[10px]" : ""}
          `}
          title={`${booking.customer_first_name} ${booking.customer_last_name} — ${booking.status}`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot} mr-1 mb-px`} />
          {booking.customer_first_name} {booking.customer_last_name}
          {booking.move_time && !compact ? ` · ${booking.move_time}` : ""}
        </RouterLink>
      )}
    </Draggable>
  );
}

function DayCell({ dateStr, bookings, isCurrentMonth = true, today }) {
  const date = parseISO(dateStr);
  const todayCell = isToday(date);
  return (
    <Droppable droppableId={dateStr}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`min-h-[90px] p-1 border border-gray-100 rounded-md flex flex-col gap-0.5 transition-colors
            ${!isCurrentMonth ? "bg-gray-50" : "bg-white"}
            ${snapshot.isDraggingOver ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300" : ""}
          `}
        >
          <span className={`text-xs font-semibold mb-0.5 self-start px-1 rounded-full
            ${todayCell ? "bg-blue-600 text-white px-1.5" : isCurrentMonth ? "text-gray-700" : "text-gray-300"}
          `}>
            {format(date, "d")}
          </span>
          {bookings.map((b, i) => (
            <BookingChip key={b.id} booking={b} index={i} compact />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default function Calendars() {
  const [view, setView] = useState("month");
  const [current, setCurrent] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, move_date }) => base44.entities.Booking.update(id, { move_date }),
    onMutate: async ({ id, move_date }) => {
      await queryClient.cancelQueries({ queryKey: ["bookings"] });
      const prev = queryClient.getQueryData(["bookings"]);
      queryClient.setQueryData(["bookings"], (old) =>
        old.map((b) => b.id === id ? { ...b, move_date } : b)
      );
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(["bookings"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const handleDragEnd = ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    updateBooking.mutate({ id: draggableId, move_date: destination.droppableId });
  };

  const bookingsByDate = (dateStr) =>
    bookings.filter((b) => b.move_date === dateStr);

  // ── Monthly view ────────────────────────────────────────────────────────
  const MonthView = () => {
    const monthStart = startOfMonth(current);
    const monthEnd   = endOfMonth(current);
    const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let d = gridStart;
    while (d <= gridEnd) {
      days.push(d);
      d = addDays(d, 1);
    }

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            return (
              <DayCell
                key={dateStr}
                dateStr={dateStr}
                bookings={bookingsByDate(dateStr)}
                isCurrentMonth={isSameMonth(day, current)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // ── Weekly view ──────────────────────────────────────────────────────────
  const WeekView = () => {
    const weekStart = startOfWeek(current, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDate(dateStr);
          const todayCell = isToday(day);
          return (
            <div key={dateStr} className="flex flex-col">
              <div className={`text-center py-2 mb-1 rounded-t-lg ${todayCell ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                <p className="text-xs font-semibold">{format(day, "EEE")}</p>
                <p className={`text-lg font-bold ${todayCell ? "text-white" : "text-gray-800"}`}>{format(day, "d")}</p>
                <p className="text-xs opacity-70">{format(day, "MMM")}</p>
              </div>
              <Droppable droppableId={dateStr}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[400px] p-1.5 rounded-b-lg border flex flex-col gap-1 transition-colors
                      ${snapshot.isDraggingOver ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300" : "bg-white border-gray-200"}
                    `}
                  >
                    {dayBookings.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-xs text-gray-300 text-center mt-4 italic">No bookings</p>
                    )}
                    {dayBookings.map((b, i) => (
                      <BookingChip key={b.id} booking={b} index={i} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    );
  };

  const navigatePrev = () => view === "month" ? setCurrent(subMonths(current, 1)) : setCurrent(subWeeks(current, 1));
  const navigateNext = () => view === "month" ? setCurrent(addMonths(current, 1)) : setCurrent(addWeeks(current, 1));
  const title = view === "month" ? format(current, "MMMM yyyy") : `${format(startOfWeek(current, { weekStartsOn: 1 }), "d MMM")} – ${format(endOfWeek(current, { weekStartsOn: 1 }), "d MMM yyyy")}`;

  // Stats bar
  const viewBookings = bookings.filter((b) => {
    if (!b.move_date) return false;
    if (view === "month") return isSameMonth(parseISO(b.move_date), current);
    const ws = startOfWeek(current, { weekStartsOn: 1 });
    const we = endOfWeek(current, { weekStartsOn: 1 });
    const d  = parseISO(b.move_date);
    return d >= ws && d <= we;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
          <p className="text-sm text-gray-500">Drag bookings between days to reschedule</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${view === "month" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
            >
              <LayoutGrid size={14} /> Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${view === "week" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
            >
              <CalendarDays size={14} /> Week
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Bookings", value: viewBookings.length, color: "text-blue-600" },
          { label: "Booked Jobs", value: viewBookings.filter(b => b.status === "Booked Job").length, color: "text-green-600" },
          { label: "Tentative", value: viewBookings.filter(b => b.status === "Tentative Booking").length, color: "text-yellow-600" },
          { label: "Enquiries / Quoted", value: viewBookings.filter(b => ["Enquiry","Quoted"].includes(b.status)).length, color: "text-purple-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg shadow px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-xl shadow p-4">
        {/* Nav bar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={navigatePrev} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <button onClick={() => setCurrent(new Date())} className="text-xs text-blue-600 hover:underline border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-50">Today</button>
          </div>
          <button onClick={navigateNext} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b border-gray-100">
          {Object.entries(STATUS_COLORS).map(([status, s]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {status}
            </div>
          ))}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          {view === "month" ? <MonthView /> : <WeekView />}
        </DragDropContext>
      </div>
    </div>
  );
}