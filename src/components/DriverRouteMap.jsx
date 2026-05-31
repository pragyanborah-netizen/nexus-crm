import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const makeIcon = (color, label) => L.divIcon({
  html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
    <span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:bold;">${label}</span>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
});

async function geocode(address) {
  if (!address || address === "TBC") return null;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", Australia")}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [points]);
  return null;
}

export default function DriverRouteMap({ bookings }) {
  const [coords, setCoords] = useState({}); // key: `${bookingId}-pickup` or `-delivery`
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCoords() {
      setLoading(true);
      const results = {};
      for (const b of bookings) {
        const pickupAddr = [b.pickup_address, b.pickup_suburb, b.pickup_state].filter(Boolean).join(", ");
        const deliveryAddr = [b.delivery_address, b.delivery_suburb, b.delivery_state].filter(Boolean).join(", ");
        if (pickupAddr) {
          const c = await geocode(pickupAddr);
          if (c) results[`${b.id}-pickup`] = c;
        }
        if (deliveryAddr) {
          const c = await geocode(deliveryAddr);
          if (c) results[`${b.id}-delivery`] = c;
        }
      }
      if (!cancelled) { setCoords(results); setLoading(false); }
    }
    if (bookings.length > 0) loadCoords();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [bookings.map(b => b.id).join(",")]);

  const allPoints = Object.values(coords);
  const defaultCenter = allPoints.length > 0 ? allPoints[0] : [-37.8136, 144.9631];

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-gray-900/60 rounded-2xl z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Loading map...
          </div>
        </div>
      )}
      <MapContainer center={defaultCenter} zoom={11} style={{ height: 320, borderRadius: 16 }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        {allPoints.length > 0 && <FitBounds points={allPoints} />}

        {bookings.map((b, idx) => {
          const pickupC = coords[`${b.id}-pickup`];
          const deliveryC = coords[`${b.id}-delivery`];
          const label = String(idx + 1);
          const name = `${b.customer_first_name} ${b.customer_last_name}`;
          return (
            <div key={b.id}>
              {pickupC && (
                <Marker position={pickupC} icon={makeIcon("#3b82f6", label + "P")}>
                  <Popup>
                    <strong>Pickup — Job {label}</strong><br />
                    {name}<br />
                    {[b.pickup_address, b.pickup_suburb].filter(Boolean).join(", ")}
                  </Popup>
                </Marker>
              )}
              {deliveryC && (
                <Marker position={deliveryC} icon={makeIcon("#22c55e", label + "D")}>
                  <Popup>
                    <strong>Delivery — Job {label}</strong><br />
                    {name}<br />
                    {[b.delivery_address, b.delivery_suburb].filter(Boolean).join(", ")}
                  </Popup>
                </Marker>
              )}
              {pickupC && deliveryC && (
                <Polyline
                  positions={[pickupC, deliveryC]}
                  pathOptions={{ color: "#3b82f6", weight: 3, dashArray: "6 6", opacity: 0.7 }}
                />
              )}
            </div>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="flex gap-4 mt-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-3 h-3 rounded-full bg-blue-500" /> Pickup
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-3 h-3 rounded-full bg-green-500" /> Delivery
        </div>
      </div>
    </div>
  );
}