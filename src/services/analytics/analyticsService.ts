/**
 * Analytics Service
 * Handles dashboard statistics calculations for organizers and specific events
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../constants/collections';
import { OrganizerAnalytics, EventAnalytics } from '../../types/analytics';
import { Event } from '../../types/event';
import { Ticket } from '../../types/ticket';

/**
 * Fetch dashboard analytics for a specific organizer
 * Sums metrics dynamically from organizer's events and registration tickets
 * 
 * @param organizerId The Firestore organizer ID
 * @returns Promise resolving to organizer analytics metrics
 */
export async function getOrganizerAnalytics(
  organizerId: string
): Promise<OrganizerAnalytics> {
  try {
    if (!organizerId) {
      throw new Error('Organizer ID is required');
    }

    // 1. Fetch all events created by the organizer
    const eventsQuery = query(
      collection(db, COLLECTIONS.EVENTS),
      where('organizerId', '==', organizerId)
    );
    const eventsSnapshot = await getDocs(eventsQuery);
    const events = eventsSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Event[];

    const totalEvents = events.length;

    // If the organizer has no events, return zeroed analytics
    if (totalEvents === 0) {
      return {
        totalEvents: 0,
        totalRegistrations: 0,
        totalRevenue: 0,
        totalCheckedIn: 0,
      };
    }

    // 2. Fetch all tickets registered under these events
    const eventIds = events.map((event) => event.id);
    const tickets: Ticket[] = [];

    // Firestore `in` operator supports up to 30 elements in a single query.
    // Chunk event IDs into groups of 30 and perform queries in parallel.
    const chunks: string[][] = [];
    for (let i = 0; i < eventIds.length; i += 30) {
      chunks.push(eventIds.slice(i, i + 30));
    }

    const queryPromises = chunks.map((chunk) => {
      const q = query(
        collection(db, COLLECTIONS.TICKETS),
        where('eventId', 'in', chunk)
      );
      return getDocs(q);
    });

    const snapshots = await Promise.all(queryPromises);
    for (const snapshot of snapshots) {
      for (const docSnap of snapshot.docs) {
        tickets.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Ticket);
      }
    }

    // 3. Map event pricing structure for dynamic revenue calculation
    const eventPriceMap = new Map<string, { priceType: string; price: number }>();
    for (const event of events) {
      eventPriceMap.set(event.id, {
        priceType: event.priceType,
        price: event.price ?? 0,
      });
    }

    // 4. Calculate total registrations, total checked in, and total revenue
    const totalRegistrations = tickets.length;
    let totalCheckedIn = 0;
    let totalRevenue = 0;

    for (const ticket of tickets) {
      // Checked in if ticket.scanned is true or ticketStatus is 'scanned'
      if (ticket.scanned || ticket.ticketStatus === 'scanned') {
        totalCheckedIn++;
      }

      const eventInfo = eventPriceMap.get(ticket.eventId);
      if (eventInfo && eventInfo.priceType === 'paid') {
        // Fall back to the parent event's price if the ticket doesn't have its own price override
        const ticketPrice = ticket.price ?? eventInfo.price;
        const parsedPrice = typeof ticketPrice === 'number' ? ticketPrice : parseFloat(ticketPrice) || 0;
        totalRevenue += parsedPrice;
      }
    }

    return {
      totalEvents,
      totalRegistrations,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCheckedIn,
    };
  } catch (error) {
    console.error('Get organizer analytics error:', error);
    throw error;
  }
}

/**
 * Fetch detailed analytics for a single event
 * Calculates dynamic counts, revenue, and attendance rate from Firestore data
 * 
 * @param eventId The Firestore event ID
 * @returns Promise resolving to event analytics metrics
 */
export async function getEventAnalytics(
  eventId: string
): Promise<EventAnalytics> {
  try {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    // 1. Fetch the event detail to verify it exists and get pricing structure
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error(`Event not found for id: ${eventId}`);
    }

    const event = {
      id: eventSnap.id,
      ...eventSnap.data(),
    } as Event;

    // 2. Fetch all tickets for this event
    const ticketsQuery = query(
      collection(db, COLLECTIONS.TICKETS),
      where('eventId', '==', eventId)
    );
    const ticketsSnapshot = await getDocs(ticketsQuery);
    const tickets = ticketsSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Ticket[];

    // 3. Dynamic metric aggregation
    const registrationsCount = tickets.length;
    let checkedInCount = 0;
    let revenue = 0;

    for (const ticket of tickets) {
      if (ticket.scanned || ticket.ticketStatus === 'scanned') {
        checkedInCount++;
      }

      if (event.priceType === 'paid') {
        const ticketPrice = ticket.price ?? event.price ?? 0;
        const parsedPrice = typeof ticketPrice === 'number' ? ticketPrice : parseFloat(ticketPrice) || 0;
        revenue += parsedPrice;
      }
    }

    const attendanceRate = registrationsCount > 0
      ? (checkedInCount / registrationsCount) * 100
      : 0;

    return {
      registrationsCount,
      checkedInCount,
      revenue: parseFloat(revenue.toFixed(2)),
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
    };
  } catch (error) {
    console.error('Get event analytics error:', error);
    throw error;
  }
}
