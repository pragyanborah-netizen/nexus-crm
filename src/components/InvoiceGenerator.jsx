import { jsPDF } from "jspdf";
import { FileText } from "lucide-react";

function generateInvoicePdf(form, flatRates = [], packFlatRates = [], movingFlatRates = [], unpackFlatRates = []) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 0;

  // ── Header bar (matches Quoted email) ──────────────────────────────────────
  doc.setFillColor(29, 78, 216); // #1d4ed8
  doc.rect(0, 0, pageW, 44, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MOVE ON REMOVALS", margin, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("moveme@moveonremovals.com.au  |  www.moveonremovals.com.au", margin, 28);

  // Invoice label right-aligned
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pageW - margin, 18, { align: "right" });

  const invoiceNum = form.booking_number ? `#${form.booking_number}` : `#INV-${Date.now().toString().slice(-6)}`;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceNum, pageW - margin, 27, { align: "right" });
  doc.text(`Date: ${new Date().toLocaleDateString("en-AU")}`, pageW - margin, 34, { align: "right" });
  y = 58;

  // ── Bill To + Move Details ─────────────────────────────────────────────────
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);
  doc.text("MOVE DETAILS", 120, y);
  y += 4;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, 105, y);
  doc.line(120, y, pageW - margin, y);
  y += 6;

  // Left: Customer
  const billY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${form.customer_first_name || ""} ${form.customer_last_name || ""}`.trim() || "—", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (form.customer_email)  { doc.text(form.customer_email, margin, y);  y += 5; }
  if (form.customer_mobile) { doc.text(form.customer_mobile, margin, y); y += 5; }

  // Right: Move details
  let ry = billY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const moveRows = [
    form.move_date ? ["Move Date:", `${form.move_date}${form.move_time ? "  at  " + form.move_time : ""}`] : null,
    [form.pickup_suburb, form.pickup_state].some(Boolean) ? ["Pickup:", [form.pickup_suburb, form.pickup_state].filter(Boolean).join(", ")] : null,
    [form.delivery_suburb, form.delivery_state].some(Boolean) ? ["Delivery:", [form.delivery_suburb, form.delivery_state].filter(Boolean).join(", ")] : null,
    form.moving_truck_size || form.truck_size ? ["Truck:", form.moving_truck_size || form.truck_size] : null,
    form.moving_num_people || form.num_movers ? ["Movers:", `${form.moving_num_people || form.num_movers}`] : null,
  ].filter(Boolean);
  moveRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, 120, ry);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(value, 145, ry);
    ry += 5;
  });

  y = Math.max(y, ry) + 10;

  // ── Services & Pricing section header (blue left-border style) ─────────────
  doc.setFillColor(240, 247, 255); // light blue bg
  doc.rect(margin, y, pageW - margin * 2, 10, "F");
  doc.setFillColor(29, 78, 216);
  doc.rect(margin, y, 3, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(29, 78, 216);
  doc.text("SERVICES & PRICING", margin + 7, y + 6.5);

  // Column headers
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("QTY / HRS", 128, y + 6.5);
  doc.text("RATE", 150, y + 6.5);
  doc.text("AMOUNT (excl. GST)", pageW - margin - 2, y + 6.5, { align: "right" });
  y += 14;

  // ── Build line items ───────────────────────────────────────────────────────
  const lineItems = [];

  if ((form.selected_services || []).includes("Packaging Supplies") && form.packaging_supplies_price) {
    lineItems.push({ desc: "Packaging Supplies – Delivery Charge", qty: "", rate: "", amount: Number(form.packaging_supplies_price) });
  }
  if ((form.selected_services || []).includes("Packing") && (form.packing_total || form.packing_rate_per_hour)) {
    const rate = Number(form.packing_rate_per_hour) || 0;
    const hrs  = Number(form.packing_hours) || 0;
    const amt  = Number(form.packing_total) || rate * hrs;
    lineItems.push({ desc: `Packing Service${form.packing_num_people ? ` (${form.packing_num_people} packers)` : ""}${form.packing_date ? " — " + form.packing_date : ""}`, qty: hrs ? `${hrs} hrs` : "", rate: rate ? `$${rate}/hr` : "", amount: amt });
    packFlatRates.filter(r => r.description && r.amount).forEach(r =>
      lineItems.push({ desc: `  Packing – ${r.description}`, qty: "", rate: "", amount: Number(r.amount) })
    );
  }
  if ((form.selected_services || []).includes("Moving") && (form.moving_total || form.moving_rate_per_hour)) {
    const rate = Number(form.moving_rate_per_hour) || 0;
    const hrs  = Number(form.moving_hours) || 0;
    const amt  = Number(form.moving_total) || rate * hrs;
    lineItems.push({ desc: `Moving Service${form.moving_truck_size ? ` (${form.moving_truck_size})` : ""}${form.moving_num_people ? `, ${form.moving_num_people} movers` : ""}${form.moving_date || form.move_date ? " — " + (form.moving_date || form.move_date) : ""}`, qty: hrs ? `${hrs} hrs` : "", rate: rate ? `$${rate}/hr` : "", amount: amt });
    movingFlatRates.filter(r => r.description && r.amount).forEach(r =>
      lineItems.push({ desc: `  Moving – ${r.description}`, qty: "", rate: "", amount: Number(r.amount) })
    );
  }
  if ((form.selected_services || []).includes("Unpacking") && (form.unpacking_total || form.unpacking_rate_per_hour)) {
    const rate = Number(form.unpacking_rate_per_hour) || 0;
    const hrs  = Number(form.unpacking_hours) || 0;
    const amt  = Number(form.unpacking_total) || rate * hrs;
    lineItems.push({ desc: `Unpacking Service${form.unpacking_num_people ? ` (${form.unpacking_num_people} unpackers)` : ""}${form.unpacking_date ? " — " + form.unpacking_date : ""}`, qty: hrs ? `${hrs} hrs` : "", rate: rate ? `$${rate}/hr` : "", amount: amt });
    unpackFlatRates.filter(r => r.description && r.amount).forEach(r =>
      lineItems.push({ desc: `  Unpacking – ${r.description}`, qty: "", rate: "", amount: Number(r.amount) })
    );
  }
  flatRates.filter(r => r.description && r.amount).forEach(r =>
    lineItems.push({ desc: r.description, qty: "", rate: "", amount: Number(r.amount) })
  );

  // Render line items
  if (lineItems.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No line items — add services in the Services & Pricing tab.", margin + 3, y + 3);
    y += 12;
  } else {
    lineItems.forEach((item, i) => {
      if (y > 248) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, pageW - margin * 2, 11, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const descLines = doc.splitTextToSize(item.desc, 102);
      doc.text(descLines, margin + 4, y + 2);
      doc.setTextColor(71, 85, 105);
      doc.text(item.qty,  128, y + 2);
      doc.text(item.rate, 150, y + 2);
      if (item.amount) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(`$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageW - margin - 2, y + 2, { align: "right" });
      }
      y += Math.max(descLines.length * 5.5, 11);
    });
  }

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Totals (green box style matching Quoted email) ─────────────────────────
  const subtotal    = lineItems.reduce((s, l) => s + (l.amount || 0), 0);
  const overrideTotal = Number(form.price) || subtotal;
  const gst         = parseFloat((overrideTotal * 0.1).toFixed(2));
  const grandTotal  = overrideTotal + gst;

  const totalsX = 120;
  const amtX    = pageW - margin - 2;

  const tRow = (label, value, opts = {}) => {
    if (y > 260) { doc.addPage(); y = 20; }
    if (opts.highlight) {
      doc.setFillColor(240, 253, 244); // green tint like quoted email total
      doc.rect(totalsX - 4, y - 5, pageW - margin - totalsX + 4, 11, "F");
      doc.setDrawColor(187, 247, 208);
      doc.rect(totalsX - 4, y - 5, pageW - margin - totalsX + 4, 11, "S");
    }
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.bold ? 10 : 9);
    doc.setTextColor(opts.highlight ? 21 : 100, opts.highlight ? 128 : 116, opts.highlight ? 61 : 139);
    doc.text(label, totalsX, y);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setTextColor(opts.highlight ? 21 : 30, opts.highlight ? 128 : 41, opts.highlight ? 61 : 59);
    doc.text(value, amtX, y, { align: "right" });
    y += 8;
  };

  tRow("Subtotal (excl. GST):", `$${overrideTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
  tRow("GST (10%):", `$${gst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
  tRow("TOTAL (incl. GST):", `$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { bold: true, highlight: true });

  if (form.deposit) {
    y += 2;
    // Orange note style (matches Quoted email warning block)
    doc.setFillColor(255, 247, 237);
    doc.rect(totalsX - 4, y - 5, pageW - margin - totalsX + 4, 22, "F");
    doc.setDrawColor(253, 215, 170);
    doc.rect(totalsX - 4, y - 5, pageW - margin - totalsX + 4, 22, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(194, 65, 12);
    doc.text("Deposit Required (excl. GST):", totalsX, y);
    doc.text(`$${Number(form.deposit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, amtX, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12);
    doc.text("* Deposit is not subject to GST", totalsX, y);
    y += 6;

    // Deposit warning note below the orange box
    y += 4;
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(253, 215, 170);
    const depositNote = "Please note that if the deposit is not received within 24 hours, we will no longer be able to hold your booking as pending, and the truck and time slot may become available to other customers.";
    const depositNoteLines = doc.splitTextToSize(depositNote, pageW - margin * 2 - 8);
    doc.rect(margin, y - 4, pageW - margin * 2, depositNoteLines.length * 5 + 8, "F");
    doc.rect(margin, y - 4, pageW - margin * 2, depositNoteLines.length * 5 + 8, "S");
    doc.setFillColor(234, 88, 12);
    doc.rect(margin, y - 4, 3, depositNoteLines.length * 5 + 8, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(154, 52, 18);
    doc.text(depositNoteLines, margin + 7, y + 2);
    y += depositNoteLines.length * 5 + 10;

    const bal = grandTotal - Number(form.deposit);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Balance Due on Day (incl. GST):", totalsX, y);
    doc.text(`$${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, amtX, y, { align: "right" });
    y += 10;
  }

  // Payment method
  if (form.payment_method) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Payment Method: ${form.payment_method}`, margin, y);
    y += 8;
  }

  // Notes (blue left-border style matching Quoted email)
  if (form.notes) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageW - margin * 2, 4, "F");
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, y, 3, 4 + doc.splitTextToSize(form.notes, pageW - margin * 2 - 12).length * 5 + 4, "F");
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 3, y, pageW - margin * 2 - 3, doc.splitTextToSize(form.notes, pageW - margin * 2 - 12).length * 5 + 8, "F");

    const noteLines = doc.splitTextToSize(form.notes, pageW - margin * 2 - 12);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(noteLines, margin + 7, y + 6);
    y += noteLines.length * 5 + 10;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 16;
  doc.setFillColor(241, 245, 249);
  doc.rect(0, footerY - 6, pageW, 24, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("All prices are in AUD. GST registration applies.", pageW / 2, footerY + 1, { align: "center" });
  doc.text("Move On Removals  —  Thank you for your business!", pageW / 2, footerY + 7, { align: "center" });

  const filename = `Invoice_${form.customer_last_name || "Customer"}_${invoiceNum.replace("#", "")}.pdf`;
  doc.save(filename);
}

export default function InvoiceGenerator({ form, flatRates, packFlatRates, movingFlatRates, unpackFlatRates }) {
  return (
    <button
      type="button"
      onClick={() => generateInvoicePdf(form, flatRates, packFlatRates, movingFlatRates, unpackFlatRates)}
      className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-medium"
    >
      <FileText size={16} className="text-green-600" /> Invoice PDF
    </button>
  );
}