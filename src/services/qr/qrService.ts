/**
 * QR + Attendance Service
 * Handles QR code generation, verification, and attendance marking
 */

import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Ticket } from '../../types/ticket';
import { COLLECTIONS } from '../../constants/collections';
import { fetchTicketByTicketId } from '../ticket/ticketService';

const QR_PREFIX = 'eventsphere://';

/**
 * Generate QR code payload for a ticket
 * @param eventId Event ID
 * @param ticketId Ticket ID
 * @returns QR data string in format eventsphere://{eventId}/{ticketId}
 */
export function generateQRCodeData(eventId: string, ticketId: string): string {
  return `${QR_PREFIX}${eventId}/${ticketId}`;
}

/**
 * Parse a QR payload into its eventId and ticketId components
 * @param qrData Raw QR string
 * @returns Parsed IDs or null if format is invalid
 */
function parseQRPayload(
  qrData: string
): { eventId: string; ticketId: string } | null {
  if (!qrData.startsWith(QR_PREFIX)) {
    return null;
  }

  const payload = qrData.slice(QR_PREFIX.length);
  const parts = payload.split('/');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  return { eventId: parts[0], ticketId: parts[1] };
}

/**
 * Verify a QR code payload
 * Parses the QR data, extracts eventId and ticketId, verifies the ticket
 * exists in Firestore and has not already been scanned
 * @param qrData QR data string
 * @returns Verification result with ticket data if valid
 */
export async function verifyQRCode(
  qrData: string
): Promise<{ valid: boolean; ticket?: Ticket; message: string }> {
  try {
    const parsed = parseQRPayload(qrData);

    if (!parsed) {
      return {
        valid: false,
        message: 'Invalid QR code format',
      };
    }

    const { eventId, ticketId } = parsed;

    const ticket = await fetchTicketByTicketId(ticketId);

    if (!ticket) {
      return {
        valid: false,
        message: 'Ticket not found',
      };
    }

    if (ticket.eventId !== eventId) {
      return {
        valid: false,
        message: 'Ticket does not match event',
        ticket,
      };
    }

    if (ticket.ticketStatus === 'scanned') {
      return {
        valid: false,
        message: 'Ticket already scanned',
        ticket,
      };
    }

    if (ticket.ticketStatus === 'cancelled') {
      return {
        valid: false,
        message: 'Ticket has been cancelled',
        ticket,
      };
    }

    return {
      valid: true,
      message: 'Valid ticket',
      ticket,
    };
  } catch (error) {
    console.error('Verify QR code error:', error);
    return {
      valid: false,
      message: 'Error verifying QR code',
    };
  }
}

/**
 * Mark attendance by updating ticket status from registered to scanned
 * @param ticketDocId Firestore document ID of the ticket
 * @returns Updated ticket data
 */
export async function markAttendance(ticketDocId: string): Promise<Ticket> {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketDocId);
    const ticketDocSnap = await getDoc(ticketRef);

    if (!ticketDocSnap.exists()) {
      throw new Error(`Ticket not found for id: ${ticketDocId}`);
    }

    const ticketData = ticketDocSnap.data() as Omit<Ticket, 'id'>;

    if (ticketData.ticketStatus === 'scanned') {
      throw new Error('Ticket already scanned');
    }

    if (ticketData.ticketStatus === 'cancelled') {
      throw new Error('Cannot mark attendance for a cancelled ticket');
    }

    await updateDoc(ticketRef, {
      ticketStatus: 'scanned' as const,
      scanned: true,
      scannedAt: Timestamp.now(),
    });

    return {
      id: ticketDocSnap.id,
      ...ticketData,
      ticketStatus: 'scanned',
      scanned: true,
    } as Ticket;
  } catch (error) {
    console.error('Mark attendance error:', error);
    throw error;
  }
}
