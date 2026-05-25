/**
 * Payout Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export type PayoutStatus = 'pending' | 'processed';

export interface OrganizerPayoutSummary {
  organizerId: string;
  totalRevenue: number;
  refundedAmount: number;
  platformFee: number;
  payoutAmount: number;
}

export interface PayoutRecord {
  id: string;
  organizerId: string;
  totalRevenue: number;
  refundedAmount: number;
  platformFee: number;
  payoutAmount: number;
  status: PayoutStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processedAt?: Timestamp;
}
