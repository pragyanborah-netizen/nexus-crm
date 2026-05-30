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
      const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
      await base44.asServiceRole.entities.Booking.update(bookingId, {
        items_to_move: items || [],
      });

      // Trigger AI quote in background
      const pickup = [booking.pickup_address, booking.pickup_suburb, booking.pickup_state].filter(Boolean).join(', ') || 'Unknown';
      const delivery = [booking.delivery_address, booking.delivery_suburb, booking.delivery_state].filter(Boolean).join(', ') || 'Unknown';
      const itemsList = (items || []).map(i => '- ' + i).join('\n');

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY') || ''}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{
            role: 'system',
            content: 'You are a removalist quoting expert for Move On Australia. Respond only with valid JSON.'
          }, {
            role: 'user',
            content: `Quote this Australian removalist job based on the inventory.

Items to move:
${itemsList}

Pickup: ${pickup}
Delivery: ${delivery}
Customer type: ${booking.customer_type || 'Residential'}
${booking.pickup_floor ? 'Pickup floor: ' + booking.pickup_floor : ''}
${booking.delivery_floor ? 'Delivery floor: ' + booking.delivery_floor : ''}
${booking.distance_km ? 'Distance: ' + booking.distance_km + ' km' : ''}

Respond with JSON: { "truck_size": "Small (4t)|Medium (8t)|Large (12t)|Extra Large (14t)", "num_movers": number, "estimated_hours": number, "price": number, "reasoning": "brief explanation" }`
          }]
        })
      });

      if (openaiRes.ok) {
        const aiData = await openaiRes.json();
        const result = JSON.parse(aiData.choices[0].message.content);
        await base44.asServiceRole.entities.Booking.update(bookingId, {
          truck_size: result.truck_size || undefined,
          num_movers: result.num_movers || undefined,
          estimated_hours: result.estimated_hours || undefined,
          price: result.price || undefined,
          internal_notes: (booking.internal_notes ? booking.internal_notes + '\n\n' : '') + '[AI Quote] ' + (result.reasoning || ''),
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});