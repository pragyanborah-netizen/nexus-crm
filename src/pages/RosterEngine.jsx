import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import {
  CalendarDays, Sparkles, AlertTriangle, Users, CheckCircle,
  ChevronDown, ChevronUp, Loader2, Info, Clock, Briefcase, Mail, MessageSquare
} from "lucide-react";

const today = new Date();

const WEEK_OPTIONS = [0, 1, 2, 3].map(offset => {
  const d = addWeeks(today, offset);
  const start = startOfWeek(d, { weekStartsOn: 1 });
  const end = endOfWeek(d, { weekStartsOn: 1 });
  return {
    label: offset === 0 ? "This Week" : offset === 1 ? "Next Week" : `+${offset} weeks`,
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
});

const SHIFT_COLORS = {
  "Assigned Job": "bg-blue-100 border-blue-300 text-blue-800",
  "Standby": "bg-yellow-50 border-yellow-300 text-yellow-800",
  "Day Off": "bg-gray-50 border-gray-200 text-gray-500",
};

const ROLE_COLORS = {
  Driver: "bg-purple-100 text-purple-700",
  Supervisor: "bg-orange-100 text-orange-700",
  Mover: "bg-blue-100 text-blue-700",
  Packer: "bg-green-100 text-green-700",
  Admin: "bg-gray-100 text-gray-700",
};

function AssignmentCard({ assignment }) {
  const [expanded, setExpanded] = useState(true);
  const style = SHIFT_COLORS[assignment.shift_type] || SHIFT_COLORS["Standby"];
  const dateLabel = new Date(assignment.date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "short"
  });

  return (
    <div className={`rounded-xl border ${style} overflow-hidden`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm font-bold">{dateLabel}</div>
          {assignment.booking_number && (
            <span className="text-xs bg-white/70 border border-current/20 px-2 py-0.5 rounded-full font-mono font-semibold">
              #{assignment.booking_number}
            </span>
          )}
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 border border-current/20">
            {assignment.shift_type}
          </span>
          {assignment.warnings?.length > 0 && (
            <AlertTriangle size={14} className="text-amber-600" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs opacity-70">{assignment.employees?.length || 0} staff</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-current/10 pt-3">
          {(!assignment.employees || assignment.employees.length === 0) && (
            <p className="text-xs italic opacity-60">No staff assigned</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assignment.employees?.map((emp, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/60 rounded-lg px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-bold border border-current/20 flex-shrink-0 mt-0.5">
                  {emp.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold">{emp.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[emp.role] || ROLE_COLORS.Mover}`}>
                      {emp.role}
                    </span>
                  </div>
                  {emp.note && <p className="text-xs opacity-70 mt-0.5">{emp.note}</p>}
                </div>
              </div>
            ))}
          </div>
          {assignment.warnings?.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RosterEngine() {
  const [selectedWeek, setSelectedWeek] = useState(WEEK_OPTIONS[1]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState("all");
  const [sendingConfirmations, setSendingConfirmations] = useState(false);
  const [confirmationsSent, setConfirmationsSent] = useState(false);

  const weekStart = useCustom ? customStart : selectedWeek.start;
  const weekEnd = useCustom ? customEnd : selectedWeek.end;

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-week", weekStart, weekEnd],
    queryFn: () => base44.entities.Booking.filter({}),
    select: data => data.filter(b => {
      const d = b.move_date || b.moving_date;
      return d && d >= weekStart && d <= weekEnd;
    }),
    enabled: !!weekStart && !!weekEnd,
  });

  const activeEmployees = employees.filter(e => e.active !== false);

  const handleGenerate = async () => {
    if (!weekStart || !weekEnd) return;
    setLoading(true);
    setError("");
    setRoster(null);
    const res = await base44.functions.invoke("generateRoster", {
      week_start: weekStart,
      week_end: weekEnd,
      notes,
    });
    setLoading(false);
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setRoster(res.data?.roster);
    }
  };

  const handleSendConfirmations = async () => {
    if (!roster?.assignments) return;
    setSendingConfirmations(true);
    try {
      const res = await base44.functions.invoke("sendRosterConfirmations", {
        assignments: roster.assignments.flatMap(a => 
          a.employees?.map(emp => ({
            employee_name: emp.name,
            employee_email: activeEmployees.find(e => `${e.first_name} ${e.last_name}` === emp.name)?.email,
            shift_type: a.shift_type,
            shift_date: a.date,
            booking_id: a.booking_id,
            booking_number: a.booking_number
          })) || []
        ),
        roster_period: { start: weekStart, end: weekEnd }
      });
      const d = res.data;
      const skippedMsg = d.skipped?.length > 0 ? `\n${d.skipped.length} skipped (no email): ${d.skipped.map(s => s.name).join(", ")}` : "";
      const failedMsg = d.failed?.length > 0 ? `\n${d.failed.length} failed: ${d.failed.map(f => `${f.name}: ${f.error}`).join(", ")}` : "";
      alert(`✓ Sent roster confirmations to ${d.sent} employee(s).${skippedMsg}${failedMsg}`);
      setConfirmationsSent(true);
    } catch (e) {
      alert("Error sending confirmations: " + e.message);
    }
    setSendingConfirmations(false);
  };

  const uniqueDates = roster
    ? [...new Set(roster.assignments?.map(a => a.date))].sort()
    : [];

  const filteredAssignments = roster?.assignments?.filter(a =>
    activeDay === "all" || a.date === activeDay
  ) || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles size={22} className="text-purple-600" /> AI Roster Engine
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate optimal weekly shift schedules using employee availability, roles, and performance data
        </p>
      </div>

      {/* Config panel */}
      <div className="bg-white rounded-xl shadow p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CalendarDays size={17} className="text-blue-600" /> Select Week
        </h2>

        <div className="flex flex-wrap gap-2">
          {WEEK_OPTIONS.map(w => (
            <button key={w.start}
              onClick={() => { setSelectedWeek(w); setUseCustom(false); }}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                !useCustom && selectedWeek.start === w.start
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-600"
              }`}>
              {w.label}
              <span className="ml-1 opacity-60 text-xs">
                {new Date(w.start + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </span>
            </button>
          ))}
          <button onClick={() => setUseCustom(true)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              useCustom ? "bg-purple-600 border-purple-600 text-white" : "border-gray-300 text-gray-600 hover:border-purple-400"
            }`}>
            Custom
          </button>
        </div>

        {useCustom && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            </div>
          </div>
        )}

        {/* Context summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <Users size={18} className="text-purple-600" />
            <div>
              <p className="text-xl font-bold text-purple-800">{activeEmployees.length}</p>
              <p className="text-xs text-purple-600">Active Employees</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <Briefcase size={18} className="text-blue-600" />
            <div>
              <p className="text-xl font-bold text-blue-800">{bookings.length}</p>
              <p className="text-xs text-blue-600">Bookings This Week</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <Clock size={18} className="text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-800">
                {weekStart ? new Date(weekStart + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
                {" – "}
                {weekEnd ? new Date(weekEnd + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
              </p>
              <p className="text-xs text-green-600">Selected Period</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Notes (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. John is on restricted duties, prioritise experienced staff for Wednesday office removal..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={loading || !weekStart || !weekEnd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Generating Roster...</>
              : <><Sparkles size={16} /> Generate AI Roster</>
            }
          </button>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Info size={12} />
            Considers availability, leave, roles and recent performance
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} />
            {error}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-purple-600 animate-pulse" />
          </div>
          <p className="font-semibold text-gray-700">Analysing your team data...</p>
          <p className="text-sm text-gray-400 mt-1">
            Reviewing {activeEmployees.length} employees, {bookings.length} bookings, availability and performance metrics
          </p>
        </div>
      )}

      {/* Results */}
      {roster && !loading && (
        <div className="space-y-5">
          {/* AI Summary */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">AI Roster — {roster.week}</p>
                <p className="text-sm text-white/90">{roster.summary}</p>
              </div>
            </div>
          </div>

          {/* Gaps warning */}
          {roster.staffing_gaps?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
              <p className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                <AlertTriangle size={15} /> Staffing Gaps Identified
              </p>
              {roster.staffing_gaps.map((g, i) => (
                <p key={i} className="text-sm text-amber-700 ml-5">{g}</p>
              ))}
            </div>
          )}

          {/* Day filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveDay("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeDay === "all" ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-600 hover:border-purple-400"
              }`}>
              All Days
            </button>
            {uniqueDates.map(date => (
              <button key={date}
                onClick={() => setActiveDay(date)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeDay === date ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-600 hover:border-purple-400"
                }`}>
                {new Date(date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
              </button>
            ))}
          </div>

          {/* Assignment cards */}
          <div className="space-y-3">
            {filteredAssignments.map((a, i) => (
              <AssignmentCard key={i} assignment={a} />
            ))}
            {filteredAssignments.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No assignments for this day.</div>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
              <p className="text-xl font-bold text-blue-700">
                {roster.assignments?.filter(a => a.shift_type === "Assigned Job").length || 0}
              </p>
              <p className="text-xs text-gray-500">Assigned Shifts</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
              <p className="text-xl font-bold text-yellow-600">
                {roster.assignments?.filter(a => a.shift_type === "Standby").length || 0}
              </p>
              <p className="text-xs text-gray-500">Standby Shifts</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
              <p className="text-xl font-bold text-red-600">
                {roster.staffing_gaps?.length || 0}
              </p>
              <p className="text-xs text-gray-500">Staffing Gaps</p>
            </div>
          </div>

          {/* AI Reasoning */}
          {roster.reasoning && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Info size={12} /> AI Reasoning
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">{roster.reasoning}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 border border-purple-300 text-purple-700 hover:bg-purple-50 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Sparkles size={14} /> Regenerate
            </button>
            <button
              onClick={handleSendConfirmations}
              disabled={sendingConfirmations || confirmationsSent}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {sendingConfirmations ? (
                <><Loader2 size={14} className="animate-spin" /> Sending...</>
              ) : confirmationsSent ? (
                <><CheckCircle size={14} /> Sent</>
              ) : (
                <><Mail size={14} /> Send Confirmations</>
              )}
            </button>
            <button
              onClick={() => {
                const text = JSON.stringify(roster, null, 2);
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
                a.download = `roster_${weekStart}.json`;
                a.click();
              }}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Export JSON
            </button>
          </div>
        </div>
      )}

      {!roster && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-purple-300" />
          </div>
          <p className="font-medium text-gray-500">Select a week and generate your AI roster</p>
          <p className="text-sm mt-1">
            The AI considers {activeEmployees.length} active employees, leave requests, roles and performance data
          </p>
        </div>
      )}
    </div>
  );
}