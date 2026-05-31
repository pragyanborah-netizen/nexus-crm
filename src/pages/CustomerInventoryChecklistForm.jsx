import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckSquare, Square, Plus, Minus, Send, CheckCircle, Package, Home, ChevronDown, ChevronUp } from "lucide-react";

const ROOMS = [
  {
    name: "Living Room",
    items: ["Sofa (2-seater)", "Sofa (3-seater)", "Armchair", "Coffee Table", "TV Unit", "TV (up to 55\")", "TV (55\"+)", "Bookshelf", "Side Table", "Rug (large)", "Wall Art / Pictures", "Floor Lamp"],
  },
  {
    name: "Dining Room",
    items: ["Dining Table", "Dining Chairs (×2)", "Buffet / Sideboard", "China Cabinet", "Bar Fridge"],
  },
  {
    name: "Master Bedroom",
    items: ["King Bed Frame", "Queen Bed Frame", "Mattress (King)", "Mattress (Queen)", "Bedside Tables (×2)", "Wardrobe (large)", "Wardrobe (small)", "Chest of Drawers", "Dressing Table", "Mirror (freestanding)", "TV"],
  },
  {
    name: "Bedroom 2",
    items: ["Double Bed Frame", "Single Bed Frame", "Mattress (Double)", "Mattress (Single)", "Wardrobe", "Chest of Drawers", "Desk", "Desk Chair"],
  },
  {
    name: "Bedroom 3",
    items: ["Single Bed Frame", "Mattress (Single)", "Bunk Bed", "Wardrobe", "Chest of Drawers", "Desk"],
  },
  {
    name: "Kitchen",
    items: ["Fridge (large)", "Fridge (small)", "Washing Machine", "Dryer", "Dishwasher", "Microwave", "Small Appliances (toaster, kettle, etc.)", "Kitchen Boxes (10–20)", "Pantry Boxes (5–10)"],
  },
  {
    name: "Home Office",
    items: ["Desk (large)", "Desk (small)", "Office Chair", "Filing Cabinet", "Computer / Monitor", "Printer", "Bookshelf"],
  },
  {
    name: "Garage / Outdoor",
    items: ["Lawn Mower", "Garden Tools", "Outdoor Table", "Outdoor Chairs", "BBQ", "Bicycles", "Tools / Toolbox", "Sporting Equipment", "Storage Boxes"],
  },
];

const PACKAGING = [
  { id: "tea_chest", name: "Tea Chest Box", price: 6.00, desc: "43 × 41 × 60 cm — household goods, clothing, toys" },
  { id: "book_wine", name: "Book & Wine Box", price: 5.50, desc: "41 × 30 × 43 cm — books, kitchen items" },
  { id: "port_a_robe", name: "Port-A-Robe", price: 20.00, desc: "60 × 48 × 120 cm — hanging clothing" },
  { id: "packing_paper", name: "Packing Paper (125 sheets)", price: 25.00, desc: "Wrap fragile items, fill box voids" },
  { id: "mattress_single", name: "Mattress Protector — Single", price: 14.00, desc: "" },
  { id: "mattress_dq", name: "Mattress Protector — Double/Queen", price: 18.00, desc: "" },
  { id: "mattress_king", name: "Mattress Protector — King", price: 20.00, desc: "" },
  { id: "packaging_tape", name: "Packaging Tape", price: 5.00, desc: "Secure box bottoms and tops" },
  { id: "bubble_wrap", name: "Bubble Wrap Heavy Duty (50m × 375mm)", price: 40.00, desc: "Glass, mirrors, antiques, fragile goods" },
  { id: "fragile_tape", name: "\"Fragile\" Tape", price: 6.00, desc: "Close tops of boxes with fragile items" },
];

const SERVICES = ["Moving Only", "Packing", "Unpacking", "Pack & Move", "Pack, Move & Unpack", "Packaging Supplies Delivery Only"];

export default function CustomerInventoryChecklistForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("booking_id") || "";
  const bookingNumber = urlParams.get("booking_number") || "";
  const prefillName = urlParams.get("name") || "";
  const prefillEmail = urlParams.get("email") || "";

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Contact info
  const [contact, setContact] = useState({
    name: prefillName,
    email: prefillEmail,
    phone: "",
    move_from: "",
    move_to: "",
    move_date: "",
  });

  // Room selections: { [roomName]: Set of selected items }
  const [roomSelections, setRoomSelections] = useState({});
  const [customItems, setCustomItems] = useState({});
  const [expandedRooms, setExpandedRooms] = useState({ "Living Room": true });

  // Packaging supplies quantities
  const [packQty, setPackQty] = useState({});

  // Services
  const [services, setServices] = useState([]);

  // Notes
  const [notes, setNotes] = useState("");

  const toggleItem = (room, item) => {
    setRoomSelections(prev => {
      const current = new Set(prev[room] || []);
      current.has(item) ? current.delete(item) : current.add(item);
      return { ...prev, [room]: current };
    });
  };

  const toggleRoom = (room) => setExpandedRooms(p => ({ ...p, [room]: !p[room] }));

  const totalItems = Object.values(roomSelections).reduce((s, set) => s + set.size, 0);
  const packingItems = PACKAGING.filter(p => (packQty[p.id] || 0) > 0);
  const packingTotal = packingItems.reduce((s, p) => s + p.price * (packQty[p.id] || 0), 0);

  const handleSubmit = async () => {
    if (!contact.name || !contact.email) { alert("Please fill in your name and email."); return; }
    setSubmitting(true);

    const rooms = ROOMS.map(r => ({
      room: r.name,
      items: [...(roomSelections[r.name] || [])],
      custom_items: customItems[r.name] || "",
    })).filter(r => r.items.length > 0 || r.custom_items);

    await base44.entities.CustomerInventoryChecklist.create({
      booking_id: bookingId,
      booking_number: bookingNumber,
      customer_name: contact.name,
      customer_email: contact.email,
      customer_phone: contact.phone,
      move_from: contact.move_from,
      move_to: contact.move_to,
      move_date: contact.move_date,
      rooms,
      packaging_supplies: packingItems.map(p => ({ name: p.name, qty: packQty[p.id] })),
      services_needed: services,
      notes,
      status: "Submitted",
    });

    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Checklist Submitted!</h2>
          <p className="text-gray-500">Thank you, <strong>{contact.name}</strong>. Our team will review your inventory and be in touch shortly with a quote.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-1">Move On Removals</h1>
        <p className="text-blue-200 text-base">Inventory & Packaging Checklist</p>
        <p className="text-blue-300 text-sm mt-1">Fill in your items so we can prepare the perfect move for you!</p>
      </div>

      {/* Step indicator */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          {["Your Details", "Room Items", "Packaging Supplies", "Services & Submit"].map((label, i) => (
            <div key={i} className={`flex-1 text-center text-xs py-2 rounded-lg font-semibold border transition-all ${
              step === i + 1 ? "bg-blue-600 text-white border-blue-600" :
              step > i + 1 ? "bg-green-100 text-green-700 border-green-300" :
              "bg-white text-gray-400 border-gray-200"
            }`}>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Contact */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Home size={20} className="text-blue-600" /> Your Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Full Name *", type: "text" },
                { key: "email", label: "Email Address *", type: "email" },
                { key: "phone", label: "Phone Number", type: "tel" },
                { key: "move_date", label: "Preferred Move Date", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} value={contact[f.key]}
                    onChange={e => setContact(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Moving From (suburb/address)</label>
                <input type="text" value={contact.move_from}
                  onChange={e => setContact(p => ({ ...p, move_from: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 12 Smith St, Richmond VIC 3121"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Moving To (suburb/address)</label>
                <input type="text" value={contact.move_to}
                  onChange={e => setContact(p => ({ ...p, move_to: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 5 Jones Ave, Fitzroy VIC 3065"
                />
              </div>
            </div>
            <button onClick={() => { if (!contact.name || !contact.email) { alert("Please enter your name and email."); return; } setStep(2); }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold mt-2">
              Next: Room Items →
            </button>
          </div>
        )}

        {/* Step 2: Room Items */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">Select Your Items by Room</h2>
              <span className="text-sm text-blue-600 font-semibold">{totalItems} items selected</span>
            </div>
            {ROOMS.map(room => {
              const selected = roomSelections[room.name] || new Set();
              const isOpen = !!expandedRooms[room.name];
              return (
                <div key={room.name} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                  <button onClick={() => toggleRoom(room.name)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <span className="font-semibold text-gray-800">{room.name}</span>
                    <div className="flex items-center gap-2">
                      {selected.size > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{selected.size}</span>}
                      {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {room.items.map(item => {
                          const checked = selected.has(item);
                          return (
                            <button key={item} onClick={() => toggleItem(room.name, item)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                                checked ? "bg-blue-50 border-blue-400 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300"
                              }`}>
                              {checked ? <CheckSquare size={16} className="text-blue-600 flex-shrink-0" /> : <Square size={16} className="text-gray-400 flex-shrink-0" />}
                              {item}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Other items in this room (comma separated)..."
                          value={customItems[room.name] || ""}
                          onChange={e => setCustomItems(p => ({ ...p, [room.name]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-gray-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold">Next: Packaging →</button>
            </div>
          </div>
        )}

        {/* Step 3: Packaging Supplies */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Package size={20} className="text-blue-600" /> Packaging Supplies</h2>
              <span className="text-sm text-gray-500">Optional — we can deliver these to you</span>
            </div>
            {PACKAGING.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                    <p className="font-bold text-blue-700 text-sm">${item.price.toFixed(2)}</p>
                  </div>
                  {item.desc && <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setPackQty(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))}
                    disabled={(packQty[item.id] || 0) === 0}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800">{packQty[item.id] || 0}</span>
                  <button onClick={() => setPackQty(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}
                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
            {packingTotal > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm font-semibold text-blue-800">
                Packaging subtotal (excl. GST): ${packingTotal.toFixed(2)} + GST ${(packingTotal * 0.1).toFixed(2)} = <strong>${(packingTotal * 1.1).toFixed(2)}</strong>
              </div>
            )}
            <p className="text-xs text-gray-400">* Second-hand boxes may be available at 50% off — contact us for availability.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">← Back</button>
              <button onClick={() => setStep(4)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold">Next: Services →</button>
            </div>
          </div>
        )}

        {/* Step 4: Services & Submit */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-800">Services Needed & Notes</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">What services are you after? (select all that apply)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICES.map(s => {
                  const checked = services.includes(s);
                  return (
                    <button key={s} onClick={() => setServices(p => checked ? p.filter(x => x !== s) : [...p, s])}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                        checked ? "bg-blue-50 border-blue-400 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300"
                      }`}>
                      {checked ? <CheckSquare size={16} className="text-blue-600 flex-shrink-0" /> : <Square size={16} className="text-gray-400 flex-shrink-0" />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Notes</label>
              <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any special requirements, fragile items, access restrictions, pets, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1 border border-gray-200">
              <p className="font-semibold text-gray-700 mb-2">Summary</p>
              <p className="text-gray-600">📦 <strong>{totalItems}</strong> furniture/household items across {Object.values(roomSelections).filter(s => s.size > 0).length} rooms</p>
              {packingItems.length > 0 && <p className="text-gray-600">🗃️ <strong>{packingItems.length}</strong> packaging supply types requested</p>}
              {services.length > 0 && <p className="text-gray-600">🚛 Services: {services.join(", ")}</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">← Back</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold">
                {submitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</> : <><Send size={16} /> Submit Checklist</>}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">Our team will review your checklist and contact you with a quote within 24 hours.</p>
          </div>
        )}
      </div>
    </div>
  );
}