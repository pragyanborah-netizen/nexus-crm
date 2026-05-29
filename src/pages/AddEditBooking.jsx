import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Save, ArrowLeft, Plus, Trash2, User, Wrench, MapPin, Package, Truck, Check, Mail, CalendarDays, X, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
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
    notes: "", internal_notes: "",
  });

  const [extraStops, setExtraStops] = useState([]);
  const [flatRates, setFlatRates] = useState([]);

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
      packing_rates_config: JSON.stringify(form.packing_rates_config || {}),
      unpacking_rates_config: JSON.stringify(form.unpacking_rates_config || {}),
      additional_stops: extraStops.filter((s) => s.address || s.suburb).map((s) => [s.address, s.suburb, s.state].filter(Boolean).join(", ")),
      flat_rate_charges: JSON.stringify(flatRates),
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
            onClick={handleGeneratePdf}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
          >
            <FileText size={16} /> PDF Quote
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

          <Section title="Packing Pricing">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Number of People">
                <select className={selectClass} value={form.packing_num_people || ""} onChange={(e) => set("packing_num_people", e.target.value)}>
                  <option value="">Select</option>
                  <option value="2">2 People</option>
                  <option value="3">3 People</option>
                </select>
              </Field>
              <Field label="Hours">
                <input className={inputClass} type="number" min="0" step="0.5" value={form.packing_hours || ""} onChange={(e) => {
                  const hrs = parseFloat(e.target.value) || 0;
                  const rate = parseFloat(form.packing_rate_per_hour) || 0;
                  set("packing_hours", e.target.value);
                  if (rate) set("packing_total", (hrs * rate).toFixed(2));
                }} placeholder="e.g. 3" />
              </Field>
              <Field label="Rate ($/hr)">
                <input className={inputClass} type="number" min="0" step="0.01" value={form.packing_rate_per_hour || ""} onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 0;
                  const hrs = parseFloat(form.packing_hours) || 0;
                  set("packing_rate_per_hour", e.target.value);
                  if (hrs) set("packing_total", (hrs * rate).toFixed(2));
                }} placeholder="e.g. 180" />
              </Field>
              <Field label="Total ($)">
                <input className={inputClass + " font-semibold bg-green-50 border-green-300"} type="number" min="0" step="0.01" value={form.packing_total || ""} onChange={(e) => set("packing_total", e.target.value)} placeholder="Auto-calculated" />
              </Field>
            </div>
          </Section>

          <Section title="Moving Pricing">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Number of People">
                <select className={selectClass} value={form.moving_num_people || ""} onChange={(e) => set("moving_num_people", e.target.value)}>
                  <option value="">Select</option>
                  <option value="2">2 People</option>
                  <option value="3">3 People</option>
                </select>
              </Field>
              <Field label="Hours">
                <input className={inputClass} type="number" min="0" step="0.5" value={form.moving_hours || ""} onChange={(e) => {
                  const hrs = parseFloat(e.target.value) || 0;
                  const rate = parseFloat(form.moving_rate_per_hour) || 0;
                  set("moving_hours", e.target.value);
                  if (rate) set("moving_total", (hrs * rate).toFixed(2));
                }} placeholder="e.g. 4" />
              </Field>
              <Field label="Rate ($/hr)">
                <input className={inputClass} type="number" min="0" step="0.01" value={form.moving_rate_per_hour || ""} onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 0;
                  const hrs = parseFloat(form.moving_hours) || 0;
                  set("moving_rate_per_hour", e.target.value);
                  if (hrs) set("moving_total", (hrs * rate).toFixed(2));
                }} placeholder="e.g. 200" />
              </Field>
              <Field label="Total ($)">
                <input className={inputClass + " font-semibold bg-green-50 border-green-300"} type="number" min="0" step="0.01" value={form.moving_total || ""} onChange={(e) => set("moving_total", e.target.value)} placeholder="Auto-calculated" />
              </Field>
            </div>
          </Section>

          <Section title="Truck & Pricing">

            {/* Packing Pricing */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Packing Pricing ($/hr)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left text-gray-600 font-semibold border-b border-gray-200">Service</th>
                      <th className="px-4 py-2 text-center text-gray-600 font-semibold border-b border-gray-200">2 People</th>
                      <th className="px-4 py-2 text-center text-gray-600 font-semibold border-b border-gray-200">3 People</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-4 py-2 font-medium text-gray-700 border-b border-gray-100">Packing</td>
                      <td className="px-4 py-2 border-b border-gray-100">
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                          value={(form.packing_rates_config || {})["2P"] || ""}
                          onChange={(e) => set("packing_rates_config", { ...(form.packing_rates_config || {}), "2P": e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2 border-b border-gray-100">
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                          value={(form.packing_rates_config || {})["3P"] || ""}
                          onChange={(e) => set("packing_rates_config", { ...(form.packing_rates_config || {}), "3P": e.target.value })}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hourly Rates Grid */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Hourly Rates by Truck &amp; Movers ($/hr)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left text-gray-600 font-semibold border-b border-gray-200">Truck</th>
                      <th className="px-4 py-2 text-center text-gray-600 font-semibold border-b border-gray-200">2 Movers</th>
                      <th className="px-4 py-2 text-center text-gray-600 font-semibold border-b border-gray-200">3 Movers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "2T", label: "2T Van" },
                      { key: "5T", label: "5T Truck" },
                      { key: "6T", label: "6T Truck" },
                      { key: "10T", label: "10T Truck" },
                      { key: "12T", label: "12T Truck" },
                    ].map(({ key, label }, idx) => {
                      const rates = (form.moving_rates_config || {});
                      const truckRates = rates[key] || {};
                      const setRate = (movers, val) => {
                        set("moving_rates_config", {
                          ...rates,
                          [key]: { ...truckRates, [movers]: val }
                        });
                      };
                      return (
                        <tr key={key} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-2 font-medium text-gray-700 border-b border-gray-100">{label}</td>
                          <td className="px-4 py-2 border-b border-gray-100">
                            <input
                              type="number" min="0" step="0.01" placeholder="0.00"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                              value={truckRates["2M"] || ""}
                              onChange={(e) => setRate("2M", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2 border-b border-gray-100">
                            <input
                              type="number" min="0" step="0.01" placeholder="0.00"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                              value={truckRates["3M"] || ""}
                              onChange={(e) => setRate("3M", e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unpacking Pricing - rates grid */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Unpacking Pricing ($/hr)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left text-gray-600 font-semibold border-b border-gray-200">Service</th>
                      <th className="px-4 py-2 text-center text-gray-600 font-semibold border-b border-gray-200">2 People</th>
                      <th className="px-4 py-2 text-center text-gray-600 font-semibold border-b border-gray-200">3 People</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-4 py-2 font-medium text-gray-700 border-b border-gray-100">Unpacking</td>
                      <td className="px-4 py-2 border-b border-gray-100">
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                          value={(form.unpacking_rates_config || {})["2P"] || ""}
                          onChange={(e) => set("unpacking_rates_config", { ...(form.unpacking_rates_config || {}), "2P": e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2 border-b border-gray-100">
                        <input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                          value={(form.unpacking_rates_config || {})["3P"] || ""}
                          onChange={(e) => set("unpacking_rates_config", { ...(form.unpacking_rates_config || {}), "3P": e.target.value })}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Field label="Distance Between Locations (km)">
                <input className={inputClass} type="number" value={form.distance_km} onChange={(e) => set("distance_km", e.target.value)} placeholder="e.g. 25 (optional — AI will estimate if blank)" min="0" />
              </Field>
            </div>
          </Section>

          <Section title="Unpacking Pricing">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Number of People">
                <select className={selectClass} value={form.unpacking_num_people || ""} onChange={(e) => set("unpacking_num_people", e.target.value)}>
                  <option value="">Select</option>
                  <option value="2">2 People</option>
                  <option value="3">3 People</option>
                </select>
              </Field>
              <Field label="Hours">
                <input className={inputClass} type="number" min="0" step="0.5" value={form.unpacking_hours || ""} onChange={(e) => {
                  const hrs = parseFloat(e.target.value) || 0;
                  const rate = parseFloat(form.unpacking_rate_per_hour) || 0;
                  set("unpacking_hours", e.target.value);
                  if (rate) set("unpacking_total", (hrs * rate).toFixed(2));
                }} placeholder="e.g. 2" />
              </Field>
              <Field label="Rate ($/hr)">
                <input className={inputClass} type="number" min="0" step="0.01" value={form.unpacking_rate_per_hour || ""} onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 0;
                  const hrs = parseFloat(form.unpacking_hours) || 0;
                  set("unpacking_rate_per_hour", e.target.value);
                  if (hrs) set("unpacking_total", (hrs * rate).toFixed(2));
                }} placeholder="e.g. 160" />
              </Field>
              <Field label="Total ($)">
                <input className={inputClass + " font-semibold bg-green-50 border-green-300"} type="number" min="0" step="0.01" value={form.unpacking_total || ""} onChange={(e) => set("unpacking_total", e.target.value)} placeholder="Auto-calculated" />
              </Field>
            </div>
          </Section>

          <Section title="Flat Rate Charges">
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setFlatRates([...flatRates, { description: "", amount: "" }])}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50"
              >
                <Plus size={13} /> Add Charge
              </button>
            </div>
            {flatRates.length === 0 && (
              <p className="text-sm text-gray-400 italic">No flat rate charges added yet.</p>
            )}
            {flatRates.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_140px_36px] gap-2 text-xs text-gray-500 font-medium px-1">
                  <span>Description</span>
                  <span>Amount ($)</span>
                  <span></span>
                </div>
                {flatRates.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_140px_36px] gap-2 items-center">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Stair carry, Long walk, Fuel levy"
                      value={row.description}
                      onChange={(e) => { const r = [...flatRates]; r[idx].description = e.target.value; setFlatRates(r); }}
                    />
                    <input
                      type="number" min="0" step="0.01"
                      className={inputClass + " text-right"}
                      placeholder="0.00"
                      value={row.amount}
                      onChange={(e) => { const r = [...flatRates]; r[idx].amount = e.target.value; setFlatRates(r); }}
                    />
                    <button
                      type="button"
                      onClick={() => setFlatRates(flatRates.filter((_, i) => i !== idx))}
                      className="flex items-center justify-center w-9 h-9 text-red-400 hover:text-red-600 hover:bg-red-50 rounded border border-gray-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <p className="text-sm font-semibold text-gray-700">
                    Total: ${
                      flatRates.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toFixed(2)
                    }
                  </p>
                </div>
              </div>
            )}
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