import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data } = await req.json();
    
    if (!data || !data.id || !data.status) {
      return Response.json({ error: 'Request ID and status are required' }, { status: 400 });
    }

    if (!['Approved', 'Rejected'].includes(data.status)) {
      return Response.json({ error: 'Status must be Approved or Rejected' }, { status: 400 });
    }

    // Update the availability request
    const updated = await base44.entities.MoverAvailability.update(data.id, {
      status: data.status,
      admin_notes: data.admin_notes || '',
    });

    return Response.json({ 
      success: true, 
      availability: updated,
      message: `Availability request ${data.status.toLowerCase()}` 
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});