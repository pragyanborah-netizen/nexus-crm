import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, X, CheckCircle, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORIES = [
  {
    name: "Living Room",
    emoji: "🛋️",
    items: ["Sofa", "2-Seater Sofa", "3-Seater Sofa", "L-Shape Sofa", "Armchair", "Recliner", "Coffee Table", "Side Table", "TV", "TV Unit", "Entertainment Unit", "Bookshelf", "Display Cabinet", "Console Table"],
  },
  {
    name: "Bedroom",
    emoji: "🛏️",
    items: ["Bed (King)", "Bed (Queen)", "Bed (Double)", "Bed (Single)", "Bunk Bed", "Mattress (King)", "Mattress (Queen)", "Mattress (Single)", "Wardrobe (Single)", "Wardrobe (Double)", "Wardrobe (Triple)", "Chest of Drawers", "Bedside Table", "Dressing Table"],
  },
  {
    name: "Kitchen & Laundry",
    emoji: "🍳",
    items: ["Fridge", "Fridge (Large)", "Washing Machine", "Dryer", "Dishwasher", "Microwave", "Oven", "Bar Fridge"],
  },
  {
    name: "Dining Room",
    emoji: "🍽️",
    items: ["Dining Table", "Dining Chairs", "Bar Stools", "Buffet / Sideboard"],
  },
  {
    name: "Office & Study",
    emoji: "💼",
    items: ["Desk", "Office Chair", "Filing Cabinet", "Office Drawers", "Bookcase", "Printer"],
  },
  {
    name: "Outdoor & Garage",
    emoji: "🌿",
    items: ["BBQ", "Garden Table", "Garden Chairs", "Garden Shed Items", "Bicycle", "Treadmill", "Exercise Bike", "Weights", "Lawn Mower"],
  },
  {
    name: "Boxes & Misc",
    emoji: "📦",
    items: ["Boxes (Small)", "Boxes (Medium)", "Boxes (Large)", "Artwork / Mirrors", "Plants", "Piano", "Safe"],
  },
];

const ALL_ITEMS = CATEGORIES.flatMap(c => c.items);

function CategorySection({ category, items, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const selectedInCat = category.items.filter(i => items.includes(i));
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{category.emoji}</span>
          <span className="font-semibold text-gray-700 text-sm">{category.name}</span>
          {selectedInCat.length > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-medium">{selectedInCat.length}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {category.items.map(item => {
              const selected = items.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => selected ? onRemove(item) : onAdd(item)}
                  className={`px-3 py-2 rounded-lg text-sm border-2 transition-all font-medium ${
                    selected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  {selected ? "✓ " : ""}{item}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventoryForm() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

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
    ? ALL_ITEMS.filter(i => i.toLowerCase().includes(query.toLowerCase()) && !items.includes(i))
    : [];

  const addItem = (item) => {
    if (!items.includes(item)) setItems(prev => [...prev, item]);
    setQuery("");
    inputRef.current?.focus();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-3" size={36} />
          <p className="text-gray-500 text-sm">Loading your form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link not found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle size={60} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">All done! 🎉</h2>
          <p className="text-gray-600 mb-4">Thanks <strong>{booking?.customer_first_name}</strong>! We've received your {items.length} item{items.length !== 1 ? "s" : ""}.</p>
          <div className="bg-blue-50 rounded-xl p-4 text-left mb-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">✨ What happens next?</p>
            <p className="text-sm text-blue-700">Our team is preparing a personalised quote based on your inventory. We'll be in touch shortly!</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {items.map(item => (
              <span key={item} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{item}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-blue-700 text-white py-5 px-4 text-center shadow-md">
        <h1 className="text-xl font-bold tracking-wide">Move On Australia</h1>
        <p className="text-blue-200 text-xs mt-0.5">Content Inventory — Tell us what you need moved</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Greeting card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-blue-100">
          <p className="text-base font-semibold text-gray-800">
            Hi {booking?.customer_first_name}! 👋
          </p>
          {booking?.move_date && (
            <p className="text-sm text-gray-500 mt-0.5">
              Your move is on <strong>{new Date(booking.move_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</strong>
              {booking.pickup_suburb && ` from ${booking.pickup_suburb}`}
              {booking.delivery_suburb && ` to ${booking.delivery_suburb}`}.
            </p>
          )}
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-sm text-blue-700">
              <strong>Add all the items you need moved</strong> — tap a category below, or search. This helps us quote you accurately and send the right truck 🚛
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length > 0) addItem(filtered[0]);
                  else if (query.trim()) addCustom();
                }
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Search items or type a custom one..."
              className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm bg-white shadow-sm focus:outline-none"
            />
          </div>
          {(filtered.length > 0 || query.trim()) && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto">
              {filtered.slice(0, 8).map(item => (
                <button key={item} type="button" onClick={() => addItem(item)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors">
                  {item}
                </button>
              ))}
              {query.trim() && !ALL_ITEMS.some(i => i.toLowerCase() === query.toLowerCase()) && (
                <button type="button" onClick={addCustom}
                  className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 flex items-center gap-2 font-medium">
                  <Plus size={14} /> Add "{query.trim()}" as custom item
                </button>
              )}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="space-y-2">
          {CATEGORIES.map(cat => (
            <CategorySection
              key={cat.name}
              category={cat}
              items={items}
              onAdd={addItem}
              onRemove={removeItem}
            />
          ))}
        </div>

        {/* Selected items summary */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Your items ({items.length})</p>
              <button type="button" onClick={() => setItems([])} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <span key={item} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full font-medium">
                  {item}
                  <button type="button" onClick={() => removeItem(item)} className="hover:text-red-500 ml-0.5 flex-shrink-0">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all"
        >
          {saving ? (
            <><Loader2 size={20} className="animate-spin" /> Getting your quote ready...</>
          ) : (
            <>Submit {items.length > 0 ? `${items.length} items` : "Inventory"} &amp; Get Quote</>
          )}
        </button>

        {items.length === 0 && (
          <p className="text-center text-xs text-gray-400">Add at least one item to continue</p>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">Move On Australia · moveme@moveonremovals.com.au</p>
      </div>
    </div>
  );
}