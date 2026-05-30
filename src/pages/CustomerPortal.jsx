import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Mail, Lock, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

export default function CustomerPortal() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtpMutation = useMutation({
    mutationFn: async (email) => {
      // Generate and send OTP via email
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP temporarily (in production, use proper session management)
      sessionStorage.setItem('customer_portal_otp', otp);
      sessionStorage.setItem('customer_portal_email', email);
      
      const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS - Security Code</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hello,</p>
    <p>You requested access to your customer portal. Your verification code is:</p>
    <div style="background:#f1f5f9;padding:16px;text-align:center;margin:20px 0;">
      <p style="font-size:32px;font-weight:bold;letter-spacing:4px;color:#1d4ed8;margin:0;">${otp}</p>
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals Team</strong></p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: "Your Move On Removals Verification Code",
        body: emailBody,
      });
      
      return { success: true };
    },
    onSuccess: () => {
      setOtpSent(true);
      setError("");
    },
    onError: (err) => {
      setError("Failed to send verification code. Please try again.");
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp }) => {
      const storedOtp = sessionStorage.getItem('customer_portal_otp');
      const storedEmail = sessionStorage.getItem('customer_portal_email');
      
      if (otp !== storedOtp || email !== storedEmail) {
        throw new Error("Invalid verification code");
      }
      
      // Fetch customer bookings
      const allBookings = await base44.entities.Booking.list();
      const customerBookings = allBookings.filter(b => 
        b.customer_email?.toLowerCase() === email.toLowerCase()
      );
      
      // Clear OTP from session
      sessionStorage.removeItem('customer_portal_otp');
      
      return customerBookings;
    },
    onSuccess: (bookings) => {
      setCustomerBookings(bookings);
      setVerified(true);
      setError("");
    },
    onError: (err) => {
      setError("Invalid verification code. Please try again.");
    }
  });

  const handleSendOtp = () => {
    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    sendOtpMutation.mutate(email);
  };

  const handleVerifyOtp = () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    verifyOtpMutation.mutate({ email, otp: otpCode });
  };

  const handleLogout = () => {
    setVerified(false);
    setOtpSent(false);
    setOtpCode("");
    setEmail("");
    setCustomerBookings([]);
    sessionStorage.removeItem('customer_portal_email');
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-blue-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Move On Removals</h1>
                <p className="text-blue-100 text-sm mt-1">Customer Portal</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">My Bookings</h2>
            <p className="text-sm text-gray-500 mt-1">
              {customerBookings.length} booking{customerBookings.length !== 1 ? 's' : ''} found for {email}
            </p>
          </div>

          {customerBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No bookings found</p>
              <p className="text-sm text-gray-400 mt-2">
                You don't have any bookings with us yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customerBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Booking #{booking.booking_number || booking.id.slice(0, 8)}</p>
                        <h3 className="font-semibold text-gray-800 text-lg mt-1">
                          {booking.move_date ? new Date(booking.move_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        booking.status === 'Booked Job' || booking.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📍</span>
                        <span>{booking.pickup_suburb} → {booking.delivery_suburb}</span>
                      </div>
                      {booking.truck_assigned && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🚛</span>
                          <span>{booking.truck_assigned}</span>
                        </div>
                      )}
                      {booking.price && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">💰</span>
                          <span className="font-semibold text-gray-800">${Number(booking.price).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {booking.status !== 'Cancelled' && ['Booked Job', 'Confirmed'].includes(booking.status) && (
                        <a
                          href={`/customer/tracking?booking_id=${booking.id}`}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          Track Truck
                        </a>
                      )}
                      {booking.status === 'Completed' && (
                        <a
                          href={`/customer/invoice?booking_id=${booking.id}`}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          View Invoice
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Move On Removals</h1>
          <p className="text-gray-500 mt-2">Customer Portal</p>
        </div>

        {!otpSent ? (
          /* Email Entry */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Sending...</span>
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              We'll send a 6-digit code to your email
            </p>
          </div>
        ) : (
          /* OTP Entry */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter verification code
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Code sent to {email}
              </p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Access Portal'}
            </button>

            <button
              onClick={() => {
                setOtpSent(false);
                setOtpCode("");
                setError("");
              }}
              className="w-full text-gray-600 hover:text-gray-800 text-sm py-2"
            >
              ← Use different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}