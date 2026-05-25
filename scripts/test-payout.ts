/**
 * Organizer Payout Simulation integration test
 *
 * Run: npx vite-node scripts/test-payout.ts
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { COLLECTIONS } from '../src/constants/collections';
import { createEvent, deleteEvent } from '../src/services/event/eventService';
import { createPaymentOrder, completePayment } from '../src/services/payment/paymentService';
import { registerForEvent } from '../src/services/ticket/ticketService';
import {
  approveRefundRequest,
  createRefundRequest,
} from '../src/services/refund/refundService';
import {
  createPayoutRecord,
  fetchPayoutHistory,
  getOrganizerPayoutSummary,
  processPayout,
} from '../src/services/payout/payoutService';
import type { CreateEventData } from '../src/types/event';

const TEST_PREFIX = 'test-payout-';
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

async function cleanupByEvent(collectionName: string, eventId: string): Promise<void> {
  const cleanupQuery = query(
    collection(db, collectionName),
    where('eventId', '==', eventId)
  );
  const snapshot = await getDocs(cleanupQuery);

  await Promise.all(
    snapshot.docs.map((cleanupDoc) =>
      deleteDoc(doc(db, collectionName, cleanupDoc.id))
    )
  );
}

async function cleanupPayoutsForOrganizer(organizerId: string): Promise<void> {
  const payoutQuery = query(
    collection(db, COLLECTIONS.PAYOUTS),
    where('organizerId', '==', organizerId)
  );
  const payoutSnapshot = await getDocs(payoutQuery);

  await Promise.all(
    payoutSnapshot.docs.map((payoutDoc) =>
      deleteDoc(doc(db, COLLECTIONS.PAYOUTS, payoutDoc.id))
    )
  );
}

async function runPayoutTests(): Promise<void> {
  console.log('\n========================================');
  console.log(' EventSphere - Organizer Payout Test');
  console.log('========================================\n');

  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    logFail(
      'ENV',
      'Missing VITE_FIREBASE_PROJECT_ID. Add Firebase values to .env first.'
    );
    process.exit(1);
  }

  const eventData: CreateEventData = {
    title: `${TEST_PREFIX} Payout Test Event 2026`,
    description: 'Temporary event for organizer payout simulation test.',
    eventType: 'Conference',
    date: '2026-12-28',
    time: '11:00',
    location: 'Payout Test Hall',
    capacity: 100,
    tags: ['payout', 'test'],
    priceType: 'paid',
    price: 100,
  };

  let createdEventId: string | undefined;

  try {
    console.log('[1] Creating temporary event...');
    const seedEvent = await createEvent(eventData, TEST_ORGANIZER_ID);
    createdEventId = seedEvent.id;
    const eventId = createdEventId;

    assert(!!eventId, '1', `Test event created (${eventId})`);

    console.log('\n[2] Creating paid payment orders...');
    const firstOrder = await createPaymentOrder({
      userId: TEST_USER_ID,
      eventId,
      ticketTypes: [
        { ticketTypeId: 'vip', name: 'VIP', unitPrice: 100, quantity: 2 },
        { ticketTypeId: 'community', name: 'Community Pass', unitPrice: 0, quantity: 1 },
      ],
    });
    const secondOrder = await createPaymentOrder({
      userId: TEST_USER_ID,
      eventId,
      ticketTypes: [
        { ticketTypeId: 'general', name: 'General', unitPrice: 100, quantity: 1 },
      ],
    });

    await completePayment(firstOrder.id);
    await completePayment(secondOrder.id);
    assert(true, '2', 'Two paid payment orders created');

    console.log('\n[3] Creating approved refund worth 50...');
    const ticket = await registerForEvent({
      attendeeId: TEST_USER_ID,
      eventId,
      eventTitle: seedEvent.title,
      eventDate: seedEvent.date,
      userEmail: 'payout-test@example.com',
      userName: 'Payout Test User',
    });

    await updateDoc(doc(db, COLLECTIONS.TICKETS, ticket.id), {
      price: 50,
    });

    const refund = await createRefundRequest(
      ticket.id,
      TEST_USER_ID,
      'Approved refund for payout deduction.'
    );
    await approveRefundRequest(refund.id);
    assert(true, '3', 'Approved refund created');

    console.log('\n[4] Calculating payout summary...');
    const summary = await getOrganizerPayoutSummary(TEST_ORGANIZER_ID);
    assert(summary.totalRevenue === 300, '4', 'totalRevenue is 300');
    assert(summary.refundedAmount === 50, '4', 'refundedAmount is 50');
    assert(summary.platformFee === 30, '4', 'platformFee is 10% of totalRevenue');
    assert(summary.payoutAmount === 220, '4', 'payoutAmount is 220');

    console.log('\n[5] Creating payout record...');
    const payoutRecord = await createPayoutRecord(TEST_ORGANIZER_ID);
    assert(!!payoutRecord.id, '5', 'Payout record created');
    assert(payoutRecord.status === 'pending', '5', 'Payout starts as pending');
    assert(payoutRecord.totalRevenue === 300, '5', 'Payout record snapshots revenue');
    assert(payoutRecord.refundedAmount === 50, '5', 'Payout record snapshots refunds');
    assert(payoutRecord.platformFee === 30, '5', 'Payout record snapshots platform fee');
    assert(payoutRecord.payoutAmount === 220, '5', 'Payout record snapshots payout amount');
    assert(!!payoutRecord.createdAt, '5', 'Payout record has createdAt timestamp');
    assert(!!payoutRecord.updatedAt, '5', 'Payout record has updatedAt timestamp');

    console.log('\n[6] Processing payout...');
    const processedPayout = await processPayout(payoutRecord.id);
    assert(processedPayout.status === 'processed', '6', 'Payout status updated to processed');
    assert(!!processedPayout.processedAt, '6', 'Processed timestamp was added');

    console.log('\n[7] Fetching payout history...');
    const payoutHistory = await fetchPayoutHistory(TEST_ORGANIZER_ID);
    assert(payoutHistory.length >= 1, '7', 'Payout history returns records');
    assert(payoutHistory[0].id === payoutRecord.id, '7', 'Newest payout appears first');
    assert(payoutHistory[0].status === 'processed', '7', 'History shows processed status');

    console.log('\n========================================');
    console.log('PASS - ALL ORGANIZER PAYOUT TESTS PASSED');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('FAIL - ORGANIZER PAYOUT TEST FAILED');
    console.error('========================================\n');
    console.error(error);
    process.exitCode = 1;
  } finally {
    console.log('\n[8] Cleaning up test data...');

    try {
      if (createdEventId) {
        await cleanupPayoutsForOrganizer(TEST_ORGANIZER_ID);
        logPass('8', 'Payout test documents removed');

        await cleanupByEvent(COLLECTIONS.REFUNDS, createdEventId);
        logPass('8', 'Refund test documents removed');

        await cleanupByEvent(COLLECTIONS.TICKETS, createdEventId);
        logPass('8', 'Ticket test documents removed');

        await cleanupByEvent(COLLECTIONS.PAYMENTS, createdEventId);
        logPass('8', 'Payment test documents removed');

        await deleteEvent(createdEventId);
        logPass('8', 'Event test document removed');
      } else {
        logPass('8', 'No test event was created');
      }
    } catch (cleanupError) {
      logFail('8', 'Cleanup encountered an issue');
      console.error(cleanupError);
      process.exitCode = 1;
    }
  }
}

runPayoutTests();
