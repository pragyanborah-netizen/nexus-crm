import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Save, ArrowLeft, Mail, Sparkles } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow mb-5">
    <div className="px-6 py-3 border-b-2 border-blue-500">
      <h2 className="font-semibold text-gray-800">{title}</h2>
    </div>
    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, children, required, full }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="block text-sm text-gray-600 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
    {children}
  </div>
);

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";

export default function AddEditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id && id !== "new";

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

  const [emailText, setEmailText] = useState("");
  const [showEmailParser, setShowEmailParser] = useState(false);
  const [parsing, setParsing] = useState(false);

  const parseEmail = async () => {
    if (!emailText.trim()) return;
    setParsing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract customer details from this email. Return only what you can find.\n\nEmail:\n${emailText}`,
      response_json_schema: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          mobile: { type: "string" },
          pickup_address: { type: "string" },
          pickup_suburb: { type: "string" },
          delivery_address: { type: "string" },
          delivery_suburb: { type: "string" },
          move_date: { type: "string" },
          notes: { type: "string" },
        }
      }
    });
    setParsing(false);
    setForm((f) => ({
      ...f,
      customer_first_name: result.first_name || f.customer_first_name,
      customer_last_name: result.last_name || f.customer_last_name,
      customer_email: result.email || f.customer_email,
      customer_mobile: result.mobile || f.customer_mobile,
      pickup_address: result.pickup_address || f.pickup_address,
      pickup_suburb: result.pickup_suburb || f.pickup_suburb,
      delivery_address: result.delivery_address || f.delivery_address,
      delivery_suburb: result.delivery_suburb || f.delivery_suburb,
      move_date: result.move_date || f.move_date,
      notes: result.notes || f.notes,
    }));
    setShowEmailParser(false);
    setEmailText("");
  };

  const [form, setForm] = useState({
    status: "New", customer_type: "Residential", booking_number: "",
    agent_quoted: "", agent_booked: "", agent_inquired: "",
    customer_first_name: "", customer_last_name: "", customer_email: "",
    customer_mobile: "", customer_phone_info: "", 
    pickup_address: "", pickup_suburb: "", pickup_state: "VIC", pickup_postcode: "", pickup_floor: "", pickup_elevator: false,
    delivery_address: "", delivery_suburb: "", delivery_state: "VIC", delivery_postcode: "", delivery_floor: "", delivery_elevator: false,
    move_date: "", move_time: "", service_type: "", num_movers: "", truck_size: "", truck_assigned: "",
    estimated_hours: "", actual_hours: "", price: "", deposit: "", balance_due: "", payment_method: "",
    notes: "", internal_notes: "",
  });

  useEffect(() => {
    if (existing) setForm({ ...form, ...existing });
  }, [existing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? base44.entities.Booking.update(id, data) : base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      navigate("/bookings");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const agentOptions = agents.filter((a) => a.active !== false);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/bookings" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home &rsaquo; <Link to="/bookings" className="hover:underline">Bookings</Link> &rsaquo; {isEdit ? "Edit Booking" : "Add new Booking"}</nav>
          <h1 className="text-2xl font-bold text-gray-800">{isEdit ? "Edit Booking" : "Add new Booking"}</h1>
        </div>
      </div>

      {/* Email Parser */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-blue-600" />
            <span className="font-medium text-blue-800 text-sm">Import from Email</span>
            <span className="text-blue-500 text-xs">Paste a customer email and AI will fill the form automatically</span>
          </div>
          <button type="button" onClick={() => setShowEmailParser(!showEmailParser)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            {showEmailParser ? "Hide" : "Paste Email"}
          </button>
        </div>
        {showEmailParser && (
          <div className="mt-3">
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Paste the customer's email here..."
              rows={5}
              className="w-full border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={parseEmail}
                disabled={parsing || !emailText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={14} />
                {parsing ? "Extracting details..." : "Auto-fill from Email"}
              </button>
              <button type="button" onClick={() => { setShowEmailParser(false); setEmailText(""); }} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Status + Booking # */}
        <Section title="Booking Info">
          <Field label="Booking Number">
            <input className={inputClass} value={form.booking_number} onChange={(e) => set("booking_number", e.target.value)} placeholder="Auto-generated if blank" />
          </Field>
          <Field label="Status">
            <select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {["New","Confirmed","In Progress","Completed","Cancelled","No Show"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </Section>

        {/* Agents */}
        <Section title="Agents">
          <Field label="Agent who Quoted">
            <select className={selectClass} value={form.agent_quoted} onChange={(e) => set("agent_quoted", e.target.value)}>
              <option value="">-- Select Agent --</option>
              {agentOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Agent who Booked">
            <select className={selectClass} value={form.agent_booked} onChange={(e) => set("agent_booked", e.target.value)}>
              <option value="">-- Select Agent --</option>
              {agentOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Agent who Inquired">
            <select className={selectClass} value={form.agent_inquired} onChange={(e) => set("agent_inquired", e.target.value)}>
              <option value="">-- Select Agent --</option>
              {agentOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </Field>
        </Section>

        {/* Customer */}
        <Section title="Customer Detail *">
          <Field label="First Name" required>
            <input className={inputClass} value={form.customer_first_name} onChange={(e) => set("customer_first_name", e.target.value)} placeholder="First Name" required />
          </Field>
          <Field label="Last Name" required>
            <input className={inputClass} value={form.customer_last_name} onChange={(e) => set("customer_last_name", e.target.value)} placeholder="Last Name" required />
          </Field>
          <Field label="Email">
            <input className={inputClass} type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="Email" />
          </Field>
          <Field label="Mobile">
            <input className={inputClass} value={form.customer_mobile} onChange={(e) => set("customer_mobile", e.target.value)} placeholder="Mobile" />
          </Field>
          <Field label="Phone Call Info">
            <input className={inputClass} value={form.customer_phone_info} onChange={(e) => set("customer_phone_info", e.target.value)} placeholder="Phone or Phone Call Info" />
          </Field>
          <Field label="Type">
            <select className={selectClass} value={form.customer_type} onChange={(e) => set("customer_type", e.target.value)}>
              <option>Residential</option>
              <option>Commercial</option>
              <option>Office</option>
            </select>
          </Field>
        </Section>

        {/* Pickup */}
        <Section title="Pickup Details">
          <Field label="Pickup Address" full>
            <input className={inputClass} value={form.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} placeholder="Pickup Address" />
          </Field>
          <Field label="Suburb">
            <input className={inputClass} value={form.pickup_suburb} onChange={(e) => set("pickup_suburb", e.target.value)} placeholder="Suburb" />
          </Field>
          <Field label="State">
            <input className={inputClass} value={form.pickup_state} onChange={(e) => set("pickup_state", e.target.value)} placeholder="VIC" />
          </Field>
          <Field label="Postcode">
            <input className={inputClass} value={form.pickup_postcode} onChange={(e) => set("pickup_postcode", e.target.value)} placeholder="Postcode" />
          </Field>
          <Field label="Floor / Level">
            <input className={inputClass} value={form.pickup_floor} onChange={(e) => set("pickup_floor", e.target.value)} placeholder="Floor or level" />
          </Field>
          <Field label="Elevator Available">
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={form.pickup_elevator} onChange={(e) => set("pickup_elevator", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-600">Yes, there is an elevator</span>
            </label>
          </Field>
        </Section>

        {/* Delivery */}
        <Section title="Delivery Details">
          <Field label="Delivery Address" full>
            <input className={inputClass} value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)} placeholder="Delivery Address" />
          </Field>
          <Field label="Suburb">
            <input className={inputClass} value={form.delivery_suburb} onChange={(e) => set("delivery_suburb", e.target.value)} placeholder="Suburb" />
          </Field>
          <Field label="State">
            <input className={inputClass} value={form.delivery_state} onChange={(e) => set("delivery_state", e.target.value)} placeholder="VIC" />
          </Field>
          <Field label="Postcode">
            <input className={inputClass} value={form.delivery_postcode} onChange={(e) => set("delivery_postcode", e.target.value)} placeholder="Postcode" />
          </Field>
          <Field label="Floor / Level">
            <input className={inputClass} value={form.delivery_floor} onChange={(e) => set("delivery_floor", e.target.value)} placeholder="Floor or level" />
          </Field>
          <Field label="Elevator Available">
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={form.delivery_elevator} onChange={(e) => set("delivery_elevator", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-600">Yes, there is an elevator</span>
            </label>
          </Field>
        </Section>

        {/* Move Details */}
        <Section title="Move Details">
          <Field label="Move Date" required>
            <input className={inputClass} type="date" value={form.move_date} onChange={(e) => set("move_date", e.target.value)} required />
          </Field>
          <Field label="Move Time">
            <input className={inputClass} type="time" value={form.move_time} onChange={(e) => set("move_time", e.target.value)} />
          </Field>
          <Field label="Service Type">
            <select className={selectClass} value={form.service_type} onChange={(e) => set("service_type", e.target.value)}>
              <option value="">-- Select Service --</option>
              {["House Removal","Office Removal","Furniture Removal","Packing & Unpacking","Storage","Interstate"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Number of Movers">
            <input className={inputClass} type="number" value={form.num_movers} onChange={(e) => set("num_movers", e.target.value)} placeholder="e.g. 2" min="1" />
          </Field>
          <Field label="Truck Size">
            <select className={selectClass} value={form.truck_size} onChange={(e) => set("truck_size", e.target.value)}>
              <option value="">-- Select Truck Size --</option>
              {["Small (4t)","Medium (8t)","Large (12t)","Extra Large (14t)"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Truck Assigned">
            <select className={selectClass} value={form.truck_assigned} onChange={(e) => set("truck_assigned", e.target.value)}>
              <option value="">-- Select Truck --</option>
              {trucks.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.size})</option>)}
            </select>
          </Field>
          <Field label="Estimated Hours">
            <input className={inputClass} type="number" value={form.estimated_hours} onChange={(e) => set("estimated_hours", e.target.value)} placeholder="Hours" step="0.5" />
          </Field>
          <Field label="Actual Hours">
            <input className={inputClass} type="number" value={form.actual_hours} onChange={(e) => set("actual_hours", e.target.value)} placeholder="Hours" step="0.5" />
          </Field>
        </Section>

        {/* Pricing */}
        <Section title="Pricing & Payment">
          <Field label="Price ($)">
            <input className={inputClass} type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" step="0.01" />
          </Field>
          <Field label="Deposit Paid ($)">
            <input className={inputClass} type="number" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} placeholder="0.00" step="0.01" />
          </Field>
          <Field label="Balance Due ($)">
            <input className={inputClass} type="number" value={form.balance_due} onChange={(e) => set("balance_due", e.target.value)} placeholder="0.00" step="0.01" />
          </Field>
          <Field label="Payment Method">
            <select className={selectClass} value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
              <option value="">-- Select --</option>
              {["Cash","Card","Bank Transfer","Invoice"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <Field label="Customer Notes" full>
            <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes visible to customer..." />
          </Field>
          <Field label="Internal Notes" full>
            <textarea className={inputClass} rows={3} value={form.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} placeholder="Internal staff notes..." />
          </Field>
        </Section>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} /> {saveMutation.isPending ? "Saving..." : (isEdit ? "Save Changes" : "Create Booking")}
          </button>
          <Link to="/bookings" className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2 border border-gray-300 rounded">Cancel</Link>
        </div>
      </form>
    </div>
  );
}