/**
 * Ticket Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export type TicketStatus = 'registered' | 'scanned' | 'cancelled';

export interface Ticket {
  id: string;
  ticketId: string;
  attendeeId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userEmail: string;
  userName: string;
  ticketStatus: TicketStatus;
  qrCodeData: string;
  registeredAt: Timestamp;
  scanned: boolean;
  scannedAt?: Timestamp;
  price?: number;
}

export interface CreateTicketData {
  attendeeId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userEmail: string;
  userName: string;
}
