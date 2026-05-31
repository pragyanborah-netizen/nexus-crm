import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { action, token } = await req.json();
    
    if (!action || !token) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Decode token
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { employee_name, employee_email, booking_id, shift_type } = decoded;

    // Update booking with response
    if (booking_id) {
      const booking = await base44.entities.Booking.get(booking_id);
      
      if (booking) {
        const responseField = action === 'accept' ? 'roster_accepted' : 'roster_declined';
        const responseData = {
          [responseField]: true,
          roster_response_date: new Date().toISOString(),
          roster_responded_by: employee_name,
          roster_response_email: employee_email
        };

        // Track who accepted/declined
        if (action === 'accept') {
          responseData.roster_accepted_by = employee_name;
          responseData.roster_accepted_date = new Date().toISOString();
        } else {
          responseData.roster_declined_by = employee_name;
          responseData.roster_declined_date = new Date().toISOString();
        }

        await base44.entities.Booking.update(booking_id, responseData);
      }
    }

    // Also log the response in TimeLog or create a RosterResponse record if needed
    await base44.entities.TimeLog.create({
      employee_name,
      date: new Date().toISOString().split('T')[0],
      notes: `Roster ${action}ed for ${shift_type || 'shift'} - Booking: ${booking_id || 'N/A'}`,
      start_time: '00:00',
      end_time: '00:00',
      hours_worked: 0
    });

    return Response.json({ 
      success: true, 
      action, 
      employee_name,
      message: action === 'accept' ? 'Shift accepted successfully' : 'Shift declined'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});