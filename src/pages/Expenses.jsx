import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus, X, Save, Search, Receipt, CheckCircle, XCircle,
  Upload, DollarSign, Filter, Eye, Pencil, Trash2, Clock
} from "lucide-react";

const CATEGORIES = ["Fuel", "Tolls", "Parking", "Meals", "Equipment", "Uniform", "Training", "Other"];

const STATUS_STYLES = {
  Pending:  "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Paid:     "bg-blue-100 text-blue-700",
};

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

function ExpenseModal({ expense, employees, onClose, onSave, saving }) {
  const isNew = !expense?.id;
  const [form, setForm] = useState(expense || {
    employee_name: "", employee_email: "", date: new Date().toISOString().split("T")[0],
    category: "Other", amount: "", description: "", receipt_url: "", booking_number: "",
    status: "Pending", admin_notes: "", payroll_period: "",
  });
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEmployeeChange = (name) => {
    const emp = employees.find(e => `${e.first_name} ${e.last_name}` === name);
    setForm(f => ({ ...f, employee_name: name, employee_email: emp?.email || "" }));
  };

  const handleReceiptUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("receipt_url", file_url);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800 text-lg">{isNew ? "Log Expense" : "Edit Expense"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Employee *</label>
            <select className={inputClass} value={form.employee_name} onChange={e => handleEmployeeChange(e.target.value)}>
              <option value="">Select employee...</option>
              {employees.map(e => (
                <option key={e.id} value={`${e.first_name} ${e.last_name}`}>
                  {e.first_name} {e.last_name} — {e.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
              <input className={inputClass} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Amount ($) *</label>
              <input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
              <select className={inputClass} value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Booking # (optional)</label>
              <input className={inputClass} value={form.booking_number} onChange={e => set("booking_number", e.target.value)} placeholder="e.g. BK-001" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea className={inputClass} rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the expense..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Receipt</label>
            {form.receipt_url ? (
              <div className="flex items-center gap-2">
                <a href={form.receipt_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 text-sm hover:underline">
                  <Eye size={14} /> View Receipt
                </a>
                <button onClick={() => set("receipt_url", "")} className="text-red-400 text-xs hover:underline ml-2">Remove</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-blue-400 transition-colors">
                <Upload size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500">{uploading ? "Uploading..." : "Click to upload receipt (image or PDF)"}</span>
                <input type="file" className="hidden" accept="image/*,application/pdf"
                  onChange={e => handleReceiptUpload(e.target.files[0])} disabled={uploading} />
              </label>
            )}
          </div>

          {!isNew && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select className={inputClass} value={form.status} onChange={e => set("status", e.target.value)}>
                  {["Pending", "Approved", "Rejected", "Paid"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Admin Notes</label>
                <textarea className={inputClass} rows={2} value={form.admin_notes || ""} onChange={e => set("admin_notes", e.target.value)} placeholder="Notes for this expense..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payroll Period</label>
                <input className={inputClass} value={form.payroll_period || ""} onChange={e => set("payroll_period", e.target.value)} placeholder="e.g. May 2026" />
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || uploading || !form.employee_name || !form.date || !form.amount}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-semibold"
          >
            <Save size={15} /> {saving ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.filter({ active: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.Expense.update(data.id, data)
      : base44.entities.Expense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); setShowModal(false); setEditExpense(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const quickStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Expense.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.employee_name?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()) || e.booking_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    const matchCat = filterCategory === "all" || e.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const totalPending = expenses.filter(e => e.status === "Pending").reduce((s, e) => s + (e.amount || 0), 0);
  const totalApproved = expenses.filter(e => e.status === "Approved").reduce((s, e) => s + (e.amount || 0), 0);
  const totalPaid = expenses.filter(e => e.status === "Paid").reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expense Management</h1>
          <p className="text-gray-500 text-sm">Staff work-related expenses linked to payroll</p>
        </div>
        <button
          onClick={() => { setEditExpense(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <Plus size={16} /> Log Expense
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg"><Clock size={20} className="text-yellow-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Pending Approval</p>
            <p className="text-xl font-bold text-gray-800">${totalPending.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{expenses.filter(e => e.status === "Pending").length} expenses</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Approved (Unpaid)</p>
            <p className="text-xl font-bold text-gray-800">${totalApproved.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{expenses.filter(e => e.status === "Approved").length} expenses</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg"><DollarSign size={20} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Paid Out</p>
            <p className="text-xl font-bold text-gray-800">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{expenses.filter(e => e.status === "Paid").length} expenses</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Search by employee, description, booking..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {["Pending", "Approved", "Rejected", "Paid"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No expenses found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Employee</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Booking</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Receipt</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{exp.employee_name}</td>
                  <td className="px-4 py-3 text-gray-500">{exp.date}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full">{exp.category}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{exp.description || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{exp.booking_number || "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">${Number(exp.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {exp.receipt_url ? (
                      <a href={exp.receipt_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-blue-600 text-xs hover:underline">
                        <Eye size={13} /> View
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[exp.status] || "bg-gray-100 text-gray-600"}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {exp.status === "Pending" && (
                        <>
                          <button onClick={() => quickStatus.mutate({ id: exp.id, status: "Approved" })}
                            title="Approve"
                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors">
                            <CheckCircle size={15} />
                          </button>
                          <button onClick={() => quickStatus.mutate({ id: exp.id, status: "Rejected" })}
                            title="Reject"
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      {exp.status === "Approved" && (
                        <button onClick={() => quickStatus.mutate({ id: exp.id, status: "Paid" })}
                          title="Mark Paid"
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors text-xs font-bold">
                          <DollarSign size={15} />
                        </button>
                      )}
                      <button onClick={() => { setEditExpense(exp); setShowModal(true); }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm("Delete this expense?")) deleteMutation.mutate(exp.id); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
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
        <ExpenseModal
          expense={editExpense}
          employees={employees}
          onClose={() => { setShowModal(false); setEditExpense(null); }}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}