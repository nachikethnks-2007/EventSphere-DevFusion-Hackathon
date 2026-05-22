/**
 * AI Service
 * Handles Gemini AI integration for event description generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '../../constants/config';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Generate event description using Gemini AI
 * @param eventName Event name
 * @param eventType Event type (conference, workshop, party, etc.)
 * @param additionalContext Additional context about the event
 * @returns Promise with generated description
 */
export async function generateEventDescription(
  eventName: string,
  eventType: string,
  additionalContext?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate a compelling and professional event description for:
    
Event Name: ${eventName}
Event Type: ${eventType}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Requirements:
- Keep it between 100-200 words
- Make it engaging and professional
- Highlight key benefits or takeaways
- Include a call to action
- Use an enthusiastic but professional tone

Please provide only the description, no additional text.`;

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
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
