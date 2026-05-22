/**
 * Configuration Constants
 * Environment variables and app configuration
 */

// Gemini API Key
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Firebase Configuration (also in firebase/config.ts)
// This is for reference and validation
export const FIREBASE_CONFIG_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'EventSphere',
  APP_VERSION: '1.0.0',
  MAX_EVENTS_PER_PAGE: 20,
  MAX_TICKETS_PER_EVENT: 1000,
  QR_EXPIRY_HOURS: 24,
} as const;

// Event Types
export const EVENT_TYPES = [
  'Conference',
  'Workshop',
  'Seminar',
  'Meetup',
  'Party',
  'Concert',
  'Exhibition',
  'Webinar',
  'Networking',
  'Other',
] as const;

// User Roles
export const USER_ROLES = ['attendee', 'organizer'] as const;
