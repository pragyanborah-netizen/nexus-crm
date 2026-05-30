import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow service role calls (for scheduled automation)
    if (!user && req.headers.get('Authorization')?.includes('Bearer')) {
      // Service role auth will be handled by SDK
    } else if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized or insufficient permissions' }, { status: 403 });
    }

    const { period_start, period_end, send_email = true, send_sms = true } = await req.json();

    if (!period_start || !period_end) {
      return Response.json({ error: 'Period start and end dates are required' }, { status: 400 });
    }

    // Calculate payroll for the period
    const payrollResponse = await base44.functions.invoke('calculatePayroll', {
      start_date: period_start,
      end_date: period_end
    });

    const { payroll_data, summary } = payrollResponse.data;

    if (!payroll_data || payroll_data.length === 0) {
      return Response.json({ 
        message: 'No payroll data found for this period',
        notifications_sent: 0
      });
    }

    // Get all users to find mover emails
    const allUsers = await base44.entities.User.list();
    
    const notificationsSent = [];
    const notificationsFailed = [];

    for (const payroll of payroll_data) {
      const moverEmail = payroll.mover_name; // Assuming mover_name is email
      const moverUser = allUsers.find(u => u.email === moverEmail);
      
      if (!moverUser) {
        notificationsFailed.push({
          mover: moverEmail,
          reason: 'User not found'
        });
        continue;
      }

      // Generate secure link to view earnings (Payroll page with filter)
      const secureLink = `${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/payroll?period_start=${period_start}&period_end=${period_end}`;

      // Send email notification
      if (send_email) {
        try {
          const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Move On Australia - Payroll Summary</h1>
  </div>
  <div style="padding:20px;border:1px solid #e2e8f0;border-top:none;background:#f8fafc;">
    <p style="margin:0 0 16px;">Hi ${payroll.mover_name.split('@')[0] || 'Mover'},</p>
    
    <p style="margin:16px 0;">Your payroll summary for the period <strong>${new Date(period_start).toLocaleDateString('en-AU')} - ${new Date(period_end).toLocaleDateString('en-AU')}</strong> is now ready.</p>
    
    <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
      <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:16px;">Payroll Summary</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <p style="margin:0;font-size:12px;color:#64748b;">Jobs Completed</p>
          <p style="margin:4px 0;font-size:18px;font-weight:bold;color:#1e293b;">${payroll.jobs_completed}</p>
        </div>
        <div>
          <p style="margin:0;font-size:12px;color:#64748b;">Hours Worked</p>
          <p style="margin:4px 0;font-size:18px;font-weight:bold;color:#1e293b;">${payroll.total_hours.toFixed(1)}</p>
        </div>
        <div>
          <p style="margin:0;font-size:12px;color:#64748b;">Base Wage</p>
          <p style="margin:4px 0;font-size:18px;font-weight:bold;color:#16a34a;">$${payroll.base_wage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p style="margin:0;font-size:12px;color:#64748b;">Performance Bonus</p>
          <p style="margin:4px 0;font-size:18px;font-weight:bold;color:#16a34a;">$${payroll.performance_bonus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>
      <div style="border-top:2px solid #e2e8f0;margin-top:16px;padding-top:16px;">
        <p style="margin:0;font-size:12px;color:#64748b;">Total Earnings</p>
        <p style="margin:8px 0;font-size:24px;font-weight:bold;color:#16a34a;">$${payroll.total_wage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    </div>
    
    <div style="text-align:center;margin:24px 0;">
      <a href="${secureLink}" 
         style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        View Full Breakdown
      </a>
    </div>
    
    <p style="font-size:13px;color:#64748b;margin-top:24px;">This link will take you to your detailed earnings breakdown showing all jobs, hours, and bonus calculations for this pay period.</p>
    
    <p style="margin-top:24px;">If you have any questions about your payroll, please contact your administrator.</p>
    
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Australia Team</strong></p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;border-radius:0 0 8px 8px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">This is an automated message. Please do not reply.</p>
  </div>
</div>`;

          await base44.integrations.Core.SendEmail({
            to: moverEmail,
            subject: `Payroll Summary Ready - ${new Date(period_start).toLocaleDateString('en-AU')} to ${new Date(period_end).toLocaleDateString('en-AU')}`,
            body: emailBody,
            from_name: 'Move On Australia Payroll'
          });

          notificationsSent.push({
            mover: moverEmail,
            type: 'email',
            status: 'sent'
          });
        } catch (emailError) {
          console.error(`Email failed for ${moverEmail}:`, emailError);
          notificationsFailed.push({
            mover: moverEmail,
            type: 'email',
            reason: emailError.message
          });
        }
      }

      // Send SMS notification
      if (send_sms && moverUser.phone) {
        try {
          const smsMessage = `Hi ${payroll.mover_name.split('@')[0] || 'Mover'}! Your payroll for ${new Date(period_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${new Date(period_end).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} is ready. Total: $${payroll.total_wage.toFixed(2)}. View details: ${secureLink}`;

          await base44.integrations.Core.SendSms({
            to: moverUser.phone,
            body: smsMessage
          });

          notificationsSent.push({
            mover: moverEmail,
            type: 'sms',
            phone: moverUser.phone,
            status: 'sent'
          });
        } catch (smsError) {
          console.error(`SMS failed for ${moverEmail}:`, smsError);
          notificationsFailed.push({
            mover: moverEmail,
            type: 'sms',
            phone: moverUser.phone,
            reason: smsError.message
          });
        }
      }
    }

    return Response.json({
      message: 'Payroll notifications processed',
      period: { start: period_start, end: period_end },
      total_movers: payroll_data.length,
      notifications_sent: notificationsSent.length,
      notifications_failed: notificationsFailed.length,
      details: {
        sent: notificationsSent,
        failed: notificationsFailed
      },
      summary: {
        total_payroll: summary.total_payroll,
        total_jobs: summary.total_jobs,
        total_hours: summary.total_hours
      }
    });

  } catch (error) {
    console.error('Payroll notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});