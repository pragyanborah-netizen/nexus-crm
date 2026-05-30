import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Clock, MapPin, Users, CheckCircle, AlertCircle, Navigation, 
  Calendar, User, Phone, Mail, Search, Filter, RefreshCw,
  Play, Square, Coffee, Briefcase
} from "lucide-react";

const SHIFT_TYPES = {
  "Clock In": { icon: Play, color: "text-green-600 bg-green-100 border-green-300" },
  "Clock Out": { icon: Square, color: "text-red-600 bg-red-100 border-red-300" },
  "Break Start": { icon: Coffee, color: "text-orange-600 bg-orange-100 border-orange-300" },
  "Break End": { icon: Briefcase, color: "text-blue-600 bg-blue-100 border-blue-300" },
};

export default function TimeClockApp() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("mover"); // "mover" or "dispatcher"
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [selectedShiftType, setSelectedShiftType] = useState("Clock In");
  const [bookingNumber, setBookingNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Get current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          setLocationError("Unable to get your location. Please enable location permissions.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: timeClocks = [] } = useQuery({
    queryKey: ["timeclocks"],
    queryFn: () => base44.entities.TimeClock.list("-timestamp", 500),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-all"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const clockMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('clockInOut', {
        ...data,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timeclocks"] });
      alert(data.message);
      setNotes("");
      setBookingNumber("");
    },
    onError: (error) => {
      alert('Error: ' + error.message);
    },
  });

  const handleClockAction = () => {
    if (!currentLocation) {
      alert("Please wait for location to be detected...");
      return;
    }

    clockMutation.mutate({
      shift_type: selectedShiftType,
      booking_number: bookingNumber || null,
      notes: notes || null,
    });
  };

  // Calculate current shift status for user
  const getUserCurrentStatus = (email) => {
    const userClocks = timeClocks
      .filter(tc => tc.employee_email === email)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (userClocks.length === 0) return { status: "Not Clocked In", lastUpdate: null };
    
    const lastClock = userClocks[0];
    let status = "Unknown";
    
    if (lastClock.shift_type === "Clock In") status = "On Shift";
    else if (lastClock.shift_type === "Clock Out") status = "Off Shift";
    else if (lastClock.shift_type === "Break Start") status = "On Break";
    else if (lastClock.shift_type === "Break End") status = "On Shift";
    
    return {
      status,
      lastUpdate: lastClock.timestamp,
      location: lastClock.location_name,
      verified: lastClock.geofence_verified,
    };
  };

  // Get all active movers for dispatcher view
  const getActiveMovers = () => {
    const movers = {};
    
    timeClocks.forEach(tc => {
      if (!movers[tc.employee_email]) {
        movers[tc.employee_email] = {
          name: tc.employee_name,
          email: tc.employee_email,
          status: "Unknown",
          lastUpdate: null,
          location: null,
          verified: false,
        };
      }
      
      const lastClock = movers[tc.employee_email];
      if (new Date(tc.timestamp) > new Date(lastClock.lastUpdate || 0)) {
        if (tc.shift_type === "Clock In" || tc.shift_type === "Break End") {
          lastClock.status = "On Shift";
        } else if (tc.shift_type === "Clock Out") {
          lastClock.status = "Off Shift";
        } else if (tc.shift_type === "Break Start") {
          lastClock.status = "On Break";
        }
        lastClock.lastUpdate = tc.timestamp;
        lastClock.location = tc.location_name;
        lastClock.verified = tc.geofence_verified;
      }
    });
    
    return Object.values(movers);
  };

  const activeMovers = getActiveMovers();
  const onShiftCount = activeMovers.filter(m => m.status === "On Shift").length;
  const onBreakCount = activeMovers.filter(m => m.status === "On Break").length;
  const offShiftCount = activeMovers.filter(m => m.status === "Off Shift").length;

  const userStatus = currentUser ? getUserCurrentStatus(currentUser.email) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Time Clock</h1>
          <p className="text-sm text-gray-500 mt-1">
            {view === "mover" ? "Clock in/out and track your shifts" : "Monitor team attendance and locations"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("mover")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === "mover" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Mover View
          </button>
          <button
            onClick={() => setView("dispatcher")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === "dispatcher" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Dispatcher View
          </button>
        </div>
      </div>

      {view === "mover" ? (
        /* MOVER VIEW */
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Current Status Card */}
          {userStatus && (
            <div className={`rounded-lg shadow p-6 border-l-4 ${
              userStatus.status === "On Shift" ? "border-green-500 bg-green-50" :
              userStatus.status === "On Break" ? "border-orange-500 bg-orange-50" :
              "border-gray-500 bg-gray-50"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Your Current Status</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    userStatus.status === "On Shift" ? "text-green-700" :
                    userStatus.status === "On Break" ? "text-orange-700" :
                    "text-gray-700"
                  }`}>
                    {userStatus.status}
                  </p>
                  {userStatus.lastUpdate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last update: {new Date(userStatus.lastUpdate).toLocaleString()}
                    </p>
                  )}
                  {userStatus.location && (
                    <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                      <MapPin size={14} />
                      {userStatus.location}
                      {userStatus.verified && <CheckCircle size={14} className="text-green-600" />}
                    </p>
                  )}
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  userStatus.status === "On Shift" ? "bg-green-500" :
                  userStatus.status === "On Break" ? "bg-orange-500" :
                  "bg-gray-500"
                }`}>
                  <Clock size={32} className="text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Clock Action Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Clock In/Out
            </h2>

            {locationError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle size={18} />
                  <p className="text-sm font-medium">{locationError}</p>
                </div>
              </div>
            ) : !currentLocation ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <RefreshCw size={18} className="animate-spin" />
                  <p className="text-sm font-medium">Getting your location...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <CheckCircle size={18} />
                <p className="text-sm font-medium">Location detected (±{Math.round(currentLocation.accuracy)}m accuracy)</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Shift Type Selection */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SHIFT_TYPES).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedShiftType(type)}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                          selectedShiftType === type
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon size={18} className={config.color.split(" ")[0]} />
                        <span className="text-sm font-medium">{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Booking Number (optional) */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Booking Number (optional, for geofencing)
                </label>
                <input
                  type="text"
                  value={bookingNumber}
                  onChange={(e) => setBookingNumber(e.target.value)}
                  placeholder="e.g., BK-001234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                {bookingNumber && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin size={12} />
                    Location will be verified against job site (100m radius)
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleClockAction}
                disabled={!currentLocation || clockMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {clockMutation.isPending ? (
                  <><RefreshCw size={18} className="animate-spin" /> Processing...</>
                ) : (
                  <><Clock size={18} /> {selectedShiftType}</>
                )}
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          {currentUser && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                Your Recent Activity
              </h2>
              <div className="space-y-3">
                {timeClocks
                  .filter(tc => tc.employee_email === currentUser.email)
                  .slice(0, 10)
                  .map((tc) => {
                    const config = SHIFT_TYPES[tc.shift_type] || { color: "text-gray-600 bg-gray-100" };
                    const Icon = config.icon || Clock;
                    return (
                      <div key={tc.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{tc.shift_type}</p>
                          <p className="text-sm text-gray-600">{new Date(tc.timestamp).toLocaleString()}</p>
                          {tc.location_name && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin size={12} />
                              {tc.location_name}
                              {tc.geofence_verified && (
                                <CheckCircle size={12} className="text-green-600" />
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {timeClocks.filter(tc => tc.employee_email === currentUser.email).length === 0 && (
                  <p className="text-center text-gray-400 py-4">No activity yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DISPATCHER VIEW */
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{activeMovers.length}</p>
                  <p className="text-xs text-gray-500">Total Movers</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{onShiftCount}</p>
                  <p className="text-xs text-gray-500">On Shift</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Coffee size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{onBreakCount}</p>
                  <p className="text-xs text-gray-500">On Break</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center">
                  <Square size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{offShiftCount}</p>
                  <p className="text-xs text-gray-500">Off Shift</p>
                </div>
              </div>
            </div>
          </div>

          {/* Movers List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Team Status Dashboard
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {activeMovers.map((mover) => (
                <div key={mover.email} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        mover.status === "On Shift" ? "bg-green-100" :
                        mover.status === "On Break" ? "bg-orange-100" :
                        "bg-gray-100"
                      }`}>
                        <User size={20} className={
                          mover.status === "On Shift" ? "text-green-600" :
                          mover.status === "On Break" ? "text-orange-600" :
                          "text-gray-600"
                        } />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{mover.name}</p>
                        <p className="text-sm text-gray-500">{mover.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            mover.status === "On Shift" ? "bg-green-100 text-green-700" :
                            mover.status === "On Break" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {mover.status}
                          </span>
                          {mover.verified && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle size={12} />
                              Location verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {mover.lastUpdate ? new Date(mover.lastUpdate).toLocaleString() : "Never"}
                      </p>
                      {mover.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 justify-end">
                          <MapPin size={12} />
                          {mover.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {activeMovers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No movers have clocked in yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}