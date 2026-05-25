/**
 * Smart Schedule Service
 * Deterministic MVP schedule ordering without AI calls
 */

import { createError } from '../../utils/errorUtils';
import type {
  ScheduleAudienceLevel,
  ScheduleSession,
  SmartScheduleResult,
} from '../../types/schedule';

const AUDIENCE_LEVEL_ORDER: Record<ScheduleAudienceLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function isNetworkingSession(session: ScheduleSession): boolean {
  return (
    session.sessionType === 'networking' ||
    session.title.trim().toLowerCase().includes('networking')
  );
}

function validateSession(session: ScheduleSession, index: number): void {
  if (!session.title.trim()) {
    throw createError(
      `Session at index ${index} requires a title`,
      'invalid-session-title'
    );
  }

  if (!Array.isArray(session.speakerNames) || session.speakerNames.length === 0) {
    throw createError(
      `Session "${session.title}" requires at least one speaker`,
      'invalid-session-speakers'
    );
  }

  if (session.speakerNames.some((speakerName) => !speakerName.trim())) {
    throw createError(
      `Session "${session.title}" has an empty speaker name`,
      'invalid-session-speakers'
    );
  }

  if (
    !Number.isInteger(session.durationMinutes) ||
    session.durationMinutes <= 0
  ) {
    throw createError(
      `Session "${session.title}" requires a positive whole-number duration`,
      'invalid-session-duration'
    );
  }

  if (!(session.audienceLevel in AUDIENCE_LEVEL_ORDER)) {
    throw createError(
      `Session "${session.title}" has an unsupported audience level`,
      'invalid-session-audience-level'
    );
  }
}

function buildReasoning(
  orderedSessions: ScheduleSession[],
  hasNetworkingSession: boolean
): string {
  const levelFlow = orderedSessions
    .filter((session) => !isNetworkingSession(session))
    .map((session) => session.audienceLevel);
  const uniqueLevels = Array.from(new Set(levelFlow));
  const levelText =
    uniqueLevels.length > 0
      ? uniqueLevels.join(' to ')
      : 'the provided session levels';

  const networkingText = hasNetworkingSession
    ? ' A networking session is placed last so attendees can connect after the learning flow.'
    : '';

  return `Sessions are ordered from ${levelText}, moving attendees from foundational content toward deeper material.${networkingText}`;
}

/**
 * Generate a deterministic smart schedule from provided sessions.
 */
export function generateSmartSchedule(
  sessions: ScheduleSession[]
): SmartScheduleResult {
  try {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      throw createError(
        'At least one session is required',
        'empty-schedule-sessions'
      );
    }

    sessions.forEach((session, index) => validateSession(session, index));

    const sessionsWithIndex = sessions.map((session, index) => ({
      session: {
        ...session,
        title: session.title.trim(),
        speakerNames: session.speakerNames.map((speakerName) =>
          speakerName.trim()
        ),
      },
      index,
    }));

    const sortedSessions = [...sessionsWithIndex].sort((a, b) => {
      const aIsNetworking = isNetworkingSession(a.session);
      const bIsNetworking = isNetworkingSession(b.session);

      if (aIsNetworking !== bIsNetworking) {
        return aIsNetworking ? 1 : -1;
      }

      const levelDiff =
        AUDIENCE_LEVEL_ORDER[a.session.audienceLevel] -
        AUDIENCE_LEVEL_ORDER[b.session.audienceLevel];

      return levelDiff || a.index - b.index;
    });

    const orderedSessions = sortedSessions.map(({ session }) => session);
    const hasNetworkingSession = orderedSessions.some((session) =>
      isNetworkingSession(session)
    );

    return {
      orderedSessions,
      reasoning: buildReasoning(orderedSessions, hasNetworkingSession),
    };
  } catch (error) {
    console.error('Generate smart schedule error:', error);
    throw error;
  }
}
