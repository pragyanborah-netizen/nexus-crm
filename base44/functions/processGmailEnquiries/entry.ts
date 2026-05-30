import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Gmail connection for the current user
    const connectorId = req.headers.get('X-Connector-ID') || 'gmail';
    let accessToken;
    
    try {
      const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
      accessToken = connection.accessToken;
    } catch (e) {
      return Response.json({ 
        error: 'Gmail not connected. Please connect your Gmail account first.',
        connect_url: await base44.connectors.connectAppUser(connectorId)
      }, { status: 400 });
    }

    // Fetch recent emails from Gmail
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!gmailResponse.ok) {
      return Response.json({ error: 'Failed to fetch Gmail messages' }, { status: 500 });
    }
    
    const { messages } = await gmailResponse.json();
    
    if (!messages || messages.length === 0) {
      return Response.json({ processed: 0, bookings_created: 0, message: 'No new emails' });
    }

    let processedCount = 0;
    let bookingsCreated = 0;
    const results = [];

    for (const msg of messages) {
      // Fetch full message
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!msgResponse.ok) continue;
      
      const message = await msgResponse.json();
      
      // Extract email headers
      const headers = message.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      // Check if this looks like an enquiry email
      const enquiryKeywords = ['enquiry', 'inquiry', 'quote', 'booking', 'move', 'removal'];
      const isEnquiry = enquiryKeywords.some(keyword => 
        subject.toLowerCase().includes(keyword) || from.toLowerCase().includes('enquiry')
      );
      
      if (!isEnquiry) {
        processedCount++;
        continue;
      }

      // Extract email body
      let body = '';
      if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            body = atob(part.body.data);
            break;
          }
        }
      } else if (message.payload.body.data) {
        body = atob(message.payload.body.data);
      }

      // Use LLM to extract booking information from email
      const extractionResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract booking information from this customer enquiry email. Return JSON with these fields:
- customer_first_name (string)
- customer_last_name (string)  
- customer_email (string)
- customer_mobile (string)
- move_date (string, format YYYY-MM-DD)
- pickup_address (string, full address)
- pickup_suburb (string)
- pickup_state (string)
- delivery_address (string, full address)
- delivery_suburb (string)
- delivery_state (string)
- service_type (string: House Removal, Office Removal, Furniture Removal, Packing, Moving, Unpacking)
- items_to_move (array of strings - list all items mentioned)
- notes (string, any special requirements)

Email Subject: ${subject}
From: ${from}
Date: ${date}
Body: ${body.substring(0, 3000)}

Return ONLY valid JSON. If information is not found, use null for that field.`,
        response_json_schema: {
          type: "object",
          properties: {
            customer_first_name: { type: "string" },
            customer_last_name: { type: "string" },
            customer_email: { type: "string" },
            customer_mobile: { type: "string" },
            move_date: { type: "string" },
            pickup_address: { type: "string" },
            pickup_suburb: { type: "string" },
            pickup_state: { type: "string" },
            delivery_address: { type: "string" },
            delivery_suburb: { type: "string" },
            delivery_state: { type: "string" },
            service_type: { type: "string" },
            items_to_move: { type: "array", items: { type: "string" } },
            notes: { type: "string" }
          }
        }
      });

      if (extractionResult && extractionResult.customer_first_name && extractionResult.customer_email) {
        // Check if booking already exists for this email
        const existingBookings = await base44.entities.Booking.filter({
          customer_email: extractionResult.customer_email
        });

        if (existingBookings.length === 0) {
          // Create new booking
          await base44.entities.Booking.create({
            customer_first_name: extractionResult.customer_first_name,
            customer_last_name: extractionResult.customer_last_name,
            customer_email: extractionResult.customer_email,
            customer_mobile: extractionResult.customer_mobile || '',
            customer_type: 'Residential',
            move_date: extractionResult.move_date || '',
            pickup_address: extractionResult.pickup_address || '',
            pickup_suburb: extractionResult.pickup_suburb || '',
            pickup_state: extractionResult.pickup_state || 'VIC',
            delivery_address: extractionResult.delivery_address || '',
            delivery_suburb: extractionResult.delivery_suburb || '',
            delivery_state: extractionResult.delivery_state || 'VIC',
            service_type: extractionResult.service_type || 'House Removal',
            items_to_move: extractionResult.items_to_move || [],
            notes: extractionResult.notes || `Extracted from email: ${subject}\nFrom: ${from}\nDate: ${date}`,
            status: 'Enquiry',
            agent_inquired: user.full_name || 'System',
            selected_services: extractionResult.service_type ? [extractionResult.service_type] : []
          });
          bookingsCreated++;
        }
      }
      
      processedCount++;
      results.push({ subject, from, processed: true });
    }

    return Response.json({
      processed: processedCount,
      bookings_created: bookingsCreated,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});