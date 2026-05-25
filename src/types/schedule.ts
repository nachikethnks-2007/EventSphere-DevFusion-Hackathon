/**
 * Smart Schedule Type Definitions
 */

export type ScheduleAudienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type ScheduleSessionType = 'session' | 'networking';

export interface ScheduleSession {
  id?: string;
  title: string;
  speakerNames: string[];
  durationMinutes: number;
  audienceLevel: ScheduleAudienceLevel;
  sessionType?: ScheduleSessionType;
}

export interface SmartScheduleResult {
  orderedSessions: ScheduleSession[];
  reasoning: string;
}
