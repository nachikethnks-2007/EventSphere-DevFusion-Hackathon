/**
 * QR Service
 * Handles QR code generation and validation
 */

import { fetchTicketByTicketId } from '../ticket/ticketService';
import { Ticket } from '../../types/ticket';

/**
 * Generate QR data for a ticket
 * @param ticketId Ticket ID
 * @returns QR data string
 */
export function generateQRData(ticketId: string): string {
  // QR data contains ticket ID and timestamp for validation
  const data = {
    ticketId,
    generatedAt: Date.now(),
  };
  
  return JSON.stringify(data);
}

/**
 * Validate QR data
 * @param qrData QR data string
 * @returns Promise with validation result
 */
export async function validateQR(
  qrData: string
): Promise<{ valid: boolean; ticket?: Ticket; message: string }> {
  try {
    // Parse QR data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      return {
        valid: false,
        message: 'Invalid QR code format',
      };
    }

    const { ticketId } = parsedData;
    
    if (!ticketId) {
      return {
        valid: false,
        message: 'Missing ticket ID in QR code',
      };
    }

    // Fetch ticket
    const ticket = await fetchTicketByTicketId(ticketId);
    
    if (!ticket) {
      return {
        valid: false,
        message: 'Ticket not found',
      };
    }

    // Check if already scanned
    if (ticket.scanned) {
      return {
        valid: false,
        message: 'Ticket already scanned',
        ticket,
      };
    }

    // Check if event is in the past (optional validation)
    const eventDate = new Date(ticket.eventDate);
    const now = new Date();
    if (eventDate < now) {
      return {
        valid: false,
        message: 'Event has already passed',
        ticket,
      };
    }

    return {
      valid: true,
      message: 'Valid ticket',
      ticket,
    };
  } catch (error) {
    console.error('Validate QR error:', error);
    return {
      valid: false,
      message: 'Error validating QR code',
    };
  }
}

/**
 * Check if QR data is expired (optional time-based validation)
 * @param qrData QR data string
 * @param expiryHours Hours before QR expires (default: 24)
 * @returns Boolean indicating if QR is expired
 */
export function isQRExpired(qrData: string, expiryHours: number = 24): boolean {
  try {
    const parsedData = JSON.parse(qrData);
    const { generatedAt } = parsedData;
    
    if (!generatedAt) {
      return true;
    }

    const expiryTime = generatedAt + (expiryHours * 60 * 60 * 1000);
    return Date.now() > expiryTime;
  } catch {
    return true;
  }
}
