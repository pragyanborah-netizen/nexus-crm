import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { week_start, week_end, notes } = await req.json();
    if (!week_start || !week_end) {
      return Response.json({ error: 'week_start and week_end required' }, { status: 400 });
    }

    // Fetch all data in parallel
    const [employees, availability, bookings, timeLogs, surveys] = await Promise.all([
      base44.asServiceRole.entities.Employee.list(),
      base44.asServiceRole.entities.MoverAvailability.list(),
      base44.asServiceRole.entities.Booking.list(),
      base44.asServiceRole.entities.TimeLog.list(),
      base44.asServiceRole.entities.Survey.list(),
    ]);

    const activeEmployees = employees.filter(e => e.active !== false);

    // Filter bookings in the target week
    const weekBookings = bookings.filter(b => {
      const d = b.move_date || b.moving_date || b.packing_date;
      return d && d >= week_start && d <= week_end;
    });

    // Approved leave in week
    const weekLeave = availability.filter(a => {
      return a.status === 'Approved' &&
        !(a.end_date < week_start || a.start_date > week_end);
    });

    // Performance: avg survey ratings per employee name, recent 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentSurveys = surveys.filter(s => s.move_date >= ninetyDaysAgo);
    const perfMap = {};
    for (const s of recentSurveys) {
      // surveys are linked to bookings; use booking_number to match employees later
      // We'll include them as general quality signal per booking
    }

    // Hours per employee in last 30 days (workload balance)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentLogs = timeLogs.filter(t => t.date >= thirtyDaysAgo);
    const hoursMap = {};
    for (const log of recentLogs) {
      if (!hoursMap[log.employee_name]) hoursMap[log.employee_name] = 0;
      hoursMap[log.employee_name] += log.hours_worked || 0;
    }

    // Avg survey rating overall (proxy for quality)
    const avgRating = recentSurveys.length > 0
      ? (recentSurveys.reduce((s, r) => s + (r.overall_rating || 0), 0) / recentSurveys.length).toFixed(1)
      : 'N/A';

    // Summarise employee data for AI
    const employeeSummaries = activeEmployees.map(e => {
      const name = `${e.first_name} ${e.last_name}`;
      const onLeave = weekLeave.filter(l => l.employee_name === name || l.employee_email === e.email);
      const leaveDates = onLeave.map(l => `${l.start_date} to ${l.end_date}`).join(', ');
      const recentHours = (hoursMap[name] || 0).toFixed(1);
      return {
        name,
        role: e.role || 'Mover',
        employment_type: e.employment_type || 'Casual',
        pay_rate: e.pay_rate,
        approved_leave_this_week: leaveDates || 'None',
        hours_last_30_days: recentHours,
      };
    });

    // Summarise bookings needing staff
    const bookingSummaries = weekBookings.map(b => ({
      date: b.move_date || b.moving_date,
      booking_number: b.booking_number || b.id?.slice(0, 8),
      service: b.service_type || (b.selected_services?.join(', ')) || 'Move',
      num_movers_required: b.num_movers || b.moving_num_people || b.packing_num_people || 2,
      truck_size: b.truck_size || b.moving_truck_size,
      estimated_hours: b.estimated_hours || b.moving_hours || b.packing_hours || 4,
      pickup_suburb: b.pickup_suburb,
      delivery_suburb: b.delivery_suburb,
      time: b.move_time || b.moving_time || 'TBC',
    }));

    const prompt = `
You are an expert workforce rostering AI for "Move On Australia", a professional moving company.

Your task is to produce an OPTIMAL weekly shift schedule for the week: ${week_start} to ${week_end}.

## EMPLOYEES AVAILABLE
${JSON.stringify(employeeSummaries, null, 2)}

## BOOKINGS NEEDING STAFF THIS WEEK
${JSON.stringify(bookingSummaries, null, 2)}

## PERFORMANCE CONTEXT
- Average recent customer survey rating: ${avgRating}/5
- Employees with high hours (last 30 days) should be given lighter loads to prevent burnout.
- Drivers must be assigned to jobs with truck requirements. Supervisors should be assigned to large or complex moves.

## ADMIN NOTES
${notes || 'None provided.'}

## YOUR INSTRUCTIONS
1. Assign employees to each booking based on:
   - Their ROLE (Drivers must drive, Movers can pack/move, Supervisors oversee complex jobs)
   - Leave: NEVER assign someone on approved leave
   - Workload fairness: spread hours evenly; employees with high hours recently should get fewer shifts
   - Employment type: prefer Full-time and Part-time over Casual for large jobs
2. After assigning bookings, fill the remaining weekdays with suggested STANDBY/AVAILABLE shifts for employees not assigned to a booking.
3. Flag any days where you cannot fill the required staffing and explain WHY.
4. Provide a brief reasoning paragraph at the end.

Respond with ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "week": "${week_start} to ${week_end}",
  "summary": "1-2 sentence overview",
  "assignments": [
    {
      "date": "YYYY-MM-DD",
      "booking_number": "string or null",
      "shift_type": "Assigned Job | Standby | Day Off",
      "employees": [
        { "name": "string", "role": "string", "note": "string" }
      ],
      "warnings": ["string"]
    }
  ],
  "staffing_gaps": ["string"],
  "reasoning": "string"
}
`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          week: { type: 'string' },
          summary: { type: 'string' },
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                booking_number: { type: 'string' },
                shift_type: { type: 'string' },
                employees: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      role: { type: 'string' },
                      note: { type: 'string' },
                    },
                  },
                },
                warnings: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          staffing_gaps: { type: 'array', items: { type: 'string' } },
          reasoning: { type: 'string' },
        },
      },
    });

    return Response.json({ roster: result, meta: { bookings: bookingSummaries.length, employees: employeeSummaries.length } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});