import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get the booking data from the automation payload
    const { data, event } = req.body;
    
    if (!data || !data.id) {
      return Response.json({ error: 'No booking data provided' }, { status: 400 });
    }

    // Fetch full booking details if needed
    const booking = data;
    
    // Check if customer email exists
    if (!booking.customer_email) {
      console.log('No customer email for booking', booking.id);
      return Response.json({ skipped: 'No customer email' });
    }

    // Determine which template to use based on status
    let templateType;
    if (booking.status === 'Confirmed') {
      templateType = 'Booking Confirmation';
    } else if (booking.status === 'Quoted') {
      templateType = 'Quoted';
    } else if (booking.status === 'Tentative Booking') {
      templateType = 'Pending Booking';
    } else if (booking.status === 'Enquiry') {
      templateType = 'Enquiry - No Response';
    } else {
      console.log('No template for status:', booking.status);
      return Response.json({ skipped: 'No template for status' });
    }

    // Fetch the email template
    const templates = await base44.entities.EmailTemplate.filter({ 
      type: templateType,
      active: true 
    });

    if (!templates || templates.length === 0) {
      console.log('Template not found:', templateType);
      return Response.json({ skipped: 'Template not found' });
    }

    const template = templates[0];

    // Replace placeholders in template
    let subject = template.data.subject || '';
    let body = template.data.body || '';

    // Customer name placeholders
    subject = subject.replace(/{{customer_first_name}}/g, booking.customer_first_name || 'there');
    subject = subject.replace(/{{customer_last_name}}/g, booking.customer_last_name || '');
    
    body = body.replace(/{{customer_first_name}}/g, booking.customer_first_name || 'there');
    body = body.replace(/{{customer_last_name}}/g, booking.customer_last_name || '');
    
    // Move details
    body = body.replace(/{{move_date}}/g, booking.move_date || 'TBC');
    body = body.replace(/{{booking_number}}/g, booking.booking_number || booking.id?.slice(0, 8).toUpperCase() || 'TBC');
    
    // Location placeholders
    body = body.replace(/{{pickup_address}}/g, booking.pickup_address || 'TBC');
    body = body.replace(/{{pickup_suburb}}/g, booking.pickup_suburb || 'TBC');
    body = body.replace(/{{pickup_state}}/g, booking.pickup_state || 'TBC');
    body = body.replace(/{{delivery_address}}/g, booking.delivery_address || 'TBC');
    body = body.replace(/{{delivery_suburb}}/g, booking.delivery_suburb || 'TBC');
    body = body.replace(/{{delivery_state}}/g, booking.delivery_state || 'TBC');
    
    // Pricing placeholders
    body = body.replace(/{{price}}/g, booking.price ? Number(booking.price).toLocaleString() : 'TBC');
    body = body.replace(/{{deposit}}/g, booking.deposit ? Number(booking.deposit).toLocaleString() : 'TBC');
    body = body.replace(/{{balance_due}}/g, booking.balance_due ? Number(booking.balance_due).toLocaleString() : 'TBC');
    
    // Services
    const services = (booking.selected_services || []).join(', ') || booking.service_type || 'Removal Services';
    body = body.replace(/{{services}}/g, services);

    // Send the email
    await base44.integrations.Core.SendEmail({
      to: booking.customer_email,
      subject: subject,
      body: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 28px;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">Move On Australia</h1>
  </div>
  <div style="padding:28px 32px;border:1px solid #e2e8f0;border-top:none;background:#fff;">
    ${body}
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Australia</p>
  </div>
</div>`,
    });

    console.log(`Email sent to ${booking.customer_email} for booking ${booking.id} with template: ${templateType}`);
    
    return Response.json({ 
      success: true, 
      email_sent: booking.customer_email,
      template_used: templateType 
    });
  } catch (error) {
    console.error('Error sending booking notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});