import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_email, customer_first_name } = await req.json();
  if (!customer_email) return Response.json({ error: 'customer_email required' }, { status: 400 });

  const packagingOrderUrl = `https://${req.headers.get('host') || 'moveonremovals.com.au'}/packaging-order`;

  const body = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
  <div style="background:#1d4ed8;padding:20px 24px;">
    <h1 style="color:white;margin:0;font-size:22px;">MOVE ON REMOVALS</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">Packaging Price List</p>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
    <p>Hi ${customer_first_name || 'there'},</p>
    <p style="color:#2563eb;font-weight:bold;font-size:15px;">We are not just a moving company — we PACK, MOVE AND UNPACK according to your needs!</p>
    <p>We offer all the packing materials required to make your move hassle free. We can pre-deliver your order prior to your move so you can pack at your own pace. Once complete, we can remove your unwanted flat-packed boxes!</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;">
      <h2 style="color:#1d4ed8;font-size:16px;margin:0 0 16px;border-bottom:2px solid #dbeafe;padding-bottom:8px;">📦 PACKAGING ITEMS &amp; PRICES (excl. GST)</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#dbeafe;"><th style="text-align:left;padding:8px 10px;font-size:13px;">Item</th><th style="text-align:left;padding:8px 10px;font-size:13px;">Details</th><th style="text-align:right;padding:8px 10px;font-size:13px;">Price</th></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 10px;font-weight:bold;font-size:13px;">Tea Chest</td><td style="padding:8px 10px;font-size:12px;color:#64748b;">43.1×40.6×59.6cm — Household goods, clothing, toys, small appliances</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1d4ed8;">$6.00</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc;"><td style="padding:8px 10px;font-weight:bold;font-size:13px;">Book &amp; Wine Box</td><td style="padding:8px 10px;font-size:12px;color:#64748b;">40.6×29.8×43.1cm — Books, wine bottles &amp; kitchen items</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1d4ed8;">$4.00</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 10px;font-weight:bold;font-size:13px;">Packing Paper</td><td style="padding:8px 10px;font-size:12px;color:#64748b;">125 sheets per pack — Wrap items, fill voids, pad top &amp; bottom of boxes</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1d4ed8;">$25.00</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc;"><td style="padding:8px 10px;font-weight:bold;font-size:13px;">Bubble Wrap</td><td style="padding:8px 10px;font-size:12px;color:#64748b;">50m × 375mm roll — Glass, mirrors, antiques &amp; fragile goods</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1d4ed8;">$35.00</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px 10px;font-weight:bold;font-size:13px;">Mattress Protector</td><td style="padding:8px 10px;font-size:12px;color:#64748b;">Single $12 · Double/Queen $14 · King $16 — Protects from dirt &amp; damage</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1d4ed8;">from $12</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc;"><td style="padding:8px 10px;font-weight:bold;font-size:13px;">Packaging Tape</td><td style="padding:8px 10px;font-size:12px;color:#64748b;">Secures bottom and tops of non-fragile boxes</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1d4ed8;">$5.00</td></tr>
        <tr><td style="padding:8px 10px;font-weight:bold;font-size:13px;">"Fragile" Tape</td><td style="padding:8px 10px;font-size:12px;color:#64748b;">Closes tops of boxes containing fragile items only</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1d4ed8;">$6.00</td></tr>
      </table>
      <p style="font-size:12px;color:#64748b;margin:10px 0 0;">💡 Second hand boxes may be available on request at 50% off. All pricing excludes GST.</p>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <h2 style="color:#15803d;font-size:15px;margin:0 0 10px;">🧑‍🤝‍🧑 PACK &amp; WRAP / UNPACK SERVICE</h2>
      <p style="font-size:13px;margin:0 0 8px;">Sit back and leave it to our professional team!</p>
      <ul style="font-size:13px;margin:0;padding-left:18px;color:#374151;">
        <li style="margin-bottom:4px;"><strong>2 Packers/Unpackers:</strong> $158/hr Mon–Fri · $196/hr Saturday</li>
        <li style="margin-bottom:4px;"><strong>Additional Packer:</strong> $79/hr Mon–Fri · $98/hr Saturday</li>
        <li style="color:#64748b;">Minimum 3 hours · Excludes packing materials</li>
      </ul>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${packagingOrderUrl}" style="background:#1d4ed8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">📦 Order Packaging Supplies Online</a>
    </div>

    <p style="font-size:13px;color:#64748b;"><strong>Delivery:</strong> Minimum order may apply. Payment required prior to delivery. Contact us for delivery fees and personalised quotes.</p>
    <p>If you have any questions, simply reply to this email or give us a call.</p>
    <p style="margin-top:24px;">Kind regards,<br/><strong>Move On Removals Team</strong><br/>moveme@moveonremovals.com.au</p>
  </div>
  <div style="background:#f1f5f9;padding:12px 20px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Move On Removals · All pricing excludes GST unless otherwise noted.</p>
  </div>
</div>`;

  await base44.integrations.Core.SendEmail({
    to: customer_email,
    subject: 'Move On Removals – Packaging Supplies Price List',
    body,
  });

  return Response.json({ success: true, message: `Packaging price list sent to ${customer_email}` });
});