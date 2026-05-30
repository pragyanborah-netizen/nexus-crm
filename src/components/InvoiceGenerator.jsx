import { jsPDF } from "jspdf";
import { FileText } from "lucide-react";

function generateInvoicePdf(form, flatRates = [], packFlatRates = [], movingFlatRates = [], unpackFlatRates = []) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 0;

  // Header
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageW, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MOVE ON REMOVALS", margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("moveme@moveonremovals.com.au  |  www.moveonremovals.com.au", margin, 28);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pageW - margin, 20, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const invoiceNum = form.booking_number || `INV-${Date.now().toString().slice(-6)}`;
  doc.text(`Invoice #: ${invoiceNum}`, pageW - margin, 30, { align: "right" });
  doc.text(`Date: ${new Date().toLocaleDateString("en-AU")}`, pageW - margin, 37, { align: "right" });
  y = 54;

  // Bill To + Move Details (two columns)
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);
  doc.text("MOVE DETAILS", 115, y);
  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, 100, y);
  doc.line(115, y, pageW - margin, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${form.customer_first_name || ""} ${form.customer_last_name || ""}`, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (form.customer_email) { doc.text(form.customer_email, margin, y); y += 5; }
  if (form.customer_mobile) { doc.text(form.customer_mobile, margin, y); y += 5; }

  // Move details on the right
  let ry = 64;
  const moveDetails = [
    form.move_date ? `Move Date: ${form.move_date}${form.move_time ? " at " + form.move_time : ""}` : null,
    [form.pickup_suburb, form.pickup_state].filter(Boolean).length ? `Pickup: ${[form.pickup_suburb, form.pickup_state].filter(Boolean).join(", ")}` : null,
    [form.delivery_suburb, form.delivery_state].filter(Boolean).length ? `Delivery: ${[form.delivery_suburb, form.delivery_state].filter(Boolean).join(", ")}` : null,
    form.truck_size ? `Truck: ${form.truck_size}` : null,
    form.num_movers ? `Movers: ${form.num_movers}` : null,
  ].filter(Boolean);
  doc.setFontSize(9);
  moveDetails.forEach(d => {
    doc.setFont("helvetica", "normal");
    doc.text(d, 115, ry);
    ry += 5;
  });

  y = Math.max(y, ry) + 8;

  // Status badge
  const statusColors = {
    "Enquiry": [14, 165, 233], "Quoted": [147, 51, 234], "Tentative Booking": [234, 179, 8],
    "Booked Job": [22, 163, 74], "Completed": [107, 114, 128], "Cancelled": [220, 38, 38],
  };
  const sc = statusColors[form.status] || [107, 114, 128];
  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.roundedRect(margin, y - 5, 45, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(form.status || "Draft", margin + 22.5, y, { align: "center" });
  y += 10;

  // Line items table
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageW - margin * 2, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", margin + 3, y + 6);
  doc.text("QTY / HRS", 130, y + 6);
  doc.text("RATE", 155, y + 6);
  doc.text("AMOUNT (excl. GST)", pageW - margin - 2, y + 6, { align: "right" });
  y += 13;

  const lineItems = [];

  if ((form.selected_services || []).includes("Packaging Supplies") && form.packaging_supplies_price) {
    lineItems.push({ desc: "Packaging Supplies – Delivery Charge", qty: "", rate: "", amount: Number(form.packaging_supplies_price) });
  }
  if ((form.selected_services || []).includes("Packing") && (form.packing_total || form.packing_rate_per_hour)) {
    const rate = Number(form.packing_rate_per_hour) || 0;
    const hrs = Number(form.packing_hours) || 0;
    const amt = Number(form.packing_total) || (rate * hrs);
    lineItems.push({ desc: `Packing Service${form.packing_num_people ? ` (${form.packing_num_people} packers)` : ""}${form.packing_date ? ` — ${form.packing_date}` : ""}`, qty: hrs ? `${hrs} hrs` : "", rate: rate ? `$${rate}/hr` : "", amount: amt });
    packFlatRates.filter(r => r.description && r.amount).forEach(r => lineItems.push({ desc: `  Packing – ${r.description}`, qty: "", rate: "", amount: Number(r.amount) }));
  }
  if ((form.selected_services || []).includes("Moving") && (form.moving_total || form.moving_rate_per_hour)) {
    const rate = Number(form.moving_rate_per_hour) || 0;
    const hrs = Number(form.moving_hours) || 0;
    const amt = Number(form.moving_total) || (rate * hrs);
    lineItems.push({ desc: `Moving Service${form.moving_truck_size ? ` (${form.moving_truck_size})` : ""}${form.moving_num_people ? `, ${form.moving_num_people} movers` : ""}${form.moving_date || form.move_date ? ` — ${form.moving_date || form.move_date}` : ""}`, qty: hrs ? `${hrs} hrs` : "", rate: rate ? `$${rate}/hr` : "", amount: amt });
    movingFlatRates.filter(r => r.description && r.amount).forEach(r => lineItems.push({ desc: `  Moving – ${r.description}`, qty: "", rate: "", amount: Number(r.amount) }));
  }
  if ((form.selected_services || []).includes("Unpacking") && (form.unpacking_total || form.unpacking_rate_per_hour)) {
    const rate = Number(form.unpacking_rate_per_hour) || 0;
    const hrs = Number(form.unpacking_hours) || 0;
    const amt = Number(form.unpacking_total) || (rate * hrs);
    lineItems.push({ desc: `Unpacking Service${form.unpacking_num_people ? ` (${form.unpacking_num_people} unpackers)` : ""}${form.unpacking_date ? ` — ${form.unpacking_date}` : ""}`, qty: hrs ? `${hrs} hrs` : "", rate: rate ? `$${rate}/hr` : "", amount: amt });
    unpackFlatRates.filter(r => r.description && r.amount).forEach(r => lineItems.push({ desc: `  Unpacking – ${r.description}`, qty: "", rate: "", amount: Number(r.amount) }));
  }
  flatRates.filter(r => r.description && r.amount).forEach(r => lineItems.push({ desc: r.description, qty: "", rate: "", amount: Number(r.amount) }));

  doc.setTextColor(30, 41, 59);
  lineItems.forEach((item, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageW - margin * 2, 10, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(item.desc, 100);
    doc.text(descLines, margin + 3, y + 2);
    doc.text(item.qty, 130, y + 2);
    doc.text(item.rate, 155, y + 2);
    if (item.amount) doc.text(`$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageW - margin - 2, y + 2, { align: "right" });
    y += Math.max(descLines.length * 5, 10);
  });

  if (lineItems.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No line items — add services in the Services & Pricing tab.", margin + 3, y + 2);
    y += 10;
  }

  // Totals
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  const subtotal = lineItems.reduce((s, l) => s + (l.amount || 0), 0);
  const overrideTotal = Number(form.price) || subtotal;
  const gst = overrideTotal * 0.1;
  const grandTotal = overrideTotal + gst;

  const totalsX = 130;
  const amtX = pageW - margin - 2;

  const tRow = (label, value, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(239, 246, 255);
      doc.rect(totalsX - 5, y - 5, pageW - margin - totalsX + 5, 10, "F");
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(bold ? 29 : 100, bold ? 78 : 116, bold ? 216 : 139);
    doc.text(label, totalsX, y);
    doc.setTextColor(30, 41, 59);
    doc.text(value, amtX, y, { align: "right" });
    y += 7;
  };

  tRow("Subtotal (excl. GST):", `$${overrideTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
  tRow("GST (10%):", `$${gst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
  tRow("TOTAL (incl. GST):", `$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, true, true);

  if (form.deposit) {
    y += 2;
    tRow("Deposit Required:", `$${Number(form.deposit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    const bal = grandTotal - Number(form.deposit);
    tRow("Balance Due on Day:", `$${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, true);
  }

  // Payment method
  if (form.payment_method) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Payment Method: ${form.payment_method}`, margin, y);
    y += 6;
  }

  // Notes
  if (form.notes) {
    y += 4;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 4, pageW - margin * 2, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Notes:", margin + 2, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(form.notes, pageW - margin * 2 - 4);
    doc.text(noteLines, margin + 2, y);
    y += noteLines.length * 5 + 4;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 16;
  doc.setFillColor(241, 245, 249);
  doc.rect(0, footerY - 4, pageW, 24, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("All prices are in AUD. GST registration applies.", pageW / 2, footerY + 2, { align: "center" });
  doc.text("Move On Removals — Thank you for your business!", pageW / 2, footerY + 8, { align: "center" });

  const filename = `Invoice_${form.customer_last_name || "Customer"}_${invoiceNum}.pdf`;
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