import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Package, Plus, X, CheckCircle, Loader2 } from "lucide-react";

const PRESET_ITEMS = [
  "Sofa", "2-Seater Sofa", "3-Seater Sofa", "L-Shape Sofa", "Armchair", "Recliner",
  "Dining Table", "Dining Chairs", "Coffee Table", "Side Table", "Console Table",
  "TV", "TV Unit", "Entertainment Unit", "Bookshelf", "Display Cabinet",
  "Wardrobe (Single)", "Wardrobe (Double)", "Wardrobe (Triple)", "Chest of Drawers", "Bedside Table",
  "Bed (King)", "Bed (Queen)", "Bed (Double)", "Bed (Single)", "Bunk Bed",
  "Mattress (King)", "Mattress (Queen)", "Mattress (Single)",
  "Desk", "Office Chair", "Filing Cabinet", "Office Drawers",
  "Fridge", "Fridge (Large)", "Washing Machine", "Dryer", "Dishwasher", "Microwave", "Oven",
  "Piano", "BBQ", "Garden Table", "Garden Chairs",
  "Bicycle", "Treadmill", "Exercise Bike", "Weights",
  "Boxes (Small)", "Boxes (Medium)", "Boxes (Large)", "Artwork / Mirrors", "Plants",
];

const QUICK_ITEMS = ["Sofa", "Dining Table", "Dining Chairs", "Bed (Queen)", "Bed (King)", "Fridge", "Washing Machine", "Wardrobe (Double)", "TV", "Chest of Drawers", "Boxes (Small)", "Boxes (Medium)", "Boxes (Large)"];

export default function InventoryForm() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await base44.functions.invoke("inventoryForm", { action: "get", bookingId });
      if (res.data?.error) {
        setError("We couldn't find this booking. Please check your link.");
      } else {
        setBooking(res.data);
        setItems(res.data.items_to_move || []);
      }
      setLoading(false);
    };
    load();
  }, [bookingId]);

  const filtered = query.trim()
    ? PRESET_ITEMS.filter(i => i.toLowerCase().includes(query.toLowerCase()) && !items.includes(i))
    : [];

  const addItem = (item) => {
    if (!items.includes(item)) setItems(prev => [...prev, item]);
    setQuery("");
  };

  const addCustom = () => {
    const t = query.trim();
    if (t && !items.includes(t)) setItems(prev => [...prev, t]);
    setQuery("");
  };

  const removeItem = (item) => setItems(items.filter(i => i !== item));

  const handleSave = async () => {
    setSaving(true);
    await base44.functions.invoke("inventoryForm", { action: "save", bookingId, items });
    setSaving(false);
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank you!</h2>
          <p className="text-gray-500">Your inventory has been submitted. Our team will review it and be in touch shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white py-6 px-4 text-center">
        <h1 className="text-2xl font-bold">Move On Australia</h1>
        <p className="text-blue-200 text-sm mt-1">Content Inventory Form</p>
      </div>

      <div className="max-w-xl mx-auto p-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <p className="text-sm text-gray-500">Hello, <strong className="text-gray-800">{booking?.customer_first_name} {booking?.customer_last_name}</strong></p>
          {booking?.move_date && (
            <p className="text-sm text-gray-500 mt-1">Move Date: <strong className="text-gray-800">{booking.move_date}</strong></p>
          )}
          {(booking?.pickup_suburb || booking?.delivery_suburb) && (
            <p className="text-sm text-gray-500 mt-1">
              {booking.pickup_suburb && `From: ${booking.pickup_suburb}`}
              {booking.pickup_suburb && booking.delivery_suburb && " \u2192 "}
              {booking.delivery_suburb && `To: ${booking.delivery_suburb}`}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
            Please add all items you need moved. This helps us send the right truck for your move.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Search Items</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtered.length > 0) addItem(filtered[0]);
                else if (query.trim()) addCustom();
              }
            }}
            placeholder="e.g. Sofa, Fridge, Wardrobe..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
          {(filtered.length > 0 || query.trim()) && (
            <div className="absolute left-5 right-5 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-52 overflow-y-auto mt-1">
              {filtered.map(item => (
                <button key={item} type="button" onClick={() => addItem(item)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700">
                  {item}
                </button>
              ))}
              {query.trim() && !PRESET_ITEMS.some(i => i.toLowerCase() === query.toLowerCase()) && (
                <button type="button" onClick={addCustom}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                  <Plus size={13} /> Add "{query.trim()}"
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Common Items — tap to add</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ITEMS.map(item => (
              <button key={item} type="button" onClick={() => addItem(item)}
                disabled={items.includes(item)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  items.includes(item)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                }`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">{items.length} item{items.length !== 1 ? "s" : ""} selected</p>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <span key={item} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1.5 rounded-full">
                  {item}
                  <button type="button" onClick={() => removeItem(item)} className="hover:text-red-500 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : "Submit My Inventory"}
        </button>
      </div>
    </div>
  );
}