import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, bookingId, items } = body;

    if (!bookingId) {
      return Response.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    if (action === 'get') {
      const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
      if (!booking) {
        return Response.json({ error: 'Booking not found' }, { status: 404 });
      }
      return Response.json({
        customer_first_name: booking.customer_first_name,
        customer_last_name: booking.customer_last_name,
        move_date: booking.move_date,
        pickup_suburb: booking.pickup_suburb,
        delivery_suburb: booking.delivery_suburb,
        items_to_move: booking.items_to_move || [],
      });
    }

    if (action === 'save') {
      await base44.asServiceRole.entities.Booking.update(bookingId, {
        items_to_move: items || [],
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});