/**
 * AI Service
 * Handles Gemini AI integration for event description generation and recommendations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '../../constants/config';
import { Event } from '../../types/event';
import { fetchAllEvents } from '../event/eventService';
import { fetchTicketsByUser } from '../ticket/ticketService';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface GenerateDescriptionInput {
  title: string;
  category: string;
  targetAudience: string;
  location: string;
  theme: string;
}

/**
 * Generate a professional event description using Gemini AI
 * @param input Event details (title, category, targetAudience, location, theme)
 * @returns Promise with generated description string
 */
export async function generateEventDescription(
  input: GenerateDescriptionInput
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Generate a professional and engaging event description for an event listing page.

Title: ${input.title}
Category: ${input.category}
Target Audience: ${input.targetAudience}
Location: ${input.location}
Theme: ${input.theme}

Requirements:
- Keep it between 100-200 words
- Make it engaging, concise, and professional
- Highlight key benefits or takeaways for the target audience
- Include a call to action
- Suitable for an event listing page

Provide only the description text, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const description = response.text();

    return description.trim();
  } catch (error) {
    console.error('Generate event description error:', error);
    throw new Error('Failed to generate event description');
  }
}

/**
 * Generate event tags using Gemini AI
 * @param eventName Event name
 * @param description Event description
 * @returns Promise with array of tags
 */
export async function generateEventTags(
  eventName: string,
  description: string
): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Generate 5-8 relevant tags for this event:

Event Name: ${eventName}
Description: ${description}

Requirements:
- Tags should be relevant and searchable
- Use single words or short phrases
- Separate tags with commas
- Include industry, topic, and format tags

Example format: technology, networking, workshop, innovation

Please provide only the tags, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tagsText = response.text();

    return tagsText
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
  } catch (error) {
    console.error('Generate event tags error:', error);
    // Return default tags on error
    return ['event', 'general'];
  }
}

/**
 * Generate event suggestions using Gemini AI
 * @param userInterests User interests or preferences
 * @param pastEvents Past events user attended
 * @returns Promise with array of event suggestions
 */
export async function generateEventSuggestions(
  userInterests: string[],
  pastEvents: string[]
): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Based on the following user data, suggest 5 event types they might be interested in:

User Interests: ${userInterests.join(', ')}
Past Events Attended: ${pastEvents.join(', ')}

Requirements:
- Suggest 5 different event types
- Keep suggestions diverse and relevant
- Format as a comma-separated list
- Be specific (e.g., "AI Workshop" instead of "Workshop")

Please provide only the suggestions, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestionsText = response.text();

    return suggestionsText
      .split(',')
      .map(suggestion => suggestion.trim())
      .filter(suggestion => suggestion.length > 0);
  } catch (error) {
    console.error('Generate event suggestions error:', error);
    return ['Networking Event', 'Workshop', 'Conference', 'Meetup', 'Webinar'];
  }
}

export interface RecommendedEvent {
  event: Event;
  score: number;
  reason?: string;
}

/**
 * Recommend events for a user based on their registration history
 * Scores events by matching categories, tags, and event types, then
 * optionally generates a short Gemini-powered reason for the top picks
 * @param userId User ID to generate recommendations for
 * @param includeReasons Whether to generate Gemini-powered reason text (default false)
 * @returns Promise with array of recommended events sorted by relevance
 */
export async function recommendEvents(
  userId: string,
  includeReasons: boolean = false
): Promise<RecommendedEvent[]> {
  try {
    const [userTickets, allEvents] = await Promise.all([
      fetchTicketsByUser(userId),
      fetchAllEvents(),
    ]);

    const registeredEventIds = new Set(
      userTickets.map((ticket) => ticket.eventId)
    );

    const attendedEvents = allEvents.filter((event) =>
      registeredEventIds.has(event.id)
    );

    const userEventTypes = new Set(
      attendedEvents.map((event) => event.eventType)
    );

    const userTags = new Set(
      attendedEvents.flatMap((event) => event.tags)
    );

    const candidateEvents = allEvents.filter(
      (event) => !registeredEventIds.has(event.id)
    );

    const scored: RecommendedEvent[] = candidateEvents.map((event) => {
      let score = 0;

      if (userEventTypes.has(event.eventType)) {
        score += 3;
      }

      const matchingTags = event.tags.filter((tag) => userTags.has(tag));
      score += matchingTags.length;

      return { event, score };
    });

    const recommendations = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (includeReasons && recommendations.length > 0) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const eventSummaries = recommendations
          .slice(0, 5)
          .map((r) => `"${r.event.title}" (${r.event.eventType})`)
          .join(', ');

        const pastSummaries = attendedEvents
          .slice(0, 5)
          .map((e) => `"${e.title}" (${e.eventType})`)
          .join(', ');

        const prompt = `Given a user who attended: ${pastSummaries}
We recommend: ${eventSummaries}

For each recommended event, write a one-sentence reason (max 15 words) explaining why the user would enjoy it. Format as a numbered list matching the order above. Provide only the reasons, nothing else.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const reasons = response
          .text()
          .split('\n')
          .map((line) => line.replace(/^\d+\.\s*/, '').trim())
          .filter((line) => line.length > 0);

        for (let i = 0; i < Math.min(reasons.length, recommendations.length); i++) {
          recommendations[i].reason = reasons[i];
        }
      } catch (error) {
        console.error('Generate recommendation reasons error:', error);
      }
    }

    return recommendations;
  } catch (error) {
    console.error('Recommend events error:', error);
    throw error;
  }
}
