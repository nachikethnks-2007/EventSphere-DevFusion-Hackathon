/**
 * Ticket Service
 * Handles ticket registration, generation, and attendance tracking
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Ticket, CreateTicketData } from '../../types/ticket';
import { COLLECTIONS } from '../../constants/collections';

/**
 * Register for an event (create a ticket/registration document)
 * @param ticketData Ticket registration data
 * @returns Promise with created ticket
 */
export async function registerForEvent(
  ticketData: CreateTicketData
): Promise<Ticket> {
  try {
    const ticketId = generateTicketId();
    const qrCodeData = `eventsphere://${ticketData.eventId}/${ticketId}`;

    const ticketWithMetadata = {
      ...ticketData,
      ticketId,
      ticketStatus: 'registered' as const,
      qrCodeData,
      registeredAt: Timestamp.now(),
      scanned: false,
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.TICKETS),
      ticketWithMetadata
    );

    const ticketDocSnap = await getDoc(docRef);
    return {
      id: ticketDocSnap.id,
      ...ticketDocSnap.data(),
    } as Ticket;
  } catch (error) {
    console.error('Register for event error:', error);
    throw error;
  }
}

/**
 * Generate unique ticket ID
 * @returns Unique ticket ID string
 */
function generateTicketId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TICK-${timestamp}-${random}`.toUpperCase();
}

/**
 * Fetch ticket by ticket ID
 * @param ticketId Ticket ID
 * @returns Promise with ticket data or null
 */
export async function fetchTicketByTicketId(
  ticketId: string
): Promise<Ticket | null> {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where('ticketId', '==', ticketId)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const ticketDoc = querySnapshot.docs[0];
    return {
      id: ticketDoc.id,
      ...ticketDoc.data(),
    } as Ticket;
  } catch (error) {
    console.error('Fetch ticket error:', error);
    throw error;
  }
}

/**
 * Fetch all tickets registered by a specific attendee
 * @param attendeeId Attendee's user ID
 * @returns Promise with array of tickets
 */
export async function fetchTicketsByUser(
  attendeeId: string
): Promise<Ticket[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where('attendeeId', '==', attendeeId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((ticketDoc) => ({
      id: ticketDoc.id,
      ...ticketDoc.data(),
    })) as Ticket[];
  } catch (error) {
    console.error('Fetch user tickets error:', error);
    throw error;
  }
}

/**
 * Fetch all tickets/registrations for a specific event
 * @param eventId Event ID
 * @returns Promise with array of tickets
 */
export async function fetchTicketsByEvent(
  eventId: string
): Promise<Ticket[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where('eventId', '==', eventId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((ticketDoc) => ({
      id: ticketDoc.id,
      ...ticketDoc.data(),
    })) as Ticket[];
  } catch (error) {
    console.error('Fetch event tickets error:', error);
    throw error;
  }
}

/**
 * Mark ticket as scanned (with duplicate prevention)
 * @param ticketId Ticket ID (Firestore document ID)
 * @returns Promise with success status and message
 */
export async function markTicketAsScanned(
  ticketId: string
): Promise<{ success: boolean; message: string; ticket?: Ticket }> {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);

    const result = await runTransaction(db, async (transaction) => {
      const ticketDocSnap = await transaction.get(ticketRef);

      if (!ticketDocSnap.exists()) {
        throw new Error(`Ticket not found for id: ${ticketId}`);
      }

      const ticketData = ticketDocSnap.data() as Ticket;

      if (ticketData.scanned) {
        return {
          success: false,
          message: 'Ticket already scanned',
          ticket: ticketData,
        };
      }

      transaction.update(ticketRef, {
        scanned: true,
        ticketStatus: 'scanned' as const,
        scannedAt: Timestamp.now(),
      });

      return {
        success: true,
        message: 'Ticket scanned successfully',
        ticket: { ...ticketData, scanned: true, ticketStatus: 'scanned' as const },
      };
    });

    return result;
  } catch (error) {
    console.error('Mark ticket scanned error:', error);
    throw error;
  }
}

/**
 * Get attendance count for an event
 * @param eventId Event ID
 * @returns Promise with attendance count
 */
export async function getEventAttendanceCount(
  eventId: string
): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where('eventId', '==', eventId),
      where('scanned', '==', true)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Get attendance count error:', error);
    throw error;
  }
}
