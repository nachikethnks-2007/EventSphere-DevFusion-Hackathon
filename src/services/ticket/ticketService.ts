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
  updateDoc,
  query,
  where,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Ticket, CreateTicketData } from '../../types/ticket';

/**
 * Register a ticket for an event
 * @param ticketData Ticket data
 * @returns Promise with created ticket
 */
export async function registerTicket(
  ticketData: CreateTicketData
): Promise<Ticket> {
  try {
    // Generate unique ticket ID
    const ticketId = generateTicketId();

    const ticketWithMetadata = {
      ...ticketData,
      ticketId,
      createdAt: Timestamp.now(),
      scanned: false,
    };

    const docRef = await addDoc(collection(db, 'tickets'), ticketWithMetadata);
    
    const ticketDoc = await getDoc(docRef);
    return {
      id: ticketDoc.id,
      ...ticketDoc.data(),
    } as Ticket;
  } catch (error) {
    console.error('Register ticket error:', error);
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
 * @returns Promise with ticket data
 */
export async function fetchTicketByTicketId(ticketId: string): Promise<Ticket | null> {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('ticketId', '==', ticketId)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Ticket;
  } catch (error) {
    console.error('Fetch ticket error:', error);
    throw error;
  }
}

/**
 * Fetch tickets by user
 * @param userId User ID
 * @returns Promise with array of tickets
 */
export async function fetchTicketsByUser(userId: string): Promise<Ticket[]> {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId),
      where('scanned', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Ticket[];
  } catch (error) {
    console.error('Fetch user tickets error:', error);
    throw error;
  }
}

/**
 * Fetch tickets by event
 * @param eventId Event ID
 * @returns Promise with array of tickets
 */
export async function fetchTicketsByEvent(eventId: string): Promise<Ticket[]> {
  try {
    const q = query(
      collection(db, 'tickets'),
      where('eventId', '==', eventId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Ticket[];
  } catch (error) {
    console.error('Fetch event tickets error:', error);
    throw error;
  }
}

/**
 * Mark ticket as scanned (with duplicate prevention)
 * @param ticketId Ticket ID
 * @returns Promise with success status and message
 */
export async function markTicketAsScanned(
  ticketId: string
): Promise<{ success: boolean; message: string; ticket?: Ticket }> {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    
    // Use transaction to prevent duplicate scans
    const result = await runTransaction(db, async (transaction) => {
      const ticketDoc = await transaction.get(ticketRef);
      
      if (!ticketDoc.exists()) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketDoc.data() as Ticket;
      
      if (ticketData.scanned) {
        return {
          success: false,
          message: 'Ticket already scanned',
          ticket: ticketData,
        };
      }

      transaction.update(ticketRef, {
        scanned: true,
        scannedAt: Timestamp.now(),
      });

      return {
        success: true,
        message: 'Ticket scanned successfully',
        ticket: { ...ticketData, scanned: true },
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
export async function getEventAttendanceCount(eventId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'tickets'),
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
