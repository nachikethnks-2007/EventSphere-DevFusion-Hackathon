/**
 * Smart Schedule Builder test
 *
 * Run: npx vite-node scripts/test-schedule.ts
 */

import { generateSmartSchedule } from '../src/services/schedule/scheduleService';
import type { ScheduleAudienceLevel, ScheduleSession } from '../src/types/schedule';

const logPass = (step: string, message: string) => {
  console.log(`[${step}] PASS - ${message}`);
};

const logFail = (step: string, message: string) => {
  console.error(`[${step}] FAIL - ${message}`);
};

function assert(condition: boolean, step: string, message: string): void {
  if (!condition) {
    logFail(step, message);
    throw new Error(message);
  }

  logPass(step, message);
}

function assertLevelOrder(
  step: string,
  levels: ScheduleAudienceLevel[]
): void {
  const expectedOrder: ScheduleAudienceLevel[] = [
    'beginner',
    'intermediate',
    'advanced',
  ];

  for (let i = 0; i < levels.length - 1; i++) {
    assert(
      expectedOrder.indexOf(levels[i]) <= expectedOrder.indexOf(levels[i + 1]),
      step,
      `Level ${levels[i]} comes before or equals ${levels[i + 1]}`
    );
  }
}

function runScheduleTests(): void {
  console.log('\n========================================');
  console.log(' EventSphere - Smart Schedule Builder Test');
  console.log('========================================\n');

  const sessions: ScheduleSession[] = [
    {
      id: 'advanced-1',
      title: 'Scaling Event Operations',
      speakerNames: ['Asha Rao'],
      durationMinutes: 45,
      audienceLevel: 'advanced',
    },
    {
      id: 'networking-1',
      title: 'Networking Mixer',
      speakerNames: ['EventSphere Team'],
      durationMinutes: 30,
      audienceLevel: 'beginner',
      sessionType: 'networking',
    },
    {
      id: 'beginner-1',
      title: 'Getting Started with Event Planning',
      speakerNames: ['Mira Shah'],
      durationMinutes: 30,
      audienceLevel: 'beginner',
    },
    {
      id: 'intermediate-1',
      title: 'Audience Engagement Patterns',
      speakerNames: ['Dev Menon'],
      durationMinutes: 40,
      audienceLevel: 'intermediate',
    },
  ];

  try {
    console.log('[1] Generating smart schedule...');
    const result = generateSmartSchedule(sessions);
    assert(result.orderedSessions.length === sessions.length, '1', 'All sessions returned');

    console.log('\n[2] Verifying audience-level ordering...');
    const nonNetworkingSessions = result.orderedSessions.filter(
      (session) => session.sessionType !== 'networking'
    );
    assertLevelOrder(
      '2',
      nonNetworkingSessions.map((session) => session.audienceLevel)
    );
    assert(result.orderedSessions[0].id === 'beginner-1', '2', 'Beginner session comes first');
    assert(
      result.orderedSessions[1].id === 'intermediate-1',
      '2',
      'Intermediate session comes before advanced'
    );
    assert(result.orderedSessions[2].id === 'advanced-1', '2', 'Advanced session comes after intermediate');

    console.log('\n[3] Verifying networking placement...');
    const lastSession = result.orderedSessions[result.orderedSessions.length - 1];
    assert(lastSession.id === 'networking-1', '3', 'Networking session is placed last');

    console.log('\n[4] Verifying reasoning text...');
    assert(!!result.reasoning.trim(), '4', 'Reasoning text is generated');
    assert(
      result.reasoning.includes('beginner') &&
        result.reasoning.includes('intermediate') &&
        result.reasoning.includes('advanced'),
      '4',
      'Reasoning explains the beginner to advanced flow'
    );
    assert(
      result.reasoning.toLowerCase().includes('networking'),
      '4',
      'Reasoning explains networking placement'
    );

    console.log('\n========================================');
    console.log('PASS - ALL SMART SCHEDULE TESTS PASSED');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('FAIL - SMART SCHEDULE TEST FAILED');
    console.error('========================================\n');
    console.error(error);
    process.exitCode = 1;
  }
}

runScheduleTests();
