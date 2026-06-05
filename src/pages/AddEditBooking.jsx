import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Save, ArrowLeft, Plus, Trash2, User, Wrench, MapPin, Package, Truck, Check, Mail, CalendarDays, X, Bell, Sparkles, CreditCard } from "lucide-react";
import { jsPDF } from "jspdf";
import DiaryModal from "../components/DiaryModal";
import InvoiceGenerator from "../components/InvoiceGenerator";
import ItemsSelector from "../components/ItemsSelector";
import EmailPreview from "../components/EmailPreview";

const TABS = [
  { id: "customer", label: "Customer", icon: User },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "services", label: "Services & Pricing", icon: Wrench },
  { id: "content", label: "Content and Booking Stage", icon: Package },
  { id: "summary", label: "Summary", icon: Truck },
];

const SERVICE_OPTIONS = ["Packaging Supplies", "Packing", "Moving", "Unpacking"];

const TRUCK_RATES = [
  { label: "5 Tonne Truck",  truckSize: "5T",  movers: 2, rate: 168 },
  { label: "6 Tonne Truck",  truckSize: "6T",  movers: 2, rate: 178 },
  { label: "10 Tonne Truck", truckSize: "10T", movers: 2, rate: 208 },
  { label: "10 Tonne Truck", truckSize: "10T", movers: 3, rate: 278 },
  { label: "12 Tonne Truck", truckSize: "12T", movers: 3, rate: 288 },
];

const SAT_TRUCK_RATES = [
  { label: "2 Tonne Truck",  truckSize: "2T",  movers: 1, rate: 170 },
  { label: "2 Tonne Truck",  truckSize: "2T",  movers: 2, rate: 186 },
  { label: "5 Tonne Truck",  truckSize: "5T",  movers: 2, rate: 196 },
  { label: "6 Tonne Truck",  truckSize: "6T",  movers: 2, rate: 206 },
  { label: "10 Tonne Truck", truckSize: "10T", movers: 2, rate: 246 },
  { label: "10 Tonne Truck", truckSize: "10T", movers: 3, rate: 368 },
  { label: "12 Tonne Truck", truckSize: "12T", movers: 3, rate: 378 },
];

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";
const emptyAddress = { address: "", suburb: "", state: "VIC", postcode: "", floor: "", elevator: false };

const PROPERTY_ACCESS_OPTIONS = [
  "Ground floor", "Stairs", "Elevator", "Narrow street", "Height restrictions",
  "No parking", "Steep driveway", "Overhanging trees", "Low powerlines",
];

function PropertyAccess({ value = [], onChange }) {
  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-sm font-medium text-gray-600 mb-2">Property access</p>
      <div className="flex flex-wrap gap-2">
        {PROPERTY_ACCESS_OPTIONS.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                active
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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

function ServiceFlatRates({ rates, setRates }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">Flat Rate Charges</p>
        <button
          type="button"
          onClick={() => setRates([...rates, { description: "", amount: "" }])}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50"
        >
          <Plus size={13} /> Add Flat Rate
        </button>
      </div>
      {rates.length === 0 && (
        <p className="text-xs text-gray-400 italic">No flat rate charges for this service.</p>
      )}
      {rates.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_130px_36px] gap-2 text-xs text-gray-500 font-medium px-1">
            <span>Description</span><span>Amount ($)</span><span></span>
          </div>
          {rates.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_130px_36px] gap-2 items-center">
              <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Stair carry, Fuel levy" value={row.description}
                onChange={(e) => { const r = [...rates]; r[idx].description = e.target.value; setRates(r); }} />
              <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-right" placeholder="0.00" value={row.amount}
                onChange={(e) => { const r = [...rates]; r[idx].amount = e.target.value; setRates(r); }} />
              <button type="button" onClick={() => setRates(rates.filter((_, i) => i !== idx))}
                className="flex items-center justify-center w-9 h-9 text-red-400 hover:text-red-600 hover:bg-red-50 rounded border border-gray-200">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <p className="text-sm font-semibold text-gray-700">Total: ${rates.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
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
    status: "Enquiry", booking_number: "",
    is_returning_customer: false, returning_contact_method: "",
    customer_first_name: "", customer_last_name: "", customer_email: "",
    customer_mobile: "", customer_phone_info: "", customer_type: "Residential",
    agent_quoted: user?.full_name || "", agent_booked: user?.full_name || "", agent_inquired: user?.full_name || "", agent_pending: user?.full_name || "",
    selected_services: [],
    pickup_address: "", pickup_suburb: "", pickup_state: "VIC", pickup_postcode: "", pickup_floor: "", pickup_elevator: false, pickup_property_access: [],
    delivery_address: "", delivery_suburb: "", delivery_state: "VIC", delivery_postcode: "", delivery_floor: "", delivery_elevator: false, delivery_property_access: [],
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
    notes: "", internal_notes: "", customer_content_notes: "",
  });

  const [extraStops, setExtraStops] = useState([]);
  const [flatRates, setFlatRates] = useState([]);
  const [customRates, setCustomRates] = useState([]);
  const [customPackRates, setCustomPackRates] = useState([]);
  const [customUnpackRates, setCustomUnpackRates] = useState([]);
  const [packFlatRates, setPackFlatRates] = useState([]);
  const [unpackFlatRates, setUnpackFlatRates] = useState([]);
  const [movingFlatRates, setMovingFlatRates] = useState([]);

  useEffect(() => {
    if (existing) {
      let parsedRates = {};
      if (existing.moving_rates_config) { try { parsedRates = JSON.parse(existing.moving_rates_config); } catch(e) {} }
      let parsedPackingRates = {};
      if (existing.packing_rates_config) { try { parsedPackingRates = JSON.parse(existing.packing_rates_config); } catch(e) {} }
      let parsedUnpackingRates = {};
      if (existing.unpacking_rates_config) { try { parsedUnpackingRates = JSON.parse(existing.unpacking_rates_config); } catch(e) {} }
      setForm((f) => ({ ...f, ...existing, items_to_move: existing.items_to_move || [], moving_rates_config: parsedRates, packing_rates_config: parsedPackingRates, unpacking_rates_config: parsedUnpackingRates, pickup_property_access: existing.pickup_property_access || [], delivery_property_access: existing.delivery_property_access || [] }));
      if (existing.additional_stops?.length) {
        setExtraStops(existing.additional_stops.map((s) => ({ address: s, suburb: "", state: "VIC", postcode: "", floor: "", elevator: false })));
      }
      if (existing.flat_rate_charges) { try { setFlatRates(JSON.parse(existing.flat_rate_charges)); } catch(e) {} }
      if (existing.packing_rates_config) { try { const pc = JSON.parse(existing.packing_rates_config); if (pc.flatRates) setPackFlatRates(pc.flatRates); } catch(e) {} }
      if (existing.unpacking_rates_config) { try { const uc = JSON.parse(existing.unpacking_rates_config); if (uc.flatRates) setUnpackFlatRates(uc.flatRates); } catch(e) {} }
      if (existing.moving_rates_config) { try { const mc = JSON.parse(existing.moving_rates_config); if (mc.flatRates) setMovingFlatRates(mc.flatRates); } catch(e) {} }
    }
  }, [existing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-calculate deposit when a rate/truck is selected
  useEffect(() => {
    const truckSize = form.truck_size || "";
    const movingRate = Number(form.moving_rate_per_hour) || 0;
    const packingRate = Number(form.packing_rate_per_hour) || 0;
    const unpackingRate = Number(form.unpacking_rate_per_hour) || 0;

    if (movingRate) {
      const smallTruck = ["2T", "5T", "6T"].includes(truckSize);
      const depositHrs = smallTruck ? 2 : 3;
      setForm((f) => ({ ...f, deposit: movingRate * depositHrs }));
    } else if (packingRate) {
      setForm((f) => ({ ...f, deposit: packingRate * 3 }));
    } else if (unpackingRate) {
      setForm((f) => ({ ...f, deposit: unpackingRate * 3 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.moving_rate_per_hour, form.truck_size, form.packing_rate_per_hour, form.unpacking_rate_per_hour]);

  const toggleService = (svc) => {
    const curr = form.selected_services || [];
    set("selected_services", curr.includes(svc) ? curr.filter((s) => s !== svc) : [...curr, svc]);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? base44.entities.Booking.update(id, data) : base44.entities.Booking.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookings"] }); navigate("/bookings"); },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (data) => isEdit ? base44.entities.Booking.update(id, data) : base44.entities.Booking.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookings"] }); },
  });

  const NUMERIC_FIELDS = [
    'price', 'distance_km', 'estimated_hours', 'actual_hours', 'balance_due', 'deposit',
    'num_movers', 'moving_total', 'moving_rate_per_hour', 'moving_num_people', 'moving_hours',
    'packing_hours', 'packing_total', 'packing_rate_per_hour', 'packing_num_people',
    'unpacking_hours', 'unpacking_total', 'unpacking_rate_per_hour', 'unpacking_num_people',
    'packaging_supplies_price',
  ];

  const sanitizeNumericFields = (data) => {
    const out = { ...data };
    for (const field of NUMERIC_FIELDS) {
      if (out[field] === '' || out[field] === undefined) out[field] = null;
    }
    return out;
  };

  const handleSave = () => {
    const data = sanitizeNumericFields({
      ...form,
      moving_rates_config: JSON.stringify({ ...(form.moving_rates_config || {}), flatRates: movingFlatRates }),
      packing_rates_config: JSON.stringify({ ...(form.packing_rates_config || {}), flatRates: packFlatRates }),
      unpacking_rates_config: JSON.stringify({ ...(form.unpacking_rates_config || {}), flatRates: unpackFlatRates }),
      additional_stops: extraStops.filter((s) => s.address || s.suburb).map((s) => [s.address, s.suburb, s.state].filter(Boolean).join(", ")),
      flat_rate_charges: JSON.stringify(flatRates),
    });
    saveMutation.mutate(data);
  };

  const handleSaveDraft = () => {
    const data = sanitizeNumericFields({
      ...form,
      moving_rates_config: JSON.stringify({ ...(form.moving_rates_config || {}), flatRates: movingFlatRates }),
      packing_rates_config: JSON.stringify({ ...(form.packing_rates_config || {}), flatRates: packFlatRates }),
      unpacking_rates_config: JSON.stringify({ ...(form.unpacking_rates_config || {}), flatRates: unpackFlatRates }),
      additional_stops: extraStops.filter((s) => s.address || s.suburb).map((s) => [s.address, s.suburb, s.state].filter(Boolean).join(", ")),
      flat_rate_charges: JSON.stringify(flatRates),
    });
    saveDraftMutation.mutate(data);
  };

  const rec = recommendTruck(form.items_to_move || []);
  const agentOptions = agents.filter((a) => a.active !== false);

  const applyRecommendation = () => {
    set("truck_size", rec.size);
    set("num_movers", rec.movers);
    set("estimated_hours", rec.baseHours);
    if (!form.price) set("price", rec.baseHours * rec.rate);
  };

  const inventoryLink = isEdit ? `${window.location.origin}/inventory/${id}` : null;
  const [copiedLink, setCopiedLink] = useState(false);
  const copyInventoryLink = () => {
    navigator.clipboard.writeText(inventoryLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const [sendingEnquiry, setSendingEnquiry] = useState(false);
  const handleSendEnquiryEmail = async () => {
    if (!form.customer_email) { alert("No customer email address on file."); return; }
    setSendingEnquiry(true);
    const link = inventoryLink || "";
    const body = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${form.customer_first_name},</p>
    <p>Thank you for your enquiry and for considering Move On Removals.</p>
    <p>To help us provide an accurate quote and recommend the right truck size for your move, please complete our Inventory Checklist using the link below and return it when convenient:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${link}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">📋 Complete Inventory Checklist</a>
    </div>
    <p style="font-size:13px;color:#64748b;">Or copy this link: <a href="${link}" style="color:#1d4ed8;">${link}</a></p>
    <p>We also offer professional packing and unpacking services, so please let us know if you'd like more information about these options.</p>
    <p>If you have any questions, simply reply to this email or give us a call.</p>
    <p>We look forward to assisting with your move.</p>
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`;
    await base44.integrations.Core.SendEmail({
      to: form.customer_email,
      subject: `Move On Removals – We tried to reach you`,
      body,
    });
    setSendingEnquiry(false);
    alert("Enquiry email sent to " + form.customer_email);
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
  const [sendingMilestone, setSendingMilestone] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("deposit");
  const [sendingPayment, setSendingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const handleSendPaymentLink = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) { alert("Please enter a valid amount."); return; }
    setSendingPayment(true);
    setPaymentResult(null);
    const result = await base44.functions.invoke("createSquarePaymentLink", {
      booking_id: id,
      amount: Number(paymentAmount),
      title: `Move On Removals – ${paymentType === "deposit" ? "Deposit" : "Balance"} – ${form.booking_number || ""}`,
      customer_email: form.customer_email,
      customer_name: `${form.customer_first_name} ${form.customer_last_name}`.trim(),
      booking_number: form.booking_number,
    });
    setSendingPayment(false);
    if (result?.data?.payment_link) {
      setPaymentResult(result.data.payment_link);
    } else {
      alert("Error: " + (result?.data?.error || "Could not create payment link"));
    }
  };

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

  const handleSendMilestoneNotification = async (milestone) => {
    if (!form.customer_email || !form.customer_mobile) {
      alert("Customer contact information missing.");
      return;
    }
    setSendingMilestone(milestone);
    try {
      const result = await base44.functions.invoke('triggerMilestoneNotification', {
        booking_id: id,
        milestone,
      });
      alert(`✓ ${milestone} notification sent to ${form.customer_email} and ${form.customer_mobile}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setSendingMilestone(null);
  };

  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const col2 = 110;
    let y = 0;

    // Header bar
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageW, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Move On Australia", margin, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Removal Quote", margin, 28);
    // Booking number top right
    if (form.booking_number) {
      doc.text(`#${form.booking_number}`, pageW - margin, 18, { align: "right" });
    }
    y = 50;

    // Status badge
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, y - 6, 50, 10, 2, 2, "F");
    doc.setTextColor(29, 78, 216);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(form.status || "New", margin + 25, y + 1, { align: "center" });
    y += 12;

    // Customer info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${form.customer_first_name} ${form.customer_last_name}`, margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    if (form.customer_email) doc.text(form.customer_email, margin, y), y += 5;
    if (form.customer_mobile) doc.text(form.customer_mobile, margin, y), y += 5;
    y += 4;

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Move details section
    const sectionTitle = (title) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y - 5, pageW - margin * 2, 9, "F");
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin + 2, y + 1);
      y += 10;
    };

    const row = (label, value, right = false) => {
      if (!value) return;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(label, right ? col2 : margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(String(value), right ? col2 + 30 : margin + 30, y);
      if (!right) y += 6;
    };

    const dualRow = (l1, v1, l2, v2) => {
      const prevY = y;
      row(l1, v1, false);
      y = prevY;
      row(l2, v2, true);
    };

    sectionTitle("Move Details");
    dualRow("Move Date:", form.move_date || "TBC", "Time:", form.move_time || "");
    dualRow("Service:", form.service_type || (form.selected_services || []).join(", ") || "—", "Type:", form.customer_type || "");
    y += 4;

    sectionTitle("Locations");
    row("Pickup:", [form.pickup_address, form.pickup_suburb, form.pickup_state, form.pickup_postcode].filter(Boolean).join(", ") || "TBC");
    if (form.pickup_floor) row("Pickup Floor:", form.pickup_floor);
    row("Delivery:", [form.delivery_address, form.delivery_suburb, form.delivery_state, form.delivery_postcode].filter(Boolean).join(", ") || "TBC");
    if (form.delivery_floor) row("Delivery Floor:", form.delivery_floor);
    if (form.distance_km) row("Distance:", `${form.distance_km} km`);
    y += 4;

    // Job details
    sectionTitle("Job Details");
    if (form.truck_size) dualRow("Truck:", form.truck_size, "Movers:", form.num_movers ? `${form.num_movers} movers` : "");
    if (form.estimated_hours) dualRow("Est. Hours:", `${form.estimated_hours} hrs`, "Truck Assigned:", form.truck_assigned || "");
    y += 4;

    // Items
    if ((form.items_to_move || []).length > 0) {
      sectionTitle(`Items to Move (${form.items_to_move.length})`);
      const cols = 3;
      const colW = (pageW - margin * 2) / cols;
      form.items_to_move.forEach((item, i) => {
        if (y > 265) { doc.addPage(); y = 20; }
        const col = i % cols;
        const row2 = Math.floor(i / cols);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${item}`, margin + col * colW, y + row2 * 5.5);
        if (col === cols - 1 || i === form.items_to_move.length - 1) y += 5.5;
      });
      y += 4;
    }

    // Pricing
    if (form.price || form.packing_total || form.moving_total || form.unpacking_total) {
      if (y > 230) { doc.addPage(); y = 20; }
      sectionTitle("Pricing");
      if (form.packing_total) row("Packing:", `$${Number(form.packing_total).toLocaleString()}`);
      if (form.moving_total) row("Moving:", `$${Number(form.moving_total).toLocaleString()}`);
      if (form.unpacking_total) row("Unpacking:", `$${Number(form.unpacking_total).toLocaleString()}`);
      const parsedFlat = (() => { try { return JSON.parse(form.flat_rate_charges || "[]"); } catch(e) { return []; } })();
      parsedFlat.forEach(fr => { if (fr.description && fr.amount) row(`${fr.description}:`, `$${Number(fr.amount).toLocaleString()}`); });
      if (form.price) {
        y += 2;
        doc.setFillColor(239, 246, 255);
        doc.rect(margin, y - 5, pageW - margin * 2, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(29, 78, 216);
        doc.text("TOTAL QUOTE", margin + 2, y + 2);
        doc.text(`$${Number(form.price).toLocaleString()}`, pageW - margin - 2, y + 2, { align: "right" });
        y += 14;
      }
      if (form.deposit) row("Deposit Required:", `$${Number(form.deposit).toLocaleString()}`);
    }

    // Notes
    if (form.notes) {
      if (y > 240) { doc.addPage(); y = 20; }
      sectionTitle("Notes");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(form.notes, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 14;
    doc.setFillColor(241, 245, 249);
    doc.rect(0, footerY - 4, pageW, 20, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Move On Australia — Thank you for choosing us!", pageW / 2, footerY + 4, { align: "center" });

    const filename = `Quote_${form.customer_last_name || "Customer"}_${form.move_date || "TBC"}.pdf`;
    doc.save(filename);
  };

  const handleSendEmail = async () => {
    if (!form.customer_email) { alert("No customer email address on file."); return; }
    setSendingEmail(true);

    const inventoryHtml = (form.items_to_move || []).length > 0
      ? form.items_to_move.map(item => `<p style="margin:2px 0;font-size:14px;">1 x ${item}</p>`).join("")
      : `<p style="color:#64748b;font-style:italic;">No items listed.</p>`;

    const addressBlock = [form.pickup_address, form.pickup_suburb, form.pickup_state, form.pickup_postcode].filter(Boolean).join(", ") || "TBC";
    const deliveryBlock = [form.delivery_address, form.delivery_suburb, form.delivery_state, form.delivery_postcode].filter(Boolean).join(", ") || "TBC";

    const flatTotal = flatRates.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    const body = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${form.customer_first_name},</p>
    <p>Thank you for booking with Move On Removals.</p>
    <p><strong>This job is now secured, acceptance of which constitutes the acknowledgement and acceptance of our Terms and Conditions and the booking details below. If you do not agree to our Terms and Conditions, please contact Move On Removals via email immediately.</strong></p>
    <p><em>Please also confirm the list of contents below reflects what you are moving, to ensure we are sending the most suitable truck for your needs. In the event of your list being not accurate, we reserve the right to leave the premises and rebook your move, at your cost. Items not listed that would be covered by insurance are not.</em></p>
    <p>Your booking details are as follows;</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;width:140px;">Move Date</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.move_date || "TBC"}${form.move_time ? " at " + form.move_time : ""}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Pickup</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${addressBlock}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Delivery</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${deliveryBlock}</td></tr>
      ${form.truck_size ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Truck</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.truck_size}</td></tr>` : ""}
      ${form.num_movers ? `<tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Movers</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.num_movers} movers</td></tr>` : ""}
      ${form.packing_hours ? `<tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Packing (est.)</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.packing_hours} hrs</td></tr>` : ""}
      ${form.moving_hours ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Moving (est.)</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.moving_hours} hrs</td></tr>` : ""}
      ${form.unpacking_hours ? `<tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Unpacking (est.)</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.unpacking_hours} hrs</td></tr>` : ""}
    </table>
    <p><strong>Inventory:</strong></p>
    ${inventoryHtml}
    ${flatRates.length > 0 ? `<p style="margin-top:16px;"><strong>Additional Charges:</strong></p>${flatRates.map(r => `<p style="margin:2px 0;font-size:14px;">${r.description}: $${Number(r.amount || 0).toLocaleString()}</p>`).join("")}<p style="font-size:14px;">Total additional: $${flatTotal.toFixed(2)}</p>` : ""}
    ${form.notes ? `<p style="margin-top:16px;background:#f8fafc;padding:12px;border-left:4px solid #3b82f6;">${form.notes}</p>` : ""}
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals Team</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`;

    await base44.integrations.Core.SendEmail({
      to: form.customer_email,
      subject: `MOVE ON REMOVALS \u2013 Booking Confirmation`,
      body,
    });
    setSendingEmail(false);
    alert("Booking confirmation sent to " + form.customer_email);
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
          {isEdit && (
            <Link
              to={`/bookings/${id}/quote`}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
            >
              <Sparkles size={16} /> AI Quote
            </Link>
          )}
          {isEdit && inventoryLink && (
            <button
              type="button"
              onClick={copyInventoryLink}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
            >
              <Package size={16} /> {copiedLink ? "Copied!" : "Copy Inventory Link"}
            </button>
          )}
          {isEdit && form.customer_email && (
            <button
              type="button"
              onClick={() => { setPaymentAmount(form.deposit ? String(form.deposit) : form.price ? String(form.price) : ""); setPaymentType("deposit"); setPaymentResult(null); setShowPaymentModal(true); }}
              className="bg-white border border-green-400 hover:bg-green-50 text-green-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
            >
              <CreditCard size={16} /> Square Payment
            </button>
          )}
          {form.customer_email && (
            <>
              <button
                type="button"
                onClick={handleSendEnquiryEmail}
                disabled={sendingEnquiry || !isEdit}
                className="bg-white border border-orange-300 hover:bg-orange-50 text-orange-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Mail size={16} /> {sendingEnquiry ? "Sending..." : "Send Enquiry"}
              </button>
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
              <div className="relative">
                <button
                  type="button"
                  disabled={!isEdit}
                  className="bg-white border border-green-300 hover:bg-green-50 text-green-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <Bell size={16} /> Milestone Alerts
                </button>
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 hidden hover:block group-hover:block">
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Send Test Notification:</p>
                    <button
                      onClick={() => handleSendMilestoneNotification('dispatched')}
                      disabled={sendingMilestone === 'dispatched'}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded flex items-center justify-between"
                    >
                      <span>🚚 Dispatched</span>
                      {sendingMilestone === 'dispatched' && <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />}
                    </button>
                    <button
                      onClick={() => handleSendMilestoneNotification('nearby')}
                      disabled={sendingMilestone === 'nearby'}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded flex items-center justify-between"
                    >
                      <span>📍 Nearby (15min)</span>
                      {sendingMilestone === 'nearby' && <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />}
                    </button>
                    <button
                      onClick={() => handleSendMilestoneNotification('delivered')}
                      disabled={sendingMilestone === 'delivered'}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded flex items-center justify-between"
                    >
                      <span>✅ Delivered</span>
                      {sendingMilestone === 'delivered' && <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />}
                    </button>
                    <div className="border-t mt-2 pt-2">
                      <p className="text-xs text-gray-400">Auto-sends when truck status changes</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              set("status", "Confirmed");
              handleSave();
            }}
            disabled={saveMutation.isPending}
            className={`px-5 py-2 rounded flex items-center gap-2 text-sm font-medium disabled:opacity-50 ${
              form.status === "Confirmed"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
            }`}
          >
            <Check size={16} /> Deposit Collected
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2 rounded flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} /> {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
          </button>
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

            <Field label="Returning Customer" full>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.is_returning_customer}
                    onChange={(e) => { set("is_returning_customer", e.target.checked); if (!e.target.checked) set("returning_contact_method", ""); }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">This customer has used our service before</span>
                </label>
                {form.is_returning_customer && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Found via:</span>
                    <select
                      className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                      value={form.returning_contact_method || ""}
                      onChange={(e) => set("returning_contact_method", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="Phone Number">Phone Number</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>
                )}
              </div>
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
                const hoursKey = svc === "Packaging Supplies" ? "packaging_supplies_hours" : svc === "Packing" ? "packing_hours" : svc === "Moving" ? "moving_hours" : "unpacking_hours";
                return (
                  <div key={svc} className={`rounded-lg border-2 transition-all ${active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <button type="button" onClick={() => toggleService(svc)} className="w-full p-3 text-left">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 ${active ? "bg-blue-500" : "bg-gray-100"}`}>
                        {active ? <Check size={13} className="text-white" /> : <Wrench size={13} className="text-gray-400" />}
                      </div>
                      <p className={`font-medium text-sm ${active ? "text-blue-800" : "text-gray-600"}`}>{svc}</p>
                    </button>
                    {active && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1.5">Date</label>
                            <input
                              className="w-full border-2 border-blue-300 rounded-lg px-3 py-2.5 text-base font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer"
                              type="date"
                              value={form[dateKey] || ""}
                              onChange={(e) => set(dateKey, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1.5">Time</label>
                            <input
                              className="w-full border-2 border-blue-300 rounded-lg px-3 py-2.5 text-base font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer"
                              type="time"
                              value={form[timeKey] || ""}
                              onChange={(e) => set(timeKey, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {svc !== "Packaging Supplies" && (
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1.5">Estimated Hours</label>
                            <select
                              className="w-full border-2 border-blue-300 rounded-lg px-3 py-2.5 text-base font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer"
                              value={form[hoursKey] || ""}
                              onChange={(e) => set(hoursKey, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">Select hours...</option>
                              {Array.from({ length: 32 }, (_, i) => (i + 1) * 0.5).map(h => (
                                <option key={h} value={h}>{h} hr{h !== 1 ? "s" : ""}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {(form.selected_services || []).includes("Packaging Supplies") && (
            <Section title="Delivery Charge">
              <p className="text-sm text-gray-500 mb-4">Enter the delivery charge for packaging supplies</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Delivery Charge ($)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 50"
                    value={form.packaging_supplies_price || ""}
                    onChange={(e) => set("packaging_supplies_price", e.target.value)}
                  />
                </Field>
                <Field label="Notes">
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="e.g. Metro delivery, Same-day"
                    value={form.packaging_supplies_notes || ""}
                    onChange={(e) => set("packaging_supplies_notes", e.target.value)}
                  />
                </Field>
              </div>
              {form.packaging_supplies_price && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 inline-block">
                  <p className="text-xs text-blue-500 mb-0.5">Delivery Charge</p>
                  <p className="text-xl font-bold text-blue-700">${Number(form.packaging_supplies_price).toFixed(2)}</p>
                </div>
              )}
            </Section>
          )}

          {(form.selected_services || []).includes("Packing") && (
            <Section title="Packing Rate">
              {(() => {
                const packDay = form.packing_date || form.move_date;
                const packDow = packDay ? new Date(packDay + "T00:00:00").getDay() : null;
                const isPackSat = packDow === 6;
                const isPackSun = packDow === 0;
                const EXTRA_PACKER_RATE = 68;
                const PACKING_RATES_WEEKDAY = [
                  { label: "2 Packers", movers: 2, rate: 168 },
                ];
                const PACKING_RATES_SAT = [
                  { label: "2 Packers", movers: 2, rate: 196 },
                ];

                const PackRateGrid = ({ rates, sectionLabel, isActive }) => {
                  const selectedInSection = rates.find(p => Number(form.packing_rate_per_hour) === p.rate);
                  const basePackers = selectedInSection ? selectedInSection.movers : 0;
                  const extraPackers = selectedInSection ? Math.max(0, Number(form.packing_num_people) - basePackers) : 0;
                  const totalPackRate = selectedInSection ? selectedInSection.rate + extraPackers * EXTRA_PACKER_RATE : 0;
                  return (
                    <div className={`rounded-xl border-2 p-4 mb-4 ${isActive ? "border-blue-400 bg-blue-50/30" : "border-gray-200 bg-white"}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className={`text-sm font-semibold ${isActive ? "text-blue-800" : "text-gray-700"}`}>{sectionLabel}</h3>
                        {isActive && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Applies to this job</span>}
                        <p className="text-xs text-gray-400 ml-auto">Extra packer: <span className="font-medium text-gray-600">${EXTRA_PACKER_RATE}/hr</span></p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {rates.map((p) => {
                          const active = Number(form.packing_rate_per_hour) === p.rate;
                          return (
                            <button
                              key={p.label + p.rate}
                              type="button"
                              onClick={() => {
                                set("packing_num_people", p.movers);
                                set("packing_rate_per_hour", p.rate);
                                if (form.packing_hours) set("packing_total", p.rate * Number(form.packing_hours));
                              }}
                              className={`rounded-lg border-2 p-4 text-left transition-all ${
                                active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-bold ${active ? "text-blue-800" : "text-gray-800"}`}>{p.label}</span>
                                {active && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Selected</span>}
                              </div>
                              <p className={`text-2xl font-bold mb-1 ${active ? "text-blue-700" : "text-gray-700"}`}>
                                ${p.rate}<span className="text-sm font-normal text-gray-400">/hr</span>
                              </p>
                              <p className="text-xs text-gray-500 mb-2">{p.movers} packers included</p>
                              <div className="border-t border-gray-100 pt-2 space-y-1">
                                <p className="text-xs text-gray-400 font-medium">+Extra packers (${EXTRA_PACKER_RATE}/hr):</p>
                                <p className="text-xs text-gray-500">+1 → <span className="font-semibold text-gray-700">${p.rate + EXTRA_PACKER_RATE}/hr</span></p>
                                <p className="text-xs text-gray-500">+2 → <span className="font-semibold text-gray-700">${p.rate + EXTRA_PACKER_RATE * 2}/hr</span></p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {selectedInSection && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          <div className="flex flex-wrap items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Base rate:</span>
                              <span className="font-semibold text-gray-800">${selectedInSection.rate}/hr ({basePackers} packers)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Total rate:</span>
                              <span className="font-semibold text-green-700 text-base">${totalPackRate}/hr</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Additional Packers <span className="text-xs font-normal text-gray-400">(${EXTRA_PACKER_RATE}/packer/hr)</span></p>
                            <div className="flex items-center gap-3 mt-2">
                              <button type="button" onClick={() => { if (Number(form.packing_num_people) > basePackers) set("packing_num_people", Number(form.packing_num_people) - 1); }} disabled={Number(form.packing_num_people) <= basePackers} className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold">−</button>
                              <div className="text-center">
                                <span className="text-2xl font-bold text-gray-800">{extraPackers}</span>
                                <p className="text-xs text-gray-400">extra packer{extraPackers !== 1 ? "s" : ""}</p>
                              </div>
                              <button type="button" onClick={() => set("packing_num_people", Number(form.packing_num_people) + 1)} className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold">+</button>
                              <div className="ml-4 text-sm text-gray-500">
                                Total packers: <span className="font-semibold text-gray-800">{form.packing_num_people}</span>
                                {extraPackers > 0 && <span className="ml-2 text-orange-600">(+${extraPackers * EXTRA_PACKER_RATE}/hr)</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 items-end">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Estimated Hours</label>
                              <input
                                type="number" min="0" step="0.5"
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-32 focus:outline-none focus:border-blue-500"
                                placeholder="e.g. 3"
                                value={form.packing_hours || ""}
                                onChange={(e) => {
                                  set("packing_hours", e.target.value);
                                  set("packing_total", totalPackRate * Number(e.target.value));
                                }}
                              />
                            </div>
                            {form.packing_hours && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                                <p className="text-xs text-blue-500 mb-0.5">Packing Total</p>
                                <p className="text-xl font-bold text-blue-700">${(totalPackRate * Number(form.packing_hours)).toFixed(0)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    <p className="text-sm text-gray-500 mb-4">Select packing crew size and enter estimated hours</p>
                    <PackRateGrid
                      rates={PACKING_RATES_WEEKDAY}
                      sectionLabel="📅 Monday – Friday Packing Rates"
                      isActive={packDow !== null && !isPackSat && !isPackSun}
                    />
                    <PackRateGrid
                      rates={PACKING_RATES_SAT}
                      sectionLabel="📅 Saturday Packing Rates"
                      isActive={isPackSat}
                    />
                    {/* Custom / Other Packing Rates */}
                    <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 mb-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">➕ Custom / Other Rates</h3>
                        <button type="button" onClick={() => setCustomPackRates([...customPackRates, { label: "", people: 2, rate: "", extraRate: 68 }])} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50">
                          <Plus size={13} /> Add Custom Rate
                        </button>
                      </div>
                      {customPackRates.length === 0 && <p className="text-sm text-gray-400 italic">No custom rates added. Click "Add Custom Rate" to create one.</p>}
                      {customPackRates.length > 0 && (
                        <div className="space-y-3">
                          {customPackRates.map((cr, idx) => {
                            const isSelected = Number(form.packing_rate_per_hour) === Number(cr.rate) && Number(form.packing_num_people) === Number(cr.people) && cr.label && form.packing_num_people == cr.people;
                            const extraPpl = isSelected ? Math.max(0, Number(form.packing_num_people) - Number(cr.people)) : 0;
                            return (
                              <div key={idx} className={`rounded-lg border-2 p-3 transition-all ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                  <div><label className="block text-xs text-gray-500 mb-1">Label</label>
                                    <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" placeholder="e.g. 3 Packers" value={cr.label} onChange={(e) => { const r = [...customPackRates]; r[idx].label = e.target.value; setCustomPackRates(r); }} /></div>
                                  <div><label className="block text-xs text-gray-500 mb-1">People included</label>
                                    <input type="number" min="1" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" value={cr.people} onChange={(e) => { const r = [...customPackRates]; r[idx].people = e.target.value; setCustomPackRates(r); }} /></div>
                                  <div><label className="block text-xs text-gray-500 mb-1">Rate ($/hr)</label>
                                    <input type="number" min="0" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" placeholder="e.g. 220" value={cr.rate} onChange={(e) => { const r = [...customPackRates]; r[idx].rate = e.target.value; setCustomPackRates(r); }} /></div>
                                  <div><label className="block text-xs text-gray-500 mb-1">Extra person ($/hr)</label>
                                    <input type="number" min="0" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" value={cr.extraRate} onChange={(e) => { const r = [...customPackRates]; r[idx].extraRate = e.target.value; setCustomPackRates(r); }} /></div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {cr.rate && (
                                    <button type="button" onClick={() => { set("packing_num_people", Number(cr.people)); set("packing_rate_per_hour", Number(cr.rate)); if (form.packing_hours) set("packing_total", Number(cr.rate) * Number(form.packing_hours)); }}
                                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${isSelected ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                                      {isSelected ? "✓ Selected" : "Select"}
                                    </button>
                                  )}
                                  <button type="button" onClick={() => setCustomPackRates(customPackRates.filter((_, i) => i !== idx))} className="ml-auto text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              <ServiceFlatRates rates={packFlatRates} setRates={setPackFlatRates} />
            </Section>
          )}

          {(form.selected_services || []).includes("Unpacking") && (
            <Section title="Unpacking Rate">
              {(() => {
                const EXTRA_UNPACKER_RATE = 68;
                const unpackDay = form.unpacking_date || form.move_date;
                const unpackDow = unpackDay ? new Date(unpackDay + "T00:00:00").getDay() : null;
                const selectedRate = Number(form.unpacking_rate_per_hour) === 168 ? { label: "2 Unpackers", movers: 2, rate: 168 } : null;
                const baseUnpackers = selectedRate ? selectedRate.movers : 0;
                const extraUnpackers = selectedRate ? Math.max(0, Number(form.unpacking_num_people) - baseUnpackers) : 0;
                const totalUnpackRate = selectedRate ? selectedRate.rate + extraUnpackers * EXTRA_UNPACKER_RATE : 0;
                return (
                  <>
                    <p className="text-sm text-gray-500 mb-4">Select unpacking crew size and enter estimated hours</p>
                    <div className={`rounded-xl border-2 p-4 mb-4 border-gray-200 bg-white`}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">📅 Monday – Friday Unpacking Rates</h3>
                        <p className="text-xs text-gray-400 ml-auto">Extra unpacker: <span className="font-medium text-gray-600">${EXTRA_UNPACKER_RATE}/hr</span></p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[{ label: "2 Unpackers", movers: 2, rate: 168 }].map((p) => {
                          const active = Number(form.unpacking_rate_per_hour) === p.rate;
                          return (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => {
                                set("unpacking_num_people", p.movers);
                                set("unpacking_rate_per_hour", p.rate);
                                if (form.unpacking_hours) set("unpacking_total", p.rate * Number(form.unpacking_hours));
                              }}
                              className={`rounded-lg border-2 p-4 text-left transition-all ${
                                active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-bold ${active ? "text-blue-800" : "text-gray-800"}`}>{p.label}</span>
                                {active && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Selected</span>}
                              </div>
                              <p className={`text-2xl font-bold mb-1 ${active ? "text-blue-700" : "text-gray-700"}`}>
                                ${p.rate}<span className="text-sm font-normal text-gray-400">/hr</span>
                              </p>
                              <p className="text-xs text-gray-500 mb-2">{p.movers} unpackers included</p>
                              <div className="border-t border-gray-100 pt-2 space-y-1">
                                <p className="text-xs text-gray-400 font-medium">+Extra unpackers (${EXTRA_UNPACKER_RATE}/hr):</p>
                                <p className="text-xs text-gray-500">+1 → <span className="font-semibold text-gray-700">${p.rate + EXTRA_UNPACKER_RATE}/hr</span></p>
                                <p className="text-xs text-gray-500">+2 → <span className="font-semibold text-gray-700">${p.rate + EXTRA_UNPACKER_RATE * 2}/hr</span></p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {selectedRate && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          <div className="flex flex-wrap items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Base rate:</span>
                              <span className="font-semibold text-gray-800">${selectedRate.rate}/hr ({baseUnpackers} unpackers)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Total rate:</span>
                              <span className="font-semibold text-green-700 text-base">${totalUnpackRate}/hr</span>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Additional Unpackers <span className="text-xs font-normal text-gray-400">(${EXTRA_UNPACKER_RATE}/unpacker/hr)</span></p>
                            <div className="flex items-center gap-3 mt-2">
                              <button type="button" onClick={() => { if (Number(form.unpacking_num_people) > baseUnpackers) set("unpacking_num_people", Number(form.unpacking_num_people) - 1); }} disabled={Number(form.unpacking_num_people) <= baseUnpackers} className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold">−</button>
                              <div className="text-center">
                                <span className="text-2xl font-bold text-gray-800">{extraUnpackers}</span>
                                <p className="text-xs text-gray-400">extra unpacker{extraUnpackers !== 1 ? "s" : ""}</p>
                              </div>
                              <button type="button" onClick={() => set("unpacking_num_people", Number(form.unpacking_num_people) + 1)} className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold">+</button>
                              <div className="ml-4 text-sm text-gray-500">
                                Total unpackers: <span className="font-semibold text-gray-800">{form.unpacking_num_people}</span>
                                {extraUnpackers > 0 && <span className="ml-2 text-orange-600">(+${extraUnpackers * EXTRA_UNPACKER_RATE}/hr)</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 items-end">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Estimated Hours</label>
                              <input
                                type="number" min="0" step="0.5"
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-32 focus:outline-none focus:border-blue-500"
                                placeholder="e.g. 3"
                                value={form.unpacking_hours || ""}
                                onChange={(e) => {
                                  set("unpacking_hours", e.target.value);
                                  set("unpacking_total", totalUnpackRate * Number(e.target.value));
                                }}
                              />
                            </div>
                            {form.unpacking_hours && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                                <p className="text-xs text-blue-500 mb-0.5">Unpacking Total</p>
                                <p className="text-xl font-bold text-blue-700">${(totalUnpackRate * Number(form.unpacking_hours)).toFixed(0)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Custom / Other Unpacking Rates */}
                    <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 mb-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">➕ Custom / Other Rates</h3>
                        <button type="button" onClick={() => setCustomUnpackRates([...customUnpackRates, { label: "", people: 2, rate: "", extraRate: 68 }])} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50">
                          <Plus size={13} /> Add Custom Rate
                        </button>
                      </div>
                      {customUnpackRates.length === 0 && <p className="text-sm text-gray-400 italic">No custom rates added. Click "Add Custom Rate" to create one.</p>}
                      {customUnpackRates.length > 0 && (
                        <div className="space-y-3">
                          {customUnpackRates.map((cr, idx) => {
                            const isSelected = Number(form.unpacking_rate_per_hour) === Number(cr.rate) && Number(form.unpacking_num_people) === Number(cr.people);
                            return (
                              <div key={idx} className={`rounded-lg border-2 p-3 transition-all ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                  <div><label className="block text-xs text-gray-500 mb-1">Label</label>
                                    <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" placeholder="e.g. 3 Unpackers" value={cr.label} onChange={(e) => { const r = [...customUnpackRates]; r[idx].label = e.target.value; setCustomUnpackRates(r); }} /></div>
                                  <div><label className="block text-xs text-gray-500 mb-1">People included</label>
                                    <input type="number" min="1" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" value={cr.people} onChange={(e) => { const r = [...customUnpackRates]; r[idx].people = e.target.value; setCustomUnpackRates(r); }} /></div>
                                  <div><label className="block text-xs text-gray-500 mb-1">Rate ($/hr)</label>
                                    <input type="number" min="0" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" placeholder="e.g. 200" value={cr.rate} onChange={(e) => { const r = [...customUnpackRates]; r[idx].rate = e.target.value; setCustomUnpackRates(r); }} /></div>
                                  <div><label className="block text-xs text-gray-500 mb-1">Extra person ($/hr)</label>
                                    <input type="number" min="0" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white" value={cr.extraRate} onChange={(e) => { const r = [...customUnpackRates]; r[idx].extraRate = e.target.value; setCustomUnpackRates(r); }} /></div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {cr.rate && (
                                    <button type="button" onClick={() => { set("unpacking_num_people", Number(cr.people)); set("unpacking_rate_per_hour", Number(cr.rate)); if (form.unpacking_hours) set("unpacking_total", Number(cr.rate) * Number(form.unpacking_hours)); }}
                                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${isSelected ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                                      {isSelected ? "✓ Selected" : "Select"}
                                    </button>
                                  )}
                                  <button type="button" onClick={() => setCustomUnpackRates(customUnpackRates.filter((_, i) => i !== idx))} className="ml-auto text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              <ServiceFlatRates rates={unpackFlatRates} setRates={setUnpackFlatRates} />
            </Section>
          )}

          {(form.selected_services || []).includes("Moving") && <Section title="Truck &amp; Rate Selection">
            {(() => {
              const moveDay = form.moving_date || form.move_date;
              const dayOfWeek = moveDay ? new Date(moveDay + "T00:00:00").getDay() : null;
              const isSaturday = dayOfWeek === 6;
              const isSunday = dayOfWeek === 0;
              const extraRate = isSunday ? 136 : isSaturday ? 82 : 68;
              const dayLabel = isSunday ? "Sun" : isSaturday ? "Sat" : "M–F";

              const RateGrid = ({ rates, sectionExtraRate, sectionLabel, isActive }) => {
                const selectedInSection = rates.find(
                  t => t.label === form.moving_truck_size && t.rate === Number(form.moving_rate_per_hour)
                );
                const baseMovers = selectedInSection ? selectedInSection.movers : 0;
                const extraMovers = selectedInSection ? Math.max(0, Number(form.moving_num_people) - baseMovers) : 0;
                const totalRate = selectedInSection ? selectedInSection.rate + extraMovers * sectionExtraRate : 0;

                return (
                  <div className={`rounded-xl border-2 p-4 mb-4 ${ isActive ? "border-blue-400 bg-blue-50/30" : "border-gray-200 bg-white" }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className={`text-sm font-semibold ${ isActive ? "text-blue-800" : "text-gray-700" }`}>{sectionLabel}</h3>
                      {isActive && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Applies to this move</span>}
                      <p className="text-xs text-gray-400 ml-auto">Extra mover: <span className="font-medium text-gray-600">${sectionExtraRate}/hr</span></p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {rates.map((t) => {
                        const active = form.moving_truck_size === t.label && Number(form.moving_rate_per_hour) === t.rate;
                        const with1Extra = t.rate + sectionExtraRate;
                        const with2Extra = t.rate + sectionExtraRate * 2;
                        return (
                          <button
                            key={t.label + t.movers + t.rate}
                            type="button"
                            onClick={() => {
                              set("moving_truck_size", t.label);
                              set("moving_num_people", t.movers);
                              set("moving_rate_per_hour", t.rate);
                              set("truck_size", t.truckSize);
                              set("num_movers", t.movers);
                            }}
                            className={`rounded-lg border-2 p-4 text-left transition-all ${
                              active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-bold ${active ? "text-blue-800" : "text-gray-800"}`}>{t.label}</span>
                              {active && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Selected</span>}
                            </div>
                            <p className={`text-2xl font-bold mb-1 ${active ? "text-blue-700" : "text-gray-700"}`}>
                              ${t.rate}<span className="text-sm font-normal text-gray-400">/hr</span>
                            </p>
                            <p className="text-xs text-gray-500 mb-2">{t.movers} mover{t.movers !== 1 ? "s" : ""} included</p>
                            <div className="border-t border-gray-100 pt-2 space-y-1">
                              <p className="text-xs text-gray-400 font-medium">+Extra movers (${sectionExtraRate}/hr):</p>
                              <p className="text-xs text-gray-500">+1 mover → <span className="font-semibold text-gray-700">${with1Extra}/hr</span></p>
                              <p className="text-xs text-gray-500">+2 movers → <span className="font-semibold text-gray-700">${with2Extra}/hr</span></p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedInSection && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        <div className="flex flex-wrap items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Base rate:</span>
                            <span className="font-semibold text-gray-800">${selectedInSection.rate}/hr ({baseMovers} movers)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Total rate:</span>
                            <span className="font-semibold text-green-700 text-base">${totalRate}/hr</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Additional Movers <span className="text-xs font-normal text-gray-400">(${sectionExtraRate}/mover/hr)</span></p>
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              type="button"
                              onClick={() => { if (Number(form.moving_num_people) > baseMovers) set("moving_num_people", Number(form.moving_num_people) - 1); }}
                              disabled={Number(form.moving_num_people) <= baseMovers}
                              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                            >−</button>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-gray-800">{extraMovers}</span>
                              <p className="text-xs text-gray-400">extra mover{extraMovers !== 1 ? "s" : ""}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => set("moving_num_people", Number(form.moving_num_people) + 1)}
                              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold"
                            >+</button>
                            <div className="ml-4 text-sm text-gray-500">
                              Total movers: <span className="font-semibold text-gray-800">{form.moving_num_people}</span>
                              {extraMovers > 0 && <span className="ml-2 text-orange-600">(+${extraMovers * sectionExtraRate}/hr)</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                  <p className="text-sm text-gray-500 mb-4">Select the truck configuration for this job</p>
                  <RateGrid
                    rates={TRUCK_RATES}
                    sectionExtraRate={68}
                    sectionLabel="📅 Monday – Friday Rates"
                    isActive={dayOfWeek !== null && !isSaturday && !isSunday}
                  />
                  <RateGrid
                    rates={SAT_TRUCK_RATES}
                    sectionExtraRate={82}
                    sectionLabel="📅 Saturday Rates"
                    isActive={isSaturday}
                  />

                  {/* Custom Rates Section */}
                  <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 mb-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">➕ Custom / Other Rates</h3>
                      <button
                        type="button"
                        onClick={() => setCustomRates([...customRates, { label: "", truckSize: "", movers: 2, rate: "", extraRate: 68 }])}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50"
                      >
                        <Plus size={13} /> Add Custom Rate
                      </button>
                    </div>
                    {customRates.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No custom rates added. Click "Add Custom Rate" to create one.</p>
                    )}
                    {customRates.length > 0 && (
                      <div className="space-y-3">
                        {customRates.map((cr, idx) => {
                          const isSelected = form.moving_truck_size === (cr.label || `Custom ${idx+1}`) && Number(form.moving_rate_per_hour) === Number(cr.rate);
                          const extraMoversCount = isSelected ? Math.max(0, Number(form.moving_num_people) - Number(cr.movers)) : 0;
                          return (
                            <div key={idx} className={`rounded-lg border-2 p-3 transition-all ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Label</label>
                                  <input
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                                    placeholder="e.g. 8T Truck"
                                    value={cr.label}
                                    onChange={(e) => { const r = [...customRates]; r[idx].label = e.target.value; setCustomRates(r); }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Movers included</label>
                                  <input
                                    type="number" min="1"
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                                    value={cr.movers}
                                    onChange={(e) => { const r = [...customRates]; r[idx].movers = e.target.value; setCustomRates(r); }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Rate ($/hr)</label>
                                  <input
                                    type="number" min="0"
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                                    placeholder="e.g. 220"
                                    value={cr.rate}
                                    onChange={(e) => { const r = [...customRates]; r[idx].rate = e.target.value; setCustomRates(r); }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Extra mover ($/hr)</label>
                                  <input
                                    type="number" min="0"
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                                    value={cr.extraRate}
                                    onChange={(e) => { const r = [...customRates]; r[idx].extraRate = e.target.value; setCustomRates(r); }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {cr.rate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      set("moving_truck_size", cr.label || `Custom ${idx+1}`);
                                      set("moving_num_people", Number(cr.movers));
                                      set("moving_rate_per_hour", Number(cr.rate));
                                      set("truck_size", cr.label || `Custom ${idx+1}`);
                                      set("num_movers", Number(cr.movers));
                                    }}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                      isSelected ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    {isSelected ? "✓ Selected" : "Select"}
                                  </button>
                                )}
                                {isSelected && (
                                  <div className="flex items-center gap-2 ml-2">
                                    <span className="text-xs text-gray-500">Extra movers:</span>
                                    <button type="button" onClick={() => { if (Number(form.moving_num_people) > Number(cr.movers)) set("moving_num_people", Number(form.moving_num_people) - 1); }} disabled={Number(form.moving_num_people) <= Number(cr.movers)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 font-bold">−</button>
                                    <span className="font-bold text-gray-800 w-5 text-center">{extraMoversCount}</span>
                                    <button type="button" onClick={() => set("moving_num_people", Number(form.moving_num_people) + 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold">+</button>
                                    {extraMoversCount > 0 && <span className="text-xs text-orange-600 ml-1">(+${extraMoversCount * Number(cr.extraRate)}/hr)</span>}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setCustomRates(customRates.filter((_, i) => i !== idx))}
                                  className="ml-auto text-red-400 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
              <ServiceFlatRates rates={movingFlatRates} setRates={setMovingFlatRates} />
          </Section>}
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
            <PropertyAccess
              value={form.pickup_property_access || []}
              onChange={(v) => set("pickup_property_access", v)}
            />
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
            <PropertyAccess
              value={form.delivery_property_access || []}
              onChange={(v) => set("delivery_property_access", v)}
            />
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
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer's Content List <span className="text-gray-400 font-normal">(free text)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">Paste or type the customer's list of contents exactly as provided.</p>
              <textarea
                className={inputClass}
                rows={6}
                value={form.customer_content_notes || ""}
                onChange={(e) => set("customer_content_notes", e.target.value)}
                placeholder="e.g. 3 seater couch, queen bed, dining table x6 chairs, fridge, washing machine..."
              />
            </div>
          </Section>

          {/* Booking Stage */}
          <Section title="Booking Stage">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "Enquiry", color: "bg-sky-500" },
                { value: "Quoted", color: "bg-purple-500" },
                { value: "Tentative Booking", color: "bg-yellow-500" },
                { value: "Confirmed", color: "bg-emerald-500" },
                { value: "Booked Job", color: "bg-green-600" },
                { value: "Completed", color: "bg-gray-500" },
                { value: "Cancelled", color: "bg-red-500" },
                { value: "No Show", color: "bg-orange-500" },
              ].map(({ value, color }) => {
                const active = form.status === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("status", value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                      active
                        ? `${color} text-white border-transparent shadow`
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
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
              <SummaryRow label="Email" value={form.customer_email || "—"} />
              <SummaryRow label="Status" value={form.status || "—"} />
              <SummaryRow label="Services" value={(form.selected_services || []).join(", ") || "—"} />
              <SummaryRow label="Move Date" value={form.move_date || "—"} />
              <SummaryRow label="Pickup" value={[form.pickup_suburb, form.pickup_state].filter(Boolean).join(", ") || form.pickup_address || "—"} />
              <SummaryRow label="Delivery" value={[form.delivery_suburb, form.delivery_state].filter(Boolean).join(", ") || form.delivery_address || "—"} />
              <SummaryRow label="Items" value={`${(form.items_to_move || []).length} items`} />
              {form.truck_size && <SummaryRow label="Truck" value={form.truck_size} />}
              {form.num_movers && <SummaryRow label="Movers" value={`${form.num_movers} movers`} />}
            </div>
          </Section>

          {(form.items_to_move || []).length > 0 && (
            <Section title="Inventory">
              <div className="columns-2 md:columns-3 gap-4">
                {form.items_to_move.map((item, i) => (
                  <p key={i} className="text-sm text-gray-700 mb-1">• {item}</p>
                ))}
              </div>
            </Section>
          )}



          <Section title="Notes">
            <Field label="Notes for Customer">
              <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any special instructions or notes to include in the confirmation email..." />
            </Field>
          </Section>

          {/* Email Preview */}
          {["Enquiry", "Quoted", "Tentative Booking", "Booked Job"].includes(form.status) && (
            <EmailPreview
              form={form}
              inventoryLink={inventoryLink}
              flatRates={flatRates}
              packFlatRates={packFlatRates}
              movingFlatRates={movingFlatRates}
              unpackFlatRates={unpackFlatRates}
              onSend={handleSendEmail}
              sending={sendingEmail}
            />
          )}

          {/* Milestone Notifications Status */}
          {isEdit && (
            <Section title="Automated Notifications">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-lg border-2 p-4 ${form.notification_dispatched_sent ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${form.notification_dispatched_sent ? 'bg-green-500' : 'bg-gray-200'}`}>
                      {form.notification_dispatched_sent ? <Check size={14} className="text-white" /> : <Truck size={14} className="text-gray-400" />}
                    </div>
                    <span className={`font-semibold text-sm ${form.notification_dispatched_sent ? 'text-green-800' : 'text-gray-600'}`}>Dispatched</span>
                  </div>
                  {form.notification_dispatched_sent ? (
                    <p className="text-xs text-green-600">Sent {new Date(form.notification_dispatched_date).toLocaleString()}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Not yet sent</p>
                  )}
                </div>

                <div className={`rounded-lg border-2 p-4 ${form.notification_nearby_sent ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${form.notification_nearby_sent ? 'bg-green-500' : 'bg-gray-200'}`}>
                      {form.notification_nearby_sent ? <Check size={14} className="text-white" /> : <MapPin size={14} className="text-gray-400" />}
                    </div>
                    <span className={`font-semibold text-sm ${form.notification_nearby_sent ? 'text-green-800' : 'text-gray-600'}`}>Nearby (15min)</span>
                  </div>
                  {form.notification_nearby_sent ? (
                    <p className="text-xs text-green-600">Sent {new Date(form.notification_nearby_date).toLocaleString()}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Not yet sent</p>
                  )}
                </div>

                <div className={`rounded-lg border-2 p-4 ${form.notification_delivered_sent ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${form.notification_delivered_sent ? 'bg-green-500' : 'bg-gray-200'}`}>
                      {form.notification_delivered_sent ? <Check size={14} className="text-white" /> : <Check size={14} className="text-gray-400" />}
                    </div>
                    <span className={`font-semibold text-sm ${form.notification_delivered_sent ? 'text-green-800' : 'text-gray-600'}`}>Delivered</span>
                  </div>
                  {form.notification_delivered_sent ? (
                    <p className="text-xs text-green-600">Sent {new Date(form.notification_delivered_date).toLocaleString()}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Not yet sent</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                💡 Notifications are automatically sent when truck status changes. Use the "Milestone Alerts" button above to send test notifications.
              </p>
            </Section>
          )}
        </>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2"><CreditCard size={18} className="text-green-600" /> Send Square Payment Link</h2>
                <p className="text-sm text-gray-500">To: {form.customer_email}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {paymentResult ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-semibold text-sm mb-1">✅ Payment link created & emailed!</p>
                    <p className="text-xs text-green-700 break-all">{paymentResult}</p>
                  </div>
                  <a href={paymentResult} target="_blank" rel="noopener noreferrer"
                    className="block text-center bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold">
                    Open Payment Link
                  </a>
                  <button onClick={() => setShowPaymentModal(false)} className="w-full border border-gray-300 hover:bg-gray-50 py-2.5 rounded-lg text-sm font-medium text-gray-700">Close</button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type</label>
                    <div className="flex gap-2">
                      {[["deposit", "Deposit"], ["balance", "Balance"], ["full", "Full Amount"]].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => { setPaymentType(val); if (val === "deposit" && form.deposit) setPaymentAmount(String(form.deposit)); else if (val === "balance" && form.balance_due) setPaymentAmount(String(form.balance_due)); else if (val === "full" && form.price) setPaymentAmount(String(form.price)); }}
                          className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${ paymentType === val ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 text-gray-600 hover:border-gray-300" }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (AUD) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                      <input type="number" min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-500" placeholder="0.00" />
                    </div>
                    {form.deposit && <p className="text-xs text-gray-400 mt-1">Deposit on file: ${form.deposit} · Balance: ${form.balance_due || '—'} · Total: ${form.price || '—'}</p>}
                  </div>
                  <button onClick={handleSendPaymentLink} disabled={sendingPayment || !paymentAmount}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold text-sm">
                    {sendingPayment ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating link...</> : <><CreditCard size={16} /> Create & Email Payment Link</>}
                  </button>
                  <p className="text-xs text-gray-400 text-center">A Square payment link will be created and emailed to the customer.</p>
                </>
              )}
            </div>
          </div>
        </div>
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