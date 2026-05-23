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
