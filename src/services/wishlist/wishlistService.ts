/**
 * Wishlist Service
 * Handles user wishlist operations: add, remove, fetch wishlisted events
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { WishlistEntry } from '../../types/wishlist';
import { Event } from '../../types/event';
import { COLLECTIONS } from '../../constants/collections';
import { fetchEventById } from '../event/eventService';

/**
 * Add an event to a user's wishlist (prevent duplicates)
 * @param userId User's ID
 * @param eventId Event's ID
 * @returns Promise with created wishlist entry
 */
export async function addToWishlist(
  userId: string,
  eventId: string
): Promise<WishlistEntry> {
  try {
    // Query to check if the entry already exists
    const q = query(
      collection(db, COLLECTIONS.WISHLISTS),
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(q);

    // If duplicate entry exists, return it instead of adding a new one
    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      return {
        id: existingDoc.id,
        ...existingDoc.data(),
      } as WishlistEntry;
    }

    const entryData = {
      userId,
      eventId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.WISHLISTS),
      entryData
    );

    const docSnap = await getDoc(docRef);
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as WishlistEntry;
  } catch (error) {
    console.error('Add to wishlist error:', error);
    throw error;
  }
}

/**
 * Remove an event from a user's wishlist
 * @param userId User's ID
 * @param eventId Event's ID
 * @returns Promise<void>
 */
export async function removeFromWishlist(
  userId: string,
  eventId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, COLLECTIONS.WISHLISTS),
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const deletePromises = querySnapshot.docs.map((entryDoc) =>
        deleteDoc(doc(db, COLLECTIONS.WISHLISTS, entryDoc.id))
      );
      await Promise.all(deletePromises);
    }
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    throw error;
  }
}

/**
 * Fetch all events in a user's wishlist
 * @param userId User's ID
 * @returns Promise with array of populated wishlisted Events
 */
export async function fetchUserWishlist(userId: string): Promise<Event[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.WISHLISTS),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const wishlistEntries = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as WishlistEntry[];

    if (wishlistEntries.length === 0) {
      return [];
    }

    // Fetch details for each event in the wishlist concurrently
    const eventPromises = wishlistEntries.map(async (entry) => {
      try {
        return await fetchEventById(entry.eventId);
      } catch (error) {
        // Log warning but don't crash the entire list fetching if one event is deleted/not found
        console.warn(`Failed to fetch wishlisted event for id: ${entry.eventId}`, error);
        return null;
      }
    });

    const events = await Promise.all(eventPromises);

    // Filter out null values in case an event was deleted from the main collection
    return events.filter((event): event is Event => event !== null);
  } catch (error) {
    console.error('Fetch user wishlist error:', error);
    throw error;
  }
}
