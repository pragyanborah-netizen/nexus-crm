import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get tomorrow's date in Australia/Melbourne timezone
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log('Sending SMS reminders for move date:', tomorrowStr);

    // Get all confirmed bookings for tomorrow
    const bookings = await base44.entities.Booking.filter({
      move_date: tomorrowStr,
      status: { $in: ["Confirmed", "Booked Job"] },
      sms_reminder_sent: { $ne: true }
    });

    if (!bookings || bookings.length === 0) {
      console.log('No bookings found for tomorrow that need SMS reminders');
      return Response.json({ 
        success: true, 
        message: 'No SMS reminders needed',
        date: tomorrowStr 
      });
    }

    console.log(`Found ${bookings.length} bookings to send SMS reminders for`);

    const results = [];
    
    // Send SMS for each booking
    for (const booking of bookings) {
      try {
        // Skip if no mobile number
        if (!booking.customer_mobile) {
          console.log(`Skipping booking ${booking.id}: No mobile number`);
          results.push({ booking_id: booking.id, status: 'skipped', reason: 'no_mobile' });
          continue;
        }

        // Call the sendSmsReminder function
        const result = await base44.functions.invoke('sendSmsReminder', { data: booking });
        
        if (result.data?.success) {
          results.push({ 
            booking_id: booking.id, 
            customer: `${booking.customer_first_name} ${booking.customer_last_name}`,
            mobile: booking.customer_mobile,
            status: 'sent',
            twilio_sid: result.data.twilio_sid
          });
        } else {
          results.push({ 
            booking_id: booking.id, 
            status: 'failed', 
            reason: result.data?.error || 'Unknown error' 
          });
        }
      } catch (error) {
        console.error(`Error sending SMS for booking ${booking.id}:`, error);
        results.push({ 
          booking_id: booking.id, 
          status: 'error', 
          reason: error.message 
        });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;

    console.log(`SMS Reminder Summary: ${sent} sent, ${skipped} skipped, ${failed} failed`);

    return Response.json({
      success: true,
      date: tomorrowStr,
      total_bookings: bookings.length,
      sent,
      skipped,
      failed,
      results
    });
  } catch (error) {
    console.error('Error in daily SMS reminder job:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});