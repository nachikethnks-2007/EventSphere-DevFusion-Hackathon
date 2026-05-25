/**
 * Review Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export interface Review {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  review: string;
  createdAt: Timestamp;
}

export interface EventRatingSummary {
  averageRating: number;
  totalReviews: number;
}
