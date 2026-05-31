import { X, Truck, MapPin, Clock, Phone, Package, Calendar, DollarSign, Users, AlertTriangle } from "lucide-react";

export default function JobSheetModal({ booking, onClose }) {
  const pickup = [booking.pickup_address, booking.pickup_suburb, booking.pickup_state, booking.pickup_postcode].filter(Boolean).join(", ");
  const delivery = [booking.delivery_address, booking.delivery_suburb, booking.delivery_state, booking.delivery_postcode].filter(Boolean).join(", ");
  const customerPhone = booking.customer_mobile || booking.customer_phone;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-2 border-b border-gray-700 last:border-0">
      <Icon size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-sm text-white mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <div>
            <h2 className="font-bold text-white text-lg">Job Sheet</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {booking.booking_number || `Job #${booking.id?.slice(0, 8)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-xl">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {/* Customer */}
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Customer Details</p>
            <div className="bg-gray-700/50 rounded-xl p-3 space-y-2">
              <InfoRow icon={Users} label="Customer" value={`${booking.customer_first_name} ${booking.customer_last_name}`} />
              {customerPhone && (
                <a href={`tel:${customerPhone}`} className="flex items-start gap-3 py-2 border-b border-gray-700 last:border-0">
                  <Phone size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-300 font-medium">{customerPhone}</p>
                </a>
              )}
              <InfoRow icon={MapPin} label="Customer Type" value={booking.customer_type || "Residential"} />
            </div>
          </div>

          {/* Route */}
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Route Details</p>
            <div className="bg-gray-700/50 rounded-xl p-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-6 flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="w-0.5 h-8 bg-gray-600" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Pickup</p>
                    <p className="text-sm text-white">{pickup || "Address not set"}</p>
                    {booking.pickup_floor && (
                      <p className="text-xs text-gray-400 mt-1">
                        Floor: {booking.pickup_floor} {booking.pickup_elevator ? "· Elevator ✓" : "· No elevator"}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Delivery</p>
                    <p className="text-sm text-white">{delivery || "Address not set"}</p>
                    {booking.delivery_floor && (
                      <p className="text-xs text-gray-400 mt-1">
                        Floor: {booking.delivery_floor} {booking.delivery_elevator ? "· Elevator ✓" : "· No elevator"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Job Information</p>
            <div className="bg-gray-700/50 rounded-xl p-3 space-y-2">
              <InfoRow icon={Calendar} label="Date & Time" value={`${booking.move_date || "TBC"} ${booking.move_time || ""}`} />
              <InfoRow icon={Truck} label="Truck Size" value={booking.truck_size || booking.moving_truck_size || "Not specified"} />
              <InfoRow icon={Users} label="Movers Required" value={booking.num_movers ? `${booking.num_movers} movers` : "Not specified"} />
              <InfoRow icon={Clock} label="Estimated Duration" value={booking.estimated_hours ? `~${booking.estimated_hours} hours` : "Not specified"} />
              <InfoRow icon={DollarSign} label="Price" value={booking.price ? `$${booking.price}` : "Not specified"} />
              <InfoRow icon={Package} label="Services" value={booking.service_type || booking.selected_services?.join(", ")} />
            </div>
          </div>

          {/* Items to Move */}
          {booking.items_to_move && booking.items_to_move.length > 0 && (
            <div>
              <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Items to Move</p>
              <div className="bg-gray-700/50 rounded-xl p-3">
                <ul className="space-y-1">
                  {booking.items_to_move.map((item, i) => (
                    <li key={i} className="text-sm text-white flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Additional Stops */}
          {booking.additional_stops && booking.additional_stops.length > 0 && (
            <div>
              <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Additional Stops</p>
              <div className="bg-gray-700/50 rounded-xl p-3">
                <ul className="space-y-1">
                  {booking.additional_stops.map((stop, i) => (
                    <li key={i} className="text-sm text-white flex items-start gap-2">
                      <AlertTriangle size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                      {stop}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Notes */}
          {(booking.notes || booking.internal_notes) && (
            <div>
              <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Notes</p>
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 space-y-2">
                {booking.notes && (
                  <div>
                    <p className="text-xs text-yellow-300 font-semibold mb-0.5">Customer Notes</p>
                    <p className="text-sm text-yellow-100">{booking.notes}</p>
                  </div>
                )}
                {booking.internal_notes && (
                  <div>
                    <p className="text-xs text-yellow-300 font-semibold mb-0.5">Internal Notes</p>
                    <p className="text-sm text-yellow-100">{booking.internal_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Property Access */}
          {(booking.pickup_property_access?.length > 0 || booking.delivery_property_access?.length > 0) && (
            <div>
              <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold mb-2">Property Access</p>
              <div className="bg-gray-700/50 rounded-xl p-3 space-y-3">
                {booking.pickup_property_access?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Pickup Access:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {booking.pickup_property_access.map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                {booking.delivery_property_access?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Delivery Access:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {booking.delivery_property_access.map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 sticky bottom-0 bg-gray-800">
          <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm">
            Close Job Sheet
          </button>
        </div>
      </div>
    </div>
  );
}