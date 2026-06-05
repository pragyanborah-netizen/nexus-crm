import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get Twilio credentials from secrets
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('Twilio credentials not configured');
      return Response.json({ error: 'SMS service not configured' }, { status: 500 });
    }

    const { data } = await req.json();
    
    if (!data || !data.id) {
      return Response.json({ error: 'No booking data provided' }, { status: 400 });
    }

    const booking = data;

    // Check if customer has mobile number
    if (!booking.customer_mobile) {
      console.log('No mobile number for booking', booking.id);
      return Response.json({ skipped: 'No mobile number' });
    }

    // Check if SMS reminder was already sent
    if (booking.sms_reminder_sent) {
      console.log('SMS already sent for booking', booking.id);
      return Response.json({ skipped: 'SMS already sent' });
    }

    // Format the SMS message
    const moveDate = booking.move_date ? new Date(booking.move_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'your scheduled date';
    const moveTime = booking.move_time || 'as scheduled';
    
    const message = `Hi ${booking.customer_first_name}, this is a reminder from Move On Australia about your move scheduled for ${moveDate} at ${moveTime}. Our team will contact you to confirm arrival details. Reply HELP for support. Thank you!`;

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', twilioPhone);
    formData.append('To', booking.customer_mobile);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Twilio API error:', error);
      throw new Error(error.message || 'Failed to send SMS');
    }

    const result = await response.json();
    console.log(`SMS sent to ${booking.customer_mobile} for booking ${booking.id}:`, result.sid);

    // Mark SMS as sent by updating the booking
    await base44.entities.Booking.update(booking.id, { sms_reminder_sent: true });

    return Response.json({ 
      success: true, 
      sms_sent: booking.customer_mobile,
      booking_id: booking.id,
      twilio_sid: result.sid
    });
  } catch (error) {
    console.error('Error sending SMS reminder:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});