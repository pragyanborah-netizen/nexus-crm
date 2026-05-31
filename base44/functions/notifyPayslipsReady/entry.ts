import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { payroll_data, period_label, start_date, end_date } = await req.json();

    if (!payroll_data || payroll_data.length === 0) {
      return Response.json({ error: 'No payroll data provided' }, { status: 400 });
    }

    // Get employees with emails
    const employees = await base44.asServiceRole.entities.Employee.list();
    const emailMap = {};
    for (const emp of employees) {
      if (emp.email) {
        const fullName = `${emp.first_name} ${emp.last_name}`.trim();
        emailMap[fullName.toLowerCase()] = emp.email;
      }
    }

    const periodStr = period_label || `${start_date} to ${end_date}`;
    const results = { sent: [], skipped: [] };

    for (const mover of payroll_data) {
      const email = emailMap[mover.mover_name?.toLowerCase()];
      if (!email) {
        results.skipped.push({ name: mover.mover_name, reason: 'No email on file' });
        continue;
      }

      const body = `
<h2>Your Payslip is Ready 💰</h2>
<p>Hi ${mover.mover_name},</p>
<p>Your payslip for the period <strong>${periodStr}</strong> is now ready.</p>
<table style="border-collapse:collapse;width:100%;max-width:400px">
  <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b">Hours Worked</td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">${mover.total_hours?.toFixed(1)} hrs</td></tr>
  <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b">Jobs Completed</td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">${mover.jobs_completed}</td></tr>
  <tr style="background:#f0fdf4"><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b"><strong>Total Gross Pay</strong></td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:#16a34a;font-size:1.1em">$${mover.total_wage?.toFixed(2)}</td></tr>
</table>
<p style="margin-top:16px">Please contact your manager or admin if you have any questions about your payslip.</p>
<p>Thank you for your hard work! 🙏</p>
<p style="color:#94a3b8;font-size:0.85em">Move On Australia — Payroll Team</p>
`.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Your Payslip is Ready — ${periodStr}`,
        body,
        from_name: 'Move On Australia — Payroll',
      });

      results.sent.push({ name: mover.mover_name, email });
    }

    return Response.json({
      message: `Payslip notifications sent to ${results.sent.length} employee(s)`,
      sent: results.sent.length,
      skipped: results.skipped,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});