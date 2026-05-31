import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingCart, Plus, Minus, Send, CheckCircle, Package } from "lucide-react";

const ITEMS = [
  { id: "tea_chest", name: "Tea Chest Box", price: 6.00, desc: "43 × 41 × 60 cm — ideal for household goods, clothing, toys & small appliances" },
  { id: "book_wine", name: "Book & Wine Box", price: 5.50, desc: "41 × 30 × 43 cm — ideal for books, well-wrapped wine bottles & kitchen items" },
  { id: "port_a_robe", name: "Port-A-Robe", price: 20.00, desc: "60 × 48 × 120 cm — ideal for suiting & delicate clothing that should not be folded" },
  { id: "packing_paper", name: "Packing Paper (125 sheets)", price: 25.00, desc: "To wrap all items. Fills voids and pads top and bottom of boxes" },
  { id: "mattress_single", name: "Mattress Protector — Single", price: 14.00, desc: "Protects mattress from dirt and damage" },
  { id: "mattress_dq", name: "Mattress Protector — Double/Queen", price: 18.00, desc: "Protects mattress from dirt and damage" },
  { id: "mattress_king", name: "Mattress Protector — King", price: 20.00, desc: "Protects mattress from dirt and damage" },
  { id: "packaging_tape", name: "Packaging Tape", price: 5.00, desc: "Used to secure the bottom of boxes and tops of non-fragile boxes" },
  { id: "bubble_wrap", name: "Bubble Wrap — Heavy Duty (50m × 375mm)", price: 40.00, desc: "For all glass, mirror, antique and fragile goods" },
  { id: "fragile_tape", name: "\"Fragile\" Tape", price: 6.00, desc: "Used to close the top of boxes containing fragile items only" },
];

export default function PackagingOrder() {
  const [quantities, setQuantities] = useState({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const setQty = (id, delta) => setQuantities(prev => {
    const next = Math.max(0, (prev[id] || 0) + delta);
    return { ...prev, [id]: next };
  });

  const orderItems = ITEMS.filter(i => (quantities[i.id] || 0) > 0);
  const subtotal = orderItems.reduce((sum, i) => sum + i.price * (quantities[i.id] || 0), 0);
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (orderItems.length === 0) { alert("Please select at least one item."); return; }
    setSending(true);

    const itemsHtml = orderItems.map(i => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${i.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${quantities[i.id]}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">$${i.price.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">$${(i.price * quantities[i.id]).toFixed(2)}</td>
      </tr>`).join("");

    const body = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:24px;">
    <h1 style="color:white;margin:0;font-size:22px;">MOVE ON REMOVALS</h1>
    <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">Packaging Supplies Invoice</p>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi <strong>${form.name}</strong>,</p>
    <p>Thank you for your packaging supplies order. Please find your invoice below.</p>
    ${form.address ? `<p><strong>Delivery Address:</strong> ${form.address}</p>` : ""}

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Item</th>
          <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e2e8f0;">Qty</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">Unit</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <table style="width:100%;max-width:300px;margin-left:auto;border-collapse:collapse;">
      <tr>
        <td style="padding:4px 8px;color:#64748b;">Subtotal (excl. GST)</td>
        <td style="padding:4px 8px;text-align:right;">$${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;color:#64748b;">GST (10%)</td>
        <td style="padding:4px 8px;text-align:right;">$${gst.toFixed(2)}</td>
      </tr>
      <tr style="font-weight:bold;font-size:16px;">
        <td style="padding:8px;background:#f1f5f9;">TOTAL (incl. GST)</td>
        <td style="padding:8px;background:#f1f5f9;text-align:right;color:#1d4ed8;">$${total.toFixed(2)}</td>
      </tr>
    </table>

    ${form.notes ? `<p style="margin-top:16px;background:#fefce8;border-left:4px solid #eab308;padding:12px;"><strong>Notes:</strong> ${form.notes}</p>` : ""}

    <p style="margin-top:24px;font-size:13px;color:#64748b;">
      <strong>PAYMENT TERMS:</strong> Payment is required prior to delivery.<br/>
      <strong>DELIVERY:</strong> Delivery charges may apply — we'll contact you to confirm.<br/>
      All pricing excludes GST unless otherwise noted.
    </p>
    <p>If you have any questions, please reply to this email or call us.</p>
    <p>Kind regards,<br/><strong>Move On Removals</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals — Packaging Supplies</p>
  </div>
</div>`;

    await base44.integrations.Core.SendEmail({
      to: form.email,
      subject: "Move On Removals — Packaging Supplies Invoice",
      body,
    });

    // Also send notification to office
    await base44.integrations.Core.SendEmail({
      to: "moveme@moveonremovals.com.au",
      subject: `New Packaging Order — ${form.name} — $${total.toFixed(2)}`,
      body: `<p>New packaging order from <strong>${form.name}</strong> (${form.email}, ${form.phone}).</p><p>Delivery: ${form.address || "Not provided"}</p><p>Total: $${total.toFixed(2)} incl. GST</p>` + body,
    });

    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Received!</h2>
          <p className="text-gray-500">Your invoice has been emailed to <strong>{form.email}</strong>. We'll be in touch to confirm delivery.</p>
          <button onClick={() => { setSent(false); setQuantities({}); setForm({ name: "", email: "", phone: "", address: "", notes: "" }); }}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold">
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-1">Packaging Supplies</h1>
        <p className="text-blue-200 text-sm">Select your items below — we deliver to you!</p>
        <p className="text-blue-300 text-xs mt-1">All prices exclude GST · Minimum order for delivery may apply</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-bold text-gray-700 text-lg mb-4 flex items-center gap-2">
              <Package size={20} className="text-blue-600" /> Select Items
            </h2>
            {ITEMS.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                    <p className="font-bold text-blue-700 text-base ml-3 whitespace-nowrap">${item.price.toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setQty(item.id, -1)}
                    disabled={(quantities[item.id] || 0) === 0}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800">{quantities[item.id] || 0}</span>
                  <button
                    onClick={() => setQty(item.id, 1)}
                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-2">* Second-hand boxes may be available at 50% off — contact us for availability.</p>
          </div>

          {/* Order summary + form */}
          <div className="space-y-6">
            {/* Cart */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-600" /> Your Order
              </h3>
              {orderItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No items selected yet</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {orderItems.map(i => (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{i.name} × {quantities[i.id]}</span>
                      <span className="font-medium text-gray-800">${(i.price * quantities[i.id]).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {orderItems.length > 0 && (
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal (excl. GST)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>GST (10%)</span>
                    <span>${gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-blue-700 pt-1 border-t">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Contact form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-gray-700 mb-1">Your Details</h3>
              {[
                { key: "name", label: "Full Name", type: "text", required: true },
                { key: "email", label: "Email", type: "email", required: true },
                { key: "phone", label: "Phone", type: "tel", required: true },
                { key: "address", label: "Delivery Address", type: "text", required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}{f.required && " *"}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Any special instructions..."
                />
              </div>
              <button
                type="submit"
                disabled={sending || orderItems.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold text-sm mt-2 transition-colors"
              >
                {sending
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  : <><Send size={16} /> Send My Invoice</>}
              </button>
              <p className="text-xs text-gray-400 text-center">We'll email your invoice instantly. Payment required prior to delivery.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}