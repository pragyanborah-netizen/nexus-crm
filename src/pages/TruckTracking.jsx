import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Truck, MapPin, Phone, Navigation, Clock, AlertCircle, RefreshCw, Search, Filter, Route } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in React
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STATUS_COLORS = {
  "En Route to Pickup": "text-blue-600 bg-blue-100 border-blue-300",
  "At Pickup": "text-purple-600 bg-purple-100 border-purple-300",
  "En Route to Delivery": "text-orange-600 bg-orange-100 border-orange-300",
  "At Delivery": "text-red-600 bg-red-100 border-red-300",
  "Completed": "text-green-600 bg-green-100 border-green-300",
  "Idle": "text-gray-600 bg-gray-100 border-gray-300",
};

const STATUS_MARKERS = {
  "En Route to Pickup": "🚛 → 📍",
  "At Pickup": "🏠 Loading",
  "En Route to Delivery": "🚛 → 🏠",
  "At Delivery": "🏠 Unloading",
  "Completed": "✅ Done",
  "Idle": "⏸️ Idle",
};

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom(), { duration: 1 });
    }
  }, [center, map]);
  return null;
}

export default function TruckTracking() {
  const queryClient = useQueryClient();
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showOptimizedRoutes, setShowOptimizedRoutes] = useState(false);
  const [routeData, setRouteData] = useState({});

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["truck-locations"],
    queryFn: async () => {
      const all = await base44.entities.TruckLocation.list("-last_update", 100);
      // Get latest location per truck
      const latest = new Map();
      all.forEach(loc => {
        if (!latest.has(loc.truck_name) || new Date(loc.last_update) > new Date(latest.get(loc.truck_name).last_update)) {
          latest.set(loc.truck_name, loc);
        }
      });
      return Array.from(latest.values());
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks-list"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["active-bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const calculateRouteMutation = useMutation({
    mutationFn: async (bookingId) => {
      const response = await base44.functions.invoke('calculateOptimalRoute', { booking_id: bookingId });
      return response.data;
    },
    onSuccess: (data) => {
      setRouteData(prev => ({ ...prev, [data.booking_id]: data.route }));
    }
  });

  const filteredLocations = locations.filter(loc => {
    const statusMatch = filterStatus === "All" || loc.status === filterStatus;
    const searchMatch = !searchQuery || 
      loc.truck_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.booking_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const activeTrucks = filteredLocations.filter(loc => 
    ["En Route to Pickup", "At Pickup", "En Route to Delivery", "At Delivery"].includes(loc.status)
  );

  const getBookingDetails = (bookingId) => {
    return bookings.find(b => b.id === bookingId);
  };

  const getTruckIcon = (status) => {
    return L.divIcon({
      html: `<div style="font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${STATUS_MARKERS[status] || "🚛"}</div>`,
      className: "custom-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const centerMap = selectedTruck 
    ? [selectedTruck.latitude, selectedTruck.longitude]
    : activeTrucks.length > 0
      ? [activeTrucks[0].latitude, activeTrucks[0].longitude]
      : [-37.8136, 144.9631]; // Melbourne CBD

  const handleToggleRoute = (loc) => {
    if (loc.booking_id) {
      if (routeData[loc.booking_id]) {
        // Remove route
        const newData = { ...routeData };
        delete newData[loc.booking_id];
        setRouteData(newData);
      } else {
        // Calculate route
        calculateRouteMutation.mutate(loc.booking_id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Live Truck Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time location monitoring with AI-optimized routes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOptimizedRoutes(!showOptimizedRoutes)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              showOptimizedRoutes ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            <Route size={16} />
            AI Routes: {showOptimizedRoutes ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              autoRefresh ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
            Auto-refresh: {autoRefresh ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["truck-locations"] })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <RefreshCw size={16} />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{activeTrucks.length}</p>
              <p className="text-xs text-gray-500">Active Trucks</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Navigation size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {locations.filter(l => l.status === "En Route to Pickup" || l.status === "En Route to Delivery").length}
              </p>
              <p className="text-xs text-gray-500">In Transit</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {locations.filter(l => l.status === "At Pickup" || l.status === "At Delivery").length}
              </p>
              <p className="text-xs text-gray-500">At Locations</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{trucks.length}</p>
              <p className="text-xs text-gray-500">Total Fleet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search trucks, drivers, bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter size={18} />
            <span>{filteredLocations.length} truck{filteredLocations.length !== 1 ? 's' : ''} shown</span>
          </div>
        </div>
      </div>

      {/* Main Content - Map and List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="h-[600px]">
            <MapContainer
              center={centerMap}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={centerMap} />
              
              {/* Render optimized routes */}
              {showOptimizedRoutes && Object.entries(routeData).map(([bookingId, route]) => (
                route.polyline && route.polyline.length > 0 && (
                  <Polyline
                    key={`route-${bookingId}`}
                    positions={route.polyline}
                    color={route.traffic_condition === 'heavy' ? '#ef4444' : route.traffic_condition === 'moderate' ? '#f59e0b' : '#10b981'}
                    weight={4}
                    opacity={0.7}
                    dashArray={route.traffic_condition === 'heavy' ? '5, 5' : null}
                  />
                )
              ))}
              
              {filteredLocations.map((loc) => {
                const hasRoute = routeData[loc.booking_id];
                return (
                <Marker
                  key={loc.truck_name}
                  position={[loc.latitude, loc.longitude]}
                  icon={getTruckIcon(loc.status)}
                  eventHandlers={{
                    click: () => {
                      setSelectedTruck(loc);
                      if (showOptimizedRoutes && loc.booking_id) {
                        handleToggleRoute(loc);
                      }
                    },
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-gray-800 mb-2">{loc.truck_name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[loc.status]}`}>
                            {loc.status}
                          </span>
                        </div>
                        {loc.driver_name && (
                          <p className="text-gray-600">👤 {loc.driver_name}</p>
                        )}
                        {loc.driver_phone && (
                          <p className="text-gray-600">📞 {loc.driver_phone}</p>
                        )}
                        {loc.booking_number && (
                          <p className="text-gray-600">📋 {loc.booking_number}</p>
                        )}
                        {loc.speed > 0 && (
                          <p className="text-gray-600">🚀 {loc.speed} km/h</p>
                        )}
                        <p className="text-gray-400 text-xs">
                          Updated: {new Date(loc.last_update).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Truck List */}
        <div className="bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[600px]">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Truck size={18} className="text-blue-600" />
            Truck Status
          </h2>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p>Loading truck locations...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertCircle size={40} className="mx-auto mb-3 opacity-50" />
              <p>No trucks found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((loc) => {
                const booking = getBookingDetails(loc.booking_id);
                const isSelected = selectedTruck?.truck_name === loc.truck_name;
                
                return (
                  <div
                    key={loc.truck_name}
                    onClick={() => setSelectedTruck(loc)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Truck size={18} className="text-gray-600" />
                        <p className="font-semibold text-gray-800">{loc.truck_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[loc.status]}`}>
                        {loc.status.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      {loc.driver_name && (
                        <div className="flex items-center gap-2">
                          <MapPin size={12} />
                          <span>{loc.driver_name}</span>
                        </div>
                      )}
                      {loc.driver_phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} />
                          <span>{loc.driver_phone}</span>
                        </div>
                      )}
                      {loc.booking_number && (
                        <div className="flex items-center gap-2">
                          <Clock size={12} />
                          <span>{loc.booking_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-400">
                        <Navigation size={12} />
                        <span>{loc.speed} km/h • Updated {new Date(loc.last_update).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Truck Details */}
      {selectedTruck && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Truck size={18} className="text-blue-600" />
              {selectedTruck.truck_name} - Live Details
            </h2>
            <button
              onClick={() => setSelectedTruck(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Driver Information</h3>
              <div className="text-sm text-gray-600">
                {selectedTruck.driver_name && <p>👤 {selectedTruck.driver_name}</p>}
                {selectedTruck.driver_phone && (
                  <a href={`tel:${selectedTruck.driver_phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                    <Phone size={14} /> {selectedTruck.driver_phone}
                  </a>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Current Status</h3>
              <div className="text-sm text-gray-600">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[selectedTruck.status]}`}>
                  {selectedTruck.status}
                </span>
                <p className="mt-1">🚀 Speed: {selectedTruck.speed} km/h</p>
                <p>🧭 Heading: {selectedTruck.heading}°</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Location</h3>
              <div className="text-sm text-gray-600">
                <p>📍 Lat: {selectedTruck.latitude.toFixed(6)}</p>
                <p>📍 Lng: {selectedTruck.longitude.toFixed(6)}</p>
                <p className="text-gray-400 text-xs">
                  Updated: {new Date(selectedTruck.last_update).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {selectedTruck.booking_number && (
            <>
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Booking Information</h3>
                {(() => {
                  const booking = getBookingDetails(selectedTruck.booking_id);
                  if (!booking) return null;
                  return (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Customer:</span>
                        <p className="font-medium">{booking.customer_first_name} {booking.customer_last_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Pickup:</span>
                        <p className="font-medium">{booking.pickup_suburb || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Delivery:</span>
                        <p className="font-medium">{booking.delivery_suburb || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[booking.status]}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* AI Route Information */}
              {showOptimizedRoutes && routeData[selectedTruck.booking_id] && (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Route size={16} />
                    AI-Optimized Route
                  </h3>
                  {(() => {
                    const route = routeData[selectedTruck.booking_id];
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Distance:</span>
                          <span className="font-medium text-gray-800">{route.distance_km?.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Est. Duration:</span>
                          <span className="font-medium text-gray-800">{route.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Traffic:</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            route.traffic_condition === 'heavy' ? 'bg-red-100 text-red-700' :
                            route.traffic_condition === 'moderate' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {route.traffic_condition?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Traffic-Adjusted ETA:</span>
                          <span className="font-medium text-gray-800">{route.traffic_adjusted_duration} min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Expected Arrival:</span>
                          <span className="font-medium text-gray-800">
                            {route.eta ? new Date(route.eta).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                        </div>
                        {route.waypoints && route.waypoints.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-xs text-purple-700 font-medium mb-2">Route Waypoints:</p>
                            <ul className="space-y-1">
                              {route.waypoints.map((wp, idx) => (
                                <li key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px]">{idx + 1}</span>
                                  {wp.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}