/**
 * TEMPORARY — Event filtering integration test
 *
 * Exercises filterEvents() against real Firestore with seeded dummy events.
 * Not for production use.
 *
 * Run: npx vite-node scripts/test-event-filtering.ts
 * Requires: .env with VITE_FIREBASE_* (see .env.example)
 *
 * Note: filterEvents() uses Firestore equality filters + orderBy(createdAt).
 * Create composite indexes when Firebase prompts (category/city/date/priceType).
 */

import { deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { COLLECTIONS } from '../src/constants/collections';
import { filterEvents } from '../src/services/event/eventService';
import type { EventFilters } from '../src/services/event/eventService';
import type { Event } from '../src/types/event';

const TEST_PREFIX = 'test-filter-';
const TEST_ORGANIZER_ID = `${TEST_PREFIX}organizer`;

/** Seeded events include filter fields used by filterEvents() */
type FilterableEvent = Event & {
  category: string;
  city: string;
  priceType: 'free' | 'paid';
};

const TEST_EVENT_IDS = {
  techWorkshop: `${TEST_PREFIX}event-tech-workshop`,
  musicFestival: `${TEST_PREFIX}event-music-festival`,
  businessSummit: `${TEST_PREFIX}event-business-summit`,
  techMeetup: `${TEST_PREFIX}event-tech-meetup`,
  artExpo: `${TEST_PREFIX}event-art-expo`,
} as const;

const FILTER_VALUES = {
  categoryTech: `${TEST_PREFIX}category-technology`,
  categoryMusic: `${TEST_PREFIX}category-music`,
  categoryBusiness: `${TEST_PREFIX}category-business`,
  categoryArts: `${TEST_PREFIX}category-arts`,
  cityNyc: `${TEST_PREFIX}city-new-york`,
  cityLa: `${TEST_PREFIX}city-los-angeles`,
  cityChicago: `${TEST_PREFIX}city-chicago`,
  citySf: `${TEST_PREFIX}city-san-francisco`,
  dateEarly: '2026-07-01',
  dateMid: '2026-08-15',
  dateLate: '2026-09-10',
  dateExpo: '2026-10-05',
  categoryEmpty: `${TEST_PREFIX}category-does-not-exist`,
  searchTitle: `${TEST_PREFIX}search-title-hit`,
  searchTag: `${TEST_PREFIX}search-tag-hit`,
} as const;

const ALL_TEST_EVENT_DOC_IDS = Object.values(TEST_EVENT_IDS);

const log = (step: string, message: string, data?: unknown) => {
  const prefix = `[${step}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

const logPass = (step: string, message: string) => {
  console.log(`[${step}] ✓ PASS — ${message}`);
};

const logFail = (step: string, message: string) => {
  console.error(`[${step}] ✗ FAIL — ${message}`);
};

function assert(condition: boolean, step: string, message: string): void {
  if (!condition) {
    logFail(step, message);
    throw new Error(message);
  }
  logPass(step, message);
}

function buildSeedEvent(
  id: string,
  title: string,
  category: string,
  city: string,
  date: string,
  priceType: 'free' | 'paid',
  tags: string[]
): FilterableEvent {
  const now = Timestamp.now();
  return {
    id,
    title,
    description: `Test event: ${title}`,
    eventType: 'Workshop',
    date,
    time: '10:00',
    location: `${city} Test Venue`,
    capacity: 100,
    tags,
    organizerId: TEST_ORGANIZER_ID,
    createdAt: now,
    updatedAt: now,
    category,
    city,
    priceType,
  };
}

const SEED_EVENTS: FilterableEvent[] = [
  buildSeedEvent(
    TEST_EVENT_IDS.techWorkshop,
    `${FILTER_VALUES.searchTitle} AI Innovation Workshop`,
    FILTER_VALUES.categoryTech,
    FILTER_VALUES.cityNyc,
    FILTER_VALUES.dateEarly,
    'free',
    ['ai', 'workshop']
  ),
  buildSeedEvent(
    TEST_EVENT_IDS.musicFestival,
    'Summer Music Festival',
    FILTER_VALUES.categoryMusic,
    FILTER_VALUES.cityLa,
    FILTER_VALUES.dateMid,
    'paid',
    ['music', FILTER_VALUES.searchTag]
  ),
  buildSeedEvent(
    TEST_EVENT_IDS.businessSummit,
    'Startup Networking Summit',
    FILTER_VALUES.categoryBusiness,
    FILTER_VALUES.cityChicago,
    FILTER_VALUES.dateEarly,
    'free',
    ['networking', 'startup']
  ),
  buildSeedEvent(
    TEST_EVENT_IDS.techMeetup,
    'Tech Leaders Meetup',
    FILTER_VALUES.categoryTech,
    FILTER_VALUES.cityNyc,
    FILTER_VALUES.dateLate,
    'paid',
    ['technology', 'leadership']
  ),
  buildSeedEvent(
    TEST_EVENT_IDS.artExpo,
    'Modern Art Gallery Opening',
    FILTER_VALUES.categoryArts,
    FILTER_VALUES.citySf,
    FILTER_VALUES.dateExpo,
    'free',
    ['art', 'culture']
  ),
];

async function seedTestData(): Promise<void> {
  log('SETUP', 'Seeding test events with varied filters…');

  for (const event of SEED_EVENTS) {
    const { id, ...data } = event;
    await setDoc(doc(db, COLLECTIONS.EVENTS, id), data);
  }

  logPass('SETUP', `Seeded ${SEED_EVENTS.length} test events`);
  log('SETUP', 'Seeded titles', SEED_EVENTS.map((e) => e.title));
}

async function cleanupTestData(): Promise<void> {
  log('CLEANUP', 'Removing seeded test events…');

  for (const eventId of ALL_TEST_EVENT_DOC_IDS) {
    await deleteDoc(doc(db, COLLECTIONS.EVENTS, eventId));
  }

  logPass('CLEANUP', 'Test events removed');
}

function scopeToTestEvents(events: Event[]): FilterableEvent[] {
  return events.filter((e) => e.id.startsWith(TEST_PREFIX)) as FilterableEvent[];
}

function eventMatchesFilter(event: FilterableEvent, filters: EventFilters): boolean {
  if (filters.category && event.category !== filters.category) {
    return false;
  }
  if (filters.city && event.city !== filters.city) {
    return false;
  }
  if (filters.date && event.date !== filters.date) {
    return false;
  }
  if (filters.priceType && event.priceType !== filters.priceType) {
    return false;
  }
  if (filters.searchQuery) {
    const searchQuery = filters.searchQuery?.toLowerCase() ?? '';
    const title = event.title.toLowerCase();
    const tags = (event.tags ?? []).map((tag) => tag.toLowerCase());
    const category = (event.category ?? '').toLowerCase();
    const matchesSearch =
      title.includes(searchQuery) ||
      tags.some((tag) => tag.includes(searchQuery)) ||
      category.includes(searchQuery);
    if (!matchesSearch) {
      return false;
    }
  }
  return true;
}

function logFilterResults(
  step: string,
  filters: EventFilters,
  results: Event[],
  testResults: FilterableEvent[]
): void {
  log(step, 'Applied filters', filters);
  log(step, 'Filtered event count', {
    total: results.length,
    testScoped: testResults.length,
  });
  log(step, 'Matching event titles (all)', results.map((e) => e.title));
  if (testResults.length > 0) {
    log(step, 'Test-scoped titles', testResults.map((e) => e.title));
  }
}

async function runFilterTest(
  step: string,
  filters: EventFilters,
  expectedTestIds: string[]
): Promise<void> {
  log(step, `Calling filterEvents()…`);
  const results = await filterEvents(filters);
  const testResults = scopeToTestEvents(results);

  logFilterResults(step, filters, results, testResults);

  for (const event of results) {
    assert(
      eventMatchesFilter(event as FilterableEvent, filters),
      step,
      `Returned event "${event.title}" satisfies all active filters`
    );
  }

  for (const expectedId of expectedTestIds) {
    assert(
      testResults.some((e) => e.id === expectedId),
      step,
      `Expected test event "${expectedId}" in results`
    );
  }

  assert(
    testResults.length === expectedTestIds.length,
    step,
    `Expected ${expectedTestIds.length} test event(s), got ${testResults.length}`
  );

  logPass(
    step,
    `Filter returned ${expectedTestIds.length} expected test event(s) with matching titles`
  );
}

async function runEmptyFilterTest(step: string, filters: EventFilters): Promise<void> {
  log(step, `Calling filterEvents() for empty result…`);
  const results = await filterEvents(filters);
  const testResults = scopeToTestEvents(results);

  logFilterResults(step, filters, results, testResults);

  assert(results.length === 0, step, 'No events returned for non-matching filter');
  assert(testResults.length === 0, step, 'No test-scoped events in empty result');
  logPass(step, 'Empty filter result handled correctly');
}

async function runTests(): Promise<void> {
  console.log('\n========================================');
  console.log(' EventSphere — Event Filtering Test');
  console.log('========================================\n');

  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    logFail(
      'ENV',
      'Missing VITE_FIREBASE_PROJECT_ID. Copy .env.example → .env and fill Firebase credentials.'
    );
    process.exit(1);
  }

  try {
    await seedTestData();

    // --- 1. Category filter ---
    await runFilterTest(
      '1',
      { category: FILTER_VALUES.categoryTech },
      [TEST_EVENT_IDS.techWorkshop, TEST_EVENT_IDS.techMeetup]
    );

    // --- 2. City filter ---
    await runFilterTest('2', { city: FILTER_VALUES.cityNyc }, [
      TEST_EVENT_IDS.techWorkshop,
      TEST_EVENT_IDS.techMeetup,
    ]);

    // --- 3. Date filter ---
    await runFilterTest('3', { date: FILTER_VALUES.dateEarly }, [
      TEST_EVENT_IDS.techWorkshop,
      TEST_EVENT_IDS.businessSummit,
    ]);

    // --- 4. Price type filter ---
    await runFilterTest('4', { priceType: 'free' }, [
      TEST_EVENT_IDS.techWorkshop,
      TEST_EVENT_IDS.businessSummit,
      TEST_EVENT_IDS.artExpo,
    ]);

    // --- 5a. Search by title ---
    await runFilterTest('5a', { searchQuery: FILTER_VALUES.searchTitle }, [
      TEST_EVENT_IDS.techWorkshop,
    ]);

    // --- 5b. Search by tag ---
    await runFilterTest('5b', { searchQuery: FILTER_VALUES.searchTag }, [
      TEST_EVENT_IDS.musicFestival,
    ]);

    // --- 5c. Search by category field ---
    await runFilterTest(
      '5c',
      { searchQuery: FILTER_VALUES.categoryArts },
      [TEST_EVENT_IDS.artExpo]
    );

    // --- 6. Empty results ---
    await runEmptyFilterTest('6a', { category: FILTER_VALUES.categoryEmpty });
    await runEmptyFilterTest('6b', {
      searchQuery: `${TEST_PREFIX}search-no-match-xyz`,
    });

    console.log('\n========================================');
    console.log(' All tests passed');
    console.log('========================================\n');
  } finally {
    try {
      await cleanupTestData();
    } catch (cleanupErr) {
      log('CLEANUP', 'Cleanup issue (docs may already be removed)', cleanupErr);
    }
  }
}

runTests().catch((err) => {
  console.error('\n========================================');
  console.error(' Test run failed');
  console.error('========================================\n');
  console.error(err);
  process.exit(1);
});
