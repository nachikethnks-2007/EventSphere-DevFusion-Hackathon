/**
 * Payment Service
 * Lightweight sandbox payment order flow for MVP checkout
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../constants/collections';
import { createError } from '../../utils/errorUtils';
import type {
  CreatePaymentOrderData,
  PaymentOrder,
  PaymentOrderItem,
  PaymentStatus,
  PaymentTicketTypeInput,
} from '../../types/payment';

const DEFAULT_CURRENCY = 'INR';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function validateTicketType(
  ticketType: PaymentTicketTypeInput,
  index: number
): void {
  if (!ticketType.name.trim()) {
    throw createError(
      `Ticket type at index ${index} requires a name`,
      'invalid-ticket-type'
    );
  }

  if (!Number.isFinite(ticketType.unitPrice) || ticketType.unitPrice < 0) {
    throw createError(
      `Ticket type "${ticketType.name}" requires a unitPrice of 0 or more`,
      'invalid-ticket-price'
    );
  }

  if (!Number.isInteger(ticketType.quantity) || ticketType.quantity <= 0) {
    throw createError(
      `Ticket type "${ticketType.name}" requires a positive whole-number quantity`,
      'invalid-ticket-quantity'
    );
  }
}

function buildOrderItems(
  ticketTypes: PaymentTicketTypeInput[]
): PaymentOrderItem[] {
  return ticketTypes.map((ticketType, index) => {
    validateTicketType(ticketType, index);

    const unitPrice = roundMoney(ticketType.unitPrice);
    const lineTotal = roundMoney(unitPrice * ticketType.quantity);

    return {
      ticketTypeId: ticketType.ticketTypeId,
      name: ticketType.name.trim(),
      unitPrice,
      quantity: ticketType.quantity,
      priceType: unitPrice === 0 ? 'free' : 'paid',
      lineTotal,
    };
  });
}

function generateSandboxPaymentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `SANDBOX-PAY-${timestamp}-${random}`.toUpperCase();
}

async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<PaymentOrder> {
  try {
    const orderRef = doc(db, COLLECTIONS.PAYMENTS, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw createError(
        `Payment order not found for id: ${orderId}`,
        'payment-order-not-found'
      );
    }

    const now = Timestamp.now();
    await updateDoc(orderRef, {
      paymentStatus,
      ...(paymentStatus === 'paid'
        ? { paidAt: now, sandboxPaymentId: generateSandboxPaymentId() }
        : { failedAt: now }),
    });

    return fetchPaymentOrder(orderId);
  } catch (error) {
    console.error(`Update payment status (${paymentStatus}) error:`, error);
    throw error;
  }
}

/**
 * Create a sandbox payment order for multi-ticket checkout.
 */
export async function createPaymentOrder(
  orderData: CreatePaymentOrderData
): Promise<PaymentOrder> {
  try {
    const userId = orderData.userId.trim();
    const eventId = orderData.eventId.trim();

    if (!userId) {
      throw createError('User ID is required', 'invalid-payment-user');
    }

    if (!eventId) {
      throw createError('Event ID is required', 'invalid-payment-event');
    }

    if (!orderData.ticketTypes.length) {
      throw createError(
        'At least one ticket type is required',
        'empty-payment-order'
      );
    }

    const items = buildOrderItems(orderData.ticketTypes);
    const subtotal = roundMoney(
      items.reduce((sum, item) => sum + item.lineTotal, 0)
    );

    const paymentOrder = {
      userId,
      eventId,
      items,
      subtotal,
      total: subtotal,
      currency: orderData.currency?.trim().toUpperCase() || DEFAULT_CURRENCY,
      paymentStatus: 'pending' as PaymentStatus,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.PAYMENTS),
      paymentOrder
    );

    return fetchPaymentOrder(docRef.id);
  } catch (error) {
    console.error('Create payment order error:', error);
    throw error;
  }
}

/**
 * Simulate a successful sandbox payment.
 */
export async function completePayment(orderId: string): Promise<PaymentOrder> {
  return updatePaymentStatus(orderId, 'paid');
}

/**
 * Simulate a failed sandbox payment.
 */
export async function failPayment(orderId: string): Promise<PaymentOrder> {
  return updatePaymentStatus(orderId, 'failed');
}

/**
 * Fetch a full payment order summary.
 */
export async function fetchPaymentOrder(orderId: string): Promise<PaymentOrder> {
  try {
    const orderSnap = await getDoc(doc(db, COLLECTIONS.PAYMENTS, orderId));

    if (!orderSnap.exists()) {
      throw createError(
        `Payment order not found for id: ${orderId}`,
        'payment-order-not-found'
      );
    }

    return {
      id: orderSnap.id,
      ...orderSnap.data(),
    } as PaymentOrder;
  } catch (error) {
    console.error('Fetch payment order error:', error);
    throw error;
  }
}
