/**
 * Wishlist Backend Integration Test
 *
 * Verifies that events can be added to user wishlists, duplicate entries
 * are prevented, user wishlists can be fetched (with populated event details),
 * and entries can be removed successfully.
 *
 * Run: npx vite-node scripts/test-wishlist.ts
 */

import { createEvent, deleteEvent } from '../src/services/event/eventService';
import {
  addToWishlist,
  removeFromWishlist,
  fetchUserWishlist,
} from '../src/services/wishlist/wishlistService';
import { CreateEventData } from '../src/types/event';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { COLLECTIONS } from '../src/constants/collections';

async function runWishlistTest() {
  console.log('=== STARTING WISHLIST SERVICE TEST ===');

  const testUserId = 'test-user-wishlist-123';
  const organizerId = 'test-organizer-wishlist';

  // 1. Create a temporary event to wishlist
  const eventData: CreateEventData = {
    title: 'Wishlist Test Event 2026',
    description: 'An event created to verify wishlist backend functionality.',
    eventType: 'Seminar',
    date: '2026-11-12',
    time: '14:00',
    location: 'Virtual Zoom Hall',
    capacity: 1000,
    tags: ['wishlist', 'test'],
  };

  let createdEventId: string | undefined;

  try {
    console.log('1. Seeding a temporary event...');
    const seedEvent = await createEvent(eventData, organizerId);
    createdEventId = seedEvent.id;
    console.log('✓ Seeding complete. Event ID:', createdEventId);

    // 2. Add event to wishlist
    console.log('\n2. Testing addToWishlist()...');
    const entry = await addToWishlist(testUserId, createdEventId);
    console.log('✓ Entry created:', entry);

    if (!entry.id) {
      throw new Error('Wishlist entry has no ID');
    }
    if (entry.userId !== testUserId) {
      throw new Error('Wishlist entry userId mismatch');
    }
    if (entry.eventId !== createdEventId) {
      throw new Error('Wishlist entry eventId mismatch');
    }
    if (!entry.createdAt) {
      throw new Error('Wishlist entry is missing createdAt Timestamp');
    }
    console.log('✓ Initial addition verification passed.');

    // 3. Test duplicate prevention
    console.log('\n3. Testing duplicate prevention...');
    const secondEntry = await addToWishlist(testUserId, createdEventId);
    console.log('✓ Duplicate addition call completed. Returned entry ID:', secondEntry.id);

    if (secondEntry.id !== entry.id) {
      throw new Error('Duplicate entry was created instead of returning the existing one!');
    }

    // Verify Firestore only has 1 record for this user + event combo
    const q = query(
      collection(db, COLLECTIONS.WISHLISTS),
      where('userId', '==', testUserId),
      where('eventId', '==', createdEventId)
    );
    const querySnapshot = await getDocs(q);
    console.log('✓ Firestore entry count for combo:', querySnapshot.size);
    if (querySnapshot.size !== 1) {
      throw new Error(`Expected exactly 1 document in Firestore, found ${querySnapshot.size}`);
    }
    console.log('✓ Duplicate prevention verified successfully.');

    // 4. Fetch the user wishlist (should return the populated Event object)
    console.log('\n4. Testing fetchUserWishlist()...');
    const wishlistEvents = await fetchUserWishlist(testUserId);
    console.log('✓ Wishlisted events retrieved:', wishlistEvents.map(e => e.title));

    if (wishlistEvents.length !== 1) {
      throw new Error(`Expected 1 wishlisted event, got ${wishlistEvents.length}`);
    }
    if (wishlistEvents[0].id !== createdEventId) {
      throw new Error('Fetched wishlisted event ID mismatch');
    }
    if (wishlistEvents[0].title !== 'Wishlist Test Event 2026') {
      throw new Error('Fetched wishlisted event title mismatch');
    }
    console.log('✓ User wishlist fetch and population verified successfully.');

    // 5. Remove event from wishlist
    console.log('\n5. Testing removeFromWishlist()...');
    await removeFromWishlist(testUserId, createdEventId);
    console.log('✓ Removal completed.');

    // Fetch again, should be empty
    const wishlistEventsPostRemoval = await fetchUserWishlist(testUserId);
    console.log('✓ Wishlisted events post-removal:', wishlistEventsPostRemoval);
    if (wishlistEventsPostRemoval.length !== 0) {
      throw new Error(`Expected 0 wishlisted events post-removal, got ${wishlistEventsPostRemoval.length}`);
    }
    console.log('✓ Wishlist entry removal verified successfully.');

  } catch (error) {
    console.error('\n✗ Wishlist service test failed:', error);
    process.exit(1);
  } finally {
    // 6. Clean up temporary event
    if (createdEventId) {
      console.log('\n6. Cleaning up temporary event...');
      try {
        await deleteEvent(createdEventId);
        console.log('✓ Event deleted successfully.');
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr);
      }
    }
  }

  console.log('\n========================================');
  console.log('✓ ALL WISHLIST BACKEND TESTS PASSED');
  console.log('========================================');
}

runWishlistTest();
