import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Send, Users, MapPin, Calendar, Search, X, Check, AlertCircle } from "lucide-react";

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";

export default function BulkSmsTool() {
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    suburbs: "",
    customerType: "",
  });
  const [previewCount, setPreviewCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-for-sms"],
    queryFn: () => base44.entities.Booking.list(),
  });

  // Calculate preview count when filters change
  useState(() => {
    const customerSet = new Set();
    
    bookings.forEach(booking => {
      if (!booking.customer_mobile || !booking.customer_email) return;
      
      if (filters.dateFrom && booking.move_date && booking.move_date < filters.dateFrom) return;
      if (filters.dateTo && booking.move_date && booking.move_date > filters.dateTo) return;
      
      if (filters.suburbs.trim()) {
        const suburbList = filters.suburbs.split(',').map(s => s.trim().toLowerCase());
        const pickupSuburb = (booking.pickup_suburb || '').toLowerCase();
        const deliverySuburb = (booking.delivery_suburb || '').toLowerCase();
        const matches = suburbList.some(s => pickupSuburb.includes(s) || deliverySuburb.includes(s));
        if (!matches) return;
      }
      
      if (filters.customerType && booking.customer_type !== filters.customerType) return;
      
      customerSet.add(booking.customer_email.toLowerCase());
    });
    
    setPreviewCount(customerSet.size);
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (data) => {
      setSending(true);
      const response = await base44.functions.invoke('sendBulkSms', data);
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setSending(false);
    },
    onError: (error) => {
      setResult({ error: error.message });
      setSending(false);
    },
  });

  const handlePreview = () => {
    setShowPreview(true);
    setResult(null);
  };

  const handleSend = () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }
    if (previewCount === 0) {
      alert("No customers match the selected filters");
      return;
    }
    if (!confirm(`Send SMS to ${previewCount} customers?`)) return;
    
    sendSmsMutation.mutate({
      message,
      filters: {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        suburbs: filters.suburbs.trim() ? filters.suburbs.split(',').map(s => s.trim()) : undefined,
        customerType: filters.customerType || undefined,
      },
    });
  };

  const resetForm = () => {
    setMessage("");
    setFilters({ dateFrom: "", dateTo: "", suburbs: "", customerType: "" });
    setPreviewCount(0);
    setShowPreview(false);
    setResult(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-xs text-gray-400 mb-1">Home › Bulk SMS Tool</nav>
          <h1 className="text-2xl font-bold text-gray-800">Bulk SMS Tool</h1>
        </div>
        <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-2">
          <X size={16} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Search size={18} /> Filter Customers
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last Service Date From</label>
                <input
                  type="date"
                  className={inputClass}
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last Service Date To</label>
                <input
                  type="date"
                  className={inputClass}
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Suburbs (comma-separated)</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Richmond, Carlton, Fitzroy"
                  value={filters.suburbs}
                  onChange={(e) => setFilters({ ...filters, suburbs: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">Matches pickup or delivery suburbs</p>
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Customer Type</label>
                <select
                  className={selectClass}
                  value={filters.customerType}
                  onChange={(e) => setFilters({ ...filters, customerType: e.target.value })}
                >
                  <option value="">All Types</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Office">Office</option>
                </select>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Matching Customers:</span>
                <span className="text-lg font-bold text-blue-600">{previewCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Send size={18} /> Compose Message
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Personalization Tags:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{`{first_name}`}</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{`{last_name}`}</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{`{email}`}</span>
              </div>
            </div>
            
            <textarea
              className={`${inputClass} h-40 resize-none`}
              placeholder="Enter your SMS message here. Use tags like {first_name} to personalize..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1600}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-400">
                {message.length} / 1600 characters
              </p>
              <p className="text-xs text-gray-400">
                ~{Math.ceil(message.length / 160)} SMS message{Math.ceil(message.length / 160) !== 1 ? 's' : ''} per recipient
              </p>
            </div>
          </div>

          {/* Preview & Send */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={!message.trim() || previewCount === 0}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={16} /> Preview Recipients
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || previewCount === 0 || sending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                ) : (
                  <><Send size={16} /> Send SMS</>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className={`rounded-lg shadow p-4 ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              {result.error ? (
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="text-green-600" size={20} />
                    <h3 className="font-semibold text-green-800">SMS Campaign Complete</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-500">Total Recipients</p>
                      <p className="text-lg font-bold text-gray-800">{result.total}</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-500">Successfully Sent</p>
                      <p className="text-lg font-bold text-green-600">{result.sent}</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="text-xs text-gray-500">Failed</p>
                      <p className="text-lg font-bold text-red-600">{result.failed}</p>
                    </div>
                  </div>
                  {result.failedNumbers && result.failedNumbers.length > 0 && (
                    <div className="bg-white rounded p-3">
                      <p className="text-xs font-semibold text-red-600 mb-2">Failed Numbers:</p>
                      <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                        {result.failedNumbers.map((f, i) => (
                          <li key={i}>{f.mobile}: {f.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users size={18} /> Preview Recipients ({previewCount})
              </h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <p className="text-sm text-gray-600 mb-4">
                These customers match your filter criteria and will receive the SMS:
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-800 mb-2">Message Preview:</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">
                  {message
                    .replace(/{first_name}/gi, 'John')
                    .replace(/{last_name}/gi, 'Smith')
                    .replace(/{email}/gi, 'john@example.com')}
                </p>
              </div>
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-blue-200 mb-3" />
                <p className="text-gray-600">
                  <span className="font-bold text-blue-600">{previewCount}</span> customer{previewCount !== 1 ? 's' : ''} will receive this SMS
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Based on bookings with valid mobile numbers matching your filters
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Close
              </button>
              <button
                onClick={() => { setShowPreview(false); handleSend(); }}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
              >
                <Send size={14} /> Send to All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}