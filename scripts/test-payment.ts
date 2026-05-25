/**
 * Sandbox Payment Flow integration test
 *
 * Run: npx vite-node scripts/test-payment.ts
 */

import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { COLLECTIONS } from '../src/constants/collections';
import { createEvent, deleteEvent } from '../src/services/event/eventService';
import {
  completePayment,
  createPaymentOrder,
  failPayment,
  fetchPaymentOrder,
} from '../src/services/payment/paymentService';
import type { CreateEventData } from '../src/types/event';
import type { PaymentOrder } from '../src/types/payment';

const TEST_PREFIX = 'test-payment-';
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

async function cleanupPaymentsForEvent(eventId: string): Promise<void> {
  const paymentQuery = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where('eventId', '==', eventId)
  );
  const paymentSnapshot = await getDocs(paymentQuery);

  await Promise.all(
    paymentSnapshot.docs.map((paymentDoc) =>
      deleteDoc(doc(db, COLLECTIONS.PAYMENTS, paymentDoc.id))
    )
  );
}

function assertOrderTotals(
  step: string,
  order: PaymentOrder,
  expectedSubtotal: number
): void {
  assert(order.subtotal === expectedSubtotal, step, `Subtotal is ${expectedSubtotal}`);
  assert(order.total === expectedSubtotal, step, `Total is ${expectedSubtotal}`);
}

async function runPaymentTests(): Promise<void> {
  console.log('\n========================================');
  console.log(' EventSphere - Sandbox Payment Flow Test');
  console.log('========================================\n');

  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    logFail(
      'ENV',
      'Missing VITE_FIREBASE_PROJECT_ID. Add Firebase values to .env first.'
    );
    process.exit(1);
  }

  const eventData: CreateEventData = {
    title: `${TEST_PREFIX} Payment Test Event 2026`,
    description: 'Temporary event for sandbox payment backend test.',
    eventType: 'Conference',
    date: '2026-12-20',
    time: '10:00',
    location: 'Payment Test Hall',
    capacity: 100,
    tags: ['payment', 'test'],
    priceType: 'paid',
    price: 75,
  };

  let createdEventId: string | undefined;

  try {
    console.log('[1] Creating temporary event...');
    const seedEvent = await createEvent(eventData, TEST_ORGANIZER_ID);
    createdEventId = seedEvent.id;
    const eventId = createdEventId;

    assert(!!eventId, '1', `Test event created (${eventId})`);

    console.log('\n[2] Creating multi-ticket checkout order...');
    const order = await createPaymentOrder({
      userId: TEST_USER_ID,
      eventId,
      currency: 'INR',
      ticketTypes: [
        { ticketTypeId: 'vip', name: 'VIP', unitPrice: 75, quantity: 2 },
        { ticketTypeId: 'community', name: 'Community Pass', unitPrice: 0, quantity: 1 },
        { ticketTypeId: 'student', name: 'Student', unitPrice: 25, quantity: 3 },
      ],
    });

    assert(!!order.id, '2', 'Payment order created');
    assert(order.userId === TEST_USER_ID, '2', 'Order userId matches');
    assert(order.eventId === eventId, '2', 'Order eventId matches');
    assert(order.items.length === 3, '2', 'Order contains three ticket types');
    assert(order.items[0].lineTotal === 150, '2', 'VIP line total is 150');
    assert(order.items[1].priceType === 'free', '2', 'Free ticket type is supported');
    assert(order.items[1].lineTotal === 0, '2', 'Free ticket line total is 0');
    assert(order.items[2].lineTotal === 75, '2', 'Student line total is 75');
    assertOrderTotals('2', order, 225);
    assert(order.paymentStatus === 'pending', '2', 'Order starts as pending');
    assert(!!order.createdAt, '2', 'Order has createdAt timestamp');

    console.log('\n[3] Completing sandbox payment...');
    const paidOrder = await completePayment(order.id);
    assert(paidOrder.paymentStatus === 'paid', '3', 'Order status updated to paid');
    assert(!!paidOrder.sandboxPaymentId, '3', 'Sandbox payment id was added');
    assert(!!paidOrder.paidAt, '3', 'Paid timestamp was added');

    console.log('\n[4] Fetching paid order summary...');
    const fetchedPaidOrder = await fetchPaymentOrder(order.id);
    assert(fetchedPaidOrder.id === order.id, '4', 'Fetched order id matches');
    assert(fetchedPaidOrder.paymentStatus === 'paid', '4', 'Fetched order has paid status');
    assertOrderTotals('4', fetchedPaidOrder, 225);

    console.log('\n[5] Creating and failing a second sandbox order...');
    const secondOrder = await createPaymentOrder({
      userId: TEST_USER_ID,
      eventId,
      ticketTypes: [
        { ticketTypeId: 'general', name: 'General', unitPrice: 40, quantity: 1 },
      ],
    });

    assert(secondOrder.paymentStatus === 'pending', '5', 'Second order starts as pending');
    assertOrderTotals('5', secondOrder, 40);

    const failedOrder = await failPayment(secondOrder.id);
    assert(failedOrder.paymentStatus === 'failed', '5', 'Second order status updated to failed');
    assert(!!failedOrder.failedAt, '5', 'Failed timestamp was added');

    console.log('\n[6] Fetching failed order summary...');
    const fetchedFailedOrder = await fetchPaymentOrder(secondOrder.id);
    assert(
      fetchedFailedOrder.paymentStatus === 'failed',
      '6',
      'Fetched second order has failed status'
    );
    assertOrderTotals('6', fetchedFailedOrder, 40);

    console.log('\n========================================');
    console.log('PASS - ALL SANDBOX PAYMENT FLOW TESTS PASSED');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('FAIL - SANDBOX PAYMENT FLOW TEST FAILED');
    console.error('========================================\n');
    console.error(error);
    process.exitCode = 1;
  } finally {
    console.log('\n[7] Cleaning up test data...');

    try {
      if (createdEventId) {
        await cleanupPaymentsForEvent(createdEventId);
        logPass('7', 'Payment test documents removed');

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

runPaymentTests();
