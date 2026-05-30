import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, ArrowLeft } from "lucide-react";
import { jsPDF } from "jspdf";

export default function CustomerInvoice() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('booking_id');
  
  const [booking, setBooking] = useState(null);

  const { data: bookingData } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await base44.entities.Booking.get(bookingId);
    },
    enabled: !!bookingId,
  });

  useState(() => {
    if (bookingData) setBooking(bookingData);
  }, [bookingData]);

  const generateInvoicePdf = () => {
    if (!booking) return;

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 0;

    // Header
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageW, 44, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("MOVE ON REMOVALS", margin, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("moveme@moveonremovals.com.au", margin, 28);

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", pageW - margin, 18, { align: "right" });

    const invoiceNum = `#${booking.booking_number || booking.id.slice(0, 8)}`;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(invoiceNum, pageW - margin, 27, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString("en-AU")}`, pageW - margin, 34, { align: "right" });
    y = 58;

    // Customer Info
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO", margin, y);
    y += 4;

    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, 105, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${booking.customer_first_name || ""} ${booking.customer_last_name || ""}`.trim(), margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    if (booking.customer_email) { doc.text(booking.customer_email, margin, y); y += 5; }
    if (booking.customer_mobile) { doc.text(booking.customer_mobile, margin, y); y += 5; }

    // Move Details
    let ry = 58;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("MOVE DETAILS", 120, ry);
    ry += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(120, ry, pageW - margin, ry);
    ry += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (booking.move_date) {
      doc.text(`Move Date:`, 120, ry);
      doc.text(`${booking.move_date}${booking.move_time ? " at " + booking.move_time : ""}`, 145, ry);
      ry += 5;
    }
    if (booking.pickup_suburb) {
      doc.text(`Pickup:`, 120, ry);
      doc.text(booking.pickup_suburb, 145, ry);
      ry += 5;
    }
    if (booking.delivery_suburb) {
      doc.text(`Delivery:`, 120, ry);
      doc.text(booking.delivery_suburb, 145, ry);
      ry += 5;
    }
    if (booking.truck_assigned) {
      doc.text(`Truck:`, 120, ry);
      doc.text(booking.truck_assigned, 145, ry);
      ry += 5;
    }

    y = Math.max(y, ry) + 10;

    // Services
    doc.setFillColor(240, 247, 255);
    doc.rect(margin, y, pageW - margin * 2, 10, "F");
    doc.setFillColor(29, 78, 216);
    doc.rect(margin, y, 3, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(29, 78, 216);
    doc.text("SERVICES & PRICING", margin + 7, y + 6.5);
    y += 14;

    const lineItems = [];
    
    if (booking.packing_total) {
      lineItems.push({ desc: "Packing Service", amount: Number(booking.packing_total) });
    }
    if (booking.moving_total) {
      lineItems.push({ desc: "Moving Service", amount: Number(booking.moving_total) });
    }
    if (booking.unpacking_total) {
      lineItems.push({ desc: "Unpacking Service", amount: Number(booking.unpacking_total) });
    }
    if (booking.price && !lineItems.length) {
      lineItems.push({ desc: "Moving Services", amount: Number(booking.price) });
    }

    lineItems.forEach((item, i) => {
      if (y > 248) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, pageW - margin * 2, 11, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(item.desc, margin + 4, y + 2);
      doc.setFont("helvetica", "bold");
      doc.text(`$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageW - margin - 2, y + 2, { align: "right" });
      y += 11;
    });

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Totals
    const subtotal = lineItems.reduce((s, l) => s + (l.amount || 0), 0);
    const gst = parseFloat((subtotal * 0.1).toFixed(2));
    const grandTotal = subtotal + gst;

    const totalsX = 120;
    const amtX = pageW - margin - 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal (excl. GST):", totalsX, y);
    doc.text(`$${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, amtX, y, { align: "right" });
    y += 8;

    doc.text("GST (10%):", totalsX, y);
    doc.text(`$${gst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, amtX, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(21, 128, 61);
    doc.text("TOTAL (incl. GST):", totalsX, y);
    doc.text(`$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, amtX, y, { align: "right" });

    if (booking.deposit) {
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("Deposit Paid:", totalsX, y);
      doc.text(`$${Number(booking.deposit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, amtX, y, { align: "right" });
      y += 8;

      const balance = grandTotal - Number(booking.deposit);
      doc.setFont("helvetica", "bold");
      doc.text("Balance Due:", totalsX, y);
      doc.text(`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, amtX, y, { align: "right" });
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 16;
    doc.setFillColor(241, 245, 249);
    doc.rect(0, footerY - 6, pageW, 24, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("All prices are in AUD. GST registration applies.", pageW / 2, footerY + 1, { align: "center" });
    doc.text("Move On Removals — Thank you for your business!", pageW / 2, footerY + 7, { align: "center" });

    const filename = `Invoice_${booking.customer_last_name || "Customer"}_${invoiceNum.replace("#", "")}.pdf`;
    doc.save(filename);
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Tax Invoice</h1>
              <p className="text-blue-100 text-sm mt-1">
                Booking #{booking.booking_number || booking.id.slice(0, 8)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generateInvoicePdf}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} />
                Download PDF
              </button>
              <a
                href="/customer"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          {/* Invoice Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-blue-600">MOVE ON REMOVALS</h2>
              <p className="text-sm text-gray-500 mt-1">moveme@moveonremovals.com.au</p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-gray-800">TAX INVOICE</h3>
              <p className="text-sm text-gray-500 mt-1">
                #{booking.booking_number || booking.id.slice(0, 8)}
              </p>
              <p className="text-sm text-gray-500">
                Date: {new Date().toLocaleDateString('en-AU')}
              </p>
            </div>
          </div>

          {/* Bill To & Move Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">BILL TO</h4>
              <div className="text-gray-800">
                <p className="font-semibold text-lg">
                  {booking.customer_first_name} {booking.customer_last_name}
                </p>
                {booking.customer_email && <p className="text-sm text-gray-600">{booking.customer_email}</p>}
                {booking.customer_mobile && <p className="text-sm text-gray-600">{booking.customer_mobile}</p>}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">MOVE DETAILS</h4>
              <div className="space-y-1 text-sm">
                {booking.move_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-800 font-medium">
                      {new Date(booking.move_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {booking.move_time && ` at ${booking.move_time}`}
                    </span>
                  </div>
                )}
                {booking.pickup_suburb && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pickup:</span>
                    <span className="text-gray-800 font-medium">{booking.pickup_suburb}</span>
                  </div>
                )}
                {booking.delivery_suburb && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery:</span>
                    <span className="text-gray-800 font-medium">{booking.delivery_suburb}</span>
                  </div>
                )}
                {booking.truck_assigned && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Truck:</span>
                    <span className="text-gray-800 font-medium">{booking.truck_assigned}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">SERVICES & PRICING</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Description</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {booking.packing_total && (
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-800">Packing Service</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        ${Number(booking.packing_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {booking.moving_total && (
                    <tr>
                      <td className="px-4 py-3 text-gray-800">Moving Service</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        ${Number(booking.moving_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {booking.unpacking_total && (
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-800">Unpacking Service</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        ${Number(booking.unpacking_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {!booking.packing_total && !booking.moving_total && !booking.unpacking_total && booking.price && (
                    <tr>
                      <td className="px-4 py-3 text-gray-800">Moving Services</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        ${Number(booking.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-80 space-y-3">
              {(() => {
                const subtotal = (booking.packing_total || 0) + (booking.moving_total || 0) + (booking.unpacking_total || 0) || (booking.price || 0);
                const gst = subtotal * 0.1;
                const grandTotal = subtotal + gst;
                
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal (excl. GST):</span>
                      <span className="font-medium text-gray-800">
                        ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST (10%):</span>
                      <span className="font-medium text-gray-800">
                        ${gst.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-green-700 bg-green-50 px-4 py-3 rounded-lg mt-4">
                      <span>TOTAL (incl. GST):</span>
                      <span>${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {booking.deposit && (
                      <>
                        <div className="flex justify-between text-sm pt-3 border-t">
                          <span className="text-gray-600">Deposit Paid:</span>
                          <span className="font-medium text-gray-800">
                            -${Number(booking.deposit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-blue-700 bg-blue-50 px-4 py-3 rounded-lg">
                          <span>Balance Due:</span>
                          <span>${(grandTotal - Number(booking.deposit)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600">All prices are in AUD. GST registration applies.</p>
            <p className="text-sm text-gray-600 mt-2 font-medium">
              Move On Removals — Thank you for your business!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}