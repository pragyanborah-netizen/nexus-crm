import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, X, CheckCircle, Loader2, Search, ChevronDown, ChevronUp, Sparkles, Mic, MicOff, Camera, Upload, Trash2 } from "lucide-react";

const CATEGORIES = [
  { name: "Living Room", emoji: "🛋️", items: ["Sofa", "2-Seater Sofa", "3-Seater Sofa", "L-Shape Sofa", "Armchair", "Recliner", "Coffee Table", "Side Table", "TV", "TV Unit", "Entertainment Unit", "Bookshelf", "Display Cabinet", "Console Table"] },
  { name: "Bedroom", emoji: "🛏️", items: ["Bed (King)", "Bed (Queen)", "Bed (Double)", "Bed (Single)", "Bunk Bed", "Mattress (King)", "Mattress (Queen)", "Mattress (Single)", "Wardrobe (Single)", "Wardrobe (Double)", "Wardrobe (Triple)", "Chest of Drawers", "Bedside Table", "Dressing Table"] },
  { name: "Kitchen & Laundry", emoji: "🍳", items: ["Fridge", "Fridge (Large)", "Washing Machine", "Dryer", "Dishwasher", "Microwave", "Oven", "Bar Fridge"] },
  { name: "Dining Room", emoji: "🍽️", items: ["Dining Table", "Dining Chairs", "Bar Stools", "Buffet / Sideboard"] },
  { name: "Office & Study", emoji: "💼", items: ["Desk", "Office Chair", "Filing Cabinet", "Office Drawers", "Bookcase", "Printer"] },
  { name: "Outdoor & Garage", emoji: "🌿", items: ["BBQ", "Garden Table", "Garden Chairs", "Garden Shed Items", "Bicycle", "Treadmill", "Exercise Bike", "Weights", "Lawn Mower"] },
  { name: "Boxes & Misc", emoji: "📦", items: ["Boxes (Small)", "Boxes (Medium)", "Boxes (Large)", "Artwork / Mirrors", "Plants", "Piano", "Safe"] },
];

const ALL_ITEMS = CATEGORIES.flatMap(c => c.items);

const TABS = [
  { id: "checkboxes", label: "Checkboxes", emoji: "☑️" },
  { id: "voice", label: "Voice", emoji: "🎙️" },
  { id: "photos", label: "Photos", emoji: "📷" },
];

function CategorySection({ category, items, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const selectedInCat = category.items.filter(i => items.includes(i));
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
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
                <button key={item} type="button" onClick={() => selected ? onRemove(item) : onAdd(item)}
                  className={`px-3 py-2 rounded-lg text-sm border-2 transition-all font-medium ${
                    selected ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                  }`}>
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
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("checkboxes");
  const inputRef = useRef(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceItems, setVoiceItems] = useState([]);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Photo state
  const [photos, setPhotos] = useState([]);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoItems, setPhotoItems] = useState([]);
  const photoInputRef = useRef(null);

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

  const handleAiSuggest = async () => {
    setAiLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert Australian removalist. Based on the following move details, generate a realistic list of household items the customer is likely moving.

Customer type: ${booking?.customer_type || 'Residential'}
Pickup: ${booking?.pickup_suburb || 'unknown suburb'}
Delivery: ${booking?.delivery_suburb || 'unknown suburb'}
Move date: ${booking?.move_date || 'unknown'}

Generate a comprehensive but realistic list of items. Include furniture, appliances, and boxes. Return 15-30 items.`,
      response_json_schema: {
        type: "object",
        properties: { items: { type: "array", items: { type: "string" } } }
      }
    });
    if (res?.items?.length) {
      setItems(prev => [...prev, ...res.items.filter(i => !prev.includes(i))]);
    }
    setAiLoading(false);
  };

  // ── Voice input ──────────────────────────────────────────────
  const startVoiceRecording = async () => {
    setTranscript("");
    setVoiceItems([]);

    // Try Web Speech API first
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-AU";
      recognitionRef.current = recognition;

      let finalTranscript = "";
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
          else interim += event.results[i][0].transcript;
        }
        setTranscript(finalTranscript + interim);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
    } else {
      // Fallback: record audio and use Whisper
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        setVoiceProcessing(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const text = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
        setTranscript(text || "");
        setVoiceProcessing(false);
      };
      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processVoiceTranscript = async () => {
    if (!transcript.trim()) return;
    setVoiceProcessing(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract a list of household furniture and moving items from this spoken description. Only include physical items that would be moved by a removalist. Clean up the item names to be professional.

Transcript: "${transcript}"

Return a JSON list of item names. If no clear items are mentioned, return an empty array.`,
      response_json_schema: {
        type: "object",
        properties: { items: { type: "array", items: { type: "string" } } }
      }
    });
    const extracted = res?.items || [];
    setVoiceItems(extracted);
    setVoiceProcessing(false);
  };

  const addVoiceItems = () => {
    setItems(prev => [...prev, ...voiceItems.filter(i => !prev.includes(i))]);
    setVoiceItems([]);
    setTranscript("");
  };

  // ── Photo input ──────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPhotoProcessing(true);

    const uploadedUrls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setPhotos(prev => [...prev, ...uploadedUrls]);

    // Use Claude Vision to identify items
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a removalist expert. Look at these photos of a room/home and identify all the furniture and household items that would need to be moved. Be specific (e.g. "3-Seater Sofa" not just "sofa"). Only list items clearly visible in the photos.`,
      file_urls: uploadedUrls,
      response_json_schema: {
        type: "object",
        properties: { items: { type: "array", items: { type: "string" } } }
      }
    });

    const identified = res?.items || [];
    setPhotoItems(prev => [...prev, ...identified.filter(i => !prev.includes(i))]);
    setPhotoProcessing(false);
    e.target.value = "";
  };

  const addPhotoItems = () => {
    setItems(prev => [...prev, ...photoItems.filter(i => !prev.includes(i))]);
    setPhotoItems([]);
    setPhotos([]);
  };

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
      <div className="bg-blue-700 text-white py-5 px-4 text-center shadow-md">
        <h1 className="text-xl font-bold tracking-wide">Move On Australia</h1>
        <p className="text-blue-200 text-xs mt-0.5">Content Inventory — Tell us what you need moved</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Greeting */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-blue-100">
          <p className="text-base font-semibold text-gray-800">Hi {booking?.customer_first_name}! 👋</p>
          {booking?.move_date && (
            <p className="text-sm text-gray-500 mt-0.5">
              Your move is on <strong>{new Date(booking.move_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</strong>
              {booking.pickup_suburb && ` from ${booking.pickup_suburb}`}
              {booking.delivery_suburb && ` to ${booking.delivery_suburb}`}.
            </p>
          )}
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-sm text-blue-700">
              <strong>Tell us what you're moving</strong> — use checkboxes, speak it out, or snap some photos. We'll handle the rest! 🚛
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}>
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* ── CHECKBOXES TAB ── */}
            {activeTab === "checkboxes" && (
              <div className="space-y-3">
                <button type="button" onClick={handleAiSuggest} disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold text-sm shadow disabled:opacity-60">
                  {aiLoading ? <><Loader2 size={16} className="animate-spin" /> AI is generating...</> : <><Sparkles size={16} /> ✨ Auto-fill with AI</>}
                </button>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); if (filtered.length > 0) addItem(filtered[0]); else if (query.trim()) addCustom(); }
                      if (e.key === "Escape") setQuery("");
                    }}
                    placeholder="Search or add a custom item..."
                    className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none" />
                  {(filtered.length > 0 || query.trim()) && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                      {filtered.slice(0, 8).map(item => (
                        <button key={item} type="button" onClick={() => addItem(item)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700">{item}</button>
                      ))}
                      {query.trim() && !ALL_ITEMS.some(i => i.toLowerCase() === query.toLowerCase()) && (
                        <button type="button" onClick={addCustom}
                          className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 flex items-center gap-2 font-medium">
                          <Plus size={13} /> Add "{query.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {CATEGORIES.map(cat => (
                    <CategorySection key={cat.name} category={cat} items={items} onAdd={addItem} onRemove={removeItem} />
                  ))}
                </div>
              </div>
            )}

            {/* ── VOICE TAB ── */}
            {activeTab === "voice" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 text-center">Press the button and speak your items naturally — e.g. <em>"I have a queen bed, 3-seater sofa, dining table..."</em></p>

                <div className="flex justify-center">
                  <button type="button"
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 font-semibold text-sm transition-all shadow-lg ${
                      isRecording
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}>
                    {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                    <span className="text-xs">{isRecording ? "Stop" : "Record"}</span>
                  </button>
                </div>

                {isRecording && (
                  <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    Listening... speak your items
                  </div>
                )}

                {transcript && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Transcript:</p>
                    <p className="text-sm text-gray-700 italic">"{transcript}"</p>
                    <button type="button" onClick={processVoiceTranscript} disabled={voiceProcessing}
                      className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                      {voiceProcessing ? <><Loader2 size={15} className="animate-spin" /> Extracting items...</> : <><Sparkles size={15} /> Extract items with AI</>}
                    </button>
                  </div>
                )}

                {voiceItems.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ AI found {voiceItems.length} items:</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {voiceItems.map((item, i) => (
                        <span key={i} className="bg-white border border-green-200 text-green-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                          {item}
                          <button type="button" onClick={() => setVoiceItems(prev => prev.filter((_, j) => j !== i))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                    <button type="button" onClick={addVoiceItems}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold">
                      Add all to my inventory
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── PHOTOS TAB ── */}
            {activeTab === "photos" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 text-center">Take photos of your rooms and our AI will identify your items automatically.</p>

                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoProcessing}
                  className="w-full border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 rounded-xl py-8 flex flex-col items-center gap-3 transition-all disabled:opacity-50">
                  {photoProcessing ? (
                    <><Loader2 size={32} className="text-blue-600 animate-spin" /><p className="text-sm font-medium text-blue-700">AI is scanning your photos...</p></>
                  ) : (
                    <><Camera size={32} className="text-blue-500" /><p className="text-sm font-semibold text-blue-700">Tap to take / upload photos</p><p className="text-xs text-blue-400">Multiple photos supported</p></>
                  )}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" multiple capture="environment"
                  className="hidden" onChange={handlePhotoUpload} />

                {photos.length > 0 && !photoProcessing && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {photos.map((url, i) => (
                      <img key={i} src={url} alt={`Photo ${i+1}`}
                        className="h-20 w-20 object-cover rounded-lg flex-shrink-0 border-2 border-gray-200" />
                    ))}
                  </div>
                )}

                {photoItems.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-800 mb-2">📷 AI identified {photoItems.length} items:</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {photoItems.map((item, i) => (
                        <span key={i} className="bg-white border border-green-200 text-green-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                          {item}
                          <button type="button" onClick={() => setPhotoItems(prev => prev.filter((_, j) => j !== i))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={addPhotoItems}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold">
                        Add all to my inventory
                      </button>
                      <button type="button" onClick={() => { setPhotoItems([]); setPhotos([]); }}
                        className="px-4 py-2.5 rounded-lg text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected items summary */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Your inventory ({items.length} items)</p>
              <button type="button" onClick={() => setItems([])} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <span key={item} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full font-medium">
                  {item}
                  <button type="button" onClick={() => removeItem(item)} className="hover:text-red-500 ml-0.5"><X size={11} /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button type="button" onClick={handleSave} disabled={saving || items.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all">
          {saving
            ? <><Loader2 size={20} className="animate-spin" /> Getting your quote ready...</>
            : <>Submit {items.length > 0 ? `${items.length} items` : "Inventory"} &amp; Get Quote</>
          }
        </button>
        {items.length === 0 && <p className="text-center text-xs text-gray-400">Add at least one item to continue</p>}

        <p className="text-center text-xs text-gray-400 pb-4">Move On Australia · moveme@moveonremovals.com.au</p>
      </div>
    </div>
  );
}