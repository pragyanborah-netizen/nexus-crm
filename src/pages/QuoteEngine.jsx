import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { jsPDF } from "jspdf";
import { ArrowLeft, Sparkles, Download, CheckCircle, Send, Loader2, Package, Truck, Clock, MapPin, RefreshCw } from "lucide-react";

const ITEM_VOLUMES = {
  "Sofa": 1.8, "2-Seater Sofa": 1.4, "3-Seater Sofa": 2.0, "L-Shape Sofa": 3.0, "Armchair": 0.8, "Recliner": 1.0,
  "Coffee Table": 0.3, "Side Table": 0.2, "Console Table": 0.4, "Dining Table": 1.2,
  "TV Unit": 0.6, "Entertainment Unit": 0.9, "Bookshelf": 0.8, "Display Cabinet": 1.0, "Buffet / Sideboard": 1.2,
  "Filing Cabinet": 0.5, "Office Drawers": 0.5,
  "Bed (King)": 2.0, "Bed (Queen)": 1.6, "Bed (Double)": 1.4, "Bed (Single)": 1.0, "Bunk Bed": 2.2,
  "Mattress (King)": 1.2, "Mattress (Queen)": 1.0, "Mattress (Single)": 0.6,
  "Wardrobe (Single)": 1.2, "Wardrobe (Double)": 2.2, "Wardrobe (Triple)": 3.2,
  "Chest of Drawers": 0.8, "Bedside Table": 0.2, "Dressing Table": 0.8,
  "Fridge": 0.9, "Fridge (Large)": 1.3, "Washing Machine": 0.7, "Dryer": 0.5,
  "Dishwasher": 0.5, "Microwave": 0.1, "Oven": 0.4, "Bar Fridge": 0.3,
  "Dining Chairs": 0.2, "Bar Stools": 0.1,
  "Desk": 0.8, "Office Chair": 0.4, "Bookcase": 0.8, "Printer": 0.1,
  "BBQ": 0.5, "Garden Table": 0.6, "Garden Chairs": 0.15, "Bicycle": 0.4,
  "Treadmill": 1.0, "Exercise Bike": 0.5, "Weights": 0.3, "Lawn Mower": 0.4,
  "TV": 0.3,
  "Boxes (Small)": 0.05, "Boxes (Medium)": 0.08, "Boxes (Large)": 0.12,
  "Artwork / Mirrors": 0.2, "Plants": 0.1, "Piano": 2.5, "Safe": 0.5,
};
const DEFAULT_VOLUME = 0.3;

function getItemVolume(item) {
  if (ITEM_VOLUMES[item]) return ITEM_VOLUMES[item];
  const key = Object.keys(ITEM_VOLUMES).find(k =>
    item.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(item.toLowerCase())
  );
  return key ? ITEM_VOLUMES[key] : DEFAULT_VOLUME;
}

function recommendTruck(m3) {
  if (m3 <= 8) return { size: "2T", label: "2 Tonne Truck" };
  if (m3 <= 20) return { size: "5T", label: "5 Tonne Truck" };
  if (m3 <= 30) return { size: "6T", label: "6 Tonne Truck" };
  if (m3 <= 45) return { size: "10T", label: "10 Tonne Truck" };
  return { size: "12T", label: "12 Tonne Truck" };
}

const TRUCK_RATES = { "2T": 148, "5T": 168, "6T": 178, "10T": 208, "12T": 248 };
const MOVERS = { "2T": 1, "5T": 2, "6T": 2, "10T": 2, "12T": 3 };

export default function QuoteEngine() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [approved, setApproved] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => base44.entities.Booking.get(id),
    enabled: !!id,
    onSuccess: (b) => {
      if (b.ai_quote_data) { try { setQuote(JSON.parse(b.ai_quote_data)); } catch {} }
      if (b.status === "Quoted") setApproved(true);
    }
  });

  const approveMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setApproved(true);
    },
  });

  const handleGenerate = async () => {
    if (!booking) return;
    setGenerating(true);
    const items = booking.items_to_move || [];
    const totalVolume = items.reduce((sum, item) => sum + getItemVolume(item), 0);
    const truck = recommendTruck(totalVolume);
    const rate = TRUCK_RATES[truck.size] || 168;
    const movers = MOVERS[truck.size] || 2;
    let accessSurcharge = 0;
    if (booking.pickup_stairs > 0) accessSurcharge += booking.pickup_stairs * 20;
    if (booking.delivery_stairs > 0) accessSurcharge += booking.delivery_stairs * 20;
    if (booking.pickup_floor && !booking.pickup_elevator) accessSurcharge += 30;
    if (booking.delivery_floor && !booking.delivery_elevator) accessSurcharge += 30;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert Australian removalist quoting specialist. Calculate a detailed quote.

Items: ${items.join(", ")}
Total estimated volume: ${totalVolume.toFixed(1)} cubic metres
Pickup: ${[booking.pickup_address, booking.pickup_suburb, booking.pickup_state].filter(Boolean).join(", ") || "TBC"}
Delivery: ${[booking.delivery_address, booking.delivery_suburb, booking.delivery_state].filter(Boolean).join(", ") || "TBC"}
Distance: ${booking.distance_km ? booking.distance_km + " km" : "estimate based on suburbs"}
Customer type: ${booking.customer_type || "Residential"}
Pickup floor: ${booking.pickup_floor || "Ground"}, Elevator: ${booking.pickup_elevator ? "Yes" : "No"}
Delivery floor: ${booking.delivery_floor || "Ground"}, Elevator: ${booking.delivery_elevator ? "Yes" : "No"}
Recommended truck: ${truck.label}, Base rate: $${rate}/hr for ${movers} movers

Calculate: loading time, driving time, unloading time, total hours (min 2hrs), base price, special item charges (piano/safe), travel levy if distance > 20km, total price. Write a professional customer-facing summary paragraph.`,
      response_json_schema: {
        type: "object",
        properties: {
          loading_hours: { type: "number" },
          driving_hours: { type: "number" },
          unloading_hours: { type: "number" },
          total_hours: { type: "number" },
          base_price: { type: "number" },
          special_items_charge: { type: "number" },
          travel_levy: { type: "number" },
          total_price: { type: "number" },
          estimated_distance_km: { type: "number" },
          summary_paragraph: { type: "string" },
          special_items_notes: { type: "string" },
        }
      }
    });

    const generated = {
      ...res,
      items,
      total_volume: parseFloat(totalVolume.toFixed(1)),
      truck_size: truck.size,
      truck_label: truck.label,
      movers,
      rate_per_hour: rate,
      access_surcharge: accessSurcharge,
      grand_total: (res?.total_price || 0) + accessSurcharge,
      generated_at: new Date().toISOString(),
      pickup: [booking.pickup_suburb, booking.pickup_state].filter(Boolean).join(", "),
      delivery: [booking.delivery_suburb, booking.delivery_state].filter(Boolean).join(", "),
      customer_name: `${booking.customer_first_name} ${booking.customer_last_name}`,
      move_date: booking.move_date,
    };
    setQuote(generated);
    await base44.entities.Booking.update(id, { ai_quote_data: JSON.stringify(generated) });
    setGenerating(false);
  };

  const handleApprove = () => {
    if (!quote) return;
    approveMutation.mutate({
      status: "Quoted",
      price: quote.grand_total,
      estimated_hours: quote.total_hours,
      truck_size: quote.truck_size,
      num_movers: quote.movers,
    });
  };

  const handleSendEmail = async () => {
    if (!booking?.customer_email || !quote) return;
    setSending(true);
    const body = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;"><h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1><p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Professional Removal Quote</p></div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${booking.customer_first_name},</p><p>${quote.summary_paragraph}</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Move Date</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${quote.move_date || "TBC"}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Pickup</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${quote.pickup || "TBC"}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Delivery</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${quote.delivery || "TBC"}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Truck</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${quote.truck_label} (${quote.movers} movers)</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Est. Hours</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${quote.total_hours} hrs @ $${quote.rate_per_hour}/hr</td></tr>
    </table>
    <div style="background:#eff6ff;border:2px solid #1d4ed8;border-radius:8px;padding:16px;text-align:center;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#1d4ed8;">TOTAL QUOTE</p>
      <p style="margin:4px 0 0;font-size:32px;font-weight:bold;color:#1d4ed8;">$${quote.grand_total?.toFixed(2)}</p>
    </div>
    <p>This quote is valid for 30 days. Reply to confirm your booking.</p>
    <p>Kind regards,<br/><strong>Move On Removals Team</strong></p>
  </div>
</div>`;
    await base44.integrations.Core.SendEmail({
      to: booking.customer_email,
      subject: `Move On Removals — Quote for ${quote.move_date || "your move"}`,
      body,
    });
    setSending(false);
    alert(`Quote emailed to ${booking.customer_email}`);
  };

  const handleDownloadPDF = () => {
    if (!quote) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const m = 18;
    let y = 0;

    doc.setFillColor(29, 78, 216); doc.rect(0, 0, pw, 36, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("MOVE ON REMOVALS", m, 16);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Professional Removal Quote", m, 26);
    doc.text(`Date: ${new Date().toLocaleDateString("en-AU")}`, pw - m, 26, { align: "right" });
    y = 46;

    doc.setTextColor(30, 41, 59); doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(`Prepared for: ${quote.customer_name}`, m, y); y += 7;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    if (booking?.customer_email) { doc.text(booking.customer_email, m, y); y += 5; }
    if (booking?.customer_mobile) { doc.text(booking.customer_mobile, m, y); y += 5; }
    y += 4;
    doc.setDrawColor(226, 232, 240); doc.line(m, y, pw - m, y); y += 8;

    const sh = (title) => {
      doc.setFillColor(241, 245, 249); doc.rect(m, y - 5, pw - m * 2, 9, "F");
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
      doc.text(title, m + 2, y + 1); y += 11;
    };
    const row = (label, value) => {
      if (!value && value !== 0) return;
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
      doc.text(label, m, y); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
      doc.text(String(value), m + 48, y); y += 6;
    };

    sh("Move Details");
    row("Move Date:", quote.move_date || "TBC");
    row("Pickup:", quote.pickup || "TBC");
    row("Delivery:", quote.delivery || "TBC");
    row("Distance:", `~${quote.estimated_distance_km || booking?.distance_km || "?"} km`);
    y += 3; sh("Job Specification");
    row("Truck:", quote.truck_label);
    row("Crew:", `${quote.movers} movers`);
    row("Volume:", `~${quote.total_volume} m3`);
    row("Loading:", `${quote.loading_hours} hrs`);
    row("Transit:", `${quote.driving_hours} hrs`);
    row("Unloading:", `${quote.unloading_hours} hrs`);
    row("Total Hours:", `${quote.total_hours} hrs`);
    y += 3; sh("Price Breakdown");
    row("Base Rate:", `$${quote.rate_per_hour}/hr x ${quote.total_hours} hrs`);
    row("Base Price:", `$${quote.base_price?.toFixed(2)}`);
    if (quote.travel_levy > 0) row("Travel Levy:", `$${quote.travel_levy?.toFixed(2)}`);
    if (quote.special_items_charge > 0) row("Special Items:", `$${quote.special_items_charge?.toFixed(2)}`);
    if (quote.access_surcharge > 0) row("Access Surcharge:", `$${quote.access_surcharge?.toFixed(2)}`);
    y += 3;

    doc.setFillColor(239, 246, 255); doc.rect(m, y - 4, pw - m * 2, 14, "F");
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(29, 78, 216);
    doc.text("TOTAL QUOTE", m + 2, y + 5);
    doc.text(`$${quote.grand_total?.toFixed(2)}`, pw - m - 2, y + 5, { align: "right" });
    y += 18;

    if (quote.summary_paragraph) {
      sh("Notes");
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(quote.summary_paragraph, pw - m * 2);
      doc.text(lines, m, y);
    }

    const fy = doc.internal.pageSize.getHeight() - 14;
    doc.setFillColor(241, 245, 249); doc.rect(0, fy - 4, pw, 20, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
    doc.text("Move On Removals — moveme@moveonremovals.com.au — Valid for 30 days.", pw / 2, fy + 4, { align: "center" });
    doc.save(`Quote_${(quote.customer_name || "Customer").replace(/\s+/g, "_")}_${quote.move_date || "TBC"}.pdf`);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (!booking) return <div className="text-center py-20 text-gray-400">Booking not found.</div>;

  const items = booking.items_to_move || [];
  const localVolume = items.reduce((sum, item) => sum + getItemVolume(item), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/bookings/${id}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">AI Quote Engine</h1>
            <p className="text-sm text-gray-500">{booking.customer_first_name} {booking.customer_last_name} · {booking.move_date || "No date set"}</p>
          </div>
        </div>
        {approved && (
          <span className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
            <CheckCircle size={16} /> Quote Approved
          </span>
        )}
      </div>

      {/* Inventory summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Package size={18} className="text-blue-600" /> Inventory ({items.length} items · ~{localVolume.toFixed(1)} m³)
        </h2>
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <p>No inventory items yet.</p>
            <Link to={`/inventory/${id}`} className="text-blue-600 hover:underline text-sm mt-2 inline-block">Send inventory form to customer</Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
              <span key={i} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                {item} <span className="text-gray-400">({getItemVolume(item).toFixed(1)}m³)</span>
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xl font-bold text-blue-700">{localVolume.toFixed(1)}</p>
            <p className="text-xs text-blue-500">Total m³</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-sm font-bold text-purple-700">{recommendTruck(localVolume).label}</p>
            <p className="text-xs text-purple-500">Recommended Truck</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xl font-bold text-green-700">{booking.distance_km || "?"} km</p>
            <p className="text-xs text-green-500">Distance</p>
          </div>
        </div>
      </div>

      {/* Generate */}
      {!quote && (
        <button onClick={handleGenerate} disabled={generating || items.length === 0}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold text-base shadow-lg disabled:opacity-50">
          {generating ? <><Loader2 size={22} className="animate-spin" /> AI is calculating...</> : <><Sparkles size={22} /> Generate AI Quote</>}
        </button>
      )}

      {/* Quote result */}
      {quote && (
        <>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="bg-blue-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">Quote Summary</h2>
                <p className="text-blue-200 text-xs mt-0.5">Generated {new Date(quote.generated_at).toLocaleString("en-AU")}</p>
              </div>
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded-lg">
                <RefreshCw size={14} className={generating ? "animate-spin" : ""} /> Regenerate
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Truck, label: "Truck", value: quote.truck_label, sub: `${quote.movers} movers` },
                  { icon: Package, label: "Volume", value: `${quote.total_volume} m³`, sub: `${quote.items?.length} items` },
                  { icon: Clock, label: "Est. Duration", value: `${quote.total_hours} hrs`, sub: `@ $${quote.rate_per_hour}/hr` },
                  { icon: MapPin, label: "Distance", value: `~${quote.estimated_distance_km || booking?.distance_km || "?"} km`, sub: `${quote.driving_hours} hrs transit` },
                ].map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <Icon size={20} className="text-blue-500 mx-auto mb-1" />
                    <p className="font-bold text-gray-800 text-sm">{value}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-600">Base Rate</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">${quote.rate_per_hour}/hr x {quote.total_hours} hrs</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">${quote.base_price?.toFixed(2)}</td>
                    </tr>
                    {quote.travel_levy > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-3 text-gray-600">Travel Levy</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">Distance surcharge</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">${quote.travel_levy?.toFixed(2)}</td>
                      </tr>
                    )}
                    {quote.special_items_charge > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-3 text-gray-600">Special Items</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{quote.special_items_notes || "Piano, safe, etc."}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">${quote.special_items_charge?.toFixed(2)}</td>
                      </tr>
                    )}
                    {quote.access_surcharge > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-3 text-gray-600">Access Surcharge</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">Stairs / no elevator</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">${quote.access_surcharge?.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="bg-blue-50">
                      <td className="px-4 py-4 font-bold text-blue-800 text-base">TOTAL</td>
                      <td className="px-4 py-4 text-blue-600 text-xs">inc. all charges</td>
                      <td className="px-4 py-4 text-right font-bold text-blue-800 text-xl">${quote.grand_total?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {quote.summary_paragraph && (
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-blue-400">
                  <p className="text-sm text-gray-700 leading-relaxed italic">"{quote.summary_paragraph}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleDownloadPDF}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-semibold">
              <Download size={18} /> Download PDF Quote
            </button>
            <button onClick={handleSendEmail} disabled={sending || !booking.customer_email}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {sending ? "Sending..." : "Email to Customer"}
            </button>
            {!approved ? (
              <button onClick={handleApprove} disabled={approveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                {approveMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Approve &amp; Update Booking
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 bg-green-100 text-green-700 py-3 rounded-xl font-semibold">
                <CheckCircle size={18} /> Status: Quoted
              </div>
            )}
          </div>
          {!booking.customer_email && (
            <p className="text-xs text-center text-gray-400">No customer email on file — add it to the booking to email the quote.</p>
          )}
        </>
      )}
    </div>
  );
}