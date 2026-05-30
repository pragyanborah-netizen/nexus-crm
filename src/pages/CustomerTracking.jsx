import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { Truck, MapPin, Phone, Navigation, Clock, Package } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function CustomerTracking() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('booking_id');
  
  const [booking, setBooking] = useState(null);
  const [truckLocation, setTruckLocation] = useState(null);
  const [routeData, setRouteData] = useState(null);

  const { data: bookingData } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      return await base44.entities.Booking.get(bookingId);
    },
    enabled: !!bookingId,
  });

  const { data: locationData } = useQuery({
    queryKey: ['truck-location', bookingData?.truck_assigned],
    queryFn: async () => {
      if (!bookingData?.truck_assigned) return null;
      const locations = await base44.entities.TruckLocation.list('-last_update', 10);
      return locations.find(loc => loc.truck_name === bookingData.truck_assigned);
    },
    enabled: !!bookingData?.truck_assigned,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (bookingData) setBooking(bookingData);
  }, [bookingData]);

  useEffect(() => {
    if (locationData) {
      setTruckLocation(locationData);
      
      // Calculate route if truck is en route
      if (bookingId && (locationData.status === 'En Route to Pickup' || locationData.status === 'En Route to Delivery')) {
        base44.functions.invoke('calculateOptimalRoute', { booking_id: bookingId })
          .then(res => setRouteData(res.route))
          .catch(console.error);
      }
    }
  }, [locationData, bookingId]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const mapCenter = truckLocation 
    ? [truckLocation.latitude, truckLocation.longitude]
    : booking.pickup_suburb ? [-37.8136, 144.9631] : [-37.8136, 144.9631];

  const statusColors = {
    "En Route to Pickup": "bg-blue-100 text-blue-700",
    "At Pickup": "bg-purple-100 text-purple-700",
    "En Route to Delivery": "bg-orange-100 text-orange-700",
    "At Delivery": "bg-red-100 text-red-700",
    "Completed": "bg-green-100 text-green-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Track Your Move</h1>
              <p className="text-blue-100 text-sm mt-1">
                Booking #{booking.booking_number || booking.id.slice(0, 8)}
              </p>
            </div>
            <a
              href="/customer"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Back to Portal
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Booking Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Move Date</p>
              <p className="font-semibold text-gray-800">
                {booking.move_date ? new Date(booking.move_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'TBD'}
                {booking.move_time && ` at ${booking.move_time}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Route</p>
              <p className="font-semibold text-gray-800">
                {booking.pickup_suburb} → {booking.delivery_suburb}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Truck</p>
              <p className="font-semibold text-gray-800">{booking.truck_assigned || 'TBA'}</p>
            </div>
          </div>
        </div>

        {/* Truck Status */}
        {truckLocation && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Truck size={20} className="text-blue-600" />
                Live Truck Location
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[truckLocation.status] || 'bg-gray-100'}`}>
                {truckLocation.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Navigation size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Speed</p>
                  <p className="font-semibold text-gray-800">{truckLocation.speed} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Clock size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Update</p>
                  <p className="font-semibold text-gray-800">{new Date(truckLocation.last_update).toLocaleTimeString()}</p>
                </div>
              </div>
              {truckLocation.driver_name && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <MapPin size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Driver</p>
                    <p className="font-semibold text-gray-800">{truckLocation.driver_name}</p>
                  </div>
                </div>
              )}
              {truckLocation.driver_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Phone size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact</p>
                    <a href={`tel:${truckLocation.driver_phone}`} className="font-semibold text-blue-600 hover:underline">
                      Call Driver
                    </a>
                  </div>
                </div>
              )}
            </div>

            {routeData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Estimated Arrival</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Distance:</span>
                    <p className="font-semibold text-gray-800">{routeData.distance_km?.toFixed(1)} km</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Est. Time:</span>
                    <p className="font-semibold text-gray-800">{routeData.traffic_adjusted_duration} min</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Traffic:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      routeData.traffic_condition === 'heavy' ? 'bg-red-100 text-red-700' :
                      routeData.traffic_condition === 'moderate' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {routeData.traffic_condition}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">ETA:</span>
                    <p className="font-semibold text-gray-800">
                      {routeData.eta ? new Date(routeData.eta).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'Calculating...'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-[500px]">
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Truck Marker */}
              {truckLocation && (
                <Marker position={[truckLocation.latitude, truckLocation.longitude]}>
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-gray-800 mb-2">Your Truck</h3>
                      <p className="text-sm text-gray-600">{booking.truck_assigned}</p>
                      <p className="text-sm text-gray-600">Status: {truckLocation.status}</p>
                      <p className="text-xs text-gray-400 mt-2">Updated: {new Date(truckLocation.last_update).toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Route Line */}
              {routeData && routeData.polyline && (
                <Polyline
                  positions={routeData.polyline}
                  color={routeData.traffic_condition === 'heavy' ? '#ef4444' : routeData.traffic_condition === 'moderate' ? '#f59e0b' : '#10b981'}
                  weight={4}
                  opacity={0.7}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {!truckLocation && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mt-6">
            <Package size={40} className="mx-auto text-yellow-600 mb-3" />
            <p className="text-yellow-800 font-medium">Truck location not yet available</p>
            <p className="text-sm text-yellow-600 mt-1">
              The driver will update their location when they start your move. Please check back closer to your scheduled time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}