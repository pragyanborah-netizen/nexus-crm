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

    const { booking_id, employee_email, employee_name, action, signature, latitude, longitude } = await req.json();

    if (!booking_id || !employee_email || !action) {
      return Response.json({ error: 'Booking ID, employee email, and action are required' }, { status: 400 });
    }

    if (!signature) {
      return Response.json({ error: 'Customer signature is required' }, { status: 400 });
    }

    // Get booking details
    const booking = await base44.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    let locationName = 'Job Site';
    let geofenceVerified = false;
    let distanceFromJob = null;

    // Check geofence if coordinates provided
    if (latitude && longitude) {
      const pickupLat = booking.pickup_latitude;
      const pickupLng = booking.pickup_longitude;
      const deliveryLat = booking.delivery_latitude;
      const deliveryLng = booking.delivery_longitude;

      if (pickupLat && pickupLng) {
        const distanceToPickup = calculateDistance(latitude, longitude, pickupLat, pickupLng);
        distanceFromJob = distanceToPickup;
        
        if (distanceToPickup <= 100) {
          geofenceVerified = true;
          locationName = `Pickup: ${booking.pickup_address || booking.pickup_suburb || 'Unknown'}`;
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
            locationName = `Delivery: ${booking.delivery_address || booking.delivery_suburb || 'Unknown'}`;
          }
        }
      }
    }

    const now = new Date();
    const timeLogData = {
      employee_name: employee_name || user.full_name || employee_email,
      employee_email: employee_email,
      date: now.toISOString().split('T')[0],
      start_time: action === 'clock_in' ? now.toTimeString().split(' ')[0].slice(0, 5) : undefined,
      end_time: action === 'clock_out' ? now.toTimeString().split(' ')[0].slice(0, 5) : undefined,
      booking_number: booking.booking_number || booking_id,
      notes: `${action === 'clock_in' ? 'Clock In' : 'Clock Out'} - Signature captured. ${geofenceVerified ? 'Location verified.' : ''}`,
      signature: signature,
      action_type: action,
      location_name: locationName,
      geofence_verified: geofenceVerified,
      latitude: latitude || null,
      longitude: longitude || null,
    };

    // Create or update time log
    const timeLog = await base44.entities.TimeLog.create(timeLogData);

    return Response.json({
      success: true,
      record_id: timeLog.id,
      geofence_verified: geofenceVerified,
      location_name: locationName,
      message: `${action === 'clock_in' ? 'Clock in' : 'Clock out'} recorded successfully${geofenceVerified ? ' - Location verified ✓' : ''}`
    });

  } catch (error) {
    console.error('Time clock error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});