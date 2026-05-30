import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, booking_number, customer_name, customer_email, customer_mobile, delay_minutes, new_eta, message } = await req.json();

    if (!booking_id || !customer_email || !delay_minutes) {
      return Response.json({ error: 'Booking ID, customer email, and delay minutes are required' }, { status: 400 });
    }

    // Format ETA time
    const etaTime = new_eta ? new Date(new_eta).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'shortly';
    
    // Create personalized delay notification
    const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#f59e0b;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS - Update</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${customer_name},</p>
    <p>We're writing to provide you with an update on your scheduled move today (Booking #${booking_number}).</p>
    
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;">
      <p style="margin:0;font-weight:bold;color:#92400e;">⏱️ Schedule Update</p>
      <p style="margin:8px 0 0 0;color:#78350f;">
        Due to unforeseen circumstances, our team is running approximately <strong>${delay_minutes} minutes behind schedule</strong>.
      </p>
      ${new_eta ? `<p style="margin:8px 0 0 0;color:#78350f;">We now expect to arrive at <strong>${etaTime}</strong>.</p>` : ''}
    </div>

    <p>We sincerely apologize for this delay and any inconvenience it may cause. Our team is working efficiently to complete your move as quickly as possible while maintaining the quality of service you expect from us.</p>

    ${message ? `<p style="background:#f8fafc;padding:12px;border-radius:6px;margin:16px 0;"><strong>Additional Message:</strong><br/>${message}</p>` : ''}

    <p>If you have any questions or concerns, please don't hesitate to contact us:</p>
    <ul style="margin:16px 0;">
      <li>📞 Phone: Reply to this email or call our office</li>
      <li>📧 Email: moveme@moveonremovals.com.au</li>
    </ul>

    <p>Thank you for your patience and understanding.</p>

    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals Team</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`;

    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: customer_email,
      subject: `Move On Removals - Schedule Update for Booking #${booking_number}`,
      body: emailBody,
    });

    // Log the notification in booking notes
    const booking = await base44.entities.Booking.get(booking_id);
    if (booking) {
      const notificationLog = `[${new Date().toLocaleString()}] Delay notification sent to customer: ${delay_minutes} minutes behind, new ETA: ${etaTime}. Sent by: ${user.full_name}`;
      const updatedNotes = booking.notes ? `${booking.notes}\n\n${notificationLog}` : notificationLog;
      await base44.entities.Booking.update(booking_id, { notes: updatedNotes });
    }

    return Response.json({
      success: true,
      message: `Delay notification sent to ${customer_email}`,
      notification_time: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delay notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});