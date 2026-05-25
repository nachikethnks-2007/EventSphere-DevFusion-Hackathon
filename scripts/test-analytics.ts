/**
 * EventSphere - Organizer Dashboard Analytics Integration Test
 *
 * Verifies dynamic analytics aggregation, revenue calculations,
 * checked-in count accuracy, and attendance rates against real Firestore.
 *
 * Run: npx vite-node scripts/test-analytics.ts
 */

import { deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { COLLECTIONS } from '../src/constants/collections';
import { getOrganizerAnalytics, getEventAnalytics } from '../src/services/analytics/analyticsService';
import { createEvent, updateEvent, deleteEvent } from '../src/services/event/eventService';

const TEST_PREFIX = 'test-analytics-';
const TEST_ORGANIZER_ID = `${TEST_PREFIX}organizer-id`;
const TEST_EMPTY_ORGANIZER_ID = `${TEST_PREFIX}empty-organizer-id`;

const TEST_EVENT_IDS = {
  paidEvent: `${TEST_PREFIX}event-paid`,
  freeEvent: `${TEST_PREFIX}event-free`,
} as const;

const TEST_TICKET_IDS = {
  paidT1: `${TEST_PREFIX}ticket-paid-1`,
  paidT2: `${TEST_PREFIX}ticket-paid-2`,
  paidT3: `${TEST_PREFIX}ticket-paid-3`,
  freeT1: `${TEST_PREFIX}ticket-free-1`,
  freeT2: `${TEST_PREFIX}ticket-free-2`,
} as const;

const log = (step: string, message: string, data?: unknown) => {
  const prefix = `[${step}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

const logPass = (step: string, message: string) => {
  console.log(`[${step}] ✓ PASS — ${message}`);
};

const logFail = (step: string, message: string) => {
  console.error(`[${step}] ✗ FAIL — ${message}`);
};

function assert(condition: boolean, step: string, message: string): void {
  if (!condition) {
    logFail(step, message);
    throw new Error(message);
  }
  logPass(step, message);
}

async function seedTestData(): Promise<void> {
  log('SETUP', 'Seeding test events and tickets into Firestore...');
  const now = Timestamp.now();

  // 1. Seed Paid Event
  await setDoc(doc(db, COLLECTIONS.EVENTS, TEST_EVENT_IDS.paidEvent), {
    title: 'Analytics Paid Masterclass',
    description: 'A premium workshop on deep dashboard metrics.',
    eventType: 'Workshop',
    date: '2026-11-12',
    time: '14:00',
    location: 'Metric Center',
    capacity: 100,
    tags: ['metrics', 'masterclass'],
    organizerId: TEST_ORGANIZER_ID,
    createdAt: now,
    updatedAt: now,
    category: 'Education',
    city: 'New York',
    priceType: 'paid',
    price: 50.00, // $50 default price
  });

  // 2. Seed Free Event
  await setDoc(doc(db, COLLECTIONS.EVENTS, TEST_EVENT_IDS.freeEvent), {
    title: 'Analytics Free Open House',
    description: 'An open networking session for beginners.',
    eventType: 'Meetup',
    date: '2026-11-13',
    time: '18:00',
    location: 'Metric Hub',
    capacity: 50,
    tags: ['networking', 'free'],
    organizerId: TEST_ORGANIZER_ID,
    createdAt: now,
    updatedAt: now,
    category: 'Community',
    city: 'New York',
    priceType: 'free',
  });

  // 3. Seed Tickets for Paid Event
  // Ticket 1: Scanned/Checked-in, Default Price ($50)
  await setDoc(doc(db, COLLECTIONS.TICKETS, TEST_TICKET_IDS.paidT1), {
    ticketId: 'TICK-PAID-001',
    attendeeId: 'attendee-1',
    eventId: TEST_EVENT_IDS.paidEvent,
    eventTitle: 'Analytics Paid Masterclass',
    eventDate: '2026-11-12',
    userEmail: 'user1@example.com',
    userName: 'User One',
    ticketStatus: 'scanned',
    qrCodeData: `eventsphere://${TEST_EVENT_IDS.paidEvent}/TICK-PAID-001`,
    registeredAt: now,
    scanned: true,
    scannedAt: now,
  });

  // Ticket 2: Registered (Not Scanned), Default Price ($50)
  await setDoc(doc(db, COLLECTIONS.TICKETS, TEST_TICKET_IDS.paidT2), {
    ticketId: 'TICK-PAID-002',
    attendeeId: 'attendee-2',
    eventId: TEST_EVENT_IDS.paidEvent,
    eventTitle: 'Analytics Paid Masterclass',
    eventDate: '2026-11-12',
    userEmail: 'user2@example.com',
    userName: 'User Two',
    ticketStatus: 'registered',
    qrCodeData: `eventsphere://${TEST_EVENT_IDS.paidEvent}/TICK-PAID-002`,
    registeredAt: now,
    scanned: false,
  });

  // Ticket 3: Scanned/Checked-in, Custom Price Override ($40 - e.g. Early Bird/Discount code)
  await setDoc(doc(db, COLLECTIONS.TICKETS, TEST_TICKET_IDS.paidT3), {
    ticketId: 'TICK-PAID-003',
    attendeeId: 'attendee-3',
    eventId: TEST_EVENT_IDS.paidEvent,
    eventTitle: 'Analytics Paid Masterclass',
    eventDate: '2026-11-12',
    userEmail: 'user3@example.com',
    userName: 'User Three',
    ticketStatus: 'scanned',
    qrCodeData: `eventsphere://${TEST_EVENT_IDS.paidEvent}/TICK-PAID-003`,
    registeredAt: now,
    scanned: true,
    scannedAt: now,
    price: 40.00,
  });

  // 4. Seed Tickets for Free Event
  // Ticket 4: Registered (Not Scanned)
  await setDoc(doc(db, COLLECTIONS.TICKETS, TEST_TICKET_IDS.freeT1), {
    ticketId: 'TICK-FREE-001',
    attendeeId: 'attendee-4',
    eventId: TEST_EVENT_IDS.freeEvent,
    eventTitle: 'Analytics Free Open House',
    eventDate: '2026-11-13',
    userEmail: 'user4@example.com',
    userName: 'User Four',
    ticketStatus: 'registered',
    qrCodeData: `eventsphere://${TEST_EVENT_IDS.freeEvent}/TICK-FREE-001`,
    registeredAt: now,
    scanned: false,
  });

  // Ticket 5: Scanned/Checked-in
  await setDoc(doc(db, COLLECTIONS.TICKETS, TEST_TICKET_IDS.freeT2), {
    ticketId: 'TICK-FREE-002',
    attendeeId: 'attendee-5',
    eventId: TEST_EVENT_IDS.freeEvent,
    eventTitle: 'Analytics Free Open House',
    eventDate: '2026-11-13',
    userEmail: 'user5@example.com',
    userName: 'User Five',
    ticketStatus: 'scanned',
    qrCodeData: `eventsphere://${TEST_EVENT_IDS.freeEvent}/TICK-FREE-002`,
    registeredAt: now,
    scanned: true,
    scannedAt: now,
  });

  logPass('SETUP', 'Seeded all test events and tickets successfully');
}

async function cleanupTestData(): Promise<void> {
  log('CLEANUP', 'Starting test data cleanup...');

  // Delete seeded tickets
  for (const ticketId of Object.values(TEST_TICKET_IDS)) {
    await deleteDoc(doc(db, COLLECTIONS.TICKETS, ticketId));
  }

  // Delete seeded events
  for (const eventId of Object.values(TEST_EVENT_IDS)) {
    await deleteDoc(doc(db, COLLECTIONS.EVENTS, eventId));
  }

  logPass('CLEANUP', 'All seeded events and tickets deleted successfully');
}

async function runTests(): Promise<void> {
  console.log('\n==================================================');
  console.log(' EventSphere — Organizer Analytics Integration Test');
  console.log('==================================================\n');

  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    logFail('ENV', 'Missing VITE_FIREBASE_PROJECT_ID. Please set in your env.');
    process.exit(1);
  }

  try {
    await seedTestData();

    // --- TEST 1: Event Analytics (Paid Event) ---
    log('TEST_1', 'Calculating analytics for PAID event...');
    const paidAnalytics = await getEventAnalytics(TEST_EVENT_IDS.paidEvent);
    log('TEST_1', 'Paid Event Analytics Results:', paidAnalytics);

    assert(paidAnalytics.registrationsCount === 3, 'TEST_1', 'Paid event registrationsCount is 3');
    assert(paidAnalytics.checkedInCount === 2, 'TEST_1', 'Paid event checkedInCount is 2');
    assert(paidAnalytics.revenue === 140.00, 'TEST_1', 'Paid event revenue is 140.00 (50 + 50 + 40)');
    assert(paidAnalytics.attendanceRate === 66.67, 'TEST_1', 'Paid event attendanceRate is 66.67%');

    // --- TEST 2: Event Analytics (Free Event) ---
    log('TEST_2', 'Calculating analytics for FREE event...');
    const freeAnalytics = await getEventAnalytics(TEST_EVENT_IDS.freeEvent);
    log('TEST_2', 'Free Event Analytics Results:', freeAnalytics);

    assert(freeAnalytics.registrationsCount === 2, 'TEST_2', 'Free event registrationsCount is 2');
    assert(freeAnalytics.checkedInCount === 1, 'TEST_2', 'Free event checkedInCount is 1');
    assert(freeAnalytics.revenue === 0.00, 'TEST_2', 'Free event revenue is 0.00');
    assert(freeAnalytics.attendanceRate === 50.00, 'TEST_2', 'Free event attendanceRate is 50.00%');

    // --- TEST 3: Organizer Analytics (Aggregated) ---
    log('TEST_3', 'Calculating aggregated analytics for organizer...');
    const organizerAnalytics = await getOrganizerAnalytics(TEST_ORGANIZER_ID);
    log('TEST_3', 'Organizer Analytics Results:', organizerAnalytics);

    assert(organizerAnalytics.totalEvents === 2, 'TEST_3', 'Organizer totalEvents is 2');
    assert(organizerAnalytics.totalRegistrations === 5, 'TEST_3', 'Organizer totalRegistrations is 5 (3 + 2)');
    assert(organizerAnalytics.totalRevenue === 140.00, 'TEST_3', 'Organizer totalRevenue is 140.00');
    assert(organizerAnalytics.totalCheckedIn === 3, 'TEST_3', 'Organizer totalCheckedIn is 3 (2 + 1)');

    // --- TEST 4: Organizer Analytics (No Events) ---
    log('TEST_4', 'Calculating analytics for an organizer with no events...');
    const emptyOrganizerAnalytics = await getOrganizerAnalytics(TEST_EMPTY_ORGANIZER_ID);
    log('TEST_4', 'Empty Organizer Analytics Results:', emptyOrganizerAnalytics);

    assert(emptyOrganizerAnalytics.totalEvents === 0, 'TEST_4', 'Empty organizer totalEvents is 0');
    assert(emptyOrganizerAnalytics.totalRegistrations === 0, 'TEST_4', 'Empty organizer totalRegistrations is 0');
    assert(emptyOrganizerAnalytics.totalRevenue === 0.00, 'TEST_4', 'Empty organizer totalRevenue is 0.00');
    assert(emptyOrganizerAnalytics.totalCheckedIn === 0, 'TEST_4', 'Empty organizer totalCheckedIn is 0');

    // --- TEST 5: Error Handling (Non-existent Event) ---
    log('TEST_5', 'Verifying error handling for non-existent event ID...');
    try {
      await getEventAnalytics('non-existent-event-id');
      logFail('TEST_5', 'Should have thrown an error for invalid event ID');
      throw new Error('Test failed: No error thrown for invalid event ID');
    } catch (error: any) {
      assert(
        error.message.includes('Event not found'),
        'TEST_5',
        `Error thrown successfully: "${error.message}"`
      );
    }

    // --- TEST 6: Pricing Validation ---
    log('TEST_6', 'Verifying event pricing validation rules...');
    
    // 6a. Paid event without price should throw
    try {
      await createEvent({
        title: 'Paid Event No Price',
        description: 'Should fail',
        eventType: 'Conference',
        date: '2026-12-01',
        time: '10:00',
        location: 'Venue',
        capacity: 100,
        priceType: 'paid',
      }, TEST_ORGANIZER_ID);
      logFail('TEST_6a', 'Should have failed to create paid event without price');
      throw new Error('Test failed: Allowed paid event without price');
    } catch (err: any) {
      assert(
        err.message.includes('Paid events must have a price greater than 0'),
        'TEST_6a',
        `Correctly rejected paid event without price: "${err.message}"`
      );
    }

    // 6b. Paid event with price <= 0 should throw
    try {
      await createEvent({
        title: 'Paid Event Zero Price',
        description: 'Should fail',
        eventType: 'Conference',
        date: '2026-12-01',
        time: '10:00',
        location: 'Venue',
        capacity: 100,
        priceType: 'paid',
        price: 0,
      }, TEST_ORGANIZER_ID);
      logFail('TEST_6b', 'Should have failed to create paid event with price <= 0');
      throw new Error('Test failed: Allowed paid event with price <= 0');
    } catch (err: any) {
      assert(
        err.message.includes('Paid events must have a price greater than 0'),
        'TEST_6b',
        `Correctly rejected paid event with zero price: "${err.message}"`
      );
    }

    // 6c. Free event with price > 0 should throw
    try {
      await createEvent({
        title: 'Free Event With Price',
        description: 'Should fail',
        eventType: 'Conference',
        date: '2026-12-01',
        time: '10:00',
        location: 'Venue',
        capacity: 100,
        priceType: 'free',
        price: 25.00,
      }, TEST_ORGANIZER_ID);
      logFail('TEST_6c', 'Should have failed to create free event with price > 0');
      throw new Error('Test failed: Allowed free event with price > 0');
    } catch (err: any) {
      assert(
        err.message.includes('Free events cannot have a price greater than 0'),
        'TEST_6c',
        `Correctly rejected free event with a price: "${err.message}"`
      );
    }

    // 6d. Creating valid paid event succeeds, and invalid update throws
    let createdEventId: string | undefined;
    try {
      const validEvent = await createEvent({
        title: 'Valid Paid Event',
        description: 'Should succeed',
        eventType: 'Conference',
        date: '2026-12-01',
        time: '10:00',
        location: 'Venue',
        capacity: 100,
        priceType: 'paid',
        price: 99.99,
      }, TEST_ORGANIZER_ID);
      createdEventId = validEvent.id;
      logPass('TEST_6d', 'Successfully created valid paid event');

      // 6e. Updating valid event to an invalid pricing combo (paid to free but keeping price) should throw
      try {
        await updateEvent(createdEventId, { priceType: 'free' });
        logFail('TEST_6e', 'Should have rejected updating paid event to free while price is still set');
        throw new Error('Test failed: Allowed updating paid event to free while keeping price');
      } catch (err: any) {
        assert(
          err.message.includes('Free events cannot have a price greater than 0'),
          'TEST_6e',
          `Correctly rejected invalid priceType update: "${err.message}"`
        );
      }
    } finally {
      if (createdEventId) {
        await deleteEvent(createdEventId);
        logPass('TEST_6', 'Cleaned up valid test event');
      }
    }

    console.log('\n==================================================');
    console.log(' All Organizer Analytics tests PASSED successfully!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n==================================================');
    console.error(' Test run failed');
    console.error('==================================================\n');
    console.error(error);
    process.exit(1);
  } finally {
    try {
      await cleanupTestData();
    } catch (cleanupErr) {
      log('CLEANUP', 'Cleanup issue (docs may already be removed)', cleanupErr);
    }
  }
}

runTests();
