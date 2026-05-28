import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Save, ArrowLeft, ChevronRight, ChevronLeft, Plus, Trash2, User, Wrench, MapPin, Package, Truck, Check } from "lucide-react";
import ItemsSelector from "../components/ItemsSelector";

const STEPS = [
  { id: 1, label: "Customer", icon: User },
  { id: 2, label: "Services", icon: Wrench },
  { id: 3, label: "Addresses", icon: MapPin },
  { id: 4, label: "Contents", icon: Package },
  { id: 5, label: "Summary", icon: Truck },
];

const SERVICE_OPTIONS = ["Packing", "Moving", "Unpacking", "Storage", "Interstate"];

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white";

const emptyAddress = { address: "", suburb: "", state: "VIC", postcode: "", floor: "", elevator: false };

function recommendTruck(items) {
  const count = items.length;
  if (count <= 5) return { size: "Small (4t)", movers: 2, baseHours: 3, rate: 160 };
  if (count <= 12) return { size: "Medium (8t)", movers: 2, baseHours: 4, rate: 180 };
  if (count <= 22) return { size: "Large (12t)", movers: 3, baseHours: 5, rate: 220 };
  return { size: "Extra Large (14t)", movers: 3, baseHours: 6, rate: 250 };
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 min-w-20">{label}:</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}

export default function AddEditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id && id !== "new";

  const [step, setStep] = useState(1);

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => base44.entities.Agent.list(),
  });
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });
  const { data: existing } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => base44.entities.Booking.get(id),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    status: "New", booking_number: "",
    customer_first_name: "", customer_last_name: "", customer_email: "",
    customer_mobile: "", customer_phone_info: "", customer_type: "Residential",
    agent_quoted: "", agent_booked: "", agent_inquired: "",
    selected_services: [],
    pickup_address: "", pickup_suburb: "", pickup_state: "VIC", pickup_postcode: "", pickup_floor: "", pickup_elevator: false,
    delivery_address: "", delivery_suburb: "", delivery_state: "VIC", delivery_postcode: "", delivery_floor: "", delivery_elevator: false,
    additional_stops: [],
    move_date: "", move_time: "", service_type: "",
    items_to_move: [],
    num_movers: "", truck_size: "", truck_assigned: "",
    estimated_hours: "", actual_hours: "",
    price: "", deposit: "", balance_due: "", payment_method: "",
    notes: "", internal_notes: "",
  });

  const [extraStops, setExtraStops] = useState([]);

  useEffect(() => {
    if (existing) {
      setForm((f) => ({ ...f, ...existing }));
      if (existing.additional_stops?.length) {
        setExtraStops(existing.additional_stops.map((s) => ({ address: s, suburb: "", state: "VIC", postcode: "", floor: "", elevator: false })));
      }
    }
  }, [existing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleService = (svc) => {
    const curr = form.selected_services || [];
    set("selected_services", curr.includes(svc) ? curr.filter((s) => s !== svc) : [...curr, svc]);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? base44.entities.Booking.update(id, data) : base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      navigate("/bookings");
    },
  });

  const handleSave = () => {
    const data = {
      ...form,
      additional_stops: extraStops
        .filter((s) => s.address || s.suburb)
        .map((s) => [s.address, s.suburb, s.state].filter(Boolean).join(", ")),
    };
    saveMutation.mutate(data);
  };

  const rec = recommendTruck(form.items_to_move || []);
  const agentOptions = agents.filter((a) => a.active !== false);

  const applyRecommendation = () => {
    set("truck_size", rec.size);
    set("num_movers", rec.movers);
    set("estimated_hours", rec.baseHours);
    if (!form.price) set("price", rec.baseHours * rec.rate);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/bookings" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home &rsaquo; <Link to="/bookings" className="hover:underline">Bookings</Link> &rsaquo; {isEdit ? "Edit Booking" : "New Booking"}</nav>
          <h1 className="text-2xl font-bold text-gray-800">{isEdit ? "Edit Booking" : "New Booking"}</h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 bg-white rounded-xl shadow px-6 py-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button onClick={() => setStep(s.id)} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span className={`text-xs font-medium ${active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"}`}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-12px] ${step > s.id ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl shadow p-6 mb-4">

        {/* STEP 1: Customer */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">First Name *</label>
                <input className={inputClass} value={form.customer_first_name} onChange={(e) => set("customer_first_name", e.target.value)} placeholder="First name" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Last Name *</label>
                <input className={inputClass} value={form.customer_last_name} onChange={(e) => set("customer_last_name", e.target.value)} placeholder="Last name" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Mobile</label>
                <input className={inputClass} value={form.customer_mobile} onChange={(e) => set("customer_mobile", e.target.value)} placeholder="Mobile number" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone / Call Info</label>
                <input className={inputClass} value={form.customer_phone_info} onChange={(e) => set("customer_phone_info", e.target.value)} placeholder="Phone or call notes" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input className={inputClass} type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="Email address" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Customer Type</label>
                <select className={selectClass} value={form.customer_type} onChange={(e) => set("customer_type", e.target.value)}>
                  <option>Residential</option><option>Commercial</option><option>Office</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {["New","Confirmed","In Progress","Completed","Cancelled","No Show"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Booking Number</label>
                <input className={inputClass} value={form.booking_number} onChange={(e) => set("booking_number", e.target.value)} placeholder="Auto-generated if blank" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Agent who Quoted</label>
                <select className={selectClass} value={form.agent_quoted} onChange={(e) => set("agent_quoted", e.target.value)}>
                  <option value="">-- Select Agent --</option>
                  {agentOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Agent who Booked</label>
                <select className={selectClass} value={form.agent_booked} onChange={(e) => set("agent_booked", e.target.value)}>
                  <option value="">-- Select Agent --</option>
                  {agentOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Services */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">What services do you need?</h2>
            <p className="text-sm text-gray-400 mb-6">Select all that apply</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {SERVICE_OPTIONS.map((svc) => {
                const active = (form.selected_services || []).includes(svc);
                return (
                  <button key={svc} type="button" onClick={() => toggleService(svc)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${active ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${active ? "bg-blue-500" : "bg-gray-100"}`}>
                      {active ? <Check size={14} className="text-white" /> : <Wrench size={14} className="text-gray-400" />}
                    </div>
                    <p className="font-medium text-sm">{svc}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Move Date *</label>
                <input className={inputClass} type="date" value={form.move_date} onChange={(e) => set("move_date", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Move Time</label>
                <input className={inputClass} type="time" value={form.move_time} onChange={(e) => set("move_time", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Service Category</label>
                <select className={selectClass} value={form.service_type} onChange={(e) => set("service_type", e.target.value)}>
                  <option value="">-- Select --</option>
                  {["House Removal","Office Removal","Furniture Removal","Packing & Unpacking","Storage","Interstate"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Addresses */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Addresses</h2>
            <p className="text-sm text-gray-400 mb-5">Pickup and delivery locations</p>

            <div className="mb-5 p-4 rounded-xl bg-green-50 border border-green-200">
              <h3 className="font-medium text-green-800 text-sm mb-3 flex items-center gap-2"><MapPin size={14} /> Pickup Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <input className={inputClass} value={form.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} placeholder="Street address" />
                </div>
                <input className={inputClass} value={form.pickup_suburb} onChange={(e) => set("pickup_suburb", e.target.value)} placeholder="Suburb" />
                <input className={inputClass} value={form.pickup_state} onChange={(e) => set("pickup_state", e.target.value)} placeholder="State" />
                <input className={inputClass} value={form.pickup_postcode} onChange={(e) => set("pickup_postcode", e.target.value)} placeholder="Postcode" />
                <input className={inputClass} value={form.pickup_floor} onChange={(e) => set("pickup_floor", e.target.value)} placeholder="Floor / Level" />
                <label className="flex items-center gap-2 text-sm text-gray-600 md:col-span-2 cursor-pointer">
                  <input type="checkbox" checked={form.pickup_elevator} onChange={(e) => set("pickup_elevator", e.target.checked)} className="w-4 h-4" />
                  Elevator available
                </label>
              </div>
            </div>

            {extraStops.map((stop, idx) => (
              <div key={idx} className="mb-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-yellow-800 text-sm flex items-center gap-2"><MapPin size={14} /> Extra Stop {idx + 1}</h3>
                  <button type="button" onClick={() => setExtraStops(extraStops.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <input className={inputClass} value={stop.address} onChange={(e) => { const s = [...extraStops]; s[idx].address = e.target.value; setExtraStops(s); }} placeholder="Street address" />
                  </div>
                  <input className={inputClass} value={stop.suburb} onChange={(e) => { const s = [...extraStops]; s[idx].suburb = e.target.value; setExtraStops(s); }} placeholder="Suburb" />
                  <input className={inputClass} value={stop.state} onChange={(e) => { const s = [...extraStops]; s[idx].state = e.target.value; setExtraStops(s); }} placeholder="State" />
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setExtraStops([...extraStops, { ...emptyAddress }])}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-5 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50">
              <Plus size={14} /> Add extra stop
            </button>

            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <h3 className="font-medium text-red-800 text-sm mb-3 flex items-center gap-2"><MapPin size={14} /> Delivery Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <input className={inputClass} value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)} placeholder="Street address" />
                </div>
                <input className={inputClass} value={form.delivery_suburb} onChange={(e) => set("delivery_suburb", e.target.value)} placeholder="Suburb" />
                <input className={inputClass} value={form.delivery_state} onChange={(e) => set("delivery_state", e.target.value)} placeholder="State" />
                <input className={inputClass} value={form.delivery_postcode} onChange={(e) => set("delivery_postcode", e.target.value)} placeholder="Postcode" />
                <input className={inputClass} value={form.delivery_floor} onChange={(e) => set("delivery_floor", e.target.value)} placeholder="Floor / Level" />
                <label className="flex items-center gap-2 text-sm text-gray-600 md:col-span-2 cursor-pointer">
                  <input type="checkbox" checked={form.delivery_elevator} onChange={(e) => set("delivery_elevator", e.target.checked)} className="w-4 h-4" />
                  Elevator available
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Contents */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">List of Contents</h2>
            <p className="text-sm text-gray-400 mb-5">Type to search and add items being moved</p>
            <ItemsSelector value={form.items_to_move || []} onChange={(v) => set("items_to_move", v)} />
            {(form.items_to_move || []).length > 0 && (
              <p className="text-xs text-gray-400 mt-3">{form.items_to_move.length} item{form.items_to_move.length !== 1 ? "s" : ""} added</p>
            )}
            <div className="mt-6">
              <label className="text-xs text-gray-500 mb-1 block">Additional Notes</label>
              <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any special items, fragile goods, or other notes..." />
            </div>
          </div>
        )}

        {/* STEP 5: Summary */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Summary &amp; Pricing</h2>
            <p className="text-sm text-gray-400 mb-5">Review details and set the truck &amp; price</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-sm">
              <SummaryRow label="Customer" value={`${form.customer_first_name} ${form.customer_last_name}`} />
              <SummaryRow label="Mobile" value={form.customer_mobile || "—"} />
              <SummaryRow label="Services" value={(form.selected_services || []).join(", ") || "—"} />
              <SummaryRow label="Move Date" value={form.move_date || "—"} />
              <SummaryRow label="Pickup" value={form.pickup_suburb || form.pickup_address || "—"} />
              <SummaryRow label="Delivery" value={form.delivery_suburb || form.delivery_address || "—"} />
              <SummaryRow label="Items" value={`${(form.items_to_move || []).length} items`} />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-blue-800 mb-1">Recommended based on {(form.items_to_move || []).length} items:</p>
              <p className="text-sm text-blue-700">Truck: <strong>{rec.size}</strong> &middot; {rec.movers} Movers &middot; ~{rec.baseHours} hrs &middot; Est. <strong>${rec.baseHours * rec.rate}</strong></p>
              <button type="button" onClick={applyRecommendation} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">
                Apply Recommendation
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Truck Size</label>
                <select className={selectClass} value={form.truck_size} onChange={(e) => set("truck_size", e.target.value)}>
                  <option value="">-- Select Truck Size --</option>
                  {["Small (4t)","Medium (8t)","Large (12t)","Extra Large (14t)"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Truck Assigned</label>
                <select className={selectClass} value={form.truck_assigned} onChange={(e) => set("truck_assigned", e.target.value)}>
                  <option value="">-- Select Truck --</option>
                  {trucks.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.size})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Number of Movers</label>
                <input className={inputClass} type="number" value={form.num_movers} onChange={(e) => set("num_movers", e.target.value)} placeholder="e.g. 2" min="1" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estimated Hours</label>
                <input className={inputClass} type="number" value={form.estimated_hours} onChange={(e) => set("estimated_hours", e.target.value)} placeholder="Hours" step="0.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Price ($)</label>
                <input className={inputClass} type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Deposit Paid ($)</label>
                <input className={inputClass} type="number" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Balance Due ($)</label>
                <input className={inputClass} type="number" value={form.balance_due} onChange={(e) => set("balance_due", e.target.value)} placeholder="0.00" step="0.01" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Payment Method</label>
                <select className={selectClass} value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
                  <option value="">-- Select --</option>
                  {["Cash","Card","Bank Transfer","Invoice"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Internal Notes</label>
                <textarea className={inputClass} rows={2} value={form.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} placeholder="Internal staff notes..." />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm px-4 py-2 border border-gray-300 rounded-lg">
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <Link to="/bookings" className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2 border border-gray-300 rounded-lg">Cancel</Link>
          )}
        </div>
        <div>
          {step < 5 ? (
            <button type="button" onClick={() => setStep(step + 1)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSave} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50">
              <Save size={16} /> {saveMutation.isPending ? "Saving..." : (isEdit ? "Save Changes" : "Create Booking")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}