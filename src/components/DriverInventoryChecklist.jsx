import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Camera, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Loader2, Send, ClipboardList, Package } from "lucide-react";

const PACKAGING_ITEMS = [
  "Tea Chest Box",
  "Book and Wine Box",
  "Port-A-Robe",
  "Packing Paper (125 sheets)",
  "Mattress Protector - Single",
  "Mattress Protector - Double/Queen",
  "Mattress Protector - King",
  "Packaging Tape",
  "Bubble Wrap (50m roll)",
  "Fragile Tape",
];

const CONDITIONS = [
  { key: "OK", label: "OK", icon: CheckCircle, color: "bg-green-600 text-white border-green-600", inactive: "bg-gray-700 text-gray-400 border-gray-600" },
  { key: "Damaged", label: "Damaged", icon: AlertTriangle, color: "bg-orange-500 text-white border-orange-500", inactive: "bg-gray-700 text-gray-400 border-gray-600" },
  { key: "Missing", label: "Missing", icon: XCircle, color: "bg-red-600 text-white border-red-600", inactive: "bg-gray-700 text-gray-400 border-gray-600" },
];

export default function DriverInventoryChecklist({ booking, truckName, onClose }) {
  const queryClient = useQueryClient();
  const fileInputRefs = useRef({});

  // Load existing check if one exists
  const { data: existing, isLoading } = useQuery({
    queryKey: ["inv-check", booking.id],
    queryFn: async () => {
      const results = await base44.entities.DriverInventoryCheck.filter({ booking_id: booking.id });
      return results[0] || null;
    },
  });

  const hasPackaging = (booking.selected_services || []).some(s =>
    s.toLowerCase().includes("pack") || s.toLowerCase().includes("unpack")
  );
  const bookingItems = booking.items_to_move || [];
  const items = hasPackaging && bookingItems.length === 0
    ? PACKAGING_ITEMS
    : hasPackaging
    ? [...bookingItems, ...PACKAGING_ITEMS.filter(p => !bookingItems.includes(p))]
    : bookingItems;

  // Local state: map of item index → { condition, notes, photoUrl, uploading }
  const [itemStates, setItemStates] = useState(() => {
    const init = {};
    items.forEach((_, i) => { init[i] = { condition: "OK", notes: "", photoUrl: "", uploading: false }; });
    return init;
  });
  const [driverNotes, setDriverNotes] = useState("");
  const [expanded, setExpanded] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setItem = (idx, patch) => setItemStates(prev => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));

  const handlePhotoCapture = async (idx, file) => {
    if (!file) return;
    setItem(idx, { uploading: true });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setItem(idx, { photoUrl: file_url, uploading: false });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      booking_id: booking.id,
      booking_number: booking.booking_number || "",
      truck_name: truckName,
      items: items.map((name, i) => ({
        name,
        condition: itemStates[i]?.condition || "OK",
        notes: itemStates[i]?.notes || "",
        photo_url: itemStates[i]?.photoUrl || "",
      })),
      driver_notes: driverNotes,
      status: "Submitted",
      submitted_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await base44.entities.DriverInventoryCheck.update(existing.id, payload);
    } else {
      await base44.entities.DriverInventoryCheck.create(payload);
    }

    queryClient.invalidateQueries({ queryKey: ["inv-check", booking.id] });
    setSubmitting(false);
    setSubmitted(true);
  };

  const damagedCount = items.filter((_, i) => itemStates[i]?.condition === "Damaged").length;
  const missingCount = items.filter((_, i) => itemStates[i]?.condition === "Missing").length;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <ClipboardList size={18} />
          </div>
          <div>
            <h2 className="font-bold text-white text-base">Pre-Move Inventory</h2>
            <p className="text-gray-400 text-xs">
              {booking.customer_first_name} {booking.customer_last_name}
              {booking.booking_number && ` · #${booking.booking_number}`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-xl">
          <X size={18} />
        </button>
      </div>

      {/* Submitted success */}
      {submitted && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <CheckCircle size={64} className="text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Checklist Submitted!</h3>
          <p className="text-gray-400 text-sm mb-2">
            {damagedCount + missingCount > 0
              ? `${damagedCount} damaged, ${missingCount} missing items flagged.`
              : "All items confirmed OK."}
          </p>
          <button onClick={onClose} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold">
            Close
          </button>
        </div>
      )}

      {!submitted && (
        <>
          {/* Summary bar */}
          {items.length > 0 && (
            <div className="bg-gray-900 px-4 py-2 flex gap-4 text-xs flex-shrink-0 border-b border-gray-700">
              <span className="text-gray-400">{items.length} items total</span>
              {damagedCount > 0 && <span className="text-orange-400 font-semibold">⚠️ {damagedCount} damaged</span>}
              {missingCount > 0 && <span className="text-red-400 font-semibold">✗ {missingCount} missing</span>}
            </div>
          )}

          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {items.length === 0 && (
              <div className="text-center py-12">
                <Package size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No inventory items listed for this booking.</p>
                <p className="text-gray-600 text-sm mt-1">Add items in the booking form first.</p>
              </div>
            )}

            {items.map((itemName, idx) => {
              const state = itemStates[idx] || { condition: "OK", notes: "", photoUrl: "", uploading: false };
              const isOpen = !!expanded[idx];
              const needsDetail = state.condition === "Damaged" || state.condition === "Missing";

              return (
                <div key={idx} className={`rounded-2xl border overflow-hidden transition-all ${
                  state.condition === "Damaged" ? "border-orange-500/50 bg-orange-950/20" :
                  state.condition === "Missing" ? "border-red-500/50 bg-red-950/20" :
                  "border-gray-700 bg-gray-800"
                }`}>
                  {/* Item header */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{itemName}</p>
                    </div>
                    {/* Condition pills */}
                    <div className="flex gap-1">
                      {CONDITIONS.map(({ key, label, icon: Icon, color, inactive }) => (
                        <button
                          key={key}
                          onClick={() => { setItem(idx, { condition: key }); if (key !== "OK") setExpanded(p => ({ ...p, [idx]: true })); }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-bold transition-all ${state.condition === key ? color : inactive}`}
                        >
                          <Icon size={11} />
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      ))}
                    </div>
                    {needsDetail && (
                      <button onClick={() => setExpanded(p => ({ ...p, [idx]: !isOpen }))} className="ml-1 text-gray-400">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Expanded details for damaged/missing */}
                  {isOpen && needsDetail && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50 pt-3">
                      <textarea
                        value={state.notes}
                        onChange={(e) => setItem(idx, { notes: e.target.value })}
                        placeholder="Describe the damage or reason for missing item..."
                        rows={2}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none"
                      />

                      {/* Photo capture */}
                      <div>
                        {state.photoUrl ? (
                          <div className="relative">
                            <img src={state.photoUrl} alt="Damage" className="w-full h-40 object-cover rounded-xl border border-orange-500/50" />
                            <button
                              onClick={() => setItem(idx, { photoUrl: "" })}
                              className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                            >
                              <X size={14} className="text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRefs.current[idx]?.click()}
                            disabled={state.uploading}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 text-sm font-medium hover:border-orange-500 hover:text-orange-400 transition-colors disabled:opacity-50"
                          >
                            {state.uploading
                              ? <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                              : <><Camera size={16} /> Take / Upload Photo</>
                            }
                          </button>
                        )}
                        <input
                          ref={el => fileInputRefs.current[idx] = el}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoCapture(idx, e.target.files?.[0])}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Driver notes */}
            {items.length > 0 && (
              <div className="mt-2">
                <label className="block text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">Overall Notes</label>
                <textarea
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="Any additional notes about the pickup condition..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
            )}
          </div>

          {/* Submit button */}
          {items.length > 0 && (
            <div className="px-4 pb-6 pt-3 bg-gray-900 border-t border-gray-700 flex-shrink-0">
              {(damagedCount > 0 || missingCount > 0) && (
                <p className="text-xs text-orange-300 mb-3 text-center">
                  ⚠️ {damagedCount + missingCount} issue(s) flagged — photos recommended for damaged items
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 py-4 rounded-2xl font-bold text-base text-white disabled:opacity-50 shadow-lg shadow-blue-900/40"
              >
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                  : <><Send size={18} /> Submit Inventory Check</>
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}