import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { booking_id, milestone } = await req.json();

    if (!booking_id || !milestone) {
      return Response.json({ error: 'Booking ID and milestone are required' }, { status: 400 });
    }

    // Trigger the notification
    const result = await base44.functions.invoke('sendMilestoneNotification', {
      booking_id,
      milestone,
    });

    return Response.json(result);

  } catch (error) {
    console.error('Manual notification trigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});