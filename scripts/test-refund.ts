/**
 * Refund Request Flow integration test
 *
 * Run: npx vite-node scripts/test-refund.ts
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { COLLECTIONS } from '../src/constants/collections';
import { createEvent, deleteEvent } from '../src/services/event/eventService';
import { registerForEvent } from '../src/services/ticket/ticketService';
import {
  approveRefundRequest,
  createRefundRequest,
  fetchRefundRequests,
  rejectRefundRequest,
} from '../src/services/refund/refundService';
import type { CreateEventData } from '../src/types/event';

const TEST_PREFIX = 'test-refund-';
const TEST_USER_ID = `${TEST_PREFIX}user`;
const TEST_ORGANIZER_ID = `${TEST_PREFIX}organizer`;

const logPass = (step: string, message: string) => {
  console.log(`[${step}] PASS - ${message}`);
};

const logFail = (step: string, message: string) => {
  console.error(`[${step}] FAIL - ${message}`);
};

function assert(condition: boolean, step: string, message: string): void {
  if (!condition) {
    logFail(step, message);
    throw new Error(message);
  }

  logPass(step, message);
}

function getErrorCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code;
}

async function expectError(
  step: string,
  label: string,
  fn: () => Promise<unknown>,
  expectedCode: string
): Promise<void> {
  try {
    await fn();
    logFail(step, `${label} should have failed`);
    throw new Error(`${label} should have failed`);
  } catch (error) {
    const code = getErrorCode(error);
    assert(
      code === expectedCode,
      step,
      `${label} failed with code "${expectedCode}"`
    );
  }
}

async function cleanupRefundsForEvent(eventId: string): Promise<void> {
  const refundQuery = query(
    collection(db, COLLECTIONS.REFUNDS),
    where('eventId', '==', eventId)
  );
  const refundSnapshot = await getDocs(refundQuery);

  await Promise.all(
    refundSnapshot.docs.map((refundDoc) =>
      deleteDoc(doc(db, COLLECTIONS.REFUNDS, refundDoc.id))
    )
  );
}

async function cleanupTicketsForEvent(eventId: string): Promise<void> {
  const ticketQuery = query(
    collection(db, COLLECTIONS.TICKETS),
    where('eventId', '==', eventId)
  );
  const ticketSnapshot = await getDocs(ticketQuery);

  await Promise.all(
    ticketSnapshot.docs.map((ticketDoc) =>
      deleteDoc(doc(db, COLLECTIONS.TICKETS, ticketDoc.id))
    )
  );
}

async function runRefundTests(): Promise<void> {
  console.log('\n========================================');
  console.log(' EventSphere - Refund Request Flow Test');
  console.log('========================================\n');

  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    logFail(
      'ENV',
      'Missing VITE_FIREBASE_PROJECT_ID. Add Firebase values to .env first.'
    );
    process.exit(1);
  }

  const eventData: CreateEventData = {
    title: `${TEST_PREFIX} Refund Test Event 2026`,
    description: 'Temporary event for refund request backend test.',
    eventType: 'Seminar',
    date: '2026-12-15',
    time: '16:00',
    location: 'Test Hall',
    capacity: 25,
    tags: ['refund', 'test'],
  };

  let createdEventId: string | undefined;
  let createdTicketDocId: string | undefined;

  try {
    console.log('[1] Creating temporary event and ticket...');
    const seedEvent = await createEvent(eventData, TEST_ORGANIZER_ID);
    createdEventId = seedEvent.id;

    const seedTicket = await registerForEvent({
      attendeeId: TEST_USER_ID,
      eventId: createdEventId,
      eventTitle: seedEvent.title,
      eventDate: seedEvent.date,
      userEmail: 'refund-test@example.com',
      userName: 'Refund Test User',
    });
    createdTicketDocId = seedTicket.id;

    assert(!!createdEventId, '1', `Test event created (${createdEventId})`);
    assert(!!createdTicketDocId, '1', `Test ticket created (${createdTicketDocId})`);

    const eventId = createdEventId;
    const ticketDocId = createdTicketDocId;

    console.log('\n[2] Creating refund request...');
    const refund = await createRefundRequest(
      ticketDocId,
      TEST_USER_ID,
      'Unable to attend the event.'
    );

    assert(refund.id === ticketDocId, '2', 'Refund ID is tied to ticket document');
    assert(refund.ticketDocId === ticketDocId, '2', 'Refund ticketDocId matches ticket');
    assert(refund.ticketId === seedTicket.ticketId, '2', 'Refund public ticketId matches ticket');
    assert(refund.userId === TEST_USER_ID, '2', 'Refund userId matches attendee');
    assert(refund.eventId === eventId, '2', 'Refund eventId matches event');
    assert(refund.status === 'pending', '2', 'Refund starts as pending');
    assert(!!refund.createdAt, '2', 'Refund has createdAt timestamp');
    assert(!!refund.updatedAt, '2', 'Refund has updatedAt timestamp');

    console.log('\n[3] Testing duplicate prevention...');
    await expectError(
      '3',
      'Duplicate refund request',
      () =>
        createRefundRequest(
          ticketDocId,
          TEST_USER_ID,
          'Trying to request another refund.'
        ),
      'duplicate-refund-request'
    );

    const refundQuery = query(
      collection(db, COLLECTIONS.REFUNDS),
      where('ticketDocId', '==', ticketDocId)
    );
    const refundSnapshot = await getDocs(refundQuery);
    assert(
      refundSnapshot.size === 1,
      '3',
      `Exactly one refund document exists for ticket (${refundSnapshot.size})`
    );

    console.log('\n[4] Approving refund request...');
    const approvedRefund = await approveRefundRequest(refund.id);
    assert(approvedRefund.status === 'approved', '4', 'Refund status updated to approved');
    assert(
      approvedRefund.updatedAt.toMillis() >= refund.updatedAt.toMillis(),
      '4',
      'updatedAt changed on approve'
    );

    console.log('\n[5] Rejecting refund request...');
    const rejectedRefund = await rejectRefundRequest(refund.id);
    assert(rejectedRefund.status === 'rejected', '5', 'Refund status updated to rejected');
    assert(
      rejectedRefund.updatedAt.toMillis() >= approvedRefund.updatedAt.toMillis(),
      '5',
      'updatedAt changed on reject'
    );

    console.log('\n[6] Fetching refund requests for event...');
    const refunds = await fetchRefundRequests(eventId);
    assert(refunds.length === 1, '6', 'One refund request returned for event');
    assert(refunds[0].id === refund.id, '6', 'Fetched refund matches created refund');
    assert(refunds[0].status === 'rejected', '6', 'Fetched refund has latest status');

    console.log('\n========================================');
    console.log('PASS - ALL REFUND REQUEST FLOW TESTS PASSED');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('FAIL - REFUND REQUEST FLOW TEST FAILED');
    console.error('========================================\n');
    console.error(error);
    process.exitCode = 1;
  } finally {
    console.log('\n[7] Cleaning up test data...');

    try {
      if (createdEventId) {
        await cleanupRefundsForEvent(createdEventId);
        logPass('7', 'Refund test documents removed');

        await cleanupTicketsForEvent(createdEventId);
        logPass('7', 'Ticket test documents removed');

        await deleteEvent(createdEventId);
        logPass('7', 'Event test document removed');
      } else {
        logPass('7', 'No test event was created');
      }
    } catch (cleanupError) {
      logFail('7', 'Cleanup encountered an issue');
      console.error(cleanupError);
      process.exitCode = 1;
    }
  }
}

runRefundTests();
