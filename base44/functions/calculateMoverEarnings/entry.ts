import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mover_email, month, year } = await req.json();

    if (!mover_email || !month || !year) {
      return Response.json({ error: 'Missing required parameters: mover_email, month, year' }, { status: 400 });
    }

    // Get all completed bookings
    const bookings = await base44.entities.Booking.filter({ status: 'Completed' });
    
    // Filter bookings for the specified month/year that have this mover assigned
    const monthlyBookings = bookings.filter(b => {
      const moveDate = new Date(b.move_date + 'T00:00:00');
      const bookingMonth = moveDate.getMonth() + 1; // 1-12
      const bookingYear = moveDate.getFullYear();
      
      // Check if booking is in the requested month/year
      // and if mover is assigned (via truck_assigned or num_movers)
      return bookingMonth === parseInt(month) && 
             bookingYear === parseInt(year) &&
             b.truck_assigned && 
             b.num_movers;
    });

    // Calculate earnings (simplified: assume equal split among movers on each job)
    const earnings = monthlyBookings.map(b => {
      const totalEarnings = b.price || 0;
      const numMovers = b.num_movers || 2;
      const earningsPerMover = totalEarnings / numMovers;
      
      return {
        booking_number: b.booking_number,
        move_date: b.move_date,
        customer: `${b.customer_first_name} ${b.customer_last_name}`,
        total_job_value: totalEarnings,
        num_movers: numMovers,
        mover_earnings: earningsPerMover
      };
    });

    const totalMonthlyEarnings = earnings.reduce((sum, e) => sum + e.mover_earnings, 0);
    const jobCount = earnings.length;

    return Response.json({
      mover_email,
      month,
      year,
      total_earnings: totalMonthlyEarnings,
      job_count: jobCount,
      earnings_breakdown: earnings
    });
  } catch (error) {
    console.error('Error calculating earnings:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});