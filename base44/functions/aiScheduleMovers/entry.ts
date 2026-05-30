import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { target_date } = await req.json();

    if (!target_date) {
      return Response.json({ error: 'Missing required parameter: target_date' }, { status: 400 });
    }

    // Get all bookings for the target date
    const allBookings = await base44.entities.Booking.filter({ move_date: target_date });
    const pendingBookings = allBookings.filter(b => 
      ["Confirmed", "Booked Job", "Tentative Booking"].includes(b.status) && !b.truck_assigned
    );

    if (pendingBookings.length === 0) {
      return Response.json({ 
        message: 'No pending bookings for this date',
        assignments: []
      });
    }

    // Get all movers (users with role 'user' or specific mover role)
    const allUsers = await base44.entities.User.list();
    const movers = allUsers.filter(u => u.role === 'user' || u.role === 'mover');

    // Get availability requests to find who's unavailable
    const availability = await base44.entities.MoverAvailability.filter({ 
      status: 'Approved'
    });

    // Get historical performance data (completed jobs per mover)
    const completedBookings = await base44.entities.Booking.filter({ status: 'Completed' });
    
    // Calculate mover performance metrics
    const moverPerformance = {};
    movers.forEach(mover => {
      const completedJobs = completedBookings.filter(b => {
        // Assume mover email is in internal_notes or we track via created_by
        return b.created_by === mover.email;
      }).length;
      
      moverPerformance[mover.email] = {
        name: mover.full_name,
        email: mover.email,
        completed_jobs: completedJobs,
        performance_score: completedJobs > 0 ? Math.min(10, completedJobs / 5) : 5 // Score 0-10
      };
    });

    // Check who's unavailable on target_date
    const unavailableMovers = new Set();
    availability.forEach(req => {
      const start = new Date(req.start_date + 'T00:00:00');
      const end = new Date(req.end_date + 'T00:00:00');
      const target = new Date(target_date + 'T00:00:00');
      
      if (target >= start && target <= end) {
        unavailableMovers.add(req.employee_email);
      }
    });

    // Get available movers
    const availableMovers = movers.filter(m => !unavailableMovers.has(m.email));

    if (availableMovers.length === 0) {
      return Response.json({ 
        error: 'No available movers for this date',
        assignments: []
      });
    }

    // Prepare data for AI optimization
    const bookingData = pendingBookings.map(b => ({
      booking_id: b.id,
      booking_number: b.booking_number,
      pickup_suburb: b.pickup_suburb,
      delivery_suburb: b.delivery_suburb,
      truck_size: b.truck_size,
      num_movers_needed: b.num_movers || 2,
      estimated_hours: b.estimated_hours,
      customer_type: b.customer_type,
      items_count: (b.items_to_move || []).length
    }));

    const moverData = availableMovers.map(m => ({
      name: moverPerformance[m.email]?.name || m.full_name,
      email: m.email,
      performance_score: moverPerformance[m.email]?.performance_score || 5,
      completed_jobs: moverPerformance[m.email]?.completed_jobs || 0
    }));

    // Use AI to optimize assignments
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert removalist scheduling optimizer for Move On Australia. 
      
TASK: Assign movers to jobs optimally for ${target_date}.

CONSTRAINTS:
- Maximum 10 total movers available per day
- Each job requires the specified number of movers
- A mover can only work one job per time slot
- Prioritize high-performing movers for complex jobs
- Consider proximity (same suburb = better efficiency)

BOOKINGS TO ASSIGN:
${JSON.stringify(bookingData, null, 2)}

AVAILABLE MOVERS:
${JSON.stringify(moverData, null, 2)}

OPTIMIZATION CRITERIA:
1. Match mover count to job requirements
2. Assign higher performers to jobs with more items or complex requirements
3. Balance workload across all available movers
4. Keep teams together when possible for efficiency

Return ONLY a JSON array of assignments in this exact format:
[
  {
    "booking_id": "booking ID",
    "booking_number": "booking number",
    "assigned_movers": ["email1", "email2"],
    "truck_size": "truck size",
    "reasoning": "brief explanation"
  }
]`,
      response_json_schema: {
        type: "object",
        properties: {
          assignments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                booking_id: { type: "string" },
                booking_number: { type: "string" },
                assigned_movers: { 
                  type: "array", 
                  items: { type: "string" } 
                },
                truck_size: { type: "string" },
                reasoning: { type: "string" }
              },
              required: ["booking_id", "assigned_movers"]
            }
          }
        }
      }
    });

    const assignments = aiResult?.assignments || [];

    // Update bookings with assignments
    const updatedBookings = [];
    for (const assignment of assignments) {
      try {
        const booking = pendingBookings.find(b => b.id === assignment.booking_id);
        if (booking && assignment.assigned_movers.length > 0) {
          const updated = await base44.entities.Booking.update(booking.id, {
            truck_assigned: assignment.assigned_movers.join(', '),
            num_movers: assignment.assigned_movers.length,
            internal_notes: (booking.internal_notes || '') + 
              `\n[AI Assignment ${target_date}]: ${assignment.reasoning || 'Auto-assigned by AI scheduler'}`
          });
          updatedBookings.push(updated);
        }
      } catch (error) {
        console.error(`Failed to update booking ${assignment.booking_id}:`, error);
      }
    }

    return Response.json({
      target_date,
      total_bookings: pendingBookings.length,
      assigned_bookings: updatedBookings.length,
      assignments: assignments.map(a => ({
        ...a,
        status: updatedBookings.find(b => b.id === a.booking_id) ? 'assigned' : 'failed'
      })),
      available_movers_count: availableMovers.length,
      unavailable_movers_count: unavailableMovers.size
    });
  } catch (error) {
    console.error('Error in AI scheduling:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});