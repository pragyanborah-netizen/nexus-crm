import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Send, Eye, CheckCircle, Package, ChevronDown, ChevronUp, Link, Copy } from "lucide-react";

const STATUS_COLORS = {
  Submitted: "bg-yellow-100 text-yellow-700",
  Reviewed: "bg-blue-100 text-blue-700",
  Quoted: "bg-green-100 text-green-700",
};

function ChecklistRow({ checklist }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const updateStatus = useMutation({
    mutationFn: (status) => base44.entities.CustomerInventoryChecklist.update(checklist.id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-checklists"] }),
  });

  const totalItems = (checklist.rooms || []).reduce((s, r) => s + (r.items?.length || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-800">{checklist.customer_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[checklist.status] || "bg-gray-100 text-gray-600"}`}>{checklist.status}</span>
            {checklist.booking_number && <span className="text-xs text-gray-400">Booking #{checklist.booking_number}</span>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{checklist.customer_email} {checklist.customer_phone && `· ${checklist.customer_phone}`}</p>
          <div className="flex gap-3 mt-1 text-xs text-gray-500">
            {checklist.move_from && <span>From: {checklist.move_from}</span>}
            {checklist.move_to && <span>To: {checklist.move_to}</span>}
            {checklist.move_date && <span>Date: {checklist.move_date}</span>}
          </div>
          <div className="flex gap-3 mt-1 text-xs">
            <span className="text-blue-600 font-medium">📦 {totalItems} items</span>
            {(checklist.packaging_supplies || []).length > 0 && (
              <span className="text-purple-600 font-medium">🗃️ {checklist.packaging_supplies.length} supply types</span>
            )}
            {(checklist.services_needed || []).length > 0 && (
              <span className="text-green-600 font-medium">🚛 {checklist.services_needed.join(", ")}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={checklist.status}
            onChange={e => updateStatus.mutate(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option>Submitted</option>
            <option>Reviewed</option>
            <option>Quoted</option>
          </select>
          <button onClick={() => setExpanded(v => !v)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          {/* Rooms */}
          {(checklist.rooms || []).length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Items by Room</p>
              <div className="space-y-2">
                {checklist.rooms.map((room, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold text-gray-700">{room.room}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(room.items || []).map((item, j) => (
                        <span key={j} className="bg-white border border-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{item}</span>
                      ))}
                      {room.custom_items && <span className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{room.custom_items}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packaging supplies */}
          {(checklist.packaging_supplies || []).length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Packaging Supplies Requested</p>
              <div className="flex flex-wrap gap-2">
                {checklist.packaging_supplies.map((s, i) => (
                  <span key={i} className="bg-purple-50 border border-purple-200 text-purple-800 text-xs px-3 py-1 rounded-full">
                    {s.name} × {s.qty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {checklist.notes && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">{checklist.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerInventoryChecklists() {
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["customer-checklists"],
    queryFn: () => base44.entities.CustomerInventoryChecklist.list("-created_date"),
  });

  const filtered = filter === "all" ? checklists : checklists.filter(c => c.status === filter);

  const baseUrl = window.location.origin;
  const checklistUrl = `${baseUrl}/inventory-checklist`;

  const copyLink = () => {
    navigator.clipboard.writeText(checklistUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Inventory Checklists</h1>
          <p className="text-gray-500 text-sm">Checklists submitted by customers for quotes</p>
        </div>
      </div>

      {/* Share link card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-800 mb-1">📤 Share checklist link with customers</p>
          <p className="text-xs text-blue-600 truncate">{checklistUrl}</p>
          <p className="text-xs text-gray-500 mt-1">You can also append <code className="bg-white px-1 rounded">?name=John&email=john@email.com</code> to pre-fill their details.</p>
        </div>
        <button onClick={copyLink}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${
            copied ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}>
          {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Submitted", color: "bg-yellow-50 border-yellow-200 text-yellow-800", count: checklists.filter(c => c.status === "Submitted").length },
          { label: "Reviewed", color: "bg-blue-50 border-blue-200 text-blue-800", count: checklists.filter(c => c.status === "Reviewed").length },
          { label: "Quoted", color: "bg-green-50 border-green-200 text-green-800", count: checklists.filter(c => c.status === "Quoted").length },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {["all", "Submitted", "Reviewed", "Quoted"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}>
            {f === "all" ? `All (${checklists.length})` : f}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow border border-gray-100">
          <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No checklists yet</p>
          <p className="text-gray-400 text-sm mt-1">Share the checklist link with customers to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => <ChecklistRow key={c.id} checklist={c} />)}
        </div>
      )}
    </div>
  );
}