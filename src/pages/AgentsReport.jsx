import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Plus, Trash2, Edit, X, Save } from "lucide-react";

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";
const emptyForm = { name: "", email: "", phone: "", role: "Sales", active: true };

export default function AgentsReport() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => base44.entities.Agent.list(),
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-created_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => modal?.id ? base44.entities.Agent.update(modal.id, data) : base44.entities.Agent.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agents"] }); setModal(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Agent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const openAdd = () => { setForm(emptyForm); setModal("add"); };
  const openEdit = (a) => { setForm({ ...emptyForm, ...a }); setModal(a); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const getAgentStats = (name) => {
    const quoted = bookings.filter((b) => b.agent_quoted === name).length;
    const booked = bookings.filter((b) => b.agent_booked === name).length;
    const revenue = bookings.filter((b) => b.agent_booked === name && b.status === "Completed").reduce((s, b) => s + (b.price || 0), 0);
    return { quoted, booked, revenue };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home &rsaquo; Agents Report</nav>
          <h1 className="text-2xl font-bold text-gray-800">Agents Report</h1>
        </div>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Add Agent
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Agent</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Quotes</th>
              <th className="text-left px-4 py-3 font-medium">Bookings</th>
              <th className="text-left px-4 py-3 font-medium">Revenue</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!isLoading && agents.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No agents yet. <button onClick={openAdd} className="text-blue-600 hover:underline">Add your first agent</button></td></tr>}
            {agents.map((a) => {
              const stats = getAgentStats(a.name);
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.role}</td>
                  <td className="px-4 py-3 text-gray-500">{a.email || "—"}</td>
                  <td className="px-4 py-3">{stats.quoted}</td>
                  <td className="px-4 py-3">{stats.booked}</td>
                  <td className="px-4 py-3">${stats.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {a.active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-green-600"><Edit size={16} /></button>
                      <button onClick={() => { if (confirm("Delete agent?")) deleteMutation.mutate(a.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">{modal?.id ? "Edit Agent" : "Add Agent"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Name *</label><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Email</label><input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Phone</label><input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Role</label>
                <select className={selectClass} value={form.role} onChange={(e) => set("role", e.target.value)}>
                  <option>Sales</option><option>Admin</option><option>Manager</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-600">Active</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="text-gray-500 text-sm px-4 py-2 border rounded">Cancel</button>
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50">
                <Save size={14} /> {saveMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}