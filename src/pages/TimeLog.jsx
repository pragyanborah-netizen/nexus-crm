import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Plus, Trash2, Edit, X, Save, Clock, Users, TrendingUp, Search } from "lucide-react";

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

const emptyForm = {
  employee_name: "",
  date: new Date().toISOString().split("T")[0],
  start_time: "",
  end_time: "",
  break_minutes: 0,
  hours_worked: "",
  booking_number: "",
  notes: "",
};

function calcHours(start, end, breakMin) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm) - (Number(breakMin) || 0);
  if (totalMin <= 0) return null;
  return Math.round((totalMin / 60) * 100) / 100;
}

export default function TimeLog() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["timelogs"],
    queryFn: () => base44.entities.TimeLog.list("-date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      modal?.id
        ? base44.entities.TimeLog.update(modal.id, data)
        : base44.entities.TimeLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timelogs"] });
      setModal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeLog.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timelogs"] }),
  });

  const set = (k, v) => {
    setForm((f) => {
      const updated = { ...f, [k]: v };
      // Auto-calculate hours when times change
      if (k === "start_time" || k === "end_time" || k === "break_minutes") {
        const calc = calcHours(updated.start_time, updated.end_time, updated.break_minutes);
        if (calc !== null) updated.hours_worked = calc;
      }
      return updated;
    });
  };

  const openAdd = () => { setForm(emptyForm); setModal("add"); };
  const openEdit = (log) => { setForm({ ...emptyForm, ...log }); setModal(log); };

  const handleSave = () => {
    const data = { ...form };
    if (!data.hours_worked) {
      const calc = calcHours(data.start_time, data.end_time, data.break_minutes);
      if (calc !== null) data.hours_worked = calc;
    }
    saveMutation.mutate(data);
  };

  const filtered = logs.filter((l) => {
    const matchSearch = !search || l.employee_name?.toLowerCase().includes(search.toLowerCase()) || (l.booking_number || "").includes(search);
    const matchDate = !dateFilter || l.date === dateFilter;
    return matchSearch && matchDate;
  });

  // Stats
  const totalHours = filtered.reduce((s, l) => s + (l.hours_worked || 0), 0);
  const uniqueEmployees = [...new Set(filtered.map((l) => l.employee_name).filter(Boolean))];
  const byEmployee = uniqueEmployees.map((name) => ({
    name,
    hours: filtered.filter((l) => l.employee_name === name).reduce((s, l) => s + (l.hours_worked || 0), 0),
    entries: filtered.filter((l) => l.employee_name === name).length,
  })).sort((a, b) => b.hours - a.hours);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home › Manual Time Log</nav>
          <h1 className="text-2xl font-bold text-gray-800">Manual Time Log</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} /> Log Hours
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-lg"><Clock size={20} className="text-white" /></div>
          <div>
            <p className="text-gray-400 text-xs">Total Hours (filtered)</p>
            <p className="text-2xl font-bold text-gray-800">{totalHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="bg-green-600 p-3 rounded-lg"><Users size={20} className="text-white" /></div>
          <div>
            <p className="text-gray-400 text-xs">Employees</p>
            <p className="text-2xl font-bold text-gray-800">{uniqueEmployees.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="bg-purple-600 p-3 rounded-lg"><TrendingUp size={20} className="text-white" /></div>
          <div>
            <p className="text-gray-400 text-xs">Log Entries</p>
            <p className="text-2xl font-bold text-gray-800">{filtered.length}</p>
          </div>
        </div>
      </div>

      {/* Employee Summary */}
      {byEmployee.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">Hours by Employee</h2>
          <div className="flex flex-wrap gap-3">
            {byEmployee.map((e) => (
              <div key={e.name} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {e.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.hours.toFixed(1)}h · {e.entries} entr{e.entries === 1 ? "y" : "ies"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or booking #..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter("")} className="text-xs text-gray-500 hover:text-red-500">Clear date</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Start</th>
                  <th className="text-left px-4 py-3 font-medium">End</th>
                  <th className="text-left px-4 py-3 font-medium">Break</th>
                  <th className="text-left px-4 py-3 font-medium">Hours</th>
                  <th className="text-left px-4 py-3 font-medium">Booking</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No entries found.</td></tr>
                )}
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{l.employee_name}</td>
                    <td className="px-4 py-3 text-gray-500">{l.date}</td>
                    <td className="px-4 py-3 text-gray-500">{l.start_time || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{l.end_time || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{l.break_minutes ? `${l.break_minutes}m` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-blue-700">{l.hours_worked ? `${Number(l.hours_worked).toFixed(1)}h` : "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{l.booking_number || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(l)} className="text-gray-400 hover:text-green-600"><Edit size={16} /></button>
                        <button onClick={() => { if (confirm("Delete this entry?")) deleteMutation.mutate(l.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t text-xs text-gray-400 flex justify-between">
          <span>{filtered.length} entries</span>
          {filtered.length > 0 && <span className="font-medium text-gray-600">Total: {totalHours.toFixed(1)} hours</span>}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">{modal?.id ? "Edit Entry" : "Log Hours"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Employee Name *</label>
                <input className={inputClass} value={form.employee_name} onChange={(e) => set("employee_name", e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date *</label>
                <input className={inputClass} type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Booking Reference</label>
                <input className={inputClass} value={form.booking_number} onChange={(e) => set("booking_number", e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                <input className={inputClass} type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                <input className={inputClass} type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Break (minutes)</label>
                <input className={inputClass} type="number" min="0" value={form.break_minutes} onChange={(e) => set("break_minutes", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hours Worked</label>
                <input
                  className={`${inputClass} bg-blue-50 font-semibold text-blue-700`}
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.hours_worked}
                  onChange={(e) => set("hours_worked", e.target.value)}
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="text-gray-500 text-sm px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50">
                <Save size={14} /> {saveMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}