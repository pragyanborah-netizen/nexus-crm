import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { assignments, roster_period } = await req.json();
    
    if (!assignments || !Array.isArray(assignments)) {
      return Response.json({ error: 'Invalid assignments data' }, { status: 400 });
    }

    const results = { sent: 0, failed: [], skipped: [] };

    for (const assignment of assignments) {
      try {
        const { employee_name, employee_email, shift_type, shift_date, booking_id, booking_number } = assignment;
        
        if (!employee_email || !employee_name) {
          results.skipped.push({ name: employee_name || 'Unknown', reason: 'No email' });
          continue;
        }

        // Create unique token for accept/decline
        const token = btoa(JSON.stringify({
          employee_name,
          employee_email,
          booking_id,
          shift_type,
          timestamp: Date.now()
        }));

        const acceptUrl = `${Deno.env.get('BASE44_APP_URL')}/roster/response?action=accept&token=${token}`;
        const declineUrl = `${Deno.env.get('BASE44_APP_URL')}/roster/response?action=decline&token=${token}`;

        const emailBody = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Shift Assignment - Move On Australia</h2>
                
                <p>Hi ${employee_name},</p>
                
                <p>You have been assigned to a new shift:</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Shift Type:</strong> ${shift_type || 'Moving Crew'}</p>
                  <p><strong>Date:</strong> ${new Date(shift_date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  ${booking_number ? `<p><strong>Booking #:</strong> ${booking_number}</p>` : ''}
                </div>
                
                <p>Please confirm your availability:</p>
                
                <div style="margin: 20px 0;">
                  <a href="${acceptUrl}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px; font-weight: bold;">✓ Accept Shift</a>
                  <a href="${declineUrl}" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">✗ Decline Shift</a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">Please respond within 24 hours. If you decline, we'll need to find a replacement.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="color: #9ca3af; font-size: 12px;">Move On Australia · Automated Roster Notification</p>
              </div>
            </body>
          </html>
        `;

        await base44.integrations.Core.SendEmail({
          to: employee_email,
          subject: `Shift Assignment - ${new Date(shift_date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`,
          body: emailBody,
          from_name: 'Move On Australia Rostering'
        });

        results.sent++;
      } catch (error) {
        results.failed.push({ name: assignment.employee_name, error: error.message });
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});