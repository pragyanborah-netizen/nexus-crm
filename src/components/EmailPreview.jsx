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

    const movingDetails = [];
    if ((form.selected_services || []).includes("Moving")) {
      if (form.moving_date || form.move_date) movingDetails.push(`<strong>Date:</strong> ${form.moving_date || form.move_date}${form.moving_time ? ` at ${form.moving_time}` : ""}`);
      if (form.moving_truck_size) movingDetails.push(`<strong>Truck:</strong> ${form.moving_truck_size}`);
      if (form.moving_num_people) movingDetails.push(`<strong>Movers:</strong> ${form.moving_num_people}`);
      if (form.moving_rate_per_hour) movingDetails.push(`<strong>Rate:</strong> $${form.moving_rate_per_hour}/hr`);
      if (form.moving_hours) movingDetails.push(`<strong>Estimated Hours:</strong> ${form.moving_hours} hrs`);
      if (form.moving_total) movingDetails.push(`<strong>Estimated Moving Total:</strong> $${Number(form.moving_total).toLocaleString()}`);
    }
    if ((form.selected_services || []).includes("Packing")) {
      if (form.packing_date) movingDetails.push(`<strong>Packing Date:</strong> ${form.packing_date}${form.packing_time ? ` at ${form.packing_time}` : ""}`);
      if (form.packing_num_people) movingDetails.push(`<strong>Packers:</strong> ${form.packing_num_people}`);
      if (form.packing_rate_per_hour) movingDetails.push(`<strong>Packing Rate:</strong> $${form.packing_rate_per_hour}/hr`);
      if (form.packing_hours) movingDetails.push(`<strong>Packing Hours:</strong> ${form.packing_hours} hrs`);
      if (form.packing_total) movingDetails.push(`<strong>Packing Total:</strong> $${Number(form.packing_total).toLocaleString()}`);
    }
    if ((form.selected_services || []).includes("Unpacking")) {
      if (form.unpacking_date) movingDetails.push(`<strong>Unpacking Date:</strong> ${form.unpacking_date}${form.unpacking_time ? ` at ${form.unpacking_time}` : ""}`);
      if (form.unpacking_num_people) movingDetails.push(`<strong>Unpackers:</strong> ${form.unpacking_num_people}`);
      if (form.unpacking_hours) movingDetails.push(`<strong>Unpacking Hours:</strong> ${form.unpacking_hours} hrs`);
      if (form.unpacking_total) movingDetails.push(`<strong>Unpacking Total:</strong> $${Number(form.unpacking_total).toLocaleString()}`);
    }

    return {
      subject: `Move On Removals – Your Quote`,
      body: `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 28px;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:28px 32px;border:1px solid #e2e8f0;border-top:none;background:#fff;">
    <p style="font-size:15px;">Hi <strong>${firstName}</strong>,</p>
    <p style="font-size:15px;">Thank-you for your enquiry with <strong>Move On Removals</strong>.</p>
    <p style="font-size:15px;">Based on the information you have provided, I would like to recommend the following quotation for your move:</p>

    ${movingDetails.length > 0 ? `
    <div style="background:#f0f7ff;border-left:4px solid #1d4ed8;border-radius:6px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;">MOVING DETAILS</p>
      ${movingDetails.map(d => `<p style="margin:4px 0;font-size:14px;">${d}</p>`).join("")}
    </div>` : ""}

    ${form.price ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:20px;font-weight:bold;color:#15803d;">Total Estimate: $${Number(form.price).toLocaleString()}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">All pricing is excluding GST unless otherwise noted.</p>
    </div>` : `<p style="font-size:13px;color:#64748b;">All pricing is excluding GST unless otherwise noted.</p>`}

    <div style="margin:24px 0;padding:14px 20px;background:#faf5ff;border-radius:8px;border:1px solid #e9d5ff;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#7c3aed;">👋 WHO ARE WE IN 15 SECS</p>
      <a href="https://www.youtube.com/watch?v=YflWvS-XgGM" style="color:#1d4ed8;font-size:14px;">https://www.youtube.com/watch?v=YflWvS-XgGM</a>
    </div>

    <div style="margin:24px 0;">
      <p style="font-size:14px;margin-bottom:10px;font-weight:600;color:#334155;">Important Information:</p>
      <table style="width:100%;">
        <tr><td style="vertical-align:top;padding:6px 8px 6px 0;width:20px;font-size:14px;">•</td>
          <td style="font-size:13.5px;color:#475569;padding:6px 0;">Charges are door to door, from pick up location to final drop off, and in half hour increments after the initial minimum booking time. Night rates may be applicable from 4pm, except if booking a 4T or 5T truck in which night rates may be applicable after 5pm. Bookings for afternoon slots may vary in arrival time due to the morning bookings, and this will be considered in adjusting night rates for each individual move. The team will be in touch during the day with updates if necessary.</td>
        </tr>
        <tr><td style="vertical-align:top;padding:6px 8px 6px 0;width:20px;font-size:14px;">•</td>
          <td style="font-size:13.5px;color:#475569;padding:6px 0;">Move on Removals has Public Liability Insurance and Transit Insurance. Please refer to our terms and conditions at <a href="http://www.moveonremovals.com.au" style="color:#1d4ed8;">www.moveonremovals.com.au</a> for further information.</td>
        </tr>
      </table>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 18px;margin:20px 0;font-size:13.5px;color:#475569;">
      <p style="margin:0 0 8px;">Please note that the above quote is <strong>not a booking</strong> and if you do wish to go ahead with the above quote the time and date will be subject to availability, a deposit and our Terms and Conditions. Quotes are valid for <strong>14 days only</strong>, at which time, you may need to be provided an update depending on availability.</p>
    </div>

    <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:6px;padding:14px 18px;margin:20px 0;">
      <p style="margin:0;font-size:13px;font-weight:bold;color:#c2410c;">⚠️ QUOTATIONS ARE BASED ON THE INFORMATION YOU PROVIDE TO US ON THE INVENTORY TO BE MOVED. NOT LISTING ITEMS MAY RESULT IN A DIFFERENT SIZED TRUCK BEING NEEDED AND A DELAY IN YOUR MOVE.</p>
    </div>

    <p style="font-size:14px;color:#475569;">If you have any questions regarding this quotation or your move, please do not hesitate to contact our team. We are here to help!</p>

    <p style="margin-top:24px;font-size:14px;">Kind regards,<br/><strong>Move On Removals</strong><br/>
      <a href="mailto:moveme@moveonremovals.com.au" style="color:#1d4ed8;">moveme@moveonremovals.com.au</a>
    </p>
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