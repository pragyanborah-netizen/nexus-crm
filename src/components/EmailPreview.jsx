import { useState } from "react";
import { ChevronDown, ChevronUp, Mail } from "lucide-react";

function getEmailContent(form, inventoryLink, flatRates) {
  const firstName = form.customer_first_name || "there";
  const link = inventoryLink || "";
  const addressBlock = [form.pickup_address, form.pickup_suburb, form.pickup_state, form.pickup_postcode].filter(Boolean).join(", ") || "TBC";
  const deliveryBlock = [form.delivery_address, form.delivery_suburb, form.delivery_state, form.delivery_postcode].filter(Boolean).join(", ") || "TBC";

  if (form.status === "Enquiry") {
    return {
      subject: `Move On Removals – We tried to reach you`,
      body: `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${firstName},</p>
    <p>Thank you for your enquiry and for considering Move On Removals.</p>
    <p>To help us provide an accurate quote and recommend the right truck size for your move, please complete our Inventory Checklist using the link below and return it when convenient:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${link}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">📋 Complete Inventory Checklist</a>
    </div>
    <p style="font-size:13px;color:#64748b;">Or copy this link: <a href="${link}" style="color:#1d4ed8;">${link || "[inventory link]"}</a></p>
    <p>We also offer professional packing and unpacking services, so please let us know if you'd like more information about these options.</p>
    <p>If you have any questions, simply reply to this email or give us a call.</p>
    <p>We look forward to assisting with your move.</p>
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`
    };
  }

  if (form.status === "Quoted") {
    const inventoryHtml = (form.items_to_move || []).length > 0
      ? form.items_to_move.map(item => `<p style="margin:2px 0;font-size:14px;">1 x ${item}</p>`).join("")
      : `<p style="color:#64748b;font-style:italic;">No items listed.</p>`;
    const flatTotal = (flatRates || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    return {
      subject: `Move On Removals – Your Quote`,
      body: `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${firstName},</p>
    <p>Thank you for your enquiry. Please find your quote details below.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;width:140px;">Move Date</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.move_date || "TBC"}${form.move_time ? " at " + form.move_time : ""}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Pickup</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${addressBlock}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Delivery</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${deliveryBlock}</td></tr>
      ${form.truck_size ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Truck</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.truck_size}</td></tr>` : ""}
      ${form.num_movers ? `<tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Movers</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.num_movers} movers</td></tr>` : ""}
    </table>
    <p><strong>Inventory:</strong></p>
    ${inventoryHtml}
    ${flatRates?.length > 0 ? `<p style="margin-top:16px;"><strong>Additional Charges:</strong></p>${flatRates.map(r => `<p style="margin:2px 0;font-size:14px;">${r.description}: $${Number(r.amount || 0).toLocaleString()}</p>`).join("")}<p>Subtotal: $${flatTotal.toFixed(2)}</p>` : ""}
    ${form.price ? `<p style="background:#eff6ff;padding:14px;border-radius:8px;font-size:18px;font-weight:bold;color:#1d4ed8;">Total Quote: $${Number(form.price).toLocaleString()}</p>` : ""}
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`
    };
  }

  // Tentative Booking or Booked Job
  const inventoryHtml = (form.items_to_move || []).length > 0
    ? form.items_to_move.map(item => `<p style="margin:2px 0;font-size:14px;">1 x ${item}</p>`).join("")
    : `<p style="color:#64748b;font-style:italic;">No items listed.</p>`;
  const flatTotal = (flatRates || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const isTentative = form.status === "Tentative Booking";

  return {
    subject: `MOVE ON REMOVALS – ${isTentative ? "Tentative Booking Confirmation" : "Booking Confirmation"}`,
    body: `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${firstName},</p>
    ${isTentative
      ? "<p>Thank you for your interest! We have a <strong>tentative booking</strong> held for you. Please confirm at your earliest convenience to secure your spot.</p>"
      : "<p>Thank you for booking with Move On Removals.</p><p><strong>This job is now secured, acceptance of which constitutes the acknowledgement and acceptance of our Terms and Conditions and the booking details below.</strong></p>"}
    <p><em>Please confirm the list of contents below reflects what you are moving, to ensure we are sending the most suitable truck for your needs.</em></p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;width:140px;">Move Date</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.move_date || "TBC"}${form.move_time ? " at " + form.move_time : ""}</td></tr>
      <tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Pickup</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${addressBlock}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Delivery</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${deliveryBlock}</td></tr>
      ${form.truck_size ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Truck</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.truck_size}</td></tr>` : ""}
      ${form.num_movers ? `<tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Movers</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.num_movers} movers</td></tr>` : ""}
      ${form.moving_hours ? `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:bold;">Moving (est.)</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${form.moving_hours} hrs</td></tr>` : ""}
    </table>
    <p><strong>Inventory:</strong></p>
    ${inventoryHtml}
    ${flatRates?.length > 0 ? `<p style="margin-top:16px;"><strong>Additional Charges:</strong></p>${flatRates.map(r => `<p style="margin:2px 0;font-size:14px;">${r.description}: $${Number(r.amount || 0).toLocaleString()}</p>`).join("")}` : ""}
    ${form.price ? `<p style="background:#eff6ff;padding:14px;border-radius:8px;font-size:18px;font-weight:bold;color:#1d4ed8;">Total: $${Number(form.price).toLocaleString()}</p>` : ""}
    ${form.deposit ? `<p>Deposit Required: <strong>$${Number(form.deposit).toLocaleString()}</strong></p>` : ""}
    ${form.notes ? `<p style="background:#f8fafc;padding:12px;border-left:4px solid #3b82f6;">${form.notes}</p>` : ""}
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals Team</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`
  };
}

export default function EmailPreview({ form, inventoryLink, flatRates }) {
  const [open, setOpen] = useState(false);
  const email = getEmailContent(form, inventoryLink, flatRates);

  const statusLabel = {
    "Enquiry": "Enquiry Email",
    "Quoted": "Quote Email",
    "Tentative Booking": "Tentative Booking Email",
    "Booked Job": "Booking Confirmation Email",
  }[form.status] || "Email Preview";

  return (
    <div className="bg-white rounded-lg shadow mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b-2 border-blue-500 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Email Preview — {statusLabel}</h2>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {form.status}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Subject:</span>
            <span className="text-sm text-gray-700 font-medium">{email.subject}</span>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="bg-white"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          </div>
        </div>
      )}
    </div>
  );
}