import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, X, Save, Users, Search } from "lucide-react";

const ROLES = ["Mover", "Driver", "Packer", "Supervisor", "Admin"];
const EMP_TYPES = ["Full-time", "Part-time", "Casual"];

const emptyForm = {
  first_name: "", last_name: "", email: "", mobile: "",
  role: "Mover", employment_type: "Casual", pay_rate: "",
  bank_account_name: "", bank_bsb: "", bank_account_number: "",
  tax_file_number: "", start_date: "", active: true, notes: "",
};

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

function EmployeeModal({ employee, onClose, onSave, saving }) {
  const [form, setForm] = useState(employee || emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800 text-lg">{employee?.id ? "Edit Employee" : "Add Employee"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Personal */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Personal Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                <input className={inputClass} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="First name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name *</label>
                <input className={inputClass} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Last name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input className={inputClass} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
                <input className={inputClass} value={form.mobile} onChange={e => set("mobile", e.target.value)} placeholder="04xx xxx xxx" />
              </div>
            </div>
          </div>

          {/* Employment */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Employment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select className={inputClass} value={form.role} onChange={e => set("role", e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Employment Type</label>
                <select className={inputClass} value={form.employment_type} onChange={e => set("employment_type", e.target.value)}>
                  {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Pay Rate ($/hr)</label>
                <input className={inputClass} type="number" min="0" step="0.01" value={form.pay_rate} onChange={e => set("pay_rate", e.target.value)} placeholder="e.g. 30.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                <input className={inputClass} type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tax File Number</label>
                <input className={inputClass} value={form.tax_file_number} onChange={e => set("tax_file_number", e.target.value)} placeholder="TFN" />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="active" checked={!!form.active} onChange={e => set("active", e.target.checked)} className="w-4 h-4" />
                <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">Currently Active</label>
              </div>
            </div>
          </div>

          {/* Banking */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Bank Details (for payroll)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Account Name</label>
                <input className={inputClass} value={form.bank_account_name} onChange={e => set("bank_account_name", e.target.value)} placeholder="Name on bank account" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">BSB</label>
                <input className={inputClass} value={form.bank_bsb} onChange={e => set("bank_bsb", e.target.value)} placeholder="000-000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Account Number</label>
                <input className={inputClass} value={form.bank_account_number} onChange={e => set("bank_account_number", e.target.value)} placeholder="Account number" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea className={inputClass} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.first_name || !form.last_name}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-semibold"
          >
            <Save size={15} /> {saving ? "Saving..." : "Save Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [modalEmployee, setModalEmployee] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.Employee.update(data.id, data)
      : base44.entities.Employee.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const filtered = employees.filter(e => {
    const name = `${e.first_name} ${e.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || e.role === filterRole;
    return matchSearch && matchRole;
  });

  const activeCount = employees.filter(e => e.active !== false).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
          <p className="text-gray-500 text-sm">{activeCount} active employee{activeCount !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setModalEmployee(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No employees found</p>
            <button onClick={() => { setModalEmployee(null); setShowModal(true); }}
              className="mt-3 text-blue-600 text-sm hover:underline">Add your first employee</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Pay Rate</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {emp.first_name?.[0]}{emp.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{emp.first_name} {emp.last_name}</p>
                        {emp.bank_account_number && <p className="text-xs text-gray-400">BSB {emp.bank_bsb} · {emp.bank_account_number}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{emp.role || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.employment_type || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{emp.pay_rate ? `$${emp.pay_rate}/hr` : "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <p>{emp.mobile || "—"}</p>
                    <p className="text-xs">{emp.email || ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${emp.active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {emp.active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setModalEmployee(emp); setShowModal(true); }}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm(`Delete ${emp.first_name} ${emp.last_name}?`)) deleteMutation.mutate(emp.id); }}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <EmployeeModal
          employee={modalEmployee}
          onClose={() => setShowModal(false)}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}