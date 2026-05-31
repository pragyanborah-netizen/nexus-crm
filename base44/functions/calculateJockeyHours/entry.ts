import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { employee_email, start_date, end_date } = await req.json();

    if (!employee_email || !start_date || !end_date) {
      return Response.json({ error: 'Employee email, start date, and end date are required' }, { status: 400 });
    }

    const startDt = new Date(start_date);
    const endDt = new Date(end_date);
    endDt.setHours(23, 59, 59, 999);

    // Fetch time logs for this employee in the period
    const allTimeLogs = await base44.entities.TimeLog.list();
    const employeeLogs = allTimeLogs.filter(log => {
      if (log.employee_email !== employee_email) return false;
      const d = new Date(log.date);
      return d >= startDt && d <= endDt;
    });

    // Group logs by booking
    const logsByBooking = {};
    employeeLogs.forEach(log => {
      const bookingRef = log.booking_number || 'UNKNOWN';
      if (!logsByBooking[bookingRef]) {
        logsByBooking[bookingRef] = [];
      }
      logsByBooking[bookingRef].push(log);
    });

    const paidShifts = [];
    let totalPaidHours = 0;
    let totalUnpaidTravel = 0;

    // Process each booking
    for (const [bookingRef, logs] of Object.entries(logsByBooking)) {
      // Sort logs by date/time
      logs.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.start_time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.start_time || '00:00'}`);
        return dateA - dateB;
      });

      // Find clock-in and clock-out pairs
      let clockIn = null;
      let clockOut = null;

      logs.forEach(log => {
        if (log.action_type === 'clock_in' && !clockIn) {
          clockIn = log;
        } else if (log.action_type === 'clock_out' && clockIn && !clockOut) {
          clockOut = log;
        }
      });

      if (clockIn && clockOut) {
        // Calculate on-site time (paid)
        const clockInTime = new Date(`${clockIn.date}T${clockIn.start_time}`);
        const clockOutTime = new Date(`${clockOut.date}T${clockOut.end_time || clockOut.start_time}`);
        
        const onSiteMinutes = (clockOutTime - clockInTime) / (1000 * 60);
        const onSiteHours = onSiteMinutes / 60;

        // According to policy: paid from sign-on to sign-off
        // Jockeys can meet at customer location (no unpaid travel) OR travel from depot
        // Travel time ≤30 min each way from depot is unpaid
        // Travel time >30 min requires management approval

        const paidHours = onSiteHours; // Full on-site time is paid
        
        // Determine if jockey met at customer location or traveled from depot
        // If clock-in location matches customer location, no unpaid travel
        const shiftMetAtCustomer = clockIn.location_name?.includes('Pickup') || clockIn.location_name?.includes('Delivery');
        const estimatedTravelEachWay = shiftMetAtCustomer ? 0 : 30; // 0 if met at customer, 30 min if from depot
        const unpaidTravelMinutes = estimatedTravelEachWay * 2; // To and from (only if from depot)
        const unpaidTravelHours = unpaidTravelMinutes / 60;

        totalPaidHours += paidHours;
        totalUnpaidTravel += unpaidTravelHours;

        paidShifts.push({
          booking_number: bookingRef,
          date: clockIn.date,
          clock_in: clockIn.start_time,
          clock_out: clockOut.end_time || clockOut.start_time,
          on_site_hours: parseFloat(onSiteHours.toFixed(2)),
          paid_hours: parseFloat(paidHours.toFixed(2)),
          unpaid_travel_hours: parseFloat(unpaidTravelHours.toFixed(2)),
          location: clockIn.location_name || 'Job Site',
          met_at_customer: shiftMetAtCustomer,
          notes: `${clockIn.notes || ''} → ${clockOut.notes || ''}`,
        });
      }
    }

    // Get employee details
    const employees = await base44.entities.Employee.list();
    const employee = employees.find(e => e.email === employee_email);

    const payRate = employee?.pay_rate || 25;
    const totalPay = totalPaidHours * payRate;

    return Response.json({
      employee_name: employee?.first_name && employee?.last_name 
        ? `${employee.first_name} ${employee.last_name}` 
        : employee_email,
      employee_email,
      period: { start_date, end_date },
      total_paid_hours: parseFloat(totalPaidHours.toFixed(2)),
      total_unpaid_travel_hours: parseFloat(totalUnpaidTravel.toFixed(2)),
      pay_rate: payRate,
      total_pay: parseFloat(totalPay.toFixed(2)),
      shifts: paidShifts,
      policy_summary: {
        paid_from: "Customer sign-on (clock in)",
        paid_until: "Customer sign-off (clock out)",
        meeting_option: "Jockeys can meet at customer location (no unpaid travel)",
        depot_travel: "Travel from depot ≤30 min each way is unpaid",
        extended_travel: "Travel >30 min requires management approval",
      },
    });

  } catch (error) {
    console.error('Calculate jockey hours error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});