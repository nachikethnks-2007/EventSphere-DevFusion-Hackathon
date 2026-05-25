/**
 * Payment Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PaymentTicketPriceType = 'free' | 'paid';

export interface PaymentTicketTypeInput {
  ticketTypeId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface PaymentOrderItem {
  ticketTypeId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  priceType: PaymentTicketPriceType;
  lineTotal: number;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  eventId: string;
  items: PaymentOrderItem[];
  subtotal: number;
  total: number;
  currency: string;
  paymentStatus: PaymentStatus;
  sandboxPaymentId?: string;
  createdAt: Timestamp;
  paidAt?: Timestamp;
  failedAt?: Timestamp;
}

export interface CreatePaymentOrderData {
  userId: string;
  eventId: string;
  ticketTypes: PaymentTicketTypeInput[];
  currency?: string;
}
