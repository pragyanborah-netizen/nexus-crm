import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { start_date, end_date, adjustments = [] } = await req.json();
    if (!start_date || !end_date) return Response.json({ error: 'Start date and end date are required' }, { status: 400 });

    const startDt = new Date(start_date);
    const endDt = new Date(end_date);
    // include full end day
    endDt.setHours(23, 59, 59, 999);

    // Fetch all data in parallel
    const [employees, allBookings, allTimeLogs, allSurveys] = await Promise.all([
      base44.entities.Employee.list(),
      base44.entities.Booking.list(),
      base44.entities.TimeLog.list(),
      base44.entities.Survey.list(),
    ]);

    // Build employee lookup by full name (case-insensitive)
    const employeeByName = {};
    employees.forEach(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.trim().toLowerCase();
      employeeByName[fullName] = emp;
    });

    // Filter to period
    const completedBookings = allBookings.filter(b => {
      if (b.status !== 'Completed') return false;
      const d = new Date(b.move_date);
      return d >= startDt && d <= endDt;
    });

    const timeLogs = allTimeLogs.filter(t => {
      const d = new Date(t.date);
      return d >= startDt && d <= endDt;
    });

    const surveys = allSurveys.filter(s => {
      if (!s.survey_submitted_date) return false;
      const d = new Date(s.survey_submitted_date);
      return d >= startDt && d <= endDt;
    });

    // Init payroll per employee from Employee records
    const payrollData = {};

    const initEmployee = (name) => {
      if (payrollData[name]) return;
      const emp = employeeByName[name.toLowerCase()] || null;
      payrollData[name] = {
        mover_name: name,
        employee_id: emp?.id || null,
        pay_rate: emp?.pay_rate || null, // null = use fallback
        employment_type: emp?.employment_type || 'Casual',
        role: emp?.role || '',
        jobs_completed: 0,
        total_hours: 0,
        base_wage: 0,          // from job value share
        hourly_wage: 0,        // hours × pay_rate
        performance_bonus: 0,
        adjustments_total: 0,
        adjustment_items: [],
        total_wage: 0,
        bookings: [],
        time_log_entries: [],
      };
    };

    // Process completed bookings — split share among assigned movers/agents
    completedBookings.forEach(booking => {
      const names = [...new Set([
        booking.agent_booked,
        booking.agent_inquired,
        booking.agent_quoted,
      ].filter(Boolean))];

      names.forEach(name => {
        initEmployee(name);
        const p = payrollData[name];
        const jobValue = Number(booking.price) || 0;
        const share = jobValue / names.length;
        const moverShare = share * 0.3; // 30% of job value as base wage
        p.jobs_completed++;
        p.base_wage += moverShare;
        p.bookings.push({
          booking_number: booking.booking_number || booking.id.slice(0, 8),
          date: booking.move_date,
          customer: `${booking.customer_first_name} ${booking.customer_last_name}`,
          job_value: jobValue,
          mover_share: moverShare,
        });
      });
    });

    // Process time logs — use employee pay_rate if available, else $25/hr fallback
    timeLogs.forEach(log => {
      const name = log.employee_name;
      if (!name) return;
      initEmployee(name);
      const p = payrollData[name];
      const hrs = Number(log.hours_worked) || 0;
      p.total_hours += hrs;
      // Use employee pay rate from Employee records, fallback to $25/hr
      const rate = p.pay_rate || 25;
      p.hourly_wage += hrs * rate;
      p.time_log_entries.push({
        date: log.date,
        hours: hrs,
        rate,
        amount: hrs * rate,
        booking_ref: log.booking_number || '',
        notes: log.notes || '',
      });
    });

    // Performance bonuses from surveys
    surveys.forEach(survey => {
      if (!survey.overall_rating) return;
      const booking = completedBookings.find(b => b.id === survey.booking_id);
      if (!booking) return;
      const names = [...new Set([booking.agent_booked, booking.agent_inquired, booking.agent_quoted].filter(Boolean))];
      names.forEach(name => {
        if (!payrollData[name]) return;
        if (survey.overall_rating >= 4.0) {
          payrollData[name].performance_bonus += (survey.overall_rating - 4.0) * 10;
        }
        if (survey.overall_rating === 5) {
          payrollData[name].performance_bonus += 25; // 5-star bonus
        }
      });
    });

    // Apply flat-rate adjustments (bonuses/deductions passed in from UI)
    adjustments.forEach(adj => {
      const name = adj.employee_name;
      if (!name || !payrollData[name]) return;
      const amount = Number(adj.amount) || 0;
      payrollData[name].adjustments_total += amount;
      payrollData[name].adjustment_items.push({
        description: adj.description || 'Adjustment',
        amount,
      });
    });

    // Final totals
    Object.values(payrollData).forEach(p => {
      p.total_wage = p.base_wage + p.hourly_wage + p.performance_bonus + p.adjustments_total;
    });

    const payrollArray = Object.values(payrollData).sort((a, b) => b.total_wage - a.total_wage);

    const summary = {
      total_payroll: payrollArray.reduce((s, p) => s + p.total_wage, 0),
      total_jobs: payrollArray.reduce((s, p) => s + p.jobs_completed, 0),
      total_hours: payrollArray.reduce((s, p) => s + p.total_hours, 0),
      total_base_wages: payrollArray.reduce((s, p) => s + p.base_wage, 0),
      total_hourly_wages: payrollArray.reduce((s, p) => s + p.hourly_wage, 0),
      total_bonuses: payrollArray.reduce((s, p) => s + p.performance_bonus, 0),
      total_adjustments: payrollArray.reduce((s, p) => s + p.adjustments_total, 0),
      mover_count: payrollArray.length,
    };

    return Response.json({
      payroll_data: payrollArray,
      summary,
      period: { start_date, end_date },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Payroll calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});