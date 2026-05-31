import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, ChevronDown, ChevronUp, CheckCircle, Truck, Clock, XCircle, Search } from "lucide-react";

const STATUS_CONFIG = {
  Pending:   { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  Paid:      { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle },
  Delivered: { color: "bg-green-100 text-green-800 border-green-200", icon: Truck },
  Cancelled: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const STATUSES = ["All", "Pending", "Paid", "Delivered", "Cancelled"];

export default function PackagingOrders() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["packaging-orders"],
    queryFn: () => base44.entities.PackagingOrder.list("-created_date", 200),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PackagingOrder.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packaging-orders"] }),
  });

  const filtered = orders.filter(o => {
    const matchStatus = filter === "All" || o.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q) ||
      o.order_number?.toLowerCase().includes(q) ||
      o.delivery_address?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = s === "All" ? orders.length : orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  const totalRevenue = orders
    .filter(o => o.status !== "Cancelled")
    .reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={24} className="text-blue-600" /> Packaging Orders
          </h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} total orders · ${totalRevenue.toFixed(2)} revenue (excl. cancelled)</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                filter === s
                  ? s === "All" ? "bg-gray-800 text-white border-gray-800" : cfg.color + " border-current"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {s} <span className="ml-1 opacity-70">({counts[s]})</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, order #..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Orders list */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading orders...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No orders found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(order => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
          const StatusIcon = cfg.icon;
          const isOpen = expanded === order.id;

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Order header row */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-bold text-gray-900">{order.customer_name}</p>
                    {order.order_number && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{order.order_number}</span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      <StatusIcon size={12} /> {order.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-500">
                    <span>{order.customer_email}</span>
                    {order.customer_phone && <span>{order.customer_phone}</span>}
                    {order.delivery_address && <span>{order.delivery_address}</span>}
                    <span>{new Date(order.created_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-lg text-gray-900">${(order.total || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">incl. GST</p>
                </div>

                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 flex-shrink-0"
                >
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
                  {/* Line items */}
                  {order.items?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Items Ordered</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b">
                            <th className="text-left py-1 font-semibold">Item</th>
                            <th className="text-center py-1 font-semibold w-16">Qty</th>
                            <th className="text-right py-1 font-semibold w-20">Unit</th>
                            <th className="text-right py-1 font-semibold w-20">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-1.5 text-gray-800">{item.name}</td>
                              <td className="py-1.5 text-center text-gray-600">{item.qty}</td>
                              <td className="py-1.5 text-right text-gray-600">${(item.unit_price || 0).toFixed(2)}</td>
                              <td className="py-1.5 text-right font-medium text-gray-800">${(item.line_total || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-2 text-right space-y-0.5">
                        <p className="text-xs text-gray-500">Subtotal: ${(order.subtotal || 0).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">GST: ${(order.gst || 0).toFixed(2)}</p>
                        <p className="text-sm font-bold text-gray-800">Total: ${(order.total || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-sm text-yellow-800">
                      <strong>Notes:</strong> {order.notes}
                    </div>
                  )}

                  {/* Status actions */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {["Pending", "Paid", "Delivered", "Cancelled"].map(s => {
                        const c = STATUS_CONFIG[s];
                        const active = order.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus.mutate({ id: order.id, status: s })}
                            disabled={active || updateStatus.isPending}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              active ? c.color + " border-current cursor-default" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                            } disabled:opacity-60`}
                          >
                            <c.icon size={13} />
                            {active ? `${s} (current)` : `Mark ${s}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}