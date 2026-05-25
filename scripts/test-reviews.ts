/**
 * TEMPORARY — Reviews & Ratings integration test
 *
 * Exercises submitReview(), fetchEventReviews(), and calculateAverageRating()
 * against real Firestore with a seeded test event.
 * Not for production use.
 *
 * Run: npx vite-node scripts/test-reviews.ts
 * Requires: .env with VITE_FIREBASE_* (see .env.example)
 *
 * Note: fetchEventReviews() uses eventId + orderBy(createdAt).
 * Create the composite index when Firebase prompts.
 */

import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { COLLECTIONS } from '../src/constants/collections';
import { createEvent, deleteEvent } from '../src/services/event/eventService';
import {
  submitReview,
  fetchEventReviews,
  calculateAverageRating,
} from '../src/services/review/reviewService';
import type { CreateEventData } from '../src/types/event';
import type { Review } from '../src/types/review';

const TEST_PREFIX = 'test-review-';
const TEST_USER_1 = `${TEST_PREFIX}user-1`;
const TEST_USER_2 = `${TEST_PREFIX}user-2`;
const TEST_ORGANIZER_ID = `${TEST_PREFIX}organizer`;

const log = (step: string, message: string, data?: unknown) => {
  const prefix = `[${step}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

const logPass = (step: string, message: string) => {
  console.log(`[${step}] ✓ PASS — ${message}`);
};

const logFail = (step: string, message: string) => {
  console.error(`[${step}] ✗ FAIL — ${message}`);
};

function assert(condition: boolean, step: string, message: string): void {
  if (!condition) {
    logFail(step, message);
    throw new Error(message);
  }
  logPass(step, message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code;
}

async function expectError(
  step: string,
  label: string,
  fn: () => Promise<unknown>,
  expectedCode: string
): Promise<void> {
  try {
    await fn();
    logFail(step, `${label} should have thrown but succeeded`);
    throw new Error(`${label} should have thrown`);
  } catch (error) {
    const code = getErrorCode(error);
    assert(
      code === expectedCode,
      step,
      `${label} rejected with code "${expectedCode}" (got "${code ?? 'none'}")`
    );
  }
}

function assertNewestFirst(step: string, reviews: Review[]): void {
  for (let i = 0; i < reviews.length - 1; i++) {
    const current = reviews[i].createdAt.toMillis();
    const next = reviews[i + 1].createdAt.toMillis();
    assert(
      current >= next,
      step,
      `Review at index ${i} is newer than or equal to index ${i + 1}`
    );
  }
  logPass(
    step,
    reviews.length <= 1
      ? 'Sort order valid (single or empty list)'
      : `Reviews sorted newest-first (${reviews.length} items)`
  );
}

async function cleanupReviewsForEvent(eventId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.REVIEWS),
    where('eventId', '==', eventId)
  );
  const snapshot = await getDocs(q);
  await Promise.all(
    snapshot.docs.map((reviewDoc) =>
      deleteDoc(doc(db, COLLECTIONS.REVIEWS, reviewDoc.id))
    )
  );
}

async function runTests(): Promise<void> {
  console.log('\n========================================');
  console.log(' EventSphere — Reviews & Ratings Test');
  console.log('========================================\n');

  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    logFail(
      'ENV',
      'Missing VITE_FIREBASE_PROJECT_ID. Copy .env.example → .env and fill Firebase credentials.'
    );
    process.exit(1);
  }

  const eventData: CreateEventData = {
    title: `${TEST_PREFIX} Reviews Test Event 2026`,
    description: 'Temporary event for reviews backend integration test.',
    eventType: 'Seminar',
    date: '2026-12-01',
    time: '18:00',
    location: 'Test Venue',
    capacity: 50,
    tags: ['reviews', 'test'],
  };

  let createdEventId: string | undefined;

  try {
    // --- 1. Create temporary test event ---
    log('1', 'Creating temporary test event…');
    const seedEvent = await createEvent(eventData, TEST_ORGANIZER_ID);
    createdEventId = seedEvent.id;
    assert(!!createdEventId, '1', `Test event created (id: ${createdEventId})`);

    // --- 2. Submit valid review ---
    log('2', 'Submitting valid review from user 1…');
    const firstReview = await submitReview(
      createdEventId,
      TEST_USER_1,
      4,
      'Great event — well organized and engaging.'
    );
    log('2', 'Created review', { id: firstReview.id, rating: firstReview.rating });
    assert(firstReview.eventId === createdEventId, '2', 'Review eventId matches test event');
    assert(firstReview.userId === TEST_USER_1, '2', 'Review userId matches user 1');
    assert(firstReview.rating === 4, '2', 'Review rating is 4');
    assert(!!firstReview.createdAt, '2', 'Review has createdAt timestamp');

    // --- 3. Invalid ratings (0 and 6) fail ---
    log('3', 'Testing invalid rating 0…');
    await expectError(
      '3',
      'Rating 0',
      () => submitReview(createdEventId, TEST_USER_1, 0, 'Should not save'),
      'invalid-rating'
    );

    log('3', 'Testing invalid rating 6…');
    await expectError(
      '3',
      'Rating 6',
      () => submitReview(createdEventId, TEST_USER_1, 6, 'Should not save'),
      'invalid-rating'
    );
    logPass('3', 'Invalid ratings 0 and 6 rejected');

    // --- 4. Duplicate review prevention ---
    log('4', 'Testing duplicate review from user 1…');
    await expectError(
      '4',
      'Duplicate review',
      () =>
        submitReview(
          createdEventId,
          TEST_USER_1,
          5,
          'Attempted duplicate review'
        ),
      'duplicate-review'
    );

    const duplicateQuery = query(
      collection(db, COLLECTIONS.REVIEWS),
      where('eventId', '==', createdEventId),
      where('userId', '==', TEST_USER_1)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    assert(
      duplicateSnapshot.size === 1,
      '4',
      `Exactly one review document for user 1 (found ${duplicateSnapshot.size})`
    );

    // --- 5. Fetch reviews for event ---
    log('5', 'Fetching reviews for event…');
    let reviews = await fetchEventReviews(createdEventId);
    log('5', 'Fetched reviews', reviews.map((r) => ({ userId: r.userId, rating: r.rating })));
    assert(reviews.length === 1, '5', 'Exactly one review returned');
    assert(reviews[0].id === firstReview.id, '5', 'Fetched review matches submitted review');

    // --- 6. Newest-first sorting ---
    log('6', 'Verifying newest-first sort order…');
    assertNewestFirst('6', reviews);

    // --- 7. Calculate average rating (single review) ---
    log('7', 'Calculating average rating (one review)…');
    let summary = await calculateAverageRating(createdEventId);
    log('7', 'Rating summary', summary);
    assert(summary.totalReviews === 1, '7', 'totalReviews is 1');
    assert(summary.averageRating === 4, '7', 'averageRating is 4.0');

    // --- 8. Second review from another user ---
    log('8', 'Waiting before second review to ensure distinct timestamps…');
    await sleep(300);
    log('8', 'Submitting review from user 2…');
    const secondReview = await submitReview(
      createdEventId,
      TEST_USER_2,
      2,
      'Decent event, but room for improvement.'
    );
    assert(secondReview.userId === TEST_USER_2, '8', 'Second review saved for user 2');
    assert(secondReview.rating === 2, '8', 'Second review rating is 2');

    // --- 9. Updated average + totalReviews (+ sort with two reviews) ---
    log('9', 'Verifying updated average and totalReviews…');
    summary = await calculateAverageRating(createdEventId);
    log('9', 'Updated rating summary', summary);
    assert(summary.totalReviews === 2, '9', 'totalReviews is 2');
    assert(summary.averageRating === 3, '9', 'averageRating is 3.0 (4 + 2) / 2');

    reviews = await fetchEventReviews(createdEventId);
    assert(reviews.length === 2, '9', 'Two reviews returned after second submission');
    assert(
      reviews[0].userId === TEST_USER_2,
      '9',
      'Newest review (user 2) is first in sorted list'
    );
    assert(
      reviews[1].userId === TEST_USER_1,
      '9',
      'Older review (user 1) is second in sorted list'
    );
    assertNewestFirst('9', reviews);

    console.log('\n========================================');
    console.log(' All tests passed');
    console.log('========================================\n');
  } finally {
    // --- 10. Cleanup test reviews and event ---
    log('10', 'Cleaning up test reviews and event…');
    try {
      if (createdEventId) {
        await cleanupReviewsForEvent(createdEventId);
        logPass('10', 'Test reviews removed');

        await deleteEvent(createdEventId);
        logPass('10', 'Test event deleted');
      } else {
        log('10', 'No test event to clean up');
      }
    } catch (cleanupErr) {
      log('10', 'Cleanup issue (docs may already be removed)', cleanupErr);
    }
  }
}

runTests().catch((err) => {
  console.error('\n========================================');
  console.error(' Test run failed');
  console.error('========================================\n');
  console.error(err);
  process.exit(1);
});
