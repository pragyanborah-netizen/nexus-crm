import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, milestone } = await req.json();

    if (!booking_id || !milestone) {
      return Response.json({ error: 'Booking ID and milestone are required' }, { status: 400 });
    }

    // Fetch booking details
    const booking = await base44.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.customer_email || !booking.customer_mobile) {
      return Response.json({ error: 'Customer contact information missing' }, { status: 400 });
    }

    // Get email template
    const templates = await base44.entities.EmailTemplate.filter({ type: milestone, active: true });
    const template = templates[0];

    // Prepare milestone-specific content
    const milestoneConfig = {
      'dispatched': {
        subject: 'Your Truck Has Been Dispatched',
        sms: `Hi ${booking.customer_first_name}, your Move On Removals truck ${booking.truck_assigned || ''} is on the way to pickup. ETA: ${booking.move_time || 'as scheduled'}. Track: ${Deno.env.get('BASE44_APP_URL')}/customer/tracking?booking_id=${booking_id}`,
        email_title: 'Your Truck is On Its Way!'
      },
      'nearby': {
        subject: 'Your Truck is Nearby',
        sms: `Hi ${booking.customer_first_name}, your removals truck is approximately 15 minutes away from ${booking.pickup_suburb}. Driver will call upon arrival. Questions? Reply to this SMS.`,
        email_title: 'We Are Almost There!'
      },
      'delivered': {
        subject: 'Delivery Complete - Thank You!',
        sms: `Hi ${booking.customer_first_name}, your move is complete! Thank you for choosing Move On Removals. Please check your email for your invoice and survey.`,
        email_title: 'Move Complete - Thank You!'
      }
    };

    const config = milestoneConfig[milestone];
    if (!config) {
      return Response.json({ error: 'Invalid milestone type' }, { status: 400 });
    }

    // Build email body
    const emailBody = template?.body || `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <h2 style="color:#1d4ed8;margin-top:0;">${config.email_title}</h2>
    <p>Hi ${booking.customer_first_name},</p>
    <p>${milestone === 'dispatched' ? 'Your truck has been dispatched and is on the way to your pickup location.' : 
      milestone === 'nearby' ? 'Your truck is approximately 15 minutes away from your location.' : 
      'Your move has been completed successfully! Thank you for choosing Move On Removals.'}</p>
    
    ${milestone === 'dispatched' ? `
    <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
      <p style="margin:4px 0;"><strong>Booking:</strong> ${booking.booking_number || booking.id.slice(0, 8)}</p>
      <p style="margin:4px 0;"><strong>Truck:</strong> ${booking.truck_assigned || 'TBA'}</p>
      <p style="margin:4px 0;"><strong>Route:</strong> ${booking.pickup_suburb} → ${booking.delivery_suburb}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${Deno.env.get('BASE44_APP_URL')}/customer/tracking?booking_id=${booking_id}" 
         style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        📍 Track Your Truck
      </a>
    </div>` : 
    milestone === 'nearby' ? `
    <p style="background:#fef3c7;padding:12px;border-left:4px solid #f59e0b;border-radius:4px;">
      <strong>⏰ ETA: ~15 minutes</strong><br/>
      Our driver will contact you upon arrival.
    </p>` : 
    `
    <div style="background:#ecfdf5;padding:16px;border-radius:8px;margin:16px 0;">
      <p style="margin:4px 0;"><strong>Booking:</strong> ${booking.booking_number || booking.id.slice(0, 8)}</p>
      <p style="margin:4px 0;"><strong>Completed:</strong> ${new Date().toLocaleDateString('en-AU')}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${Deno.env.get('BASE44_APP_URL')}/customer/invoice?booking_id=${booking_id}" 
         style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        📄 View Your Invoice
      </a>
    </div>
    <p style="margin-top:16px;">We'd love your feedback! Please check your email for a short survey.</p>`}
    
    <p style="margin-top:24px;">If you have any questions, please don't hesitate to contact us.</p>
    <p>Kind regards,<br/><strong>Move On Removals Team</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals</p>
  </div>
</div>`;

    // Send email
    await base44.integrations.Core.SendEmail({
      to: booking.customer_email,
      subject: template?.subject || config.subject,
      body: emailBody,
      from_name: template?.from_name || 'Move On Removals',
    });

    // Send SMS
    await base44.integrations.Core.SendSms({
      to: booking.customer_mobile,
      body: config.sms,
    });

    // Update booking to track notification sent
    const notificationField = `notification_${milestone}_sent`;
    await base44.entities.Booking.update(booking_id, {
      [notificationField]: true,
      [`notification_${milestone}_date`]: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: `${milestone} notification sent to ${booking.customer_email} and ${booking.customer_mobile}`,
      milestone,
      booking_number: booking.booking_number,
    });

  } catch (error) {
    console.error('Milestone notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});