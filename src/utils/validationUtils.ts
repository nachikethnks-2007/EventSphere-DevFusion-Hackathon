/**
 * Validation Utility Functions
 * Helper functions for data validation
 */

/**
 * Validate email format
 * @param email Email string
 * @returns Boolean
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password Password string
 * @returns Boolean
 */
export function isValidPassword(password: string): boolean {
  // Minimum 6 characters
  return password.length >= 6;
}

/**
 * Validate event date format (YYYY-MM-DD)
 * @param dateString Date string
 * @returns Boolean
 */
export function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate time format (HH:MM)
 * @param timeString Time string
 * @returns Boolean
 */
export function isValidTimeFormat(timeString: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Validate event capacity
 * @param capacity Number
 * @returns Boolean
 */
export function isValidCapacity(capacity: number): boolean {
  return capacity > 0 && Number.isInteger(capacity);
}

/**
 * Validate ticket ID format
 * @param ticketId Ticket ID string
 * @returns Boolean
 */
export function isValidTicketId(ticketId: string): boolean {
  // Expected format: TICK-xxxx-xxxx
  const ticketRegex = /^TICK-[a-z0-9]+-[a-z0-9]+$/i;
  return ticketRegex.test(ticketId);
}

/**
 * Sanitize user input to prevent XSS
 * @param input User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate required fields
 * @param data Object with fields
 * @param requiredFields Array of required field names
 * @returns Boolean
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): boolean {
  return requiredFields.every(field => {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Validate event price based on price type
 * @param priceType The type of price ('free' or 'paid')
 * @param price Optional price number
 * @returns Boolean indicating if valid
 */
export function isValidEventPrice(
  priceType: 'free' | 'paid' | string,
  price?: number
): boolean {
  if (priceType === 'paid') {
    return price !== undefined && price !== null && price > 0;
  }
  if (priceType === 'free') {
    return price === undefined || price === null || price === 0;
  }
  return true;
}

