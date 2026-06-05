import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { data, event } = await req.json();
    
    if (!data || !data.id) {
      return Response.json({ error: 'No booking data provided' }, { status: 400 });
    }

    const booking = data;

    // Only send survey for Completed status
    if (booking.status !== 'Completed') {
      console.log('Skipping survey - booking not completed:', booking.status);
      return Response.json({ skipped: 'Status not Completed' });
    }

    // Check if survey already sent
    if (booking.survey_sent) {
      console.log('Survey already sent for booking', booking.id);
      return Response.json({ skipped: 'Survey already sent' });
    }

    // Check if customer email exists
    if (!booking.customer_email) {
      console.log('No customer email for booking', booking.id);
      return Response.json({ skipped: 'No customer email' });
    }

    // Create survey record
    const survey = await base44.entities.Survey.create({
      booking_id: booking.id,
      booking_number: booking.booking_number || booking.id.slice(0, 8).toUpperCase(),
      customer_name: `${booking.customer_first_name} ${booking.customer_last_name}`,
      customer_email: booking.customer_email,
      move_date: booking.move_date,
      survey_sent_date: new Date().toISOString().split('T')[0]
    });

    // Generate survey link
    const surveyLink = `https://burrowing-nexus-lead-link.base44.app/survey/${survey.id}`;

    // Send survey email
    const subject = `How did we do, ${booking.customer_first_name}? – Move On Australia`;
    const body = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 28px;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">Move On Australia</h1>
  </div>
  <div style="padding:28px 32px;border:1px solid #e2e8f0;border-top:none;background:#fff;">
    <p style="font-size:15px;">Hi ${booking.customer_first_name},</p>
    
    <p style="font-size:15px;">Thank you for choosing Move On Australia for your recent move on ${booking.move_date ? new Date(booking.move_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'your scheduled date'}.</p>
    
    <p style="font-size:15px;">We hope everything went smoothly! We'd really appreciate it if you could take 2 minutes to share your experience with us.</p>
    
    <div style="text-align:center;margin:32px 0;">
      <a href="${surveyLink}" style="background:#1d4ed8;color:white;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">⭐ Rate Your Experience</a>
    </div>
    
    <p style="font-size:14px;color:#64748b;">Your feedback helps us improve our service and ensures we continue to provide the best moving experience for our customers.</p>
    
    <p style="font-size:15px;">If you have any concerns or issues, please don't hesitate to reply to this email or call us directly.</p>
    
    <p style="margin-top:24px;font-size:14px;">Thank you again for trusting us with your move.</p>
    
    <p style="margin-top:24px;font-size:14px;">Kind regards,<br/>The Move On Australia Team<br/>
      <a href="mailto:moveme@moveonremovals.com.au" style="color:#1d4ed8;">moveme@moveonremovals.com.au</a>
    </p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Australia</p>
  </div>
</div>`;

    await base44.integrations.Core.SendEmail({
      to: booking.customer_email,
      subject: subject,
      body: body,
    });

    // Mark booking as survey sent
    await base44.entities.Booking.update(booking.id, { survey_sent: true });

    console.log(`Survey email sent to ${booking.customer_email} for booking ${booking.id}`);

    return Response.json({ 
      success: true, 
      survey_id: survey.id,
      email_sent: booking.customer_email
    });
  } catch (error) {
    console.error('Error sending survey:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});