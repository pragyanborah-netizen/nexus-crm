import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await req.json();
    
    if (!data || !data.start_date || !data.end_date) {
      return Response.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    // Create availability request
    const availability = await base44.entities.MoverAvailability.create({
      employee_name: user.full_name,
      employee_email: user.email,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason || '',
      status: 'Pending',
      requested_date: new Date().toISOString(),
    });

    return Response.json({ 
      success: true, 
      availability,
      message: 'Availability request submitted for approval' 
    });
  } catch (error) {
    console.error('Error submitting availability request:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});