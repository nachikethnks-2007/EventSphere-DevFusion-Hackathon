/**
 * Event Type Definitions
 */

import { Timestamp } from 'firebase/firestore';

export interface Event {
  id: string;
  title: string;
  description: string;
  eventType: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  imageUrl?: string;
  tags: string[];
  organizerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  category: string;
  city: string;
  priceType: 'free' | 'paid';
  price?: number;
  agenda?: string[];
  speakers?: string[];
  faq?: { question: string; answer: string }[];
  venueMapUrl?: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  eventType: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  imageUrl?: string;
  tags?: string[];
  priceType?: 'free' | 'paid';
  price?: number;
  agenda?: string[];
  speakers?: string[];
  faq?: { question: string; answer: string }[];
  venueMapUrl?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  eventType?: string;
  date?: string;
  time?: string;
  location?: string;
  capacity?: number;
  imageUrl?: string;
  tags?: string[];
  priceType?: 'free' | 'paid';
  price?: number;
  agenda?: string[];
  speakers?: string[];
  faq?: { question: string; answer: string }[];
  venueMapUrl?: string;
}
