import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Save, ArrowLeft, Plus, Trash2, User, Wrench, MapPin, Package, Truck, Check, Mail, CalendarDays, X } from "lucide-react";
import DiaryModal from "../components/DiaryModal";
import ItemsSelector from "../components/ItemsSelector";

const TABS = [
  { id: "customer", label: "Customer", icon: User },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "services", label: "Services", icon: Wrench },
  { id: "content", label: "Content", icon: Package },
  { id: "summary", label: "Summary & Pricing", icon: Truck },
];

const SERVICE_OPTIONS = ["Packaging Supplies", "Packing", "Moving", "Unpacking"];

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";
const emptyAddress = { address: "", suburb: "", state: "VIC", postcode: "", floor: "", elevator: false };

const Section = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow mb-5">
    <div className="px-6 py-3 border-b-2 border-blue-500">
      <h2 className="font-semibold text-gray-800">{title}</h2>
    </div>
    <div className="px-6 py-4">{children}</div>
  </div>
);

const Field = ({ label, children, required, full }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <label className="block text-sm text-gray-600 mb-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

function SummaryRow({ label, value }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 min-w-24">{label}:</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}

function recommendTruck(items) {
  const count = items.length;
  if (count <= 5) return { size: "Small (4t)", movers: 2, baseHours: 3, rate: 160 };
  if (count <= 12) return { size: "Medium (8t)", movers: 2, baseHours: 4, rate: 180 };
  if (count <= 22) return { size: "Large (12t)", movers: 3, baseHours: 5, rate: 220 };
  return { size: "Extra Large (14t)", movers: 3, baseHours: 6, rate: 250 };
}

export default function AddEditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id && id !== "new";

  const [tab, setTab] = useState("customer");

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => base44.entities.Agent.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: existing } = useQuery({ queryKey: ["booking", id], queryFn: () => base44.entities.Booking.get(id), enabled: isEdit });

  const [form, setForm] = useState({
    status: "New", booking_number: "",
    customer_first_name: "", customer_last_name: "", customer_email: "",
    customer_mobile: "", customer_phone_info: "", customer_type: "Residential",
    agent_quoted: user?.full_name || "", agent_booked: user?.full_name || "", agent_inquired: user?.full_name || "", agent_pending: user?.full_name || "",
    selected_services: [],
    pickup_address: "", pickup_suburb: "", pickup_state: "VIC", pickup_postcode: "", pickup_floor: "", pickup_elevator: false,
    delivery_address: "", delivery_suburb: "", delivery_state: "VIC", delivery_postcode: "", delivery_floor: "", delivery_elevator: false,
    additional_stops: [],
    move_date: "", move_time: "", service_type: "",
    items_to_move: [],
    packaging_supplies_date: "", packaging_supplies_time: "", packaging_supplies_price: "",
    packing_date: "", packing_time: "",
    packing_rate_per_hour: "", packing_num_people: "", packing_hours: "", packing_total: "",
    moving_date: "", moving_time: "",
    moving_rates_config: {}, moving_rate_per_hour: "", moving_num_people: "", moving_truck_size: "", moving_hours: "", moving_total: "",
    unpacking_date: "", unpacking_time: "",
    unpacking_rate_per_hour: "", unpacking_num_people: "", unpacking_hours: "", unpacking_total: "",
    distance_km: "",
    num_movers: "", truck_size: "", truck_assigned: "",
    estimated_hours: "", actual_hours: "",
    price: "", deposit: "", balance_due: "", payment_method: "",
    notes: "", internal_notes: "",
  });

  const [extraStops, setExtraStops] = useState([]);

  useEffect(() => {
    if (existing) {
      let parsedRates = {};
      if (existing.moving_rates_config) { try { parsedRates = JSON.parse(existing.moving_rates_config); } catch(e) {} }
      setForm((f) => ({ ...f, ...existing, items_to_move: existing.items_to_move || [], moving_rates_config: parsedRates }));
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookings"] }); navigate("/bookings"); },
  });

  const handleSave = () => {
    const data = {
      ...form,
      moving_rates_config: JSON.stringify(form.moving_rates_config || {}),
      additional_stops: extraStops.filter((s) => s.address || s.suburb).map((s) => [s.address, s.suburb, s.state].filter(Boolean).join(", ")),
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

  const [sendingEmail, setSendingEmail] = useState(false);
  const [aiQuoting, setAiQuoting] = useState(false);

  const handleAiQuote = async () => {
    if ((form.items_to_move || []).length === 0) { alert("Please add items to the inventory first."); return; }
    setAiQuoting(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a removalist quoting expert for Move On Australia in Australia. Based on the following job details, provide a professional quote.

Items to move:
${form.items_to_move.map(i => "- " + i).join("\n")}

Pickup: ${[form.pickup_address, form.pickup_suburb, form.pickup_state].filter(Boolean).join(", ") || "Unknown"}
Delivery: ${[form.delivery_address, form.delivery_suburb, form.delivery_state].filter(Boolean).join(", ") || "Unknown"}
${form.distance_km ? `Distance between pickup and delivery: ${form.distance_km} km` : `Estimate the driving distance between the pickup and delivery locations and factor it into the quote.`}
Customer type: ${form.customer_type || "Residential"}
Service type: ${form.service_type || "House Removal"}
${form.pickup_floor ? `Pickup floor/level: ${form.pickup_floor}` : ""}
${form.pickup_elevator ? "Pickup has elevator access" : "No elevator at pickup"}
${form.delivery_floor ? `Delivery floor/level: ${form.delivery_floor}` : ""}
${form.delivery_elevator ? "Delivery has elevator access" : "No elevator at delivery"}

Provide a realistic Australian removalist quote. Factor in: item volume and weight, floor access difficulty, travel distance (include travel time cost at the hourly rate), and current Australian market rates (typically $150-$280/hr for 2-3 movers). For longer distances over 30km add a travel surcharge.`,
      response_json_schema: {
        type: "object",
        properties: {
          truck_size: { type: "string", enum: ["Small (4t)", "Medium (8t)", "Large (12t)", "Extra Large (14t)"] },
          num_movers: { type: "number" },
          estimated_hours: { type: "number" },
          price: { type: "number" },
          reasoning: { type: "string" }
        }
      }
    });
    if (result) {
      if (result.truck_size) set("truck_size", result.truck_size);
      if (result.num_movers) set("num_movers", result.num_movers);
      if (result.estimated_hours) set("estimated_hours", result.estimated_hours);
      if (result.price) set("price", result.price);
      setAiReasoning(result.reasoning || "");
    }
    setAiQuoting(false);
  };

  const [aiReasoning, setAiReasoning] = useState("");
  const [showDiary, setShowDiary] = useState(false);
  const [showAiEmailModal, setShowAiEmailModal] = useState(false);
  const [aiEmailDraft, setAiEmailDraft] = useState("");
  const [aiEmailSubject, setAiEmailSubject] = useState("");
  const [aiEmailPrompt, setAiEmailPrompt] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingAiEmail, setSendingAiEmail] = useState(false);

  const handleGenerateAiEmail = async () => {
    setGeneratingEmail(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional customer service agent for Move On Australia, a removalist company. 
Draft a professional, friendly email reply to a customer based on the following booking context and staff instruction.

Customer: ${form.customer_first_name} ${form.customer_last_name}
Email: ${form.customer_email || 'unknown'}
Move Date: ${form.move_date || 'TBC'}
Pickup: ${[form.pickup_suburb, form.pickup_state].filter(Boolean).join(', ') || 'TBC'}
Delivery: ${[form.delivery_suburb, form.delivery_state].filter(Boolean).join(', ') || 'TBC'}
Service: ${form.service_type || 'House Removal'}
Status: ${form.status}
${form.price ? `Quoted Price: $${form.price}` : ''}
${form.items_to_move?.length ? `Items to move: ${form.items_to_move.join(', ')}` : ''}

Staff instruction / context for this reply:
${aiEmailPrompt || 'Write a general follow-up email confirming the booking details and offering to answer any questions.'}

Write the email body only (no subject line in the body). Address the customer by first name. Sign off as "The Move On Australia Team". Keep it concise and professional.`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" }
        }
      }
    });
    if (result) {
      setAiEmailSubject(result.subject || `Re: Your Move on ${form.move_date || 'upcoming date'}`);
      setAiEmailDraft(result.body || "");
    }
    setGeneratingEmail(false);
  };

  const handleSendAiEmail = async () => {
    if (!form.customer_email) { alert("No customer email on file."); return; }
    setSendingAiEmail(true);
    const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Move On Australia</h1>
  </div>
  <div style="padding:20px;border:1px solid #e2e8f0;border-top:none;white-space:pre-line;">${aiEmailDraft}</div>
  <div style="background:#f1f5f9;padding:12px 20px;border-radius:0 0 8px 8px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Move On Australia</p>
  </div>
</div>`;
    await base44.integrations.Core.SendEmail({ to: form.customer_email, subject: aiEmailSubject, body: htmlBody });
    setSendingAiEmail(false);
    setShowAiEmailModal(false);
    alert("Email sent to " + form.customer_email);
  };

  const handleSendEmail = async () => {
    if (!form.customer_email) { alert("No customer email address on file."); return; }
    setSendingEmail(true);

    const itemsHtml = (form.items_to_move || []).length > 0
      ? `<h3 style="color:#1e40af;margin-top:24px;margin-bottom:8px;">📦 Items to Move</h3>
         <table style="width:100%;border-collapse:collapse;">
           ${form.items_to_move.map((item, i) => `
             <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'}">
               <td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:14px;">✓ ${item}</td>
             </tr>`).join("")}
         </table>`
      : `<p style="color:#64748b;font-style:italic;">No items listed yet.</p>`;

    const body = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:22px;">Move On Australia</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;">Removal Quote</p>
  </div>
  <div style="background:#f1f5f9;padding:16px 20px;">
    <p style="margin:0;font-size:14px;color:#475569;">Quote prepared for <strong>${form.customer_first_name} ${form.customer_last_name}</strong></p>
  </div>
  <div style="padding:20px;border:1px solid #e2e8f0;border-top:none;">
    <p>Dear ${form.customer_first_name},</p>
    <p>Thank you for choosing Move On Australia. Please find your removal quote details below.</p>

    <h3 style="color:#1e40af;margin-top:24px;margin-bottom:8px;">📅 Move Details</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;width:140px;">Move Date</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.move_date || 'TBC'}${form.move_time ? ' at ' + form.move_time : ''}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Pickup</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${[form.pickup_address, form.pickup_suburb, form.pickup_state, form.pickup_postcode].filter(Boolean).join(', ') || 'TBC'}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Delivery</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${[form.delivery_address, form.delivery_suburb, form.delivery_state, form.delivery_postcode].filter(Boolean).join(', ') || 'TBC'}</td></tr>
      ${form.service_type ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Service</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.service_type}</td></tr>` : ''}
      ${form.num_movers ? `<tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Movers</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.num_movers} movers</td></tr>` : ''}
      ${form.truck_size ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Truck</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.truck_size}</td></tr>` : ''}
    </table>

    ${itemsHtml}

    ${form.price ? `
    <h3 style="color:#1e40af;margin-top:24px;margin-bottom:8px;">💰 Pricing</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#eff6ff;"><td style="padding:8px 10px;border:1px solid #bfdbfe;font-weight:bold;font-size:16px;">Total Quote</td><td style="padding:8px 10px;border:1px solid #bfdbfe;font-weight:bold;font-size:16px;color:#1d4ed8;">$${Number(form.price).toLocaleString()}</td></tr>
      ${form.deposit ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;">Deposit Required</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">$${Number(form.deposit).toLocaleString()}</td></tr>` : ''}
    </table>` : ''}

    ${form.notes ? `<h3 style="color:#1e40af;margin-top:24px;margin-bottom:8px;">📝 Notes</h3><p style="background:#f8fafc;padding:12px;border-left:4px solid #3b82f6;margin:0;">${form.notes}</p>` : ''}

    <p style="margin-top:24px;">If you have any questions or would like to confirm your booking, please don't hesitate to contact us.</p>
    <p>Thank you,<br/><strong>Move On Australia Team</strong></p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;border-radius:0 0 8px 8px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated quote from Move On Australia</p>
  </div>
</div>`;

    await base44.integrations.Core.SendEmail({
      to: form.customer_email,
      subject: `Removal Quote \u2013 ${form.move_date || 'Your Move'} | Move On Australia`,
      body,
    });
    setSendingEmail(false);
    alert("Quote email sent to " + form.customer_email);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/bookings" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <nav className="text-xs text-gray-400 mb-1">
              Home › <Link to="/bookings" className="hover:underline">Bookings</Link> › {isEdit ? "Edit Booking" : "New Booking"}
            </nav>
            <h1 className="text-2xl font-bold text-gray-800">{isEdit ? "Edit Booking" : "New Booking"}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowDiary(true)}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
          >
            <CalendarDays size={16} /> Diary
          </button>
          {form.customer_email && (
            <>
              <button
                type="button"
                onClick={() => { setAiEmailPrompt(""); setAiEmailDraft(""); setAiEmailSubject(""); setShowAiEmailModal(true); }}
                className="bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
              >
                <Mail size={16} /> ✨ AI Reply
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Mail size={16} /> {sendingEmail ? "Sending..." : "Send Quote"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} /> {saveMutation.isPending ? "Saving..." : (isEdit ? "Save Changes" : "Create Booking")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-lg shadow px-4 pt-3 mb-5 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const hasContent = t.id === "content" && (form.items_to_move || []).length > 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap -mb-px ${
                active ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon size={15} />
              {t.label}
              {hasContent && (
                <span className="bg-blue-100 text-blue-700 text-xs rounded-full px-1.5 py-0.5 font-semibold">
                  {form.items_to_move.length}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1 border-b-2 border-transparent -mb-px" />
      </div>

      {/* TAB: Customer */}
      {tab === "customer" && (
        <Section title="Customer Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input className={inputClass} value={form.customer_first_name} onChange={(e) => set("customer_first_name", e.target.value)} placeholder="First name" />
            </Field>
            <Field label="Last Name" required>
              <input className={inputClass} value={form.customer_last_name} onChange={(e) => set("customer_last_name", e.target.value)} placeholder="Last name" />
            </Field>
            <Field label="Mobile">
              <input className={inputClass} value={form.customer_mobile} onChange={(e) => set("customer_mobile", e.target.value)} placeholder="Mobile number" />
            </Field>
            <Field label="Phone / Call Info">
              <input className={inputClass} value={form.customer_phone_info} onChange={(e) => set("customer_phone_info", e.target.value)} placeholder="Phone or call notes" />
            </Field>
            <Field label="Email">
              <input className={inputClass} type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="Email address" />
            </Field>
            <Field label="Customer Type">
              <select className={selectClass} value={form.customer_type} onChange={(e) => set("customer_type", e.target.value)}>
                <option>Residential</option><option>Commercial</option><option>Office</option>
              </select>
            </Field>

            <Field label="Booking Number">
              <input className={inputClass} value={form.booking_number} onChange={(e) => set("booking_number", e.target.value)} placeholder="Auto-generated if blank" />
            </Field>
          </div>
        </Section>
      )}

      {/* TAB: Services */}
      {tab === "services" && (
        <>
          <Section title="Services">
            <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
              {SERVICE_OPTIONS.map((svc) => {
                const active = (form.selected_services || []).includes(svc);
                const dateKey = svc === "Packaging Supplies" ? "packaging_supplies_date" : svc === "Packing" ? "packing_date" : svc === "Moving" ? "moving_date" : "unpacking_date";
                const timeKey = svc === "Packaging Supplies" ? "packaging_supplies_time" : svc === "Packing" ? "packing_time" : svc === "Moving" ? "moving_time" : "unpacking_time";
                return (
                  <div key={svc} className={`rounded-lg border-2 transition-all ${active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <button type="button" onClick={() => toggleService(svc)} className="w-full p-3 text-left">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 ${active ? "bg-blue-500" : "bg-gray-100"}`}>
                        {active ? <Check size={13} className="text-white" /> : <Wrench size={13} className="text-gray-400" />}
                      </div>
                      <p className={`font-medium text-sm ${active ? "text-blue-800" : "text-gray-600"}`}>{svc}</p>
                    </button>
                    {active && (
                      <div className="px-3 pb-3 flex flex-col gap-2">
                        <div>
                          <label className="block text-xs text-blue-600 mb-1">Date</label>
                          <input
                            className="w-full border border-blue-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                            type="date"
                            value={form[dateKey] || ""}
                            onChange={(e) => set(dateKey, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-blue-600 mb-1">Time</label>
                          <input
                            className="w-full border border-blue-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                            type="time"
                            value={form[timeKey] || ""}
                            onChange={(e) => set(timeKey, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>


                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* TAB: Addresses */}
      {tab === "addresses" && (
        <>
          <Section title="Pickup Location">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Street Address" full>
                <input className={inputClass} value={form.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} placeholder="Street address" />
              </Field>
              <Field label="Suburb">
                <input className={inputClass} value={form.pickup_suburb} onChange={(e) => set("pickup_suburb", e.target.value)} placeholder="Suburb" />
              </Field>
              <Field label="State">
                <input className={inputClass} value={form.pickup_state} onChange={(e) => set("pickup_state", e.target.value)} placeholder="State" />
              </Field>
              <Field label="Postcode">
                <input className={inputClass} value={form.pickup_postcode} onChange={(e) => set("pickup_postcode", e.target.value)} placeholder="Postcode" />
              </Field>
              <Field label="Floor / Level">
                <input className={inputClass} value={form.pickup_floor} onChange={(e) => set("pickup_floor", e.target.value)} placeholder="Floor or level" />
              </Field>
              <Field label="Elevator Available">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={!!form.pickup_elevator} onChange={(e) => set("pickup_elevator", e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-gray-600">Yes, there is an elevator</span>
                </label>
              </Field>
            </div>
          </Section>

          {extraStops.map((stop, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow mb-5">
              <div className="px-6 py-3 border-b-2 border-yellow-400 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Extra Stop {idx + 1}</h2>
                <button type="button" onClick={() => setExtraStops(extraStops.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-sm flex items-center gap-1">
                  <Trash2 size={14} /> Remove
                </button>
              </div>
              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Street Address" full>
                  <input className={inputClass} value={stop.address} onChange={(e) => { const s = [...extraStops]; s[idx].address = e.target.value; setExtraStops(s); }} placeholder="Street address" />
                </Field>
                <Field label="Suburb">
                  <input className={inputClass} value={stop.suburb} onChange={(e) => { const s = [...extraStops]; s[idx].suburb = e.target.value; setExtraStops(s); }} placeholder="Suburb" />
                </Field>
                <Field label="State">
                  <input className={inputClass} value={stop.state} onChange={(e) => { const s = [...extraStops]; s[idx].state = e.target.value; setExtraStops(s); }} placeholder="State" />
                </Field>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setExtraStops([...extraStops, { ...emptyAddress }])}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-5 border border-blue-200 rounded px-3 py-2 hover:bg-blue-50">
            <Plus size={14} /> Add extra stop
          </button>

          <Section title="Delivery Location">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Street Address" full>
                <input className={inputClass} value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)} placeholder="Street address" />
              </Field>
              <Field label="Suburb">
                <input className={inputClass} value={form.delivery_suburb} onChange={(e) => set("delivery_suburb", e.target.value)} placeholder="Suburb" />
              </Field>
              <Field label="State">
                <input className={inputClass} value={form.delivery_state} onChange={(e) => set("delivery_state", e.target.value)} placeholder="State" />
              </Field>
              <Field label="Postcode">
                <input className={inputClass} value={form.delivery_postcode} onChange={(e) => set("delivery_postcode", e.target.value)} placeholder="Postcode" />
              </Field>
              <Field label="Floor / Level">
                <input className={inputClass} value={form.delivery_floor} onChange={(e) => set("delivery_floor", e.target.value)} placeholder="Floor or level" />
              </Field>
              <Field label="Elevator Available">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={!!form.delivery_elevator} onChange={(e) => set("delivery_elevator", e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-gray-600">Yes, there is an elevator</span>
                </label>
              </Field>
            </div>
          </Section>

        </>
      )}

      {/* TAB: Content */}
      {tab === "content" && (
        <>
          <Section title="List of Contents">
            <p className="text-sm text-gray-500 mb-3">Search and add all items being moved. You can also type a custom item and press Enter.</p>
            <ItemsSelector value={form.items_to_move || []} onChange={(v) => set("items_to_move", v)} />
            {(form.items_to_move || []).length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                {form.items_to_move.length} item{form.items_to_move.length !== 1 ? "s" : ""} added
              </p>
            )}
          </Section>
          <Section title="Notes">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Additional Notes for Contents">
                <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any special items, fragile goods, or other notes..." />
              </Field>
            </div>
          </Section>
        </>
      )}

      {/* TAB: Summary & Pricing */}
      {tab === "summary" && (
        <>
          <Section title="Booking Summary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SummaryRow label="Customer" value={`${form.customer_first_name} ${form.customer_last_name}`} />
              <SummaryRow label="Mobile" value={form.customer_mobile || "—"} />
              <SummaryRow label="Services" value={(form.selected_services || []).join(", ") || "—"} />
              <SummaryRow label="Move Date" value={form.move_date || "—"} />
              <SummaryRow label="Pickup" value={form.pickup_suburb || form.pickup_address || "—"} />
              <SummaryRow label="Delivery" value={form.delivery_suburb || form.delivery_address || "—"} />
              <SummaryRow label="Items" value={`${(form.items_to_move || []).length} items`} />
            </div>
          </Section>

          <div className="flex gap-3 mb-5">
            <button
              type="button"
              onClick={handleAiQuote}
              disabled={aiQuoting || (form.items_to_move || []).length === 0}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {aiQuoting ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating Quote...</>
              ) : (
                <>✨ AI Generate Quote</>
              )}
            </button>
            {(form.items_to_move || []).length === 0 && (
              <p className="text-xs text-gray-400 self-center">Add items to the inventory first</p>
            )}
          </div>

          {aiReasoning && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-5">
              <p className="text-xs font-semibold text-purple-700 mb-1">✨ AI Quote Reasoning</p>
              <p className="text-sm text-purple-800">{aiReasoning}</p>
              <p className="text-xs text-purple-500 mt-2">Pricing fields have been auto-filled below. Review and adjust as needed.</p>
            </div>
          )}

          {(form.items_to_move || []).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
              <p className="text-sm font-semibold text-blue-800 mb-1">
                Recommended based on {form.items_to_move.length} items:
              </p>
              <p className="text-sm text-blue-700">
                Truck: <strong>{rec.size}</strong> &middot; {rec.movers} Movers &middot; ~{rec.baseHours} hrs &middot; Est. <strong>${rec.baseHours * rec.rate}</strong>
              </p>
              <button type="button" onClick={applyRecommendation} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded">
                Apply Recommendation
              </button>
            </div>
          )}

          <Section title="Truck & Pricing">

            {/* Packing Rates */}
            {(form.selected_services || []).includes("Packing") && (
              <div className="mb-5 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-3">📦 Packing Pricing</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Rate ($/hr)</label>
                    <input className={inputClass} type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.packing_rate_per_hour || ""}
                      onChange={(e) => { const r = e.target.value; set("packing_rate_per_hour", r); if (r && form.packing_hours) set("packing_total", (parseFloat(r) * parseFloat(form.packing_hours)).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1"># People</label>
                    <input className={inputClass} type="number" min="1" step="1" placeholder="e.g. 2"
                      value={form.packing_num_people || ""}
                      onChange={(e) => set("packing_num_people", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hours</label>
                    <input className={inputClass} type="number" min="0" step="0.5" placeholder="0"
                      value={form.packing_hours || ""}
                      onChange={(e) => { const h = e.target.value; set("packing_hours", h); if (form.packing_rate_per_hour && h) set("packing_total", (parseFloat(form.packing_rate_per_hour) * parseFloat(h)).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Total ($)</label>
                    <input className={inputClass} type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.packing_total || ""}
                      onChange={(e) => set("packing_total", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Moving Rates */}
            {(form.selected_services || []).includes("Moving") && (
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 mb-3">🚚 Moving Pricing</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Rate ($/hr)</label>
                    <input className={inputClass} type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.moving_rate_per_hour || ""}
                      onChange={(e) => { const r = e.target.value; set("moving_rate_per_hour", r); if (r && form.moving_hours) set("moving_total", (parseFloat(r) * parseFloat(form.moving_hours)).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1"># People</label>
                    <input className={inputClass} type="number" min="1" step="1" placeholder="e.g. 2"
                      value={form.moving_num_people || ""}
                      onChange={(e) => set("moving_num_people", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hours</label>
                    <input className={inputClass} type="number" min="0" step="0.5" placeholder="0"
                      value={form.moving_hours || ""}
                      onChange={(e) => { const h = e.target.value; set("moving_hours", h); if (form.moving_rate_per_hour && h) set("moving_total", (parseFloat(form.moving_rate_per_hour) * parseFloat(h)).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Total ($)</label>
                    <input className={inputClass} type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.moving_total || ""}
                      onChange={(e) => set("moving_total", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Unpacking Rates */}
            {(form.selected_services || []).includes("Unpacking") && (
              <div className="mb-5 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-purple-800 mb-3">📦 Unpacking Pricing</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Rate ($/hr)</label>
                    <input className={inputClass} type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.unpacking_rate_per_hour || ""}
                      onChange={(e) => { const r = e.target.value; set("unpacking_rate_per_hour", r); if (r && form.unpacking_hours) set("unpacking_total", (parseFloat(r) * parseFloat(form.unpacking_hours)).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1"># People</label>
                    <input className={inputClass} type="number" min="1" step="1" placeholder="e.g. 2"
                      value={form.unpacking_num_people || ""}
                      onChange={(e) => set("unpacking_num_people", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hours</label>
                    <input className={inputClass} type="number" min="0" step="0.5" placeholder="0"
                      value={form.unpacking_hours || ""}
                      onChange={(e) => { const h = e.target.value; set("unpacking_hours", h); if (form.unpacking_rate_per_hour && h) set("unpacking_total", (parseFloat(form.unpacking_rate_per_hour) * parseFloat(h)).toFixed(2)); }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Total ($)</label>
                    <input className={inputClass} type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.unpacking_total || ""}
                      onChange={(e) => set("unpacking_total", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Distance Between Locations (km)">
                <input className={inputClass} type="number" value={form.distance_km} onChange={(e) => set("distance_km", e.target.value)} placeholder="e.g. 25 (optional — AI will estimate if blank)" min="0" />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Field label="Truck Size">
                <select className={selectClass} value={form.truck_size} onChange={(e) => set("truck_size", e.target.value)}>
                  <option value="">-- Select Truck Size --</option>
                  {["2T","5T","6T","10T","12T"].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Truck Assigned">
                <select className={selectClass} value={form.truck_assigned} onChange={(e) => set("truck_assigned", e.target.value)}>
                  <option value="">-- Select Truck --</option>
                  {trucks.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.size})</option>)}
                </select>
              </Field>
              <Field label="Number of Movers">
                <input className={inputClass} type="number" value={form.num_movers} onChange={(e) => set("num_movers", e.target.value)} placeholder="e.g. 2" min="1" />
              </Field>
              <Field label="Estimated Hours">
                <input className={inputClass} type="number" value={form.estimated_hours} onChange={(e) => set("estimated_hours", e.target.value)} placeholder="Hours" step="0.5" />
              </Field>
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
              <Field label="Internal Notes" full>
                <textarea className={inputClass} rows={2} value={form.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} placeholder="Internal staff notes..." />
              </Field>
            </div>
          </Section>
        </>
      )}

      {showDiary && (
        <DiaryModal onClose={() => setShowDiary(false)} initialDate={form.move_date || undefined} />
      )}

      {showAiEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">✨ AI Email Reply</h2>
                <p className="text-sm text-gray-500">To: {form.customer_email}</p>
              </div>
              <button onClick={() => setShowAiEmailModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What should the AI reply about?</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={aiEmailPrompt}
                  onChange={(e) => setAiEmailPrompt(e.target.value)}
                  placeholder="e.g. Confirm the booking for Friday, mention we'll call the day before, ask if they need packing materials..."
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateAiEmail}
                disabled={generatingEmail}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {generatingEmail ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                ) : (
                  <>✨ Generate Draft</>
                )}
              </button>
              {aiEmailDraft && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input className={inputClass} value={aiEmailSubject} onChange={(e) => setAiEmailSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Body (editable)</label>
                    <textarea
                      className={inputClass}
                      rows={12}
                      value={aiEmailDraft}
                      onChange={(e) => setAiEmailDraft(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            {aiEmailDraft && (
              <div className="px-5 py-4 border-t flex justify-end gap-2">
                <button onClick={() => setShowAiEmailModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleSendAiEmail}
                  disabled={sendingAiEmail}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 flex items-center gap-2"
                >
                  <Mail size={14} /> {sendingAiEmail ? "Sending..." : "Send Email"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}