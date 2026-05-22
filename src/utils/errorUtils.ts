/**
 * Error Utility Functions
 * Helper functions for error handling
 */

/**
 * Get user-friendly error message from Firebase error
 * @param error Error object
 * @returns User-friendly error message
 */
export function getFirebaseErrorMessage(error: any): string {
  const errorCode = error.code;
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

/**
 * Get user-friendly error message for Firestore operations
 * @param error Error object
 * @returns User-friendly error message
 */
export function getFirestoreErrorMessage(error: any): string {
  const errorCode = error.code;
  
  switch (errorCode) {
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'not-found':
      return 'The requested document was not found.';
    case 'already-exists':
      return 'This document already exists.';
    case 'unavailable':
      return 'Service is temporarily unavailable. Please try again.';
    case 'deadline-exceeded':
      return 'Request timed out. Please try again.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

/**
 * Log error with context
 * @param error Error object
 * @param context Context string
 */
export function logError(error: any, context: string): void {
  console.error(`[${context}]`, error);
}

/**
 * Create standardized error response
 * @param message Error message
 * @param code Error code
 * @returns Error object
 */
export function createError(message: string, code?: string): Error {
  const error = new Error(message) as any;
  if (code) {
    error.code = code;
  }
  return error;
}
