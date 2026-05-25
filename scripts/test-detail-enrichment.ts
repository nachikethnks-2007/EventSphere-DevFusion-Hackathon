/**
 * Event Detail Enrichment Integration Test
 *
 * Verifies that events can be created, fetched, and updated with
 * agenda, speakers, faq, and venueMapUrl fields successfully.
 *
 * Run: npx vite-node scripts/test-detail-enrichment.ts
 */

import { createEvent, fetchEventById, updateEvent, deleteEvent } from '../src/services/event/eventService';
import { CreateEventData, UpdateEventData } from '../src/types/event';

async function runEnrichmentTest() {
  console.log('--- STARTING EVENT DETAIL ENRICHMENT TEST ---');

  const testOrganizerId = 'test-enrichment-organizer';
  
  // 1. Define event data with enrichment details
  const eventData: CreateEventData = {
    title: 'Enriched AI Summit 2026',
    description: 'An advanced summit on generative AI and agentic coding.',
    eventType: 'Conference',
    date: '2026-09-20',
    time: '09:00',
    location: 'Silicon Valley Convention Center',
    capacity: 500,
    tags: ['ai', 'agentic', 'future'],
    agenda: [
      '09:00 AM - Registration & Networking',
      '10:00 AM - Opening Keynote by Antigravity AI',
      '01:00 PM - Panel Discussion on Advanced Agents'
    ],
    speakers: ['Dr. Sophia Chen', 'Alex Rivera', 'Antigravity AI'],
    faq: [
      { question: 'Will there be food?', answer: 'Yes, lunch and coffee are provided.' },
      { question: 'Is there virtual attendance?', answer: 'Yes, we will stream the main track.' }
    ],
    venueMapUrl: 'https://maps.example.com/silicon-valley-convention-center.png'
  };

  let createdEventId: string | undefined;

  try {
    // 2. Create the event
    console.log('1. Creating enriched event...');
    const event = await createEvent(eventData, testOrganizerId);
    createdEventId = event.id;
    console.log('Created event with ID:', createdEventId);

    // Verify creation
    if (!event.agenda || event.agenda.length !== 3 || event.agenda[1] !== '10:00 AM - Opening Keynote by Antigravity AI') {
      throw new Error('Agenda mismatch in created event');
    }
    if (!event.speakers || event.speakers.length !== 3 || event.speakers[2] !== 'Antigravity AI') {
      throw new Error('Speakers mismatch in created event');
    }
    if (!event.faq || event.faq.length !== 2 || event.faq[0].answer !== 'Yes, lunch and coffee are provided.') {
      throw new Error('FAQ mismatch in created event');
    }
    if (event.venueMapUrl !== 'https://maps.example.com/silicon-valley-convention-center.png') {
      throw new Error('Venue map URL mismatch in created event');
    }
    console.log('✓ Create event verification passed!');

    // 3. Fetch the event
    console.log('2. Fetching created event...');
    const fetchedEvent = await fetchEventById(createdEventId);
    
    // Verify fetched details
    if (!fetchedEvent.agenda || fetchedEvent.agenda.length !== 3) {
      throw new Error('Agenda mismatch in fetched event');
    }
    if (!fetchedEvent.speakers || fetchedEvent.speakers.length !== 3) {
      throw new Error('Speakers mismatch in fetched event');
    }
    if (!fetchedEvent.faq || fetchedEvent.faq.length !== 2) {
      throw new Error('FAQ mismatch in fetched event');
    }
    if (fetchedEvent.venueMapUrl !== 'https://maps.example.com/silicon-valley-convention-center.png') {
      throw new Error('Venue map URL mismatch in fetched event');
    }
    console.log('✓ Fetch event verification passed!');

    // 4. Update the event
    console.log('3. Updating event enrichment details...');
    const updateData: UpdateEventData = {
      agenda: [
        '09:00 AM - Registration & Networking',
        '10:00 AM - Opening Keynote by Antigravity AI',
        '01:00 PM - Panel Discussion on Advanced Agents',
        '03:00 PM - Hands-on Hackathon Session'
      ],
      speakers: ['Dr. Sophia Chen', 'Alex Rivera', 'Antigravity AI', 'Sarah Jenkins'],
      faq: [
        { question: 'Will there be food?', answer: 'Yes, fully catered lunch, drinks, and snacks are provided.' },
        { question: 'Is there virtual attendance?', answer: 'Yes, we will stream the main track.' },
        { question: 'Are there hackathon prizes?', answer: 'Yes, $10,000 in credits!' }
      ],
      venueMapUrl: 'https://maps.example.com/silicon-valley-convention-center-updated.png'
    };

    await updateEvent(createdEventId, updateData);
    console.log('Update called successfully');

    // 5. Fetch and verify updated event
    console.log('4. Fetching updated event...');
    const updatedEvent = await fetchEventById(createdEventId);
    
    if (!updatedEvent.agenda || updatedEvent.agenda.length !== 4 || updatedEvent.agenda[3] !== '03:00 PM - Hands-on Hackathon Session') {
      throw new Error('Agenda mismatch in updated event');
    }
    if (!updatedEvent.speakers || updatedEvent.speakers.length !== 4 || updatedEvent.speakers[3] !== 'Sarah Jenkins') {
      throw new Error('Speakers mismatch in updated event');
    }
    if (!updatedEvent.faq || updatedEvent.faq.length !== 3 || updatedEvent.faq[2].question !== 'Are there hackathon prizes?') {
      throw new Error('FAQ mismatch in updated event');
    }
    if (updatedEvent.venueMapUrl !== 'https://maps.example.com/silicon-valley-convention-center-updated.png') {
      throw new Error('Venue map URL mismatch in updated event');
    }
    console.log('✓ Update event verification passed!');

  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  } finally {
    if (createdEventId) {
      console.log('5. Cleaning up test event...');
      try {
        await deleteEvent(createdEventId);
        console.log('✓ Cleanup successful');
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr);
      }
    }
  }

  console.log('--- EVENT DETAIL ENRICHMENT TEST PASSED SUCCESSFULLY ---');
}

runEnrichmentTest();
