import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Plus, Search, Trash2, Edit, X, Save } from "lucide-react";

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";

const emptyForm = { first_name: "", last_name: "", email: "", mobile: "", phone: "", type: "Residential", address: "", suburb: "", notes: "" };

export default function CustomerManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "add" | customer obj
  const [form, setForm] = useState(emptyForm);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => modal?.id ? base44.entities.Customer.update(modal.id, data) : base44.entities.Customer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const openAdd = () => { setForm(emptyForm); setModal("add"); };
  const openEdit = (c) => { setForm({ ...emptyForm, ...c }); setModal(c); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.email || "").includes(q) || (c.mobile || "").includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home &rsaquo; Customer Management</nav>
          <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
        </div>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Mobile</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Suburb</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No customers found.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-gray-500">{c.email || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{c.mobile || "—"}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{c.type || "Residential"}</span></td>
                <td className="px-4 py-3 text-gray-500">{c.suburb || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-green-600"><Edit size={16} /></button>
                    <button onClick={() => { if (confirm("Delete customer?")) deleteMutation.mutate(c.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">{modal?.id ? "Edit Customer" : "Add Customer"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div><label className="text-xs text-gray-500 mb-1 block">First Name *</label><input className={inputClass} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Last Name *</label><input className={inputClass} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Email</label><input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Mobile</label><input className={inputClass} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Phone</label><input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select className={selectClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option>Residential</option><option>Commercial</option><option>Office</option>
                </select>
              </div>
              <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Address</label><input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Suburb</label><input className={inputClass} value={form.suburb} onChange={(e) => set("suburb", e.target.value)} /></div>
              <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Notes</label><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
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