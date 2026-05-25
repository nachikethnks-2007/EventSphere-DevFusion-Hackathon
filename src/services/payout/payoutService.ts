/**
 * Payout Service
 * Simulates organizer payout summaries and payout history
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../constants/collections';
import { createError } from '../../utils/errorUtils';
import type { Event } from '../../types/event';
import type { PaymentOrder } from '../../types/payment';
import type { PayoutRecord, PayoutStatus, OrganizerPayoutSummary } from '../../types/payout';
import type { RefundRequest } from '../../types/refund';
import type { Ticket } from '../../types/ticket';

const PLATFORM_FEE_RATE = 0.1;

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function validateOrganizerId(organizerId: string): string {
  const trimmedOrganizerId = organizerId.trim();

  if (!trimmedOrganizerId) {
    throw createError('Organizer ID is required', 'invalid-organizer-id');
  }

  return trimmedOrganizerId;
}

async function fetchOrganizerEvents(organizerId: string): Promise<Event[]> {
  const eventsQuery = query(
    collection(db, COLLECTIONS.EVENTS),
    where('organizerId', '==', organizerId)
  );
  const eventSnapshot = await getDocs(eventsQuery);

  return eventSnapshot.docs.map((eventDoc) => ({
    id: eventDoc.id,
    ...eventDoc.data(),
  })) as Event[];
}

async function fetchPaidPaymentsForEvent(eventId: string): Promise<PaymentOrder[]> {
  const paymentQuery = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where('eventId', '==', eventId)
  );
  const paymentSnapshot = await getDocs(paymentQuery);

  return paymentSnapshot.docs
    .map((paymentDoc) => ({
      id: paymentDoc.id,
      ...paymentDoc.data(),
    }) as PaymentOrder)
    .filter((paymentOrder) => paymentOrder.paymentStatus === 'paid');
}

async function fetchApprovedRefundsForEvent(eventId: string): Promise<RefundRequest[]> {
  const refundQuery = query(
    collection(db, COLLECTIONS.REFUNDS),
    where('eventId', '==', eventId)
  );
  const refundSnapshot = await getDocs(refundQuery);

  return refundSnapshot.docs
    .map((refundDoc) => ({
      id: refundDoc.id,
      ...refundDoc.data(),
    }) as RefundRequest)
    .filter((refundRequest) => refundRequest.status === 'approved');
}

async function getRefundAmount(refundRequest: RefundRequest): Promise<number> {
  const ticketDoc = await getDoc(
    doc(db, COLLECTIONS.TICKETS, refundRequest.ticketDocId)
  );

  if (!ticketDoc.exists()) {
    return 0;
  }

  const ticket = ticketDoc.data() as Ticket;
  return roundMoney(ticket.price ?? 0);
}

async function fetchPayoutRecordById(payoutId: string): Promise<PayoutRecord> {
  const payoutSnap = await getDoc(doc(db, COLLECTIONS.PAYOUTS, payoutId));

  if (!payoutSnap.exists()) {
    throw createError(
      `Payout record not found for id: ${payoutId}`,
      'payout-not-found'
    );
  }

  return {
    id: payoutSnap.id,
    ...payoutSnap.data(),
  } as PayoutRecord;
}

/**
 * Calculate organizer payout summary from paid payment orders and approved refunds.
 */
export async function getOrganizerPayoutSummary(
  organizerId: string
): Promise<OrganizerPayoutSummary> {
  try {
    const validOrganizerId = validateOrganizerId(organizerId);
    const events = await fetchOrganizerEvents(validOrganizerId);

    const eventSummaries = await Promise.all(
      events.map(async (event) => {
        const [paidPayments, approvedRefunds] = await Promise.all([
          fetchPaidPaymentsForEvent(event.id),
          fetchApprovedRefundsForEvent(event.id),
        ]);

        const eventRevenue = paidPayments.reduce(
          (sum, paymentOrder) => sum + paymentOrder.total,
          0
        );
        const refundAmounts = await Promise.all(
          approvedRefunds.map((refundRequest) => getRefundAmount(refundRequest))
        );
        const eventRefundedAmount = refundAmounts.reduce(
          (sum, refundAmount) => sum + refundAmount,
          0
        );

        return {
          revenue: eventRevenue,
          refundedAmount: eventRefundedAmount,
        };
      })
    );

    const totalRevenue = roundMoney(
      eventSummaries.reduce((sum, summary) => sum + summary.revenue, 0)
    );
    const refundedAmount = roundMoney(
      eventSummaries.reduce((sum, summary) => sum + summary.refundedAmount, 0)
    );
    const platformFee = roundMoney(totalRevenue * PLATFORM_FEE_RATE);
    const payoutAmount = roundMoney(totalRevenue - refundedAmount - platformFee);

    return {
      organizerId: validOrganizerId,
      totalRevenue,
      refundedAmount,
      platformFee,
      payoutAmount,
    };
  } catch (error) {
    console.error('Get organizer payout summary error:', error);
    throw error;
  }
}

/**
 * Create a payout history entry from the current organizer payout summary.
 */
export async function createPayoutRecord(
  organizerId: string
): Promise<PayoutRecord> {
  try {
    const summary = await getOrganizerPayoutSummary(organizerId);
    const now = Timestamp.now();

    const payoutRecord = {
      organizerId: summary.organizerId,
      totalRevenue: summary.totalRevenue,
      refundedAmount: summary.refundedAmount,
      platformFee: summary.platformFee,
      payoutAmount: summary.payoutAmount,
      status: 'pending' as PayoutStatus,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.PAYOUTS),
      payoutRecord
    );

    return fetchPayoutRecordById(docRef.id);
  } catch (error) {
    console.error('Create payout record error:', error);
    throw error;
  }
}

/**
 * Mark a payout record as processed.
 */
export async function processPayout(payoutId: string): Promise<PayoutRecord> {
  try {
    const payoutRef = doc(db, COLLECTIONS.PAYOUTS, payoutId);
    const payoutSnap = await getDoc(payoutRef);

    if (!payoutSnap.exists()) {
      throw createError(
        `Payout record not found for id: ${payoutId}`,
        'payout-not-found'
      );
    }

    const now = Timestamp.now();
    await updateDoc(payoutRef, {
      status: 'processed' as PayoutStatus,
      updatedAt: now,
      processedAt: now,
    });

    return fetchPayoutRecordById(payoutId);
  } catch (error) {
    console.error('Process payout error:', error);
    throw error;
  }
}

/**
 * Fetch organizer payout records, newest first.
 */
export async function fetchPayoutHistory(
  organizerId: string
): Promise<PayoutRecord[]> {
  try {
    const validOrganizerId = validateOrganizerId(organizerId);
    const payoutQuery = query(
      collection(db, COLLECTIONS.PAYOUTS),
      where('organizerId', '==', validOrganizerId)
    );
    const payoutSnapshot = await getDocs(payoutQuery);

    const payoutRecords = payoutSnapshot.docs.map((payoutDoc) => ({
      id: payoutDoc.id,
      ...payoutDoc.data(),
    })) as PayoutRecord[];

    return payoutRecords.sort(
      (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  } catch (error) {
    console.error('Fetch payout history error:', error);
    throw error;
  }
}
