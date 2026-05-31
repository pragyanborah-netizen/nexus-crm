import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { booking_id, amount, title, customer_email, customer_name, booking_number } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');

    if (!accessToken || !locationId) {
      return Response.json({ error: 'Square credentials not configured' }, { status: 500 });
    }

    const idempotencyKey = `booking-${booking_id || Date.now()}-${Date.now()}`;
    const amountCents = Math.round(amount * 100);

    const squareBody = {
      idempotency_key: idempotencyKey,
      quick_pay: {
        name: title || `Move On Removals – ${booking_number || 'Booking'}`,
        price_money: {
          amount: amountCents,
          currency: 'AUD',
        },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: null,
      },
      pre_populated_data: customer_email ? {
        buyer_email: customer_email,
      } : undefined,
    };

    const squareResp = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify(squareBody),
    });

    const squareData = await squareResp.json();

    if (!squareResp.ok) {
      const errMsg = squareData.errors?.[0]?.detail || 'Failed to create Square payment link';
      return Response.json({ error: errMsg }, { status: 400 });
    }

    const paymentLink = squareData.payment_link?.url;
    if (!paymentLink) {
      return Response.json({ error: 'No payment link returned from Square' }, { status: 500 });
    }

    // Send the payment link via email if customer_email provided
    if (customer_email) {
      const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:20px;">MOVE ON REMOVALS</h1>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${customer_name || 'there'},</p>
    <p>Please find your payment link below for your upcoming move with Move On Removals.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f8fafc;">
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Reference</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${booking_number || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Amount</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:18px;font-weight:bold;color:#1d4ed8;">$${Number(amount).toFixed(2)} AUD</td>
      </tr>
    </table>
    <div style="text-align:center;margin:28px 0;">
      <a href="${paymentLink}" style="background:#16a34a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">💳 Pay Now via Square</a>
    </div>
    <p style="font-size:13px;color:#64748b;">Or copy this link: <a href="${paymentLink}" style="color:#1d4ed8;">${paymentLink}</a></p>
    <p>If you have any questions, please don't hesitate to contact us.</p>
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals — Secure payment powered by Square</p>
  </div>
</div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: customer_email,
        subject: `Move On Removals – Payment Link${booking_number ? ' for Booking #' + booking_number : ''}`,
        body: emailBody,
      });
    }

    return Response.json({ payment_link: paymentLink, amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});