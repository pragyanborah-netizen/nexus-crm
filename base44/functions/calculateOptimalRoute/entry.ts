import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Haversine formula to calculate distance
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple route optimization using nearest neighbor heuristic
function optimizeRoute(stops, startLocation) {
  const optimized = [];
  const unvisited = [...stops];
  let current = startLocation;

  while (unvisited.length > 0) {
    let nearest = null;
    let nearestIndex = -1;
    let minDistance = Infinity;

    unvisited.forEach((stop, idx) => {
      const dist = haversineDistance(
        current.lat,
        current.lng,
        stop.latitude,
        stop.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = stop;
        nearestIndex = idx;
      }
    });

    if (nearest) {
      optimized.push(nearest);
      unvisited.splice(nearestIndex, 1);
      current = { lat: nearest.latitude, lng: nearest.longitude };
    }
  }

  return optimized;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, truck_name } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Fetch booking details
    const booking = await base44.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Use AI to geocode addresses and get traffic-aware route
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a routing expert for Melbourne, Australia. Based on these addresses, provide approximate coordinates and route optimization.

Pickup Address: ${[booking.pickup_address, booking.pickup_suburb, booking.pickup_state, booking.pickup_postcode].filter(Boolean).join(', ')}
Delivery Address: ${[booking.delivery_address, booking.delivery_suburb, booking.delivery_state, booking.delivery_postcode].filter(Boolean).join(', ')}
Current Truck Location: ${booking.truck_assigned || 'Unknown'}

Provide JSON response with:
{
  "pickup_coords": {"lat": number, "lng": number, "address": string},
  "delivery_coords": {"lat": number, "lng": number, "address": string},
  "estimated_distance_km": number,
  "estimated_duration_minutes": number,
  "traffic_condition": "light" | "moderate" | "heavy",
  "route_optimized": boolean,
  "waypoints": array of {lat, lng, description} for complex routes
}`,
      response_json_schema: {
        type: "object",
        properties: {
          pickup_coords: {
            type: "object",
            properties: {
              lat: { type: "number" },
              lng: { type: "number" },
              address: { type: "string" }
            }
          },
          delivery_coords: {
            type: "object",
            properties: {
              lat: { type: "number" },
              lng: { type: "number" },
              address: { type: "string" }
            }
          },
          estimated_distance_km: { type: "number" },
          estimated_duration_minutes: { type: "number" },
          traffic_condition: { type: "string", enum: ["light", "moderate", "heavy"] },
          route_optimized: { type: "boolean" },
          waypoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" },
                description: { type: "string" }
              }
            }
          }
        }
      },
      add_context_from_internet: true
    });

    // Generate route polyline points (simplified for visualization)
    const routePoints = [];
    const steps = 20;
    
    if (aiResult.pickup_coords && aiResult.delivery_coords) {
      for (let i = 0; i <= steps; i++) {
        const lat = aiResult.pickup_coords.lat + (aiResult.delivery_coords.lat - aiResult.pickup_coords.lat) * (i / steps);
        const lng = aiResult.pickup_coords.lng + (aiResult.delivery_coords.lng - aiResult.pickup_coords.lng) * (i / steps);
        routePoints.push([lat, lng]);
      }
    }

    // Calculate traffic-adjusted ETA
    const trafficConditions = {
      light: 1.0,
      moderate: 1.3,
      heavy: 1.7
    };
    const trafficMultiplier = trafficConditions[aiResult.traffic_condition] || 1.3;

    const adjustedDuration = Math.round(aiResult.estimated_duration_minutes * trafficMultiplier);
    const eta = new Date(Date.now() + adjustedDuration * 60 * 1000);

    return Response.json({
      booking_id,
      booking_number: booking.booking_number,
      truck_name: booking.truck_assigned,
      route: {
        pickup: aiResult.pickup_coords,
        delivery: aiResult.delivery_coords,
        waypoints: aiResult.waypoints || [],
        polyline: routePoints,
        distance_km: aiResult.estimated_distance_km,
        duration_minutes: aiResult.estimated_duration_minutes,
        traffic_adjusted_duration: adjustedDuration,
        traffic_condition: aiResult.traffic_condition,
        eta: eta.toISOString(),
        optimized: aiResult.route_optimized
      },
      calculated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Route calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});