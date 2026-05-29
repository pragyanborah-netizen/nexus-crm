import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Plus, Edit, Trash2, X, Save } from "lucide-react";

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

const DEFAULT_TYPES = [
  "Booked", "Enquiry", "Completed", "Quoted", "72 Hours Reminder",
  "Booked with Other Company", "Cancelled", "On Site Quote", "Pending", "Invoice"
];

const empty = {
  type: "",
  from_name: "Move On Australia",
  from_email: "",
  subject: "",
  body: "",
  active: true,
};

export default function EmailTemplates() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | "add" | template object
  const [form, setForm] = useState(empty);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => base44.entities.EmailTemplate.list("-created_date", 100),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      modal?.id ? base44.entities.EmailTemplate.update(modal.id, data) : base44.entities.EmailTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["email-templates"] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });

  const openAdd = () => { setForm(empty); setModal("add"); };
  const openEdit = (t) => { setForm({ ...empty, ...t }); setModal(t); };
  const closeModal = () => setModal(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home › Email Templates</nav>
          <h1 className="text-2xl font-bold text-gray-800">Email Templates</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} /> Add Email Template
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No templates yet. Click "Add Email Template" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">From Name</th>
                  <th className="text-left px-4 py-3 font-medium">From Email</th>
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.type}</td>
                    <td className="px-4 py-3 text-gray-600">{t.from_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{t.from_email || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{t.subject}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { if (confirm("Delete this template?")) deleteMutation.mutate(t.id); }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-gray-800 text-lg">{modal?.id ? "Edit Template" : "Add Email Template"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type *</label>
                  <input
                    className={inputClass}
                    list="template-types"
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    placeholder="e.g. Booked, Enquiry..."
                  />
                  <datalist id="template-types">
                    {DEFAULT_TYPES.map((t) => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Name</label>
                  <input className={inputClass} value={form.from_name} onChange={(e) => set("from_name", e.target.value)} placeholder="Move On Australia" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Email</label>
                  <input className={inputClass} type="email" value={form.from_email} onChange={(e) => set("from_email", e.target.value)} placeholder="moveme@moveonremovals.com.au" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subject *</label>
                  <input className={inputClass} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Email subject line" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email Body</label>
                <p className="text-xs text-gray-400 mb-1">You can use placeholders like {"{customer_name}"}, {"{move_date}"}, {"{pickup_address}"}, {"{price}"}</p>
                <textarea
                  className={inputClass}
                  rows={12}
                  value={form.body}
                  onChange={(e) => set("body", e.target.value)}
                  placeholder="Write your email body here..."
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.type || !form.subject}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={14} /> {saveMutation.isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}