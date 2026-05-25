/**
 * Wishlist Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export interface WishlistEntry {
  id: string;
  userId: string;
  eventId: string;
  createdAt: Timestamp;
}
