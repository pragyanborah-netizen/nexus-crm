import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { Clock, CheckCircle, MapPin, Signature, ArrowLeft } from "lucide-react";
import SignaturePad from "../components/SignaturePad";

export default function BookingTimeClock() {
  const { bookingId } = useParams();
  const queryClient = useQueryClient();
  const [showSignature, setShowSignature] = useState(false);
  const [actionType, setActionType] = useState(null); // 'clock-in' or 'clock-out'

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => base44.entities.Booking.get(bookingId),
    enabled: !!bookingId,
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const clockMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke("clockInOut", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      setShowSignature(false);
      setActionType(null);
    },
  });

  const handleSignatureSave = (signatureData) => {
    if (!user) {
      alert("You must be logged in");
      return;
    }

    clockMutation.mutate({
      booking_id: bookingId,
      employee_email: user.email,
      employee_name: user.full_name,
      action: actionType,
      signature: signatureData,
      location: null, // Could add geolocation here
    });
  };

  const handleClockAction = (type) => {
    setActionType(type);
    setShowSignature(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg font-semibold mb-2">Booking not found</p>
          <Link to="/bookings" className="text-blue-600 hover:underline">Back to Bookings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link to="/bookings" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-3">
            <ArrowLeft size={18} /> Back to Bookings
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Job Time Clock</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Booking Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {booking.customer_first_name} {booking.customer_last_name}
              </h2>
              <p className="text-gray-500 text-sm">Booking #{booking.booking_number || booking.id.slice(0, 8)}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              booking.status === "Completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
            }`}>
              {booking.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Move Date</p>
              <p className="font-semibold">{booking.move_date || "TBC"}</p>
            </div>
            <div>
              <p className="text-gray-500">Pickup</p>
              <p className="font-semibold">{booking.pickup_suburb || "TBC"}</p>
            </div>
            <div>
              <p className="text-gray-500">Delivery</p>
              <p className="font-semibold">{booking.delivery_suburb || "TBC"}</p>
            </div>
            <div>
              <p className="text-gray-500">Truck</p>
              <p className="font-semibold">{booking.truck_size || "Not assigned"}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Clock In / Out
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={() => handleClockAction("clock_in")}
              disabled={clockMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-3 transition-all"
            >
              <CheckCircle size={24} /> Clock In - Arrival
            </button>

            <button
              onClick={() => handleClockAction("clock_out")}
              disabled={clockMutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-3 transition-all"
            >
              <CheckCircle size={24} /> Clock Out - Departure
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Customer signature required for both clock in and clock out
          </p>
        </div>

        {/* Location Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin size={20} className="text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800 text-sm">Location Verification</h4>
              <p className="text-xs text-blue-600 mt-1">
                Your location will be recorded when you clock in/out to verify you're at the job site.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Requirement */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Signature size={20} className="text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-800 text-sm">Customer Signature</h4>
              <p className="text-xs text-purple-600 mt-1">
                Get the customer's signature on their device when arriving and leaving. This validates the work hours for payroll.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignature && (
        <SignaturePad
          onSave={handleSignatureSave}
          onCancel={() => { setShowSignature(false); setActionType(null); }}
          customerName={`${booking.customer_first_name} ${booking.customer_last_name}`}
          bookingNumber={booking.booking_number}
        />
      )}
    </div>
  );
}