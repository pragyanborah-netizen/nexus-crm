import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Haversine formula to calculate distance between two coordinates
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch active bookings (today's jobs that are in progress)
    const today = new Date().toISOString().split('T')[0];
    const bookings = await base44.entities.Booking.list();
    
    const activeBookings = bookings.filter(b => {
      if (b.move_date !== today) return false;
      return ['Booked Job', 'Confirmed'].includes(b.status);
    });

    // Fetch latest truck locations
    const locations = await base44.entities.TruckLocation.list('-last_update', 100);
    
    // Get latest location per truck
    const latestLocations = new Map();
    locations.forEach(loc => {
      if (!latestLocations.has(loc.truck_name) || 
          new Date(loc.last_update) > new Date(latestLocations.get(loc.truck_name).last_update)) {
        latestLocations.set(loc.truck_name, loc);
      }
    });

    const scheduleAnalysis = [];

    for (const booking of activeBookings) {
      if (!booking.truck_assigned) continue;

      const truckLocation = latestLocations.get(booking.truck_assigned);
      if (!truckLocation) continue;

      // Calculate expected vs actual progress
      const moveTime = booking.move_time || '08:00';
      const estimatedHours = booking.estimated_hours || 4;
      const moveStart = new Date(`${booking.move_date}T${moveTime}`);
      const expectedEnd = new Date(moveStart.getTime() + estimatedHours * 60 * 60 * 1000);
      const now = new Date();

      // Calculate distance traveled (if we have pickup coordinates)
      let distanceToPickup = 0;
      let distanceToDelivery = 0;
      
      if (booking.pickup_suburb && booking.delivery_suburb) {
        // Approximate distance calculation (in production, use geocoding)
        distanceToPickup = truckLocation.status === 'At Pickup' ? 0 : 10; // Placeholder
        distanceToDelivery = truckLocation.status === 'At Delivery' ? 0 : 20; // Placeholder
      }

      // Determine if behind schedule
      const timeElapsed = (now - moveStart) / (1000 * 60); // minutes
      const expectedProgress = timeElapsed / (estimatedHours * 60);
      
      let status = 'On Schedule';
      let delayMinutes = 0;
      let isBehindSchedule = false;

      // Check if current time exceeds expected end time
      if (now > expectedEnd && truckLocation.status !== 'Completed') {
        isBehindSchedule = true;
        delayMinutes = Math.round((now - expectedEnd) / (1000 * 60));
        status = 'Behind Schedule';
      }

      // Check if truck is moving too slowly during transit
      if (truckLocation.status === 'En Route to Pickup' || truckLocation.status === 'En Route to Delivery') {
        if (truckLocation.speed < 20 && timeElapsed > 30) {
          isBehindSchedule = true;
          delayMinutes = Math.max(delayMinutes, 15);
          status = 'Running Late';
        }
      }

      // Calculate ETA
      let eta = null;
      if (truckLocation.status === 'At Pickup') {
        eta = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour estimate
      } else if (truckLocation.status === 'En Route to Delivery') {
        eta = new Date(now.getTime() + 45 * 60 * 1000); // 45 min estimate
      } else if (truckLocation.status === 'At Delivery') {
        eta = new Date(now.getTime() + 30 * 60 * 1000); // 30 min estimate
      }

      scheduleAnalysis.push({
        booking_id: booking.id,
        booking_number: booking.booking_number,
        customer_name: `${booking.customer_first_name} ${booking.customer_last_name}`,
        customer_email: booking.customer_email,
        customer_mobile: booking.customer_mobile,
        truck_name: booking.truck_assigned,
        scheduled_start: moveTime,
        expected_end: expectedEnd.toISOString(),
        current_status: truckLocation.status,
        truck_speed: truckLocation.speed,
        is_behind_schedule: isBehindSchedule,
        delay_minutes: delayMinutes,
        status: status,
        eta: eta ? eta.toISOString() : null,
        progress_percentage: Math.min(100, Math.round(expectedProgress * 100)),
      });
    }

    return Response.json({
      monitored_jobs: scheduleAnalysis,
      total_active: activeBookings.length,
      behind_schedule_count: scheduleAnalysis.filter(j => j.is_behind_schedule).length,
      on_schedule_count: scheduleAnalysis.filter(j => !j.is_behind_schedule).length,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Schedule monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});