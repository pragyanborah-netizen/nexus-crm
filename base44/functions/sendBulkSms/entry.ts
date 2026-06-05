import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Twilio credentials from secrets
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('Twilio credentials not configured');
      return Response.json({ error: 'SMS service not configured' }, { status: 500 });
    }

    const { data } = await req.json();
    
    if (!data || !data.message) {
      return Response.json({ error: 'No message provided' }, { status: 400 });
    }

    const { message, filters } = data;
    
    // Fetch all bookings to find customers
    const bookings = await base44.entities.Booking.list();
    
    // Filter customers based on criteria
    const customerMap = new Map();
    
    bookings.forEach(booking => {
      if (!booking.customer_mobile || !booking.customer_email) return;
      
      // Apply filters if provided
      if (filters) {
        // Filter by last service date
        if (filters.dateFrom || filters.dateTo) {
          const moveDate = booking.move_date;
          if (filters.dateFrom && moveDate && moveDate < filters.dateFrom) return;
          if (filters.dateTo && moveDate && moveDate > filters.dateTo) return;
        }
        
        // Filter by suburb/location
        if (filters.suburbs && filters.suburbs.length > 0) {
          const pickupSuburb = (booking.pickup_suburb || '').toLowerCase();
          const deliverySuburb = (booking.delivery_suburb || '').toLowerCase();
          const matchesSuburb = filters.suburbs.some(s => 
            pickupSuburb.includes(s.toLowerCase()) || deliverySuburb.includes(s.toLowerCase())
          );
          if (!matchesSuburb) return;
        }
        
        // Filter by customer type
        if (filters.customerType && booking.customer_type !== filters.customerType) return;
      }
      
      // Use email as unique key to avoid duplicates
      const key = booking.customer_email.toLowerCase();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          email: booking.customer_email,
          mobile: booking.customer_mobile,
          firstName: booking.customer_first_name,
          lastName: booking.customer_last_name,
          lastMoveDate: booking.move_date,
          pickupSuburb: booking.pickup_suburb,
          deliverySuburb: booking.delivery_suburb
        });
      }
    });
    
    const customers = Array.from(customerMap.values());
    
    if (customers.length === 0) {
      return Response.json({ 
        success: true, 
        sent: 0, 
        failed: 0, 
        message: 'No customers match the selected filters' 
      });
    }
    
    // Send SMS to each customer
    const results = { sent: 0, failed: 0, failedNumbers: [] };
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    for (const customer of customers) {
      try {
        // Personalize message
        let personalizedMessage = message
          .replace(/{first_name}/gi, customer.firstName || 'there')
          .replace(/{last_name}/gi, customer.lastName || '')
          .replace(/{email}/gi, customer.email || '');
        
        const formData = new URLSearchParams();
        formData.append('From', twilioPhone);
        formData.append('To', customer.mobile);
        formData.append('Body', personalizedMessage);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to send SMS');
        }

        results.sent++;
        console.log(`SMS sent to ${customer.mobile}`);
      } catch (error) {
        results.failed++;
        results.failedNumbers.push({ mobile: customer.mobile, error: error.message });
        console.error(`Failed to send SMS to ${customer.mobile}:`, error.message);
      }
    }
    
    return Response.json({ 
      success: true,
      total: customers.length,
      sent: results.sent,
      failed: results.failed,
      failedNumbers: results.failedNumbers
    });
  } catch (error) {
    console.error('Error in bulk SMS:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});