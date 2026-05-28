import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";

const PRESET_ITEMS = [
  "Sofa", "2-Seater Sofa", "3-Seater Sofa", "L-Shape Sofa", "Armchair", "Recliner",
  "Dining Table", "Dining Chairs", "Coffee Table", "Side Table", "Console Table",
  "TV", "TV Unit", "Entertainment Unit", "Bookshelf", "Display Cabinet",
  "Wardrobe (Single)", "Wardrobe (Double)", "Wardrobe (Triple)", "Chest of Drawers", "Bedside Table",
  "Bed (King)", "Bed (Queen)", "Bed (Double)", "Bed (Single)", "Bunk Bed", "Mattress (King)", "Mattress (Queen)", "Mattress (Single)",
  "Desk", "Office Chair", "Filing Cabinet", "Office Drawers",
  "Fridge", "Fridge (Large)", "Washing Machine", "Dryer", "Dishwasher", "Microwave", "Oven",
  "Piano", "BBQ", "Garden Table", "Garden Chairs", "Garden Shed Items",
  "Bicycle", "Treadmill", "Exercise Bike", "Weights",
  "Boxes (Small)", "Boxes (Medium)", "Boxes (Large)", "Artwork / Mirrors", "Plants",
];

export default function ItemsSelector({ value = [], onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filtered = query.trim()
    ? PRESET_ITEMS.filter(
        (item) =>
          item.toLowerCase().includes(query.toLowerCase()) &&
          !value.includes(item)
      )
    : [];

  const addItem = (item) => {
    if (!value.includes(item)) onChange([...value, item]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const addCustom = () => {
    const trimmed = query.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setQuery("");
    setOpen(false);
  };

  const removeItem = (item) => onChange(value.filter((v) => v !== item));

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) addItem(filtered[0]);
      else if (query.trim()) addCustom();
    }
    if (e.key === "Escape") setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="hover:text-red-500 ml-0.5"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type to search items (e.g. Sofa, Fridge...)"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Dropdown */}
      {open && (filtered.length > 0 || query.trim()) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => addItem(item)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {item}
            </button>
          ))}
          {query.trim() && !PRESET_ITEMS.some((i) => i.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              onClick={addCustom}
              className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-100 flex items-center gap-2"
            >
              <Plus size={13} /> Add "<span className="font-medium text-gray-700">{query.trim()}</span>"
            </button>
          )}
        </div>
      )}
    </div>
  );
}