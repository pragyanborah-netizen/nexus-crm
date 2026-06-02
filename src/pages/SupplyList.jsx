import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Package, Mail, CheckCircle } from "lucide-react";

const SUPPLIES = [
  {
    name: "Tea Chest",
    dims: "43.1 × 40.6 × 59.6 cm",
    desc: "Household goods, clothing, toys, small appliances",
    price: "$6.00",
  },
  {
    name: "Book & Wine Box",
    dims: "40.6 × 29.8 × 43.1 cm",
    desc: "Books, wine bottles & kitchen items",
    price: "$4.00",
  },
  {
    name: "Packing Paper",
    dims: "125 sheets per pack",
    desc: "Wrap items, fill voids, pad top & bottom of boxes",
    price: "$25.00",
  },
  {
    name: "Bubble Wrap",
    dims: "50m × 375mm roll",
    desc: "Glass, mirrors, antiques & fragile goods",
    price: "$35.00",
  },
  {
    name: "Mattress Protector",
    dims: "Single $12 · Double/Queen $14 · King $16",
    desc: "Protects mattress from dirt & damage during move",
    price: "from $12",
  },
  {
    name: "Packaging Tape",
    dims: "Standard roll",
    desc: "Secures bottom and tops of non-fragile boxes",
    price: "$5.00",
  },
  {
    name: '"Fragile" Tape',
    dims: "Standard roll",
    desc: "Closes tops of boxes containing fragile items only",
    price: "$6.00",
  },
];

export default function SupplyList() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) { alert("Please enter a customer email."); return; }
    setSending(true);
    await base44.functions.invoke("sendPackagingPriceList", {
      customer_email: email,
      customer_first_name: name,
    });
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setEmail(""); setName(""); }, 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package size={24} className="text-blue-600" /> Packaging Supply List
        </h1>
        <p className="text-sm text-gray-500 mt-1">All pricing excludes GST. Second hand boxes may be available at 50% off on request.</p>
      </div>

      {/* Price List Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-blue-50">
          <h2 className="font-semibold text-blue-800 text-sm uppercase tracking-wide">Packaging Items & Prices (excl. GST)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Item</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Size / Details</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Best For</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-600">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {SUPPLIES.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-semibold text-gray-800">{s.name}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{s.dims}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{s.desc}</td>
                <td className="px-5 py-3 text-right font-bold text-blue-700">{s.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pack & Wrap Service */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <h2 className="font-semibold text-green-800 mb-3">Pack & Wrap / Unpack Service</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="font-semibold text-gray-800">Mon – Fri</p>
            <p className="text-green-700 font-bold text-lg mt-1">$158/hr</p>
            <p className="text-xs text-gray-500 mt-1">2 Packers/Unpackers included</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="font-semibold text-gray-800">Saturday</p>
            <p className="text-green-700 font-bold text-lg mt-1">$196/hr</p>
            <p className="text-xs text-gray-500 mt-1">2 Packers/Unpackers included</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="font-semibold text-gray-800">Additional Packer</p>
            <p className="text-green-700 font-bold text-lg mt-1">$79–$98/hr</p>
            <p className="text-xs text-gray-500 mt-1">Mon–Fri $79 · Sat $98 · Min 3 hrs</p>
          </div>
        </div>
      </div>

      {/* Send to Customer */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Mail size={18} className="text-blue-600" /> Send Price List to Customer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Customer First Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Customer Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="customer@email.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || sent || !email}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
        >
          {sent ? (
            <><CheckCircle size={16} /> Sent!</>
          ) : sending ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
          ) : (
            <><Mail size={16} /> Send Price List Email</>
          )}
        </button>
      </div>
    </div>
  );
}