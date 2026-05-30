import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access payroll
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { start_date, end_date, mover_email } = await req.json();

    if (!start_date || !end_date) {
      return Response.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    // Fetch completed bookings in date range
    const bookings = await base44.entities.Booking.list();
    const completedBookings = bookings.filter(b => {
      if (b.status !== 'Completed') return false;
      const moveDate = new Date(b.move_date);
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      return moveDate >= startDate && moveDate <= endDate;
    });

    // Fetch time logs in date range
    const timeLogs = await base44.entities.TimeLog.list();
    const relevantTimeLogs = timeLogs.filter(t => {
      const logDate = new Date(t.date);
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      return logDate >= startDate && logDate <= endDate;
    });

    // Fetch surveys for performance bonuses
    const surveys = await base44.entities.Survey.list();

    // Calculate payroll per mover
    const payrollData = {};

    // Process bookings to get mover assignments and earnings
    completedBookings.forEach(booking => {
      const movers = [
        booking.agent_booked,
        booking.agent_inquired,
        booking.agent_quoted
      ].filter(Boolean);

      movers.forEach(mover => {
        if (!payrollData[mover]) {
          payrollData[mover] = {
            mover_name: mover,
            jobs_completed: 0,
            total_hours: 0,
            base_wage: 0,
            performance_bonus: 0,
            total_wage: 0,
            bookings: []
          };
        }

        const moverShare = booking.price / movers.length;
        payrollData[mover].jobs_completed++;
        payrollData[mover].base_wage += moverShare * 0.3; // 30% of job value as base wage
        payrollData[mover].bookings.push({
          booking_number: booking.booking_number,
          date: booking.move_date,
          customer: `${booking.customer_first_name} ${booking.customer_last_name}`,
          job_value: booking.price,
          mover_share: moverShare * 0.3
        });
      });
    });

    // Process time logs
    relevantTimeLogs.forEach(log => {
      const mover = log.employee_name;
      if (!mover) return;

      if (!payrollData[mover]) {
        payrollData[mover] = {
          mover_name: mover,
          jobs_completed: 0,
          total_hours: 0,
          base_wage: 0,
          performance_bonus: 0,
          total_wage: 0,
          bookings: []
        };
      }

      payrollData[mover].total_hours += log.hours_worked || 0;
    });

    // Calculate performance bonuses based on survey ratings
    surveys.forEach(survey => {
      if (!survey.overall_rating || !survey.survey_submitted_date) return;

      const surveyDate = new Date(survey.survey_submitted_date);
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (surveyDate < startDate || surveyDate > endDate) return;

      // Find the booking and associated movers
      const booking = completedBookings.find(b => b.id === survey.booking_id);
      if (!booking) return;

      const movers = [
        booking.agent_booked,
        booking.agent_inquired,
        booking.agent_quoted
      ].filter(Boolean);

      movers.forEach(mover => {
        if (!payrollData[mover]) return;

        // Performance bonus: $10 per rating point above 4.0
        if (survey.overall_rating >= 4.0) {
          const bonus = (survey.overall_rating - 4.0) * 10;
          payrollData[mover].performance_bonus += bonus;
        }

        // Perfect 5-star bonus: additional $25
        if (survey.overall_rating === 5) {
          payrollData[mover].performance_bonus += 25;
        }
      });
    });

    // Calculate total wages and add hourly component
    Object.keys(payrollData).forEach(mover => {
      const p = payrollData[mover];
      // Add hourly wage: $25/hour for logged hours
      const hourlyWage = p.total_hours * 25;
      p.hourly_wage = hourlyWage;
      p.total_wage = p.base_wage + p.hourly_wage + p.performance_bonus;
    });

    // Convert to array and sort by total wage
    const payrollArray = Object.values(payrollData).sort((a, b) => b.total_wage - a.total_wage);

    // Calculate summary statistics
    const summary = {
      total_payroll: payrollArray.reduce((sum, p) => sum + p.total_wage, 0),
      total_jobs: payrollArray.reduce((sum, p) => sum + p.jobs_completed, 0),
      total_hours: payrollArray.reduce((sum, p) => sum + p.total_hours, 0),
      total_base_wages: payrollArray.reduce((sum, p) => sum + p.base_wage, 0),
      total_hourly_wages: payrollArray.reduce((sum, p) => sum + (p.hourly_wage || 0), 0),
      total_bonuses: payrollArray.reduce((sum, p) => sum + p.performance_bonus, 0),
      mover_count: payrollArray.length
    };

    return Response.json({
      payroll_data: payrollArray,
      summary,
      period: { start_date, end_date },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Payroll calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});