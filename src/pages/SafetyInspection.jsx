import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Camera, CheckCircle, AlertTriangle, Upload, Truck, ChevronDown, ChevronUp, ClipboardList, X } from "lucide-react";
import { format } from "date-fns";

const SAFETY_GEAR_ITEMS = [
  { key: "hi_vis_vest", label: "Hi-Vis Vest" },
  { key: "safety_boots", label: "Safety Boots" },
  { key: "gloves", label: "Gloves" },
  { key: "back_brace", label: "Back Brace / Lifting Belt" },
  { key: "first_aid_kit", label: "First Aid Kit in Truck" },
  { key: "fire_extinguisher", label: "Fire Extinguisher in Truck" },
  { key: "seatbelts_ok", label: "All Seatbelts Functional" },
];

const VEHICLE_CHECK_ITEMS = [
  { key: "fuel_level_ok", label: "Fuel Level Adequate" },
  { key: "oil_level_ok", label: "Oil Level OK" },
  { key: "tyre_condition_ok", label: "Tyre Condition OK" },
  { key: "lights_ok", label: "All Lights Working" },
  { key: "brakes_ok", label: "Brakes OK" },
  { key: "mirrors_ok", label: "Mirrors Adjusted" },
  { key: "ramp_ok", label: "Loading Ramp Functional" },
  { key: "straps_ropes_ok", label: "Straps / Ropes Present & OK" },
  { key: "dollies_trolleys_ok", label: "Dollies / Trolleys Present" },
  { key: "blankets_ok", label: "Protective Blankets Present" },
];

function PhotoUploader({ label, photos, onAdd, onRemove, uploading, onUpload }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img src={url} alt={`photo-${i}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <label className={`w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          uploading ? "border-gray-200 bg-gray-50" : "border-blue-300 bg-blue-50 hover:border-blue-500"
        }`}>
          {uploading ? (
            <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <>
              <Camera size={18} className="text-blue-500 mb-1" />
              <span className="text-xs text-blue-600 font-medium">Add</span>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            disabled={uploading}
            onChange={onUpload} />
        </label>
      </div>
    </div>
  );
}

function ChecklistSection({ title, icon: Icon, items, values, onChange, color = "blue" }) {
  const [open, setOpen] = useState(true);
  const checked = items.filter(i => values[i.key]).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className={`text-${color}-600`} />
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            checked === items.length ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}>
            {checked}/{items.length}
          </span>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {items.map(item => (
            <label key={item.key} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                values[item.key]
                  ? "bg-green-500 border-green-500"
                  : "border-gray-300 bg-white"
              }`}>
                {values[item.key] && <CheckCircle size={13} className="text-white" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={!!values[item.key]}
                onChange={e => onChange(item.key, e.target.checked)}
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SafetyInspection() {
  const today = format(new Date(), "yyyy-MM-dd");
  const nowTime = format(new Date(), "HH:mm");

  const [form, setForm] = useState({
    inspector_name: "",
    inspector_email: "",
    truck_name: "",
    booking_number: "",
    shift_start_time: "",
    inspection_date: today,
    inspection_time: nowTime,
    truck_condition: "Good",
    safety_gear: {},
    vehicle_checks: {},
    damage_noted: false,
    damage_description: "",
    notes: "",
    exterior_photos: [],
    interior_photos: [],
    damage_photos: [],
  });

  const [uploading, setUploading] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const uploadPhoto = async (field, file) => {
    setUploading(u => ({ ...u, [field]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, [field]: [...(f[field] || []), file_url] }));
    setUploading(u => ({ ...u, [field]: false }));
  };

  const removePhoto = (field, idx) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  const submitMutation = useMutation({
    mutationFn: () => base44.entities.TruckSafetyInspection.create({
      ...form,
      status: "Submitted",
    }),
    onSuccess: () => setSubmitted(true),
  });

  const safetyAllChecked = SAFETY_GEAR_ITEMS.every(i => form.safety_gear[i.key]);
  const vehicleAllChecked = VEHICLE_CHECK_ITEMS.every(i => form.vehicle_checks[i.key]);
  const hasMajorIssue = form.truck_condition === "Major Issues - Do Not Use";

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Inspection Submitted!</h2>
          <p className="text-gray-500 text-sm mb-6">Your pre-shift safety inspection has been recorded for <strong>{form.truck_name}</strong>.</p>
          {hasMajorIssue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-red-700 text-sm font-semibold">
                <AlertTriangle size={15} />
                Major issue flagged — management has been notified.
              </div>
            </div>
          )}
          <button
            onClick={() => { setSubmitted(false); setForm(f => ({ ...f, exterior_photos: [], interior_photos: [], damage_photos: [] })); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm"
          >
            Start New Inspection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 px-4 pt-6 pb-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Pre-Shift Safety Inspection</h1>
            <p className="text-blue-200 text-xs">Move On Australia · Complete before starting your shift</p>
          </div>
        </div>
      </div>

      <form
        onSubmit={e => { e.preventDefault(); submitMutation.mutate(); }}
        className="max-w-2xl mx-auto px-4 py-6 space-y-5"
      >
        {/* Inspector & Truck */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Truck size={16} className="text-blue-600" /> Shift Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Your Name *</label>
              <input required value={form.inspector_name} onChange={e => setForm(f => ({ ...f, inspector_name: e.target.value }))}
                placeholder="Full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Your Email</label>
              <input type="email" value={form.inspector_email} onChange={e => setForm(f => ({ ...f, inspector_email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Truck *</label>
              <select required value={form.truck_name} onChange={e => setForm(f => ({ ...f, truck_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                <option value="">Select truck...</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.name}>{t.name} {t.size ? `(${t.size})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Booking # (if known)</label>
              <input value={form.booking_number} onChange={e => setForm(f => ({ ...f, booking_number: e.target.value }))}
                placeholder="e.g. BK-1234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Inspection Date</label>
              <input type="date" value={form.inspection_date} onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Planned Shift Start</label>
              <input type="time" value={form.shift_start_time} onChange={e => setForm(f => ({ ...f, shift_start_time: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* Overall condition */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Overall Truck Condition *</label>
            <div className="flex flex-wrap gap-2">
              {["Good", "Minor Issues", "Major Issues - Do Not Use"].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, truck_condition: opt }))}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.truck_condition === opt
                      ? opt === "Good" ? "bg-green-600 border-green-600 text-white"
                        : opt === "Minor Issues" ? "bg-yellow-500 border-yellow-500 text-white"
                        : "bg-red-600 border-red-600 text-white"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {hasMajorIssue && (
              <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                <AlertTriangle size={14} className="flex-shrink-0" />
                This truck should not be used. Management will be notified upon submission.
              </div>
            )}
          </div>
        </div>

        {/* Safety Gear Checklist */}
        <ChecklistSection
          title="Safety Gear"
          icon={Shield}
          items={SAFETY_GEAR_ITEMS}
          values={form.safety_gear}
          onChange={(key, val) => setForm(f => ({ ...f, safety_gear: { ...f.safety_gear, [key]: val } }))}
          color="green"
        />

        {/* Vehicle Checks */}
        <ChecklistSection
          title="Vehicle Checks"
          icon={Truck}
          items={VEHICLE_CHECK_ITEMS}
          values={form.vehicle_checks}
          onChange={(key, val) => setForm(f => ({ ...f, vehicle_checks: { ...f.vehicle_checks, [key]: val } }))}
          color="blue"
        />

        {/* Photos */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Camera size={16} className="text-purple-600" /> Truck Photos
          </h2>
          <PhotoUploader
            label="Exterior Photos (front, sides, rear)"
            photos={form.exterior_photos}
            onRemove={i => removePhoto("exterior_photos", i)}
            uploading={uploading.exterior_photos}
            onUpload={e => e.target.files[0] && uploadPhoto("exterior_photos", e.target.files[0])}
          />
          <PhotoUploader
            label="Interior / Cargo Area Photos"
            photos={form.interior_photos}
            onRemove={i => removePhoto("interior_photos", i)}
            uploading={uploading.interior_photos}
            onUpload={e => e.target.files[0] && uploadPhoto("interior_photos", e.target.files[0])}
          />
        </div>

        {/* Damage */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <AlertTriangle size={16} className="text-yellow-600" /> Pre-existing Damage
          </h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              form.damage_noted ? "bg-yellow-500 border-yellow-500" : "border-gray-300"
            }`}>
              {form.damage_noted && <CheckCircle size={13} className="text-white" />}
            </div>
            <input type="checkbox" className="hidden" checked={form.damage_noted}
              onChange={e => setForm(f => ({ ...f, damage_noted: e.target.checked }))} />
            <span className="text-sm text-gray-700">I am noting pre-existing damage on this truck</span>
          </label>

          {form.damage_noted && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Describe the damage</label>
                <textarea
                  rows={3}
                  value={form.damage_description}
                  onChange={e => setForm(f => ({ ...f, damage_description: e.target.value }))}
                  placeholder="Describe location and nature of damage..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 resize-none"
                />
              </div>
              <PhotoUploader
                label="Damage Photos"
                photos={form.damage_photos}
                onRemove={i => removePhoto("damage_photos", i)}
                uploading={uploading.damage_photos}
                onUpload={e => e.target.files[0] && uploadPhoto("damage_photos", e.target.files[0])}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any other observations or comments..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Status summary */}
        {(!safetyAllChecked || !vehicleAllChecked) && (
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              Not all items checked. You can still submit — unchecked items will be flagged for review.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitMutation.isPending || !form.inspector_name || !form.truck_name}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-base transition-all"
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Safety Inspection"}
        </button>
      </form>
    </div>
  );
}