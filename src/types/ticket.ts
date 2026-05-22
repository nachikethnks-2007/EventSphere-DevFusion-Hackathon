/**
 * Ticket Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export interface Ticket {
  id: string;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: Timestamp;
  scanned: boolean;
  scannedAt?: Timestamp;
}

export interface CreateTicketData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userId: string;
  userEmail: string;
  userName: string;
}
