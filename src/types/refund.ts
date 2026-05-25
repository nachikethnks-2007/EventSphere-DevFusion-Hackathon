/**
 * Refund Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export type RefundStatus = 'pending' | 'approved' | 'rejected';

export interface RefundRequest {
  id: string;
  ticketDocId: string;
  ticketId: string;
  userId: string;
  eventId: string;
  reason: string;
  status: RefundStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateRefundRequestData {
  ticketId: string;
  userId: string;
  reason: string;
}
