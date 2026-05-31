import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle, Plus, X, Loader2, Check, Send } from "lucide-react";

const STEPS = ["Your Details", "Move Details", "Your Items", "Services", "Your Quote"];

const ITEM_CATEGORIES = {
  "Bedroom": ["Single Bed", "Double Bed", "Queen Bed", "King Bed", "Bedside Table", "Wardrobe", "Chest of Drawers", "Dresser", "Desk", "Office Chair"],
  "Living Room": ["2-Seat Sofa", "3-Seat Sofa", "L-Shape Sofa", "Coffee Table", "TV Unit", "TV (up to 65\")", "Bookcase", "Armchair", "Ottoman", "Dining Table", "Dining Chair"],
  "Kitchen": ["Fridge", "Washing Machine", "Dryer", "Dishwasher", "Microwave", "Bar Fridge"],
  "Outdoor": ["BBQ", "Outdoor Table", "Outdoor Chair", "Garden Shed (flat pack)", "Trampoline", "Bicycle"],
  "Other": ["Piano (upright)", "Treadmill", "Pool/Billiard Table", "Safe", "Large Artwork", "Boxes (small)", "Boxes (medium)", "Boxes (large)"],
};

const SERVICE_OPTIONS = [
  { id: "packing", label: "Packing", desc: "We professionally pack your belongings", icon: "📦" },
  { id: "moving", label: "Moving", desc: "Full truck and crew transport service", icon: "🚛" },
  { id: "unpacking", label: "Unpacking", desc: "We unpack and set up at destination", icon: "🏠" },
  { id: "packaging_supplies", label: "Packaging Supplies", desc: "Boxes, tape, bubble wrap delivered to you", icon: "🛒" },
];

const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white";

export default function CustomerQuote() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    pickup_address: "", pickup_suburb: "", pickup_state: "VIC",
    delivery_address: "", delivery_suburb: "", delivery_state: "VIC",
    move_date: "", customer_type: "Residential",
    pickup_floor: "", delivery_floor: "",
    pickup_elevator: false, delivery_elevator: false,
  });
  const [items, setItems] = useState([]);
  const [customItem, setCustomItem] = useState("");
  const [services, setServices] = useState({ moving: true, packing: false, unpacking: false, packaging_supplies: false });
  const [generating, setGenerating] = useState(false);
  const [quote, setQuote] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleService = id => setServices(p => ({ ...p, [id]: !p[id] }));
  const addItem = (name) => { if (!items.includes(name)) setItems(p => [...p, name]); };
  const removeItem = (name) => setItems(p => p.filter(i => i !== name));
  const addCustom = () => {
    const v = customItem.trim();
    if (v && !items.includes(v)) { setItems(p => [...p, v]); setCustomItem(""); }
  };

  const selectedServices = SERVICE_OPTIONS.filter(s => services[s.id]);

  const generateQuote = async () => {
    setGenerating(true);
    setQuote(null);
    setStep(4);
    const serviceList = selectedServices.map(s => s.label).join(", ");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional removalist quoting expert for Move On Removals in Australia (Melbourne area).
Generate a detailed, accurate quote for the following job.

CUSTOMER DETAILS:
- Name: ${form.first_name} ${form.last_name}
- Type: ${form.customer_type}
- Move Date: ${form.move_date || "TBD"}

LOCATIONS:
- Pickup: ${[form.pickup_address, form.pickup_suburb, form.pickup_state].filter(Boolean).join(", ") || "Not specified"}
  Floor: ${form.pickup_floor || "Ground"}, Elevator: ${form.pickup_elevator ? "Yes" : "No"}
- Delivery: ${[form.delivery_address, form.delivery_suburb, form.delivery_state].filter(Boolean).join(", ") || "Not specified"}
  Floor: ${form.delivery_floor || "Ground"}, Elevator: ${form.delivery_elevator ? "Yes" : "No"}

SERVICES REQUESTED: ${serviceList || "Moving"}

INVENTORY (${items.length} items):
${items.map(i => "- " + i).join("\n") || "No items listed"}

RATE GUIDELINES (AUD, excl GST):
- Moving M-F: 5T truck 2 movers $168/hr, 6T $178/hr, 10T 2 movers $208/hr, 10T 3 movers $278/hr, 12T 3 movers $288/hr
- Packing M-F: 2 packers $168/hr (+$68/extra packer/hr). Min 3 hrs.
- Unpacking M-F: 2 unpackers $168/hr. Min 3 hrs.
- Factor in travel time (typically 1hr travel each way for metro Melbourne)
- Stairs/no elevator add approx 20% time
- Provide realistic Australian market estimates`,
      response_json_schema: {
        type: "object",
        properties: {
          truck_size: { type: "string" },
          num_movers: { type: "number" },
          moving_hours: { type: "number" },
          moving_rate: { type: "number" },
          moving_total: { type: "number" },
          packing_hours: { type: "number" },
          packing_rate: { type: "number" },
          packing_total: { type: "number" },
          unpacking_hours: { type: "number" },
          unpacking_rate: { type: "number" },
          unpacking_total: { type: "number" },
          packaging_supplies_estimate: { type: "number" },
          subtotal: { type: "number" },
          deposit_required: { type: "number" },
          summary: { type: "string" },
          recommendations: { type: "string" },
          estimated_duration: { type: "string" },
        }
      },
      model: "claude_sonnet_4_6",
    });
    setQuote(result);
    setGenerating(false);
  };

  const handleAccept = async () => {
    if (!form.email) { alert("Please provide your email address."); return; }
    setAccepting(true);

    const subtotal = quote.subtotal || ((quote.moving_total || 0) + (quote.packing_total || 0) + (quote.unpacking_total || 0) + (quote.packaging_supplies_estimate || 0));
    const gst = subtotal * 0.1;
    const total = subtotal + gst;

    const lineItems = [];
    if (quote.moving_total) lineItems.push({ label: `Moving — ${quote.truck_size}, ${quote.num_movers} movers, ~${quote.moving_hours}hrs @ $${quote.moving_rate}/hr`, amount: quote.moving_total });
    if (quote.packing_total) lineItems.push({ label: `Packing — ~${quote.packing_hours}hrs @ $${quote.packing_rate}/hr`, amount: quote.packing_total });
    if (quote.unpacking_total) lineItems.push({ label: `Unpacking — ~${quote.unpacking_hours}hrs @ $${quote.unpacking_rate}/hr`, amount: quote.unpacking_total });
    if (quote.packaging_supplies_estimate) lineItems.push({ label: "Packaging Supplies (estimate)", amount: quote.packaging_supplies_estimate });

    const linesHtml = lineItems.map(l => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;">${l.label}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;">$${Number(l.amount).toFixed(2)}</td>
      </tr>`).join("");

    const inventoryHtml = items.length > 0
      ? items.map(i => `<li style="font-size:13px;margin:2px 0;">${i}</li>`).join("")
      : "<li>No items listed</li>";

    const body = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:24px;">
    <h1 style="color:white;margin:0;font-size:22px;">MOVE ON REMOVALS</h1>
    <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">Your Instant Move Quote</p>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi <strong>${form.first_name}</strong>,</p>
    <p>Thank you for using our instant quote tool! Here are your estimated moving costs.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Service</th>
        <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">Estimate</th>
      </tr></thead>
      <tbody>${linesHtml}</tbody>
    </table>
    <table style="width:100%;max-width:300px;margin-left:auto;border-collapse:collapse;">
      <tr><td style="padding:4px 8px;color:#64748b;font-size:13px;">Subtotal (excl. GST)</td><td style="padding:4px 8px;text-align:right;font-size:13px;">$${subtotal.toFixed(2)}</td></tr>
      <tr><td style="padding:4px 8px;color:#64748b;font-size:13px;">GST (10%)</td><td style="padding:4px 8px;text-align:right;font-size:13px;">$${gst.toFixed(2)}</td></tr>
      <tr style="font-weight:bold;font-size:16px;">
        <td style="padding:8px;background:#f1f5f9;">TOTAL ESTIMATE</td>
        <td style="padding:8px;background:#f1f5f9;text-align:right;color:#1d4ed8;">$${total.toFixed(2)}</td>
      </tr>
    </table>
    ${quote.deposit_required ? `<p style="margin-top:12px;font-size:13px;"><strong>Deposit Required:</strong> $${Number(quote.deposit_required).toFixed(2)}</p>` : ""}
    ${quote.estimated_duration ? `<p style="font-size:13px;"><strong>Estimated Duration:</strong> ${quote.estimated_duration}</p>` : ""}
    ${quote.recommendations ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:16px 0;font-size:13px;"><strong>Our Recommendations:</strong><br/>${quote.recommendations}</div>` : ""}
    <div style="background:#f8fafc;padding:14px;border-radius:8px;margin-top:16px;">
      <p style="font-size:13px;font-weight:bold;margin:0 0 8px;">Move Details</p>
      <p style="font-size:13px;margin:2px 0;">Move Date: ${form.move_date || "TBD"}</p>
      <p style="font-size:13px;margin:2px 0;">Pickup: ${[form.pickup_suburb, form.pickup_state].filter(Boolean).join(", ") || "TBD"}</p>
      <p style="font-size:13px;margin:2px 0;">Delivery: ${[form.delivery_suburb, form.delivery_state].filter(Boolean).join(", ") || "TBD"}</p>
    </div>
    <div style="margin-top:16px;">
      <p style="font-size:13px;font-weight:bold;margin:0 0 6px;">Items to Move (${items.length})</p>
      <ul style="margin:0;padding-left:18px;">${inventoryHtml}</ul>
    </div>
    <p style="margin-top:20px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;">
      This is an estimate only. Final price is based on actual hours worked. Minimum charges apply.
      To confirm your booking, reply to this email or call us.
    </p>
    <p>We look forward to helping with your move!</p>
    <p>Kind regards,<br/><strong>Move On Removals</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`;

    await base44.integrations.Core.SendEmail({
      to: form.email,
      subject: `Move On Removals - Your Move Quote - $${total.toFixed(2)} est.`,
      body,
    });

    await base44.integrations.Core.SendEmail({
      to: "moveme@moveonremovals.com.au",
      subject: `New Quote Request - ${form.first_name} ${form.last_name} - $${total.toFixed(2)}`,
      body: `<p><strong>${form.first_name} ${form.last_name}</strong> (${form.email}, ${form.phone}) accepted a quote for $${total.toFixed(2)} incl. GST.</p><p>Move: ${form.move_date || "TBD"} from ${form.pickup_suburb} to ${form.delivery_suburb}</p>` + body,
    });

    setAccepting(false);
    setAccepted(true);
  };

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Accepted!</h2>
          <p className="text-gray-500 mb-4">Your quote has been emailed to <strong>{form.email}</strong>. Our team will contact you shortly to confirm your booking.</p>
          <p className="text-sm text-blue-600 font-semibold">Call us anytime to confirm now</p>
        </div>
      </div>
    );
  }

  const canNext = () => {
    if (step === 0) return form.first_name && form.last_name && form.email && form.phone;
    if (step === 1) return form.pickup_suburb && form.delivery_suburb;
    return true;
  };

  const subtotal = quote ? (quote.subtotal || ((quote.moving_total || 0) + (quote.packing_total || 0) + (quote.unpacking_total || 0) + (quote.packaging_supplies_estimate || 0))) : 0;
  const total = subtotal * 1.1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 to-blue-900">
      {/* Header */}
      <div className="text-white px-4 pt-10 pb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={24} className="text-yellow-300" />
          <h1 className="text-2xl font-bold">Instant Move Quote</h1>
        </div>
        <p className="text-blue-200 text-sm">Get an AI-powered estimate in 2 minutes</p>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mt-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-green-400 text-white" :
                i === step ? "bg-white text-blue-700" :
                "bg-blue-600 text-blue-300"
              }`}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-5 h-0.5 ${i < step ? "bg-green-400" : "bg-blue-600"}`} />}
            </div>
          ))}
        </div>
        <p className="text-blue-200 text-xs mt-2">{STEPS[step]}</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-t-3xl min-h-screen px-4 pt-8 pb-32 mx-auto max-w-xl">

        {/* Step 0: Details */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                <input className={inputClass} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name *</label>
                <input className={inputClass} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
              <input className={inputClass} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
              <input className={inputClass} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="04XX XXX XXX" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Move Type</label>
              <div className="grid grid-cols-3 gap-2">
                {["Residential", "Commercial", "Office"].map(t => (
                  <button key={t} onClick={() => set("customer_type", t)}
                    className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${form.customer_type === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Move Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Move Details</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Move Date</label>
              <input className={inputClass} type="date" value={form.move_date} onChange={e => set("move_date", e.target.value)} />
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-blue-800">Pickup Location</p>
              <input className={inputClass} placeholder="Street address" value={form.pickup_address} onChange={e => set("pickup_address", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} placeholder="Suburb *" value={form.pickup_suburb} onChange={e => set("pickup_suburb", e.target.value)} />
                <input className={inputClass} placeholder="State" value={form.pickup_state} onChange={e => set("pickup_state", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} placeholder="Floor/Level" value={form.pickup_floor} onChange={e => set("pickup_floor", e.target.value)} />
                <label className="flex items-center gap-2 cursor-pointer bg-white rounded-xl px-3 py-3 border border-gray-300">
                  <input type="checkbox" checked={form.pickup_elevator} onChange={e => set("pickup_elevator", e.target.checked)} />
                  <span className="text-sm text-gray-600">Elevator</span>
                </label>
              </div>
            </div>

            <div className="bg-green-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold text-green-800">Delivery Location</p>
              <input className={inputClass} placeholder="Street address" value={form.delivery_address} onChange={e => set("delivery_address", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} placeholder="Suburb *" value={form.delivery_suburb} onChange={e => set("delivery_suburb", e.target.value)} />
                <input className={inputClass} placeholder="State" value={form.delivery_state} onChange={e => set("delivery_state", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} placeholder="Floor/Level" value={form.delivery_floor} onChange={e => set("delivery_floor", e.target.value)} />
                <label className="flex items-center gap-2 cursor-pointer bg-white rounded-xl px-3 py-3 border border-gray-300">
                  <input type="checkbox" checked={form.delivery_elevator} onChange={e => set("delivery_elevator", e.target.checked)} />
                  <span className="text-sm text-gray-600">Elevator</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-800">Your Items</h2>
              {items.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{items.length} items</span>
              )}
            </div>
            <p className="text-sm text-gray-500">Select from the list below or type your own items</p>

            {items.length > 0 && (
              <div className="flex flex-wrap gap-2 bg-gray-50 rounded-2xl p-3">
                {items.map(item => (
                  <span key={item} className="flex items-center gap-1 bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-full">
                    {item}
                    <button onClick={() => removeItem(item)} className="ml-0.5 hover:text-blue-200"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Type a custom item and press Enter..."
                value={customItem}
                onChange={e => setCustomItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustom()}
              />
              <button onClick={addCustom} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold">
                <Plus size={18} />
              </button>
            </div>

            {Object.entries(ITEM_CATEGORIES).map(([cat, catItems]) => (
              <div key={cat}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {catItems.map(item => {
                    const selected = items.includes(item);
                    return (
                      <button key={item} onClick={() => selected ? removeItem(item) : addItem(item)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                          selected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-600 hover:border-blue-400"
                        }`}>
                        {selected ? "✓ " : ""}{item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Services */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Services Needed</h2>
            <p className="text-sm text-gray-500 mb-4">Select all services you would like</p>
            {SERVICE_OPTIONS.map(s => (
              <button key={s.id} onClick={() => toggleService(s.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  services[s.id] ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}>
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${services[s.id] ? "text-blue-800" : "text-gray-800"}`}>{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  services[s.id] ? "bg-blue-600 border-blue-600" : "border-gray-300"
                }`}>
                  {services[s.id] && <Check size={13} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Quote result */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} className="text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-800">Your Estimate</h2>
            </div>

            {generating && (
              <div className="flex flex-col items-center py-16 gap-4">
                <Loader2 size={40} className="animate-spin text-blue-500" />
                <p className="text-gray-600 font-medium">Calculating your quote...</p>
                <p className="text-gray-400 text-sm">Our AI is reviewing your inventory and route</p>
              </div>
            )}

            {quote && !generating && (
              <>
                {quote.summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
                    {quote.summary}
                  </div>
                )}

                <div className="space-y-3">
                  {quote.moving_total > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800">Moving</p>
                          <p className="text-xs text-gray-500 mt-1">{quote.truck_size} · {quote.num_movers} movers · ~{quote.moving_hours}hrs @ ${quote.moving_rate}/hr</p>
                        </div>
                        <p className="font-bold text-lg text-gray-800">${Number(quote.moving_total).toFixed(0)}</p>
                      </div>
                    </div>
                  )}
                  {quote.packing_total > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800">Packing</p>
                          <p className="text-xs text-gray-500 mt-1">~{quote.packing_hours}hrs @ ${quote.packing_rate}/hr</p>
                        </div>
                        <p className="font-bold text-lg text-gray-800">${Number(quote.packing_total).toFixed(0)}</p>
                      </div>
                    </div>
                  )}
                  {quote.unpacking_total > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800">Unpacking</p>
                          <p className="text-xs text-gray-500 mt-1">~{quote.unpacking_hours}hrs @ ${quote.unpacking_rate}/hr</p>
                        </div>
                        <p className="font-bold text-lg text-gray-800">${Number(quote.unpacking_total).toFixed(0)}</p>
                      </div>
                    </div>
                  )}
                  {quote.packaging_supplies_estimate > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex justify-between">
                      <p className="font-bold text-gray-800">Packaging Supplies</p>
                      <p className="font-bold text-lg text-gray-800">${Number(quote.packaging_supplies_estimate).toFixed(0)}</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal (excl. GST)</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>GST (10%)</span><span>${(subtotal * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-blue-700 border-t pt-2">
                    <span>Total Estimate</span><span>${total.toFixed(2)}</span>
                  </div>
                  {quote.deposit_required > 0 && (
                    <p className="text-xs text-gray-500">Deposit to confirm: <strong>${Number(quote.deposit_required).toFixed(2)}</strong></p>
                  )}
                  {quote.estimated_duration && (
                    <p className="text-xs text-gray-500">Estimated duration: <strong>{quote.estimated_duration}</strong></p>
                  )}
                </div>

                {quote.recommendations && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
                    <p className="font-bold mb-1">Recommendations</p>
                    <p>{quote.recommendations}</p>
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center">
                  This is an estimate only. Final price is based on actual hours worked. Minimum charges apply.
                </p>

                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-base transition-colors shadow-lg"
                >
                  {accepting
                    ? <><Loader2 size={18} className="animate-spin" /> Sending your quote...</>
                    : <><Send size={18} /> Accept and Email My Quote</>}
                </button>

                <button onClick={() => { setStep(3); setQuote(null); }}
                  className="w-full py-3 rounded-2xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50">
                  Back - Adjust My Quote
                </button>
              </>
            )}
          </div>
        )}

        {/* Nav buttons (steps 0-3) */}
        {step < 4 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex gap-3 max-w-xl mx-auto">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-5 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-50">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                Next <ChevronRight size={16} />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={generateQuote}
                disabled={generating || selectedServices.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg"
              >
                {generating
                  ? <><Loader2 size={16} className="animate-spin" /> Calculating...</>
                  : <><Sparkles size={16} /> Generate My Quote</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}