/**
 * Review Service
 * Handles public event reviews and ratings
 */

import {
  collection,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Review, EventRatingSummary } from '../../types/review';
import { COLLECTIONS } from '../../constants/collections';
import { createError } from '../../utils/errorUtils';

const MIN_RATING = 1;
const MAX_RATING = 5;

/**
 * Validate rating is an integer between 1 and 5
 */
function validateRating(rating: number): void {
  if (
    !Number.isInteger(rating) ||
    rating < MIN_RATING ||
    rating > MAX_RATING
  ) {
    throw createError(
      `Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`,
      'invalid-rating'
    );
  }
}

/**
 * Submit a review for an event (one review per user per event)
 * @param eventId Event ID
 * @param userId User ID
 * @param rating Star rating (1–5)
 * @param review Review text
 * @returns Promise with created review
 */
export async function submitReview(
  eventId: string,
  userId: string,
  rating: number,
  review: string
): Promise<Review> {
  try {
    validateRating(rating);

    const duplicateQuery = query(
      collection(db, COLLECTIONS.REVIEWS),
      where('eventId', '==', eventId),
      where('userId', '==', userId)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);

    if (!duplicateSnapshot.empty) {
      throw createError(
        'You have already reviewed this event',
        'duplicate-review'
      );
    }

    const reviewData = {
      eventId,
      userId,
      rating,
      review: review.trim(),
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.REVIEWS),
      reviewData
    );

    const docSnap = await getDoc(docRef);
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Review;
  } catch (error) {
    console.error('Submit review error:', error);
    throw error;
  }
}

/**
 * Fetch all reviews for an event, newest first
 * @param eventId Event ID
 * @returns Promise with array of reviews
 */
export async function fetchEventReviews(eventId: string): Promise<Review[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.REVIEWS),
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((reviewDoc) => ({
      id: reviewDoc.id,
      ...reviewDoc.data(),
    })) as Review[];
  } catch (error) {
    console.error('Fetch event reviews error:', error);
    throw error;
  }
}

/**
 * Calculate average rating and total review count for an event
 * @param eventId Event ID
 * @returns Promise with average rating and total review count
 */
export async function calculateAverageRating(
  eventId: string
): Promise<EventRatingSummary> {
  try {
    const reviews = await fetchEventReviews(eventId);
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating =
      Math.round((sum / totalReviews) * 10) / 10;

    return { averageRating, totalReviews };
  } catch (error) {
    console.error('Calculate average rating error:', error);
    throw error;
  }
}
