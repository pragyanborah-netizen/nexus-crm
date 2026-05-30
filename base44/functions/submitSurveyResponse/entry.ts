import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { survey_id, ratings, comments, would_recommend } = await req.json();

    if (!survey_id) {
      return Response.json({ error: 'Survey ID required' }, { status: 400 });
    }

    // Get existing survey
    const survey = await base44.entities.Survey.get(survey_id);
    
    if (!survey) {
      return Response.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Update survey with responses
    const updatedSurvey = await base44.entities.Survey.update(survey_id, {
      overall_rating: ratings?.overall || null,
      team_rating: ratings?.team || null,
      care_rating: ratings?.care || null,
      punctuality_rating: ratings?.punctuality || null,
      value_rating: ratings?.value || null,
      comments: comments || null,
      would_recommend: would_recommend || false,
      survey_submitted_date: new Date().toISOString()
    });

    // Mark booking as survey completed
    if (survey.booking_id) {
      await base44.entities.Booking.update(survey.booking_id, { survey_completed: true });
    }

    console.log(`Survey submitted for booking ${survey.booking_number}`);

    return Response.json({ 
      success: true,
      survey_id: survey_id,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Error submitting survey:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});