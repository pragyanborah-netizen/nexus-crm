import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find all pending expenses older than 48 hours
    const allExpenses = await base44.asServiceRole.entities.Expense.list();
    const now = new Date();
    const threshold = 48 * 60 * 60 * 1000; // 48 hours in ms

    const overdue = allExpenses.filter(e => {
      if (e.status !== 'Pending') return false;
      const created = new Date(e.created_date);
      return (now - created) > threshold;
    });

    if (overdue.length === 0) {
      return Response.json({ message: 'No overdue pending expenses', count: 0 });
    }

    // Get admin users to notify
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin' && u.email);

    // Build summary grouped by employee
    const grouped = {};
    for (const exp of overdue) {
      const name = exp.employee_name || 'Unknown';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(exp);
    }

    const summaryLines = Object.entries(grouped).map(([name, exps]) => {
      const total = exps.reduce((s, e) => s + (e.amount || 0), 0);
      return `• ${name}: ${exps.length} expense(s) totalling $${total.toFixed(2)}`;
    }).join('\n');

    const body = `
<h2>⚠️ Pending Expense Reports Reminder</h2>
<p>The following expense reports have been waiting for approval for <strong>more than 48 hours</strong>:</p>
<pre style="background:#f8f9fa;padding:12px;border-radius:6px;font-family:monospace">${summaryLines}</pre>
<p><strong>Total overdue expenses: ${overdue.length}</strong></p>
<p>Please log in and review these expenses at your earliest convenience.</p>
`.trim();

    const emailPromises = admins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `⚠️ ${overdue.length} Expense Report(s) Pending Over 48 Hours`,
        body,
        from_name: 'Move On Australia — Payroll',
      })
    );

    await Promise.all(emailPromises);

    return Response.json({
      message: `Notified ${admins.length} admin(s) about ${overdue.length} overdue expenses`,
      overdue_count: overdue.length,
      admins_notified: admins.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});