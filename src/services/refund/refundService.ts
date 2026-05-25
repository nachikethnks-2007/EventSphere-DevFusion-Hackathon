/**
 * Refund Service
 * Handles refund request creation and organizer review flow
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../constants/collections';
import { createError } from '../../utils/errorUtils';
import type { RefundRequest, RefundStatus } from '../../types/refund';
import type { Ticket } from '../../types/ticket';

interface ResolvedTicket {
  docId: string;
  ticket: Ticket;
}

async function resolveTicket(ticketId: string): Promise<ResolvedTicket> {
  const ticketDocRef = doc(db, COLLECTIONS.TICKETS, ticketId);
  const ticketDocSnap = await getDoc(ticketDocRef);

  if (ticketDocSnap.exists()) {
    return {
      docId: ticketDocSnap.id,
      ticket: {
        id: ticketDocSnap.id,
        ...ticketDocSnap.data(),
      } as Ticket,
    };
  }

  const ticketQuery = query(
    collection(db, COLLECTIONS.TICKETS),
    where('ticketId', '==', ticketId)
  );
  const ticketSnapshot = await getDocs(ticketQuery);

  if (ticketSnapshot.empty) {
    throw createError(`Ticket not found for id: ${ticketId}`, 'ticket-not-found');
  }

  const ticketDoc = ticketSnapshot.docs[0];
  return {
    docId: ticketDoc.id,
    ticket: {
      id: ticketDoc.id,
      ...ticketDoc.data(),
    } as Ticket,
  };
}

async function fetchRefundById(refundId: string): Promise<RefundRequest> {
  const refundDocSnap = await getDoc(doc(db, COLLECTIONS.REFUNDS, refundId));

  if (!refundDocSnap.exists()) {
    throw createError(
      `Refund request not found for id: ${refundId}`,
      'refund-not-found'
    );
  }

  return {
    id: refundDocSnap.id,
    ...refundDocSnap.data(),
  } as RefundRequest;
}

async function updateRefundStatus(
  refundId: string,
  status: RefundStatus
): Promise<RefundRequest> {
  try {
    const refundRef = doc(db, COLLECTIONS.REFUNDS, refundId);
    const refundSnap = await getDoc(refundRef);

    if (!refundSnap.exists()) {
      throw createError(
        `Refund request not found for id: ${refundId}`,
        'refund-not-found'
      );
    }

    await updateDoc(refundRef, {
      status,
      updatedAt: Timestamp.now(),
    });

    return fetchRefundById(refundId);
  } catch (error) {
    console.error(`Update refund status (${status}) error:`, error);
    throw error;
  }
}

/**
 * Create a refund request for a ticket.
 * Accepts either the ticket Firestore document ID or the public ticketId.
 */
export async function createRefundRequest(
  ticketId: string,
  userId: string,
  reason: string
): Promise<RefundRequest> {
  try {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      throw createError('Refund reason is required', 'invalid-refund-reason');
    }

    const { docId: ticketDocId, ticket } = await resolveTicket(ticketId);

    if (ticket.attendeeId !== userId) {
      throw createError(
        'Refund request user does not match ticket owner',
        'refund-user-mismatch'
      );
    }

    const refundRef = doc(db, COLLECTIONS.REFUNDS, ticketDocId);
    const now = Timestamp.now();

    await runTransaction(db, async (transaction) => {
      const existingRefundSnap = await transaction.get(refundRef);

      if (existingRefundSnap.exists()) {
        throw createError(
          'Refund request already exists for this ticket',
          'duplicate-refund-request'
        );
      }

      transaction.set(refundRef, {
        ticketDocId,
        ticketId: ticket.ticketId,
        userId,
        eventId: ticket.eventId,
        reason: trimmedReason,
        status: 'pending' as RefundStatus,
        createdAt: now,
        updatedAt: now,
      });
    });

    return fetchRefundById(refundRef.id);
  } catch (error) {
    console.error('Create refund request error:', error);
    throw error;
  }
}

/**
 * Approve a refund request.
 */
export async function approveRefundRequest(
  refundId: string
): Promise<RefundRequest> {
  return updateRefundStatus(refundId, 'approved');
}

/**
 * Reject a refund request.
 */
export async function rejectRefundRequest(
  refundId: string
): Promise<RefundRequest> {
  return updateRefundStatus(refundId, 'rejected');
}

/**
 * Fetch all refund requests for an event, newest first.
 */
export async function fetchRefundRequests(
  eventId: string
): Promise<RefundRequest[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.REFUNDS),
      where('eventId', '==', eventId)
    );

    const querySnapshot = await getDocs(q);
    const refundRequests = querySnapshot.docs.map((refundDoc) => ({
      id: refundDoc.id,
      ...refundDoc.data(),
    })) as RefundRequest[];

    return refundRequests.sort(
      (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  } catch (error) {
    console.error('Fetch refund requests error:', error);
    throw error;
  }
}
