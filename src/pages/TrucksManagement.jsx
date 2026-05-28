import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Plus, Trash2, Edit, X, Save, Truck } from "lucide-react";

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";
const emptyForm = { name: "", size: "", status: "Available", notes: "" };

const statusColors = { Available: "bg-green-100 text-green-700", "In Use": "bg-yellow-100 text-yellow-700", Maintenance: "bg-red-100 text-red-700" };

export default function TrucksManagement() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => modal?.id ? base44.entities.Truck.update(modal.id, data) : base44.entities.Truck.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["trucks"] }); setModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Truck.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trucks"] }),
  });

  const openAdd = () => { setForm(emptyForm); setModal("add"); };
  const openEdit = (t) => { setForm({ ...emptyForm, ...t }); setModal(t); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home &rsaquo; Trucks Management</nav>
          <h1 className="text-2xl font-bold text-gray-800">Trucks Management</h1>
        </div>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Add Truck
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <p className="text-gray-400 col-span-3">Loading...</p>}
        {!isLoading && trucks.length === 0 && (
          <div className="col-span-3 bg-white rounded-lg shadow p-8 text-center text-gray-400">
            No trucks added yet. <button onClick={openAdd} className="text-blue-600 hover:underline">Add your first truck</button>
          </div>
        )}
        {trucks.map((t) => (
          <div key={t.id} className="bg-white rounded-lg shadow p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg"><Truck size={20} className="text-blue-600" /></div>
                <div>
                  <p className="font-semibold text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.size || "—"}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[t.status] || "bg-gray-100 text-gray-600"}`}>{t.status}</span>
            </div>
            {t.notes && <p className="text-sm text-gray-500 mb-3">{t.notes}</p>}
            <div className="flex items-center gap-2 border-t pt-3">
              <button onClick={() => openEdit(t)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Edit size={12} /> Edit</button>
              <button onClick={() => { if (confirm("Delete this truck?")) deleteMutation.mutate(t.id); }} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={12} /> Delete</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">{modal?.id ? "Edit Truck" : "Add Truck"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Truck Name / Registration *</label><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Size</label>
                <select className={selectClass} value={form.size} onChange={(e) => set("size", e.target.value)}>
                  <option value="">-- Select Size --</option>
                  {["Small (4t)","Medium (8t)","Large (12t)","Extra Large (14t)"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option>Available</option><option>In Use</option><option>Maintenance</option>
                </select>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">Notes</label><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
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