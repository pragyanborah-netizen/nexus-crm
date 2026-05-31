import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, Plus, Truck, AlertTriangle, CheckCircle, Edit2, Trash2, X, Search, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  Available: "bg-green-100 text-green-700",
  "On Truck": "bg-blue-100 text-blue-700",
  Missing: "bg-red-100 text-red-700",
  "Under Repair": "bg-yellow-100 text-yellow-700",
  Retired: "bg-gray-100 text-gray-500",
};

const CATEGORIES = ["Dolly", "Blanket", "Toolkit", "Straps & Ropes", "Trolley", "Ramp", "Packing Tape Gun", "Other"];
const STATUSES = ["Available", "On Truck", "Missing", "Under Repair", "Retired"];
const CONDITIONS = ["Good", "Fair", "Poor"];

const EMPTY_FORM = {
  name: "", category: "Other", asset_code: "", quantity: 1,
  assigned_truck: "", status: "Available", condition: "Good",
  last_checked_date: format(new Date(), "yyyy-MM-dd"), last_checked_by: "", notes: "",
};

export default function AssetTracking() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterTruck, setFilterTruck] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [returnTruck, setReturnTruck] = useState(null); // truck name for return check modal

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.list(),
  });
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editAsset
      ? base44.entities.Asset.update(editAsset.id, data)
      : base44.entities.Asset.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Asset.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  const markMissingMutation = useMutation({
    mutationFn: (id) => base44.entities.Asset.update(id, { status: "Missing", assigned_truck: "" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, condition }) => base44.entities.Asset.update(id, {
      status: "Available", assigned_truck: "",
      last_checked_date: format(new Date(), "yyyy-MM-dd"), condition,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  const openCreate = () => { setEditAsset(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (a) => { setEditAsset(a); setForm({ ...EMPTY_FORM, ...a }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditAsset(null); };

  const truckNames = trucks.map(t => t.name);
  const assignedTruckNames = [...new Set(assets.filter(a => a.assigned_truck).map(a => a.assigned_truck))];
  const allTruckNames = [...new Set([...truckNames, ...assignedTruckNames])].sort();

  const filtered = assets.filter(a => {
    const matchSearch = a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || a.status === filterStatus;
    const matchTruck = filterTruck === "All" ||
      (filterTruck === "Unassigned" ? !a.assigned_truck : a.assigned_truck === filterTruck);
    return matchSearch && matchStatus && matchTruck;
  });

  // Summary stats
  const onTruckCount = assets.filter(a => a.status === "On Truck").length;
  const missingCount = assets.filter(a => a.status === "Missing").length;
  const availableCount = assets.filter(a => a.status === "Available").length;
  const totalCount = assets.length;

  // Group by truck for dashboard
  const byTruck = allTruckNames.reduce((acc, truck) => {
    acc[truck] = assets.filter(a => a.assigned_truck === truck);
    return acc;
  }, {});

  // Return check modal items
  const returnItems = returnTruck ? assets.filter(a => a.assigned_truck === returnTruck) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Asset Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track equipment assigned to trucks — flag missing items on return</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus size={15} /> Add Asset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: totalCount, color: "bg-slate-700", icon: Package },
          { label: "On Trucks", value: onTruckCount, color: "bg-blue-600", icon: Truck },
          { label: "Available", value: availableCount, color: "bg-green-600", icon: CheckCircle },
          { label: "Missing", value: missingCount, color: "bg-red-600", icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className={`${color} p-3 rounded-lg`}><Icon size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* By-Truck Dashboard */}
      {allTruckNames.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Truck size={17} className="text-blue-600" /> Equipment by Truck
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTruckNames.map(truck => {
              const items = byTruck[truck] || [];
              const hasMissing = items.some(a => a.status === "Missing");
              return (
                <div key={truck} className={`rounded-xl border-2 p-4 ${hasMissing ? "border-red-400 bg-red-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <Truck size={14} className="text-blue-600" /> {truck}
                    </p>
                    <div className="flex items-center gap-2">
                      {hasMissing && <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Missing</span>}
                      <button
                        onClick={() => setReturnTruck(truck)}
                        className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded-md font-medium flex items-center gap-1"
                      >
                        <ClipboardList size={11} /> Return Check
                      </button>
                    </div>
                  </div>
                  {items.length === 0
                    ? <p className="text-xs text-gray-400 italic">No items assigned</p>
                    : (
                      <div className="space-y-1">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{item.name} {item.quantity > 1 ? `×${item.quantity}` : ""}</span>
                            <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600"}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterTruck} onChange={e => setFilterTruck(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
            <option value="All">All Trucks</option>
            <option value="Unassigned">Unassigned</option>
            {allTruckNames.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Asset", "Category", "Code", "Qty", "Truck", "Status", "Condition", "Last Checked", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No assets found. Add your first item above.</td></tr>
              )}
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.category}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{a.asset_code || "—"}</td>
                  <td className="px-4 py-3 text-center">{a.quantity || 1}</td>
                  <td className="px-4 py-3 text-gray-600">{a.assigned_truck || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.condition || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.last_checked_date || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Edit2 size={13} /></button>
                      <button onClick={() => { if (confirm("Delete this asset?")) deleteMutation.mutate(a.id); }} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-800">{editAsset ? "Edit Asset" : "Add New Asset"}</h3>
              <button onClick={closeForm} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Asset Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Asset Code / Serial</label>
                  <input value={form.asset_code} onChange={e => setForm(p => ({ ...p, asset_code: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                  <input type="number" min={1} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: +e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Truck</label>
                  <select value={form.assigned_truck} onChange={e => setForm(p => ({ ...p, assigned_truck: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">— Unassigned —</option>
                    {allTruckNames.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Condition</label>
                  <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Last Checked Date</label>
                  <input type="date" value={form.last_checked_date} onChange={e => setForm(p => ({ ...p, last_checked_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Last Checked By</label>
                  <input value={form.last_checked_by} onChange={e => setForm(p => ({ ...p, last_checked_by: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold">
                {saveMutation.isPending ? "Saving..." : "Save Asset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Check Modal */}
      {returnTruck && (
        <ReturnCheckModal
          truck={returnTruck}
          items={returnItems}
          onClose={() => setReturnTruck(null)}
          onMarkMissing={(id) => markMissingMutation.mutate(id)}
          onReturn={(id, condition) => returnMutation.mutate({ id, condition })}
        />
      )}
    </div>
  );
}

function ReturnCheckModal({ truck, items, onClose, onMarkMissing, onReturn }) {
  const [conditions, setConditions] = useState(() =>
    Object.fromEntries(items.map(i => [i.id, i.condition || "Good"]))
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardList size={17} className="text-orange-600" /> Return Check — {truck}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Mark each item as returned or flag as missing</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No items assigned to this truck.</p>}
          {items.map(item => (
            <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.status === "Missing" ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{item.name} {item.quantity > 1 ? `×${item.quantity}` : ""}</p>
                <p className="text-xs text-gray-500">{item.category}</p>
              </div>
              {item.status !== "Missing" && (
                <select value={conditions[item.id] || "Good"}
                  onChange={e => setConditions(p => ({ ...p, [item.id]: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400">
                  <option>Good</option><option>Fair</option><option>Poor</option>
                </select>
              )}
              {item.status === "Missing"
                ? <span className="text-xs font-semibold text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Missing</span>
                : (
                  <div className="flex gap-2">
                    <button onClick={() => onReturn(item.id, conditions[item.id] || "Good")}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                      <CheckCircle size={12} /> Returned
                    </button>
                    <button onClick={() => { if (confirm(`Mark "${item.name}" as MISSING?`)) onMarkMissing(item.id); }}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                      <AlertTriangle size={12} /> Missing
                    </button>
                  </div>
                )
              }
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold">Done</button>
        </div>
      </div>
    </div>
  );
}