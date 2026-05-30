import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { truck_name, latitude, longitude, speed, heading, status, booking_id, booking_number, driver_name, driver_phone } = await req.json();

    if (!truck_name || latitude === undefined || longitude === undefined) {
      return Response.json({ error: 'Truck name, latitude, and longitude are required' }, { status: 400 });
    }

    // Create location record
    const locationData = {
      truck_name,
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      status: status || 'Idle',
      last_update: new Date().toISOString(),
      booking_id: booking_id || null,
      booking_number: booking_number || null,
      driver_name: driver_name || null,
      driver_phone: driver_phone || null,
    };

    const location = await base44.entities.TruckLocation.create(locationData);

    return Response.json({ 
      success: true, 
      location_id: location.id,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Location update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});