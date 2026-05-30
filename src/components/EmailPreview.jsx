import { useState } from "react";
import { ChevronDown, ChevronUp, Mail } from "lucide-react";

export function getEmailContent(form, inventoryLink, flatRates, packFlatRates, movingFlatRates, unpackFlatRates) {
  const firstName = form.customer_first_name || "there";
  const link = inventoryLink || "";
  const pFR = packFlatRates || [];
  const mFR = movingFlatRates || [];
  const uFR = unpackFlatRates || [];

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

  // Build service lines used by both Tentative + Booked
  const buildServiceLines = () => {
    const lines = [];
    const svcs = form.selected_services || [];

    if (svcs.includes("Packaging Supplies") && form.packaging_supplies_price) {
      lines.push({ label: "Packaging Supplies – Delivery Charge", total: form.packaging_supplies_price, date: form.packaging_supplies_date, time: form.packaging_supplies_time });
    }

    if (svcs.includes("Packing")) {
      const rate = Number(form.packing_rate_per_hour) || 0;
      const hrs  = Number(form.packing_hours) || 0;
      const total = rate && hrs ? rate * hrs : Number(form.packing_total) || 0;
      if (rate || hrs || total) {
        lines.push({ label: `Packing${form.packing_num_people ? " – " + form.packing_num_people + " packers" : ""}${rate ? " @ $" + rate + "/hr" : ""}`, hours: hrs || "", total: total || "", date: form.packing_date, time: form.packing_time });
      }
      pFR.filter(r => r.description && r.amount).forEach(r => lines.push({ label: `Packing – ${r.description}`, total: Number(r.amount) }));
    }

    if (svcs.includes("Moving")) {
      const rate = Number(form.moving_rate_per_hour) || 0;
      const hrs  = Number(form.moving_hours) || 0;
      const total = rate && hrs ? rate * hrs : Number(form.moving_total) || 0;
      if (rate || hrs || total) {
        lines.push({ label: `Moving${form.moving_truck_size ? " – " + form.moving_truck_size : ""}${rate ? " @ $" + rate + "/hr" : ""}`, hours: hrs || "", total: total || "", date: form.moving_date || form.move_date, time: form.moving_time || form.move_time });
      }
      mFR.filter(r => r.description && r.amount).forEach(r => lines.push({ label: `Moving – ${r.description}`, total: Number(r.amount) }));
    }

    if (svcs.includes("Unpacking")) {
      const rate = Number(form.unpacking_rate_per_hour) || 0;
      const hrs  = Number(form.unpacking_hours) || 0;
      const total = rate && hrs ? rate * hrs : Number(form.unpacking_total) || 0;
      if (rate || hrs || total) {
        lines.push({ label: `Unpacking${form.unpacking_num_people ? " – " + form.unpacking_num_people + " unpackers" : ""}${rate ? " @ $" + rate + "/hr" : ""}`, hours: hrs || "", total: total || "", date: form.unpacking_date, time: form.unpacking_time });
      }
      uFR.filter(r => r.description && r.amount).forEach(r => lines.push({ label: `Unpacking – ${r.description}`, total: Number(r.amount) }));
    }

    // global flat rates
    (flatRates || []).filter(r => r.description && r.amount).forEach(r => lines.push({ label: r.description, total: Number(r.amount) }));

    return lines;
  };

  const serviceLines = buildServiceLines();

  const serviceTable = serviceLines.length > 0 ? `
    <div style="background:#f0f7ff;border-left:4px solid #1d4ed8;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:14px;font-family:Arial,sans-serif;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;">Services &amp; Pricing</p>
      <table style="width:100%;border-collapse:collapse;">
        ${serviceLines.map((s, i) => `<tr style="${i % 2 === 0 ? "background:#e8f4ff;" : ""}">
          <td style="padding:6px 8px;font-size:13.5px;font-family:Arial,sans-serif;">${s.label}${s.date ? " · " + s.date : ""}${s.time ? " at " + s.time : ""}</td>
          <td style="padding:6px 8px;font-size:13.5px;font-family:Arial,sans-serif;text-align:right;">${s.hours ? s.hours + " hrs" : ""}</td>
          <td style="padding:6px 8px;font-size:13.5px;font-family:Arial,sans-serif;text-align:right;">${s.total ? "$" + Number(s.total).toLocaleString() : ""}</td>
        </tr>`).join("")}
      </table>
      ${form.price ? `<div style="border-top:2px solid #1d4ed8;margin-top:10px;padding-top:10px;"><p style="margin:0;font-size:16px;font-family:Arial,sans-serif;color:#1d4ed8;text-align:right;">Total Estimate: $${Number(form.price).toLocaleString()}</p></div>` : ""}
    </div>
    <p style="font-size:12px;font-family:Arial,sans-serif;color:#64748b;margin-bottom:16px;">All pricing is excluding GST unless otherwise noted.</p>` : "";

  const inventoryBlock = (form.items_to_move || []).length > 0 ? `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:14px;font-family:Arial,sans-serif;color:#334155;">Inventory:</p>
      ${form.items_to_move.map(item => `<p style="margin:2px 0;font-size:14px;font-family:Arial,sans-serif;">• 1 x ${item}</p>`).join("")}
    </div>` : "";

  const p = (text) => `<p style="font-size:14px;font-family:Arial,sans-serif;color:#475569;margin:8px 0;">${text}</p>`;
  const bullet = (text) => `<tr><td style="vertical-align:top;padding:5px 8px 5px 0;width:16px;font-size:14px;font-family:Arial,sans-serif;">•</td><td style="font-size:13px;font-family:Arial,sans-serif;color:#475569;padding:5px 0;">${text}</td></tr>`;

  const bookingTable = `
    <table style="width:100%;border-collapse:collapse;margin:12px 0 20px;">
      <tr style="background:#f8fafc;"><td style="padding:7px 10px;border:1px solid #e2e8f0;width:150px;font-size:13.5px;font-family:Arial,sans-serif;">Move Date</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">${form.move_date || "TBC"}${form.move_time ? " at " + form.move_time : ""}</td></tr>
      <tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">Pickup</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">${[form.pickup_address, form.pickup_suburb, form.pickup_state, form.pickup_postcode].filter(Boolean).join(", ") || "TBC"}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">Delivery</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">${[form.delivery_address, form.delivery_suburb, form.delivery_state, form.delivery_postcode].filter(Boolean).join(", ") || "TBC"}</td></tr>
      ${form.truck_size ? `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">Truck</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">${form.truck_size}</td></tr>` : ""}
      ${form.num_movers ? `<tr style="background:#f8fafc;"><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">Movers</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">${form.num_movers} movers</td></tr>` : ""}
      ${form.deposit ? `<tr><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;">Deposit</td><td style="padding:7px 10px;border:1px solid #e2e8f0;font-size:13.5px;font-family:Arial,sans-serif;color:#1d4ed8;">$${Number(form.deposit).toLocaleString()}</td></tr>` : ""}
    </table>`;

  const importantBullets = `
    <div style="margin:20px 0;">
      <table style="width:100%;">
        ${bullet("Charges are door to door, with no depot fees.")}
        ${bullet("Move on Removals has Public Liability Insurance and Transit Insurance. Please refer to our terms and conditions at <a href='http://www.moveonremovals.com.au' style='color:#1d4ed8;'>www.moveonremovals.com.au</a> for further information. We do not accept liability for any damages to pre-wrapped goods. Our company policy is to ensure all goods are wrapped in transit. Items such as upright pianos, marble and stone (including concrete) items, are not covered by our insurance policy. You must inspect your items and advise the team in the event of damage on the day of the move.")}
        ${bullet("In the instance that an additional mover is required, each additional mover will be charged at $68 per mover per hour Monday to Friday, $82 per mover per hour on Saturdays and $136 per mover per hour on Sundays. Charges differ on packing teams and should be discussed with our Customer Care Team. Should we need to send them via CarShare to the jobsite, this would be an additional charge to be incurred by the customer.")}
        ${bullet("If applicable, an additional fee on Monday - Friday of $50+GST per hour per person from 5-9pm and $70+GST per person per hour from 9pm will be charged on top of your agreed to rate; rates on Saturday of $70+GST per person from 5-9pm and $90+GST per hour per person from 9pm. Bookings for the afternoon slot do not have a guaranteed start time, as it may be impacted by any morning bookings. Charges differ on packing teams and should be discussed with our Customer Care Team. Exceptions apply for the night rates from 5pm on the 5T &amp; 6T with time allowances if necessary on booking slot adjustments.")}
        ${bullet("Customers should arrange parking at both pick up and drop off locations so that our team can load and unload easily. Please keep in mind that in the event a parking fine is issued or that parking needs to be paid for, you the customer are responsible for the payment of this.")}
        ${bullet("If you are requiring a ute for your move due to apartment restrictions, there will be a one time flat fee applicable. If we are not able to return the vehicle prior to 5pm due to the move being in progress, a one time fee of $149+GST applies for late return.")}
        ${bullet("We have a 48-hour rescheduling and cancellation policy. If you provide us 48 hours' notice before the booked start time of the job, no fees will apply. If you reschedule or cancel within 48 hours, we will charge a fee equivalent to the deposit amount. Terms and conditions apply for re-scheduling existing bookings.")}
        ${bullet("Please note that all TV's, mirrors, glass, antiques and fragile items must be bubble wrapped. We are happy to do this for you on the day for an extra cost of $35+GST per 50m roll. This along with any shrink wrap will be disposed of on site at the drop off location. Should you ask us to not bubble wrap, or you do so yourself, particular items that we believe need to be, these will not be covered in the event of damage.")}
        ${bullet("If you, our customer, will not be in attendance throughout the duration of the job, please advise us prior to your move. In the event that you will not be on-site during the move, we will not be liable for any items left that we have no knowledge of or that are not on the inventory list as per this email. Any alleged damage will not be covered by our insurance company in this event. We will take photos/videos as necessary to allow for the recorded state of items.")}
        ${bullet("A flat rate toll charge of $52 inclusive of GST may apply to minimise traffic time. If you do not agree to pay for these charges, Move On Removals must be advised prior to your move; in which case, alternative non-toll routes will be taken.")}
        ${bullet("The Move On Removals team does not work past 7pm. If the assets remain on the vehicle overnight due to our staff having to stop, a night rate fee will be charged in the amount of $199+GST per night in which the assets remain on the vehicle.")}
        ${bullet("When loading goods into a storage unit, your items generally need to be stacked in order to utilise the whole space. Whilst our team takes every care to ensure your goods are carefully stacked, some furniture can be easily damaged; blankets are the best and most efficient way to protect them from damage. Storage blankets can be purchased from us on the day of your move. If you already know how many blankets you may want, feel free to let us know in advance.")}
      </table>
    </div>`;

  const header = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 28px;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:28px 32px;border:1px solid #e2e8f0;border-top:none;background:#fff;">`;

  const footer = `
    <p style="margin-top:24px;font-size:14px;font-family:Arial,sans-serif;">Kind regards,<br/>Move On Removals Team<br/><a href="mailto:moveme@moveonremovals.com.au" style="color:#1d4ed8;">moveme@moveonremovals.com.au</a></p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;font-family:Arial,sans-serif;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`;

  // Tentative Booking
  if (form.status === "Tentative Booking") {
    return {
      subject: `MOVE ON REMOVALS – Tentative Booking Confirmation`,
      body: header + `
    <p style="font-size:15px;font-family:Arial,sans-serif;">Hi ${firstName},</p>
    <p style="font-size:15px;font-family:Arial,sans-serif;">Thank you for booking with Move On Removals. This booking is not yet confirmed, awaiting payment of your deposit. Once paid, you will receive a booking confirmation email that will require you to respond.</p>
    <p style="font-size:15px;font-family:Arial,sans-serif;">A deposit invoice has been sent via our Square account and should be paid within 24 hours to secure your booking. The deposit amount will be deducted from the total bill on the day of your move.</p>
    <p style="font-size:15px;font-family:Arial,sans-serif;margin-bottom:8px;">Your booking details are as follows;</p>
    ${bookingTable}
    ${serviceTable}
    ${inventoryBlock}
    ${p("Your booking has been allocated a time slot based on the details you have provided us.")}
    ${p("We appreciate that you have advised all your requirements and a thorough list of contents to be moved, dismantled and/or re-assembled. Don't worry, if you think you have missed anything, update us via email regarding the additional items/information prior to your move. Please keep in mind any change to your inventory may require a different truck size and rate. Please note that if on the day of your move there is a significant amount of additional items, which exceed what was advised, we may have to re-schedule your move to another booking time. This is so that we arrive on time for all our valued customers.")}
    ${p("We do not provide fixed quotations or time estimates as you know your destinations better than us. The better organised you are, the more efficient we can be!")}
    <div style="margin:20px 0;">
      <p style="font-size:14px;margin-bottom:10px;color:#334155;">Important Information:</p>
      <table style="width:100%;">
        ${bullet("Charges are door to door, with no depot fees.")}
        ${bullet("Move on Removals has Public Liability Insurance and Transit Insurance. Please refer to our terms and conditions at <a href='http://www.moveonremovals.com.au' style='color:#1d4ed8;'>www.moveonremovals.com.au</a> for further information. We do not accept liability for any damages to pre-wrapped goods. Our company policy is to ensure all goods are wrapped in transit.")}
        ${bullet("In the instance that an additional mover is required, each additional mover will be charged at $68 per mover per hour Monday to Friday, $82 per mover per hour on Saturdays and $136 per mover per hour on Sundays. Charges differ on packing teams and should be discussed with our Customer Care Team.")}
        ${bullet("If applicable, an additional fee on Monday - Friday of $50+GST per hour per person from 5-9pm and $70+GST per person per hour from 9pm will be charged on top of your agreed to rate; rates on Saturday of $70+GST per person from 5-9pm and $90+GST per hour per person from 9pm.")}
        ${bullet("If you are requiring a ute for your move due to apartment restrictions, there will be a one time flat fee applicable. If we are not able to return the vehicle prior to 5pm due to the move being in progress, a one time fee of $149+GST applies for late return.")}
        ${bullet("We have a 48-hour rescheduling and cancellation policy. If you provide us 48 hours' notice before the booked start time of the job, no fees will apply. If you reschedule or cancel within 48 hours, we will charge a fee equivalent to the deposit amount.")}
        ${bullet("Please note that all TV's, mirrors, glass, antiques and fragile items must be bubble wrapped. We are happy to do this for you on the day for an extra cost of $35+GST per 50m roll.")}
        ${bullet("A flat rate toll charge of $52 inclusive of GST may apply to minimise traffic time. If you do not agree to pay for these charges, Move On Removals must be advised prior to your move; in which case, alternative non-toll routes will be taken.")}
        ${bullet("The Move On Removals team does not work past 7pm. If the assets remain on the vehicle overnight due to our staff having to stop by 7pm, a night rate fee will be charged in the amount of $199+GST per night in which the assets remain on the vehicle.")}
        ${bullet("If you, our customer, will not be in attendance throughout the duration of the job, please advise us prior to your move.")}
        ${bullet("When loading goods into a storage unit, your items generally need to be stacked in order to utilise the whole space. Whilst our team takes every care to ensure your goods are carefully stacked, some furniture can be easily damaged; blankets are the best and most efficient way to protect them from damage.")}
        ${bullet("All invoices will be finalised prior to the completion of each day via card or cash only.")}
      </table>
    </div>
    ${p("In the meantime, if you have any further questions regarding your move please do not hesitate to contact us.")}
    ${p("Wishing you all the best for your move.")}` + footer
    };
  }

  // Booked Job (default)
  return {
    subject: `MOVE ON REMOVALS – Booking Confirmation`,
    body: header + `
    ${p("Hi " + firstName + ",")}
    ${p("Thank you for booking with Move On Removals.")}
    ${p("This job is now secured, acceptance of which constitutes the acknowledgement and acceptance of our Terms and Conditions and the booking details below. If you do not agree to our Terms and Conditions, please contact Move On Removals via email immediately.")}
    ${p("Please also confirm the list of contents below reflects what you are moving, to ensure we are sending the most suitable truck for your needs. In the event of your list being not accurate, we reserve the right to leave the premises and rebook your move, at your cost. Items not listed that would be covered by insurance are not.")}
    ${p("Your booking details are as follows;")}
    ${bookingTable}
    ${serviceTable}
    ${inventoryBlock}
    ${p("Your booking has been allocated a time slot based on the details you have provided us. Bookings for afternoon slots may vary in arrival time due to the morning bookings. The team will be in touch during the day with updates if necessary. If you wish to add another authorised person to the booking, please let us know their name and phone contact.")}
    ${p("We appreciate that you have advised all your requirements and a thorough list of contents to be moved, dismantled and/or re-assembled. Don't worry, if you think you have missed anything, update us via email regarding the additional items/information prior to your move. Please keep in mind any change to your inventory may require a different truck size and rate. Rates are charged in half hour increments following the initial minimum booking time. Please note that if on the day of your move there is a significant amount of additional items, which exceed what was advised, we may have to re-schedule your move to another booking time. This is so that we arrive on time for all our valued customers.")}
    ${p("In the event that we send a larger vehicle, at our own discretion, and you wish to update the inventory to utilise the larger vehicle, the rate is subject to change to reflect the increased inventory. However, if the inventory remains the same as at the time of booking, this pricing will not increase.")}
    ${p("We do not provide fixed quotations or time estimates as you know your destinations better than us. The better organised you are, the more efficient we can be!")}
    ${importantBullets}
    ${p("Your deposit amount has been received. The deposit amount (excluding surcharge) will be deducted from the total bill on the day of service. All invoices will be finalised prior to the completion of each day. Payment on issue of invoice is only accepted via card or cash, no bank transfers. The lead packer/mover will verify payment with you. The invoice will be sent via text and/or email prior to the completion and your acceptance of this booking means you accept those conditions.")}
    ${p("In the meantime, if you have any further questions regarding your move please do not hesitate to contact us.")}
    ${p("This job has been confirmed and is now booked. However, we would appreciate it if you would acknowledge receipt of this by return email.")}
    ${p("Wishing you all the best for your move.")}` + footer
  };
}

export default function EmailPreview({ form, inventoryLink, flatRates, packFlatRates, movingFlatRates, unpackFlatRates }) {
  const [open, setOpen] = useState(true);
  const email = getEmailContent(form, inventoryLink, flatRates, packFlatRates, movingFlatRates, unpackFlatRates);

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