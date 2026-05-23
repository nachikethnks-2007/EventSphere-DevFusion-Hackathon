/**
 * User Type Definitions
 */

export type UserRole = 'attendee' | 'organizer';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  displayName?: string;
  phoneNumber?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role: UserRole;
  displayName?: string;
  phoneNumber?: string;
}
