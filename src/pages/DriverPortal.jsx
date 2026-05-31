import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, Navigation, CheckCircle, Truck, Clock, Phone, Package, ChevronRight, Loader2, RefreshCw, Home, AlertCircle, Map, ClipboardList } from "lucide-react";
import DriverRouteMap from "../components/DriverRouteMap";
import DriverInventoryChecklist from "../components/DriverInventoryChecklist";
import SignaturePad from "../components/SignaturePad";

const STATUS_FLOW = [
  { key: "En Route to Pickup", label: "En Route to Pickup", emoji: "🚛", color: "bg-blue-500", light: "bg-blue-50 border-blue-200 text-blue-800" },
  { key: "At Pickup", label: "Arrived at Pickup", emoji: "📦", color: "bg-orange-500", light: "bg-orange-50 border-orange-200 text-orange-800" },
  { key: "En Route to Delivery", label: "En Route to Delivery", emoji: "🚚", color: "bg-purple-500", light: "bg-purple-50 border-purple-200 text-purple-800" },
  { key: "At Delivery", label: "Arrived at Delivery", emoji: "🏠", color: "bg-green-500", light: "bg-green-50 border-green-200 text-green-800" },
  { key: "Completed", label: "Job Completed", emoji: "✅", color: "bg-gray-500", light: "bg-gray-50 border-gray-200 text-gray-700" },
];

function getNextStatus(current) {
  const idx = STATUS_FLOW.findIndex(s => s.key === current);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

function getStatusStyle(key) {
  return STATUS_FLOW.find(s => s.key === key) || STATUS_FLOW[0];
}

export default function DriverPortal() {
  const queryClient = useQueryClient();
  const [truckName, setTruckName] = useState(() => localStorage.getItem("driver_truck") || "");
  const [setupDone, setSetupDone] = useState(() => !!localStorage.getItem("driver_truck"));
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [lastLocTime, setLastLocTime] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [checklistBooking, setChecklistBooking] = useState(null);
  const [signatureBooking, setSignatureBooking] = useState(null);
  const [savingSignature, setSavingSignature] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: bookings = [], isLoading: loadingBookings, refetch } = useQuery({
    queryKey: ["driver-bookings", today],
    queryFn: () => base44.entities.Booking.filter({ move_date: today }),
    enabled: setupDone,
    refetchInterval: 60000,
  });

  const { data: truckLocs = [] } = useQuery({
    queryKey: ["truck-locs"],
    queryFn: () => base44.entities.TruckLocation.filter({ truck_name: truckName }),
    enabled: setupDone && !!truckName,
    refetchInterval: 30000,
  });

  // Filter bookings for this truck
  const myBookings = bookings.filter(b =>
    truckName && (
      b.truck_assigned?.toLowerCase().includes(truckName.toLowerCase()) ||
      b.moving_truck_size?.toLowerCase().includes(truckName.toLowerCase()) ||
      b.truck_size?.toLowerCase().includes(truckName.toLowerCase())
    )
  );

  // Current truck location record
  const myTruckLoc = truckLocs[0];
  const activeStatus = myTruckLoc?.status || "Idle";

  const handleSetup = (e) => {
    e.preventDefault();
    if (!truckName.trim()) return;
    localStorage.setItem("driver_truck", truckName.trim());
    setSetupDone(true);
  };

  const sendLocationUpdate = async (status, bookingId) => {
    setLocating(true);
    setLocError("");
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocError("Geolocation not supported on this device.");
        setLocating(false);
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, speed } = pos.coords;
          await base44.functions.invoke("updateTruckLocation", {
            truck_name: truckName,
            booking_id: bookingId || activeJobId || "",
            latitude,
            longitude,
            speed: speed ? Math.round(speed * 3.6) : 0,
            status: status || activeStatus,
            last_update: new Date().toISOString(),
          });
          setLastLocTime(new Date());
          setLocating(false);
          queryClient.invalidateQueries({ queryKey: ["truck-locs"] });
          resolve({ latitude, longitude });
        },
        (err) => {
          setLocError("Could not get location. Please allow location access.");
          setLocating(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleSignatureSave = async (dataUrl) => {
    const booking = signatureBooking;
    setSignatureBooking(null);
    setSavingSignature(true);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `signature_${booking.id}.png`, { type: "image/png" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Booking.update(booking.id, { signature_url: file_url });
    setSavingSignature(false);
    await handleStatusUpdate(booking, "Completed");
  };

  const handleStatusUpdate = async (booking, newStatus) => {
    setUpdating(booking.id);
    setActiveJobId(booking.id);
    await sendLocationUpdate(newStatus, booking.id);
    // Also update booking status notification if applicable
    if (newStatus === "En Route to Delivery") {
      await base44.functions.invoke("triggerMilestoneNotification", {
        booking_id: booking.id,
        milestone: "dispatched",
      }).catch(() => {});
    }
    if (newStatus === "Completed") {
      await base44.functions.invoke("triggerMilestoneNotification", {
        booking_id: booking.id,
        milestone: "delivered",
      }).catch(() => {});
    }
    setUpdating(null);
    refetch();
  };

  // Setup screen
  if (!setupDone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Driver Portal</h1>
            <p className="text-gray-500 text-sm mt-1">Move On Australia</p>
          </div>
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Truck / Registration</label>
              <input
                type="text"
                value={truckName}
                onChange={(e) => setTruckName(e.target.value)}
                placeholder="e.g. Truck 1, ABC123"
                className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-4 py-3 text-base focus:outline-none"
                autoFocus
              />
            </div>
            <button type="submit" disabled={!truckName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-base disabled:opacity-40">
              Start My Shift
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Truck size={20} />
            </div>
            <div>
              <p className="font-bold text-base">{truckName}</p>
              <p className="text-gray-400 text-xs">{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-xl">
              <RefreshCw size={16} className="text-gray-300" />
            </button>
            <button onClick={() => { localStorage.removeItem("driver_truck"); setSetupDone(false); setTruckName(""); }}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-xl text-gray-300">
              Switch
            </button>
          </div>
        </div>

        {/* Current status pill */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mt-2 ${
          activeStatus === "Idle" ? "bg-gray-700 text-gray-300" : "bg-blue-600 text-white"
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {activeStatus}
          {lastLocTime && <span className="text-white/60 ml-1">· Updated {lastLocTime.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
      </div>

      {/* GPS Ping Button */}
      <div className="px-4 py-4 bg-gray-800 border-b border-gray-700">
        <button onClick={() => sendLocationUpdate(activeStatus, activeJobId)}
          disabled={locating}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 py-4 rounded-2xl font-bold text-base disabled:opacity-50 transition-all shadow-lg shadow-blue-900/50">
          {locating
            ? <><Loader2 size={20} className="animate-spin" /> Getting location...</>
            : <><Navigation size={20} /> Ping My Location to Office</>}
        </button>
        {locError && (
          <div className="flex items-center gap-2 mt-2 bg-red-900/40 border border-red-700 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{locError}</p>
          </div>
        )}
      </div>

      {/* Route Map */}
      {myBookings.length > 0 && (
        <div className="px-4 py-4 bg-gray-800 border-b border-gray-700">
          <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-3">
            <Map size={15} /> Today's Route
          </h2>
          <DriverRouteMap bookings={myBookings} />
        </div>
      )}

      {/* Jobs */}
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-white">Today's Jobs</h2>
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            {loadingBookings ? "..." : myBookings.length}
          </span>
        </div>

        {loadingBookings && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-blue-500" />
          </div>
        )}

        {!loadingBookings && myBookings.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle size={48} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No jobs assigned for today</p>
            <p className="text-gray-600 text-sm mt-1">Pull down to refresh</p>
          </div>
        )}

        {myBookings.map((booking, idx) => {
          const currentStatus = myTruckLoc?.booking_id === booking.id ? myTruckLoc?.status : null;
          const nextStatus = getNextStatus(currentStatus);
          const statusStyle = currentStatus ? getStatusStyle(currentStatus) : null;
          const isActive = updating === booking.id;
          const pickup = [booking.pickup_address, booking.pickup_suburb, booking.pickup_state].filter(Boolean).join(", ");
          const delivery = [booking.delivery_address, booking.delivery_suburb, booking.delivery_state].filter(Boolean).join(", ");

          return (
            <div key={booking.id} className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-lg">
              {/* Job header */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white text-base">
                      {booking.customer_first_name} {booking.customer_last_name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {booking.move_time || "Time TBC"} · Job #{idx + 1}
                      {booking.booking_number && ` · ${booking.booking_number}`}
                    </p>
                  </div>
                  {statusStyle && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle.color} text-white`}>
                      {statusStyle.emoji} {currentStatus}
                    </span>
                  )}
                  {!currentStatus && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-600 text-gray-300">
                      ⏳ Not started
                    </span>
                  )}
                </div>

                {booking.customer_mobile && (
                  <a href={`tel:${booking.customer_mobile}`}
                    className="inline-flex items-center gap-1.5 mt-2 text-blue-400 text-sm font-medium">
                    <Phone size={13} /> {booking.customer_mobile}
                  </a>
                )}
              </div>

              {/* Route */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div className="w-0.5 h-6 bg-gray-600" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Pickup</p>
                      <p className="text-sm text-white leading-snug">{pickup || "Address not set"}</p>
                      {booking.pickup_floor && <p className="text-xs text-gray-400">Floor: {booking.pickup_floor} {booking.pickup_elevator ? "· Elevator ✓" : "· No elevator"}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Delivery</p>
                      <p className="text-sm text-white leading-snug">{delivery || "Address not set"}</p>
                      {booking.delivery_floor && <p className="text-xs text-gray-400">Floor: {booking.delivery_floor} {booking.delivery_elevator ? "· Elevator ✓" : "· No elevator"}</p>}
                    </div>
                  </div>
                </div>

                {/* Job info chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {booking.truck_size && (
                    <span className="flex items-center gap-1 bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                      <Truck size={11} /> {booking.truck_size}
                    </span>
                  )}
                  {booking.num_movers && (
                    <span className="flex items-center gap-1 bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                      👷 {booking.num_movers} movers
                    </span>
                  )}
                  {booking.estimated_hours && (
                    <span className="flex items-center gap-1 bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                      <Clock size={11} /> ~{booking.estimated_hours} hrs
                    </span>
                  )}
                  {booking.items_to_move?.length > 0 && (
                    <span className="flex items-center gap-1 bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                      <Package size={11} /> {booking.items_to_move.length} items
                    </span>
                  )}
                </div>
              </div>

              {/* Status progress */}
              <div className="px-4 pb-2">
                <div className="flex gap-1">
                  {STATUS_FLOW.filter(s => s.key !== "Idle").map((s) => {
                    const idx2 = STATUS_FLOW.findIndex(x => x.key === s.key);
                    const curIdx = STATUS_FLOW.findIndex(x => x.key === currentStatus);
                    const done = curIdx >= idx2;
                    return (
                      <div key={s.key} className={`flex-1 h-1 rounded-full ${done ? s.color : "bg-gray-700"}`} />
                    );
                  })}
                </div>
              </div>

              {/* Inventory checklist button */}
              <div className="px-4 pb-2">
                <button
                  onClick={() => setChecklistBooking(booking)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 transition-all"
                >
                  <ClipboardList size={15} /> Pre-Move Inventory Check
                  {booking.items_to_move?.length > 0 && (
                    <span className="bg-gray-600 text-gray-300 text-xs px-1.5 py-0.5 rounded-full">{booking.items_to_move.length}</span>
                  )}
                </button>
              </div>

              {/* Status action button */}
              <div className="px-4 pb-4 pt-2">
                {nextStatus || !currentStatus ? (
                  <button
                    onClick={() => {
                      const target = nextStatus?.key || "En Route to Pickup";
                      if (target === "Completed") {
                        setSignatureBooking(booking);
                      } else {
                        handleStatusUpdate(booking, target);
                      }
                    }}
                    disabled={isActive}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                      nextStatus
                        ? `${nextStatus.color} hover:opacity-90 text-white shadow-lg`
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                    } disabled:opacity-50`}
                  >
                    {isActive
                      ? <><Loader2 size={18} className="animate-spin" /> Updating...</>
                      : <>{(nextStatus || STATUS_FLOW[0]).emoji} {nextStatus ? `Mark: ${nextStatus.label}` : "Start Job"} <ChevronRight size={16} /></>
                    }
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 bg-gray-700 py-3 rounded-xl text-gray-400 text-sm font-semibold">
                    <CheckCircle size={16} className="text-green-500" /> Job Completed
                  </div>
                )}
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="px-4 pb-4">
                  <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-xl px-3 py-2">
                    <p className="text-xs text-yellow-300 font-semibold mb-0.5">Notes</p>
                    <p className="text-xs text-yellow-200">{booking.notes}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pb-8 text-center">
        <p className="text-gray-700 text-xs">Move On Australia · Driver Portal</p>
      </div>

      {checklistBooking && (
        <DriverInventoryChecklist
          booking={checklistBooking}
          truckName={truckName}
          onClose={() => setChecklistBooking(null)}
        />
      )}

      {signatureBooking && (
        <SignaturePad
          customerName={`${signatureBooking.customer_first_name} ${signatureBooking.customer_last_name}`}
          bookingNumber={signatureBooking.booking_number || signatureBooking.id.slice(0, 8).toUpperCase()}
          onSave={handleSignatureSave}
          onCancel={() => setSignatureBooking(null)}
        />
      )}

      {savingSignature && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin text-blue-400" />
          <p className="text-white text-sm font-medium">Saving signature...</p>
        </div>
      )}
    </div>
  );
}