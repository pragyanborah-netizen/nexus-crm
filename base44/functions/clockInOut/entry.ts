import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shift_type, latitude, longitude, booking_number, notes } = await req.json();

    if (!latitude || !longitude) {
      return Response.json({ error: 'Location coordinates are required' }, { status: 400 });
    }

    let locationName = 'Unknown';
    let geofenceVerified = false;
    let distanceFromJob = null;

    // If booking number provided, check geofence
    if (booking_number) {
      const bookings = await base44.entities.Booking.list();
      const booking = bookings.find(b => b.booking_number === booking_number);

      if (booking) {
        // Get pickup or delivery coordinates (using suburb as fallback)
        const pickupLat = booking.pickup_latitude;
        const pickupLng = booking.pickup_longitude;
        const deliveryLat = booking.delivery_latitude;
        const deliveryLng = booking.delivery_longitude;

        // If we have coordinates, calculate distance
        if (pickupLat && pickupLng) {
          const distanceToPickup = calculateDistance(latitude, longitude, pickupLat, pickupLng);
          distanceFromJob = distanceToPickup;
          
          // Geofence radius: 100 meters
          if (distanceToPickup <= 100) {
            geofenceVerified = true;
            locationName = `Near Pickup: ${booking.pickup_address || booking.pickup_suburb || 'Unknown'}`;
          } else {
            locationName = `Outside geofence (${Math.round(distanceToPickup)}m from pickup)`;
          }
        } else if (booking.pickup_suburb) {
          locationName = `Near ${booking.pickup_suburb}`;
        }

        if (deliveryLat && deliveryLng) {
          const distanceToDelivery = calculateDistance(latitude, longitude, deliveryLat, deliveryLng);
          if (distanceToDelivery < (distanceFromJob || 999999)) {
            distanceFromJob = distanceToDelivery;
            if (distanceToDelivery <= 100) {
              geofenceVerified = true;
              locationName = `Near Delivery: ${booking.delivery_address || booking.delivery_suburb || 'Unknown'}`;
            }
          }
        }
      }
    }

    // Create time clock record
    const timeClockData = {
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      shift_type,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      location_name: locationName,
      booking_number: booking_number || null,
      geofence_verified: geofenceVerified,
      distance_from_job: distanceFromJob,
      notes: notes || null,
    };

    const record = await base44.entities.TimeClock.create(timeClockData);

    return Response.json({
      success: true,
      record_id: record.id,
      geofence_verified: geofenceVerified,
      location_name: locationName,
      distance_from_job: distanceFromJob,
      message: `${shift_type} recorded successfully${geofenceVerified ? ' - Location verified ✓' : ' - Outside geofence ⚠'}`
    });

  } catch (error) {
    console.error('Time clock error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});