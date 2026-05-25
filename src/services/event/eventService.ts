/**
 * Event Service
 * Handles all event operations: create, fetch, update, delete
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Event, CreateEventData, UpdateEventData } from '../../types/event';
import { COLLECTIONS } from '../../constants/collections';
import { isValidEventPrice } from '../../utils/validationUtils';

/**
 * Event filters interface
 */
export interface EventFilters {
  category?: string;
  city?: string;
  date?: string;
  priceType?: 'free' | 'paid';
  searchQuery?: string;
}
/**
 * Create a new event
 * @param eventData Event data
 * @param organizerId Organizer's user ID
 * @returns Promise with created event
 */
export async function createEvent(
  eventData: CreateEventData,
  organizerId: string
): Promise<Event> {
  try {
    if (eventData.priceType && !isValidEventPrice(eventData.priceType, eventData.price)) {
      throw new Error(
        eventData.priceType === 'paid'
          ? 'Paid events must have a price greater than 0'
          : 'Free events cannot have a price greater than 0'
      );
    }

    const eventWithMetadata = {
      ...eventData,
      tags: eventData.tags ?? [],
      organizerId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.EVENTS),
      eventWithMetadata
    );

    const eventDocSnap = await getDoc(docRef);
    return {
      id: eventDocSnap.id,
      ...eventDocSnap.data(),
    } as Event;
  } catch (error) {
    console.error('Create event error:', error);
    throw error;
  }
}

/**
 * Fetch all events
 * @returns Promise with array of events
 */
export async function fetchAllEvents(): Promise<Event[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.EVENTS),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((eventDoc) => ({
      id: eventDoc.id,
      ...eventDoc.data(),
    })) as Event[];
  } catch (error) {
    console.error('Fetch events error:', error);
    throw error;
  }
}

/**
 * Fetch single event by ID
 * @param eventId Event ID
 * @returns Promise with event data
 */
export async function fetchEventById(eventId: string): Promise<Event> {
  try {
    const eventDocRef = doc(db, COLLECTIONS.EVENTS, eventId);
    const eventDocSnap = await getDoc(eventDocRef);

    if (!eventDocSnap.exists()) {
      throw new Error(`Event not found for id: ${eventId}`);
    }

    return {
      id: eventDocSnap.id,
      ...eventDocSnap.data(),
    } as Event;
  } catch (error) {
    console.error('Fetch event error:', error);
    throw error;
  }
}

/**
 * Fetch events by organizer
 * @param organizerId Organizer's user ID
 * @returns Promise with array of events
 */
export async function fetchEventsByOrganizer(
  organizerId: string
): Promise<Event[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.EVENTS),
      where('organizerId', '==', organizerId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((eventDoc) => ({
      id: eventDoc.id,
      ...eventDoc.data(),
    })) as Event[];
  } catch (error) {
    console.error('Fetch organizer events error:', error);
    throw error;
  }
}

/**
 * Filter events based on provided filters
 * @param filters Event filters
 * @returns Promise with array of filtered events
 */
export async function filterEvents(
  filters: EventFilters
): Promise<Event[]> {
  try {
    let q = query(collection(db, COLLECTIONS.EVENTS));

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.city) {
      q = query(q, where('city', '==', filters.city));
    }

    if (filters.date) {
      q = query(q, where('date', '==', filters.date));
    }

    if (filters.priceType) {
      q = query(q, where('priceType', '==', filters.priceType));
    }

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map((eventDoc) => ({
      id: eventDoc.id,
      ...eventDoc.data(),
    })) as Event[];

    if (filters.searchQuery) {
      const searchQuery = filters.searchQuery.toLowerCase();
      return events.filter((event) => {
        const title = event.title.toLowerCase();
        const tags = event.tags.map((tag) => tag.toLowerCase());
        const category =(event.category ?? event.eventType ?? '').toLowerCase();

        return (
          title.includes(searchQuery) ||
          tags.some((tag) => tag.includes(searchQuery)) ||
          category.includes(searchQuery)
        );
      });
    }

    return events;
  } catch (error) {
    console.error('Filter events error:', error);
    throw error;
  }
}

/**
 * Update event
 * @param eventId Event ID
 * @param eventData Updated event data
 * @returns Promise<void>
 */
export async function updateEvent(
  eventId: string,
  eventData: UpdateEventData
): Promise<void> {
  try {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);

    // Fetch current event to validate pricing combinations under updates
    const currentEventSnap = await getDoc(eventRef);
    if (!currentEventSnap.exists()) {
      throw new Error(`Event not found for id: ${eventId}`);
    }
    const currentEvent = currentEventSnap.data() as Event;

    const finalPriceType = eventData.priceType ?? currentEvent.priceType;
    const finalPrice = eventData.price !== undefined ? eventData.price : currentEvent.price;

    if (finalPriceType && !isValidEventPrice(finalPriceType, finalPrice)) {
      throw new Error(
        finalPriceType === 'paid'
          ? 'Paid events must have a price greater than 0'
          : 'Free events cannot have a price greater than 0'
      );
    }

    await updateDoc(eventRef, {
      ...eventData,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Update event error:', error);
    throw error;
  }
}

/**
 * Delete event
 * @param eventId Event ID
 * @returns Promise<void>
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.EVENTS, eventId));
  } catch (error) {
    console.error('Delete event error:', error);
    throw error;
  }
}
