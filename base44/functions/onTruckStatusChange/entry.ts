import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for webhook handling
    const { data: truckLocationData, event } = await req.json();
    
    if (!truckLocationData || !event) {
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const bookingId = truckLocationData.booking_id;
    if (!bookingId) {
      return Response.json({ error: 'No booking ID in truck location data' }, { status: 400 });
    }

    // Fetch booking details
    const booking = await base44.entities.Booking.get(bookingId);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const newStatus = truckLocationData.status;
    const oldStatus = truckLocationData.old_status;

    // Check for milestone transitions
    let milestone = null;

    // Dispatched: Status changed to "En Route to Pickup"
    if (newStatus === 'En Route to Pickup' && oldStatus !== 'En Route to Pickup') {
      milestone = 'dispatched';
    }

    // Nearby: Truck is en route and within estimated 15 min of pickup (simplified logic)
    if (newStatus === 'En Route to Pickup' && !booking.notification_nearby_sent) {
      // Could add distance/speed calculation here for more accuracy
      // For now, we'll trigger based on status + time since dispatch
      const dispatchTime = booking.notification_dispatched_date;
      if (dispatchTime) {
        const minutesSinceDispatch = (new Date() - new Date(dispatchTime)) / (1000 * 60);
        // Trigger "nearby" notification 15-20 minutes after dispatch (adjust based on typical route)
        if (minutesSinceDispatch >= 15 && minutesSinceDispatch <= 25) {
          milestone = 'nearby';
        }
      }
    }

    // Delivered: Status changed to "Completed" or "At Delivery"
    if ((newStatus === 'Completed' || newStatus === 'At Delivery') && 
        oldStatus !== 'Completed' && oldStatus !== 'At Delivery') {
      milestone = 'delivered';
    }

    // Send notification if milestone detected
    if (milestone) {
      try {
        await base44.functions.invoke('sendMilestoneNotification', {
          booking_id: bookingId,
          milestone,
        });
        
        console.log(`Milestone notification sent: ${milestone} for booking ${booking.booking_number}`);
      } catch (error) {
        console.error(`Failed to send ${milestone} notification:`, error);
      }
    }

    return Response.json({ success: true, milestone, booking_id: bookingId });

  } catch (error) {
    console.error('Truck status automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});