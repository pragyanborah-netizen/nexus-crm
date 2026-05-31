import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Truck, RefreshCw, Navigation, Clock } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLORS = {
  "En Route to Pickup": "#3b82f6",
  "At Pickup": "#f97316",
  "En Route to Delivery": "#a855f7",
  "At Delivery": "#22c55e",
  "Completed": "#6b7280",
  "Idle": "#6b7280",
};

function makeTruckIcon(status, truckName) {
  const color = STATUS_COLORS[status] || "#6b7280";
  const initials = truckName?.slice(0, 2).toUpperCase() || "T";
  return L.divIcon({
    html: `<div style="position:relative;">
      <div style="background:${color};width:44px;height:44px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;flex-direction:column;">
        <span style="font-size:10px;font-weight:bold;color:white;line-height:1;">${initials}</span>
        <span style="font-size:8px;color:rgba(255,255,255,0.8);line-height:1;">🚛</span>
      </div>
      <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:${color};border-radius:50%;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;opacity:0.75;"></div>
    </div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -48],
  });
}

function AutoRefreshMap({ trucks }) {
  const map = useMap();
  useEffect(() => {
    if (trucks.length > 0) {
      const validTrucks = trucks.filter(t => t.latitude && t.longitude);
      if (validTrucks.length > 1) {
        const bounds = L.latLngBounds(validTrucks.map(t => [t.latitude, t.longitude]));
        map.fitBounds(bounds, { padding: [60, 60] });
      } else if (validTrucks.length === 1) {
        map.setView([validTrucks[0].latitude, validTrucks[0].longitude], 13);
      }
    }
  }, []);
  return null;
}

function timeSince(dateStr) {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function AdminTruckMap() {
  const { data: truckLocs = [], isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["all-truck-locs"],
    queryFn: () => base44.entities.TruckLocation.list(),
    refetchInterval: 15000,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-today-map"],
    queryFn: () => base44.entities.Booking.filter({ move_date: new Date().toISOString().split("T")[0] }),
  });

  const activeTrucks = truckLocs.filter(t => t.latitude && t.longitude);
  const defaultCenter = [-37.8136, 144.9631];

  const getBookingForTruck = (truckLoc) => {
    if (!truckLoc.booking_id) return null;
    return bookings.find(b => b.id === truckLoc.booking_id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Live Truck Map</h1>
          <p className="text-sm text-gray-500">
            {activeTrucks.length} truck{activeTrucks.length !== 1 ? "s" : ""} with location data
            {dataUpdatedAt ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <MapContainer center={defaultCenter} zoom={10} style={{ height: 520 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {activeTrucks.length > 0 && <AutoRefreshMap trucks={activeTrucks} />}

          {activeTrucks.map((truck) => {
            const booking = getBookingForTruck(truck);
            return (
              <Marker
                key={truck.id}
                position={[truck.latitude, truck.longitude]}
                icon={makeTruckIcon(truck.status, truck.truck_name)}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 4 }}>{truck.truck_name}</div>
                    <div style={{ color: STATUS_COLORS[truck.status] || "#666", fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                      {truck.status || "Idle"}
                    </div>
                    {truck.driver_name && <div style={{ fontSize: 12 }}>Driver: {truck.driver_name}</div>}
                    {truck.speed > 0 && <div style={{ fontSize: 12 }}>Speed: {truck.speed} km/h</div>}
                    {truck.last_update && (
                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                        Updated: {timeSince(truck.last_update)}
                      </div>
                    )}
                    {booking && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee" }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {booking.customer_first_name} {booking.customer_last_name}
                        </div>
                        <div style={{ fontSize: 11, color: "#555" }}>
                          {[booking.pickup_suburb, "→", booking.delivery_suburb].filter(Boolean).join(" ")}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Fleet status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && (
          <div className="col-span-3 text-center py-8 text-gray-400">Loading truck data...</div>
        )}
        {!isLoading && truckLocs.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <Navigation size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No truck locations yet</p>
            <p className="text-sm mt-1">Locations appear when drivers ping from the Driver Portal</p>
          </div>
        )}
        {truckLocs.map((truck) => {
          const booking = getBookingForTruck(truck);
          const statusColor = STATUS_COLORS[truck.status] || "#6b7280";
          const isRecent = truck.last_update && (Date.now() - new Date(truck.last_update).getTime()) < 300000;
          return (
            <div key={truck.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: statusColor }}>
                    <Truck size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{truck.truck_name}</p>
                    {truck.driver_name && <p className="text-xs text-gray-500">{truck.driver_name}</p>}
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${isRecent ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRecent ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  {isRecent ? "Live" : "Stale"}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                  <span className="text-sm font-medium" style={{ color: statusColor }}>{truck.status || "Idle"}</span>
                </div>
                {truck.speed > 0 && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Navigation size={11} /> {truck.speed} km/h
                  </p>
                )}
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Clock size={11} /> {timeSince(truck.last_update)}
                </p>
                {booking && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-700">{booking.customer_first_name} {booking.customer_last_name}</p>
                    <p className="text-xs text-gray-400">{[booking.pickup_suburb, "→", booking.delivery_suburb].filter(Boolean).join(" ")}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}