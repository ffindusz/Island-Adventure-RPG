import { describe, expect, it } from 'vitest';
import { callsForSave } from '../src/adapter/autosave';
import type { GameEvent } from '../src/core';

// When the events of a frame call for a save (README, When it saves): when the hero touches a Checkpoint, comes into
// another Adventure Area or beats the Guardian, and for nothing else. The first save of a New Game is no event: it is the
// `saveAtOnce` of the play screen's start, which tests/play-start.test.ts pins.

type Kind = GameEvent['type'];

const BOX = { minX: 3, minY: 4, maxX: 4, maxY: 5 };

/** One event of every kind the core tells. A kind that is added to the core has to be added here too, or `tsc` refuses. */
const EVENTS: { readonly [K in Kind]: Extract<GameEvent, { type: K }> } = {
  opening: { type: 'opening', lines: ['A STORM.'] },
  'hero-attacked': { type: 'hero-attacked', direction: 'down', zone: BOX },
  'hero-shot': { type: 'hero-shot', direction: 'left' },
  'out-of-ammunition': { type: 'out-of-ammunition' },
  'monster-hit': { type: 'monster-hit', monsterId: 'rat-1', damage: 2, health: 1 },
  'monster-defeated': { type: 'monster-defeated', monsterId: 'rat-1' },
  'guardian-defeated': { type: 'guardian-defeated', monsterId: 'guardian' },
  'guardian-engaged': { type: 'guardian-engaged', monsterId: 'guardian' },
  'monster-attacked': { type: 'monster-attacked', monsterId: 'rat-1', zone: BOX },
  'monster-fired': { type: 'monster-fired', monsterId: 'archer-1', direction: 'up' },
  'hero-hit': { type: 'hero-hit', monsterId: 'rat-1', damage: 1, health: 9 },
  'experience-gained': { type: 'experience-gained', amount: 5 },
  'level-up': { type: 'level-up', level: 2 },
  'milestone-reached': { type: 'milestone-reached', milestoneId: 'lookout' },
  'area-changed': { type: 'area-changed', areaId: 'cave' },
  'area-text': { type: 'area-text', areaId: 'cave', text: 'IT IS DARK.' },
  'chest-opened': { type: 'chest-opened', chestId: 'chest-1' },
  'door-locked': { type: 'door-locked', doorId: 'door-1', keyName: 'IRON KEY' },
  'door-opened': { type: 'door-opened', doorId: 'door-1', keyName: 'IRON KEY' },
  'lever-toggled': { type: 'lever-toggled', leverId: 'lever-1', pulled: true },
  'sign-read': { type: 'sign-read', signId: 'sign-1', text: 'TURN BACK.' },
  'vessel-prepared': { type: 'vessel-prepared', vesselId: 'boat' },
  'ending-reached': { type: 'ending-reached', ending: ['HOME AT LAST.'], credits: ['THE END'] },
  pickup: { type: 'pickup', item: { kind: 'consumable', id: 'ammunition', amount: 3 } },
  'gear-equipped': { type: 'gear-equipped', gearId: 'sword', slot: 'melee-weapon' },
  'healing-potion-used': { type: 'healing-potion-used', restored: 4, health: 10 },
  'weapon-switched': { type: 'weapon-switched', weapon: 'ranged-weapon' },
  'page-opened': { type: 'page-opened', page: 'stats' },
  'page-closed': { type: 'page-closed', page: 'stats' },
  'stat-point-assigned': { type: 'stat-point-assigned', stat: 'attack' },
  'checkpoint-activated': { type: 'checkpoint-activated', checkpointId: 'camp' },
  'hero-defeated': { type: 'hero-defeated' },
};

const SAVING = [
  ['checkpoint-activated', 'the hero touches a Checkpoint'],
  ['area-changed', 'the hero comes into another Adventure Area'],
  ['guardian-defeated', 'the Guardian falls, which no Checkpoint follows'],
] as const satisfies readonly (readonly [Kind, string])[];

const SAVING_KINDS: readonly Kind[] = SAVING.map(([kind]) => kind);
const OTHER_EVENTS = (Object.keys(EVENTS) as Kind[])
  .filter((kind) => !SAVING_KINDS.includes(kind))
  .map((kind) => EVENTS[kind]);

describe('a frame that calls for a save', () => {
  for (const [kind, why] of SAVING) {
    it(`has ${kind}, when ${why}`, () => {
      expect(callsForSave([EVENTS[kind]])).toBe(true);
    });
  }

  it('has one of those events among others, wherever it stands in the frame', () => {
    expect(callsForSave([EVENTS.pickup, EVENTS['checkpoint-activated']])).toBe(true);
    expect(callsForSave([EVENTS['checkpoint-activated'], EVENTS.pickup])).toBe(true);
    expect(
      callsForSave([EVENTS['hero-hit'], EVENTS['monster-defeated'], EVENTS['guardian-defeated'], EVENTS['experience-gained']]),
    ).toBe(true);
  });

  it('has two of them at once when the area has a Checkpoint at its entrance: it is still one call', () => {
    expect(callsForSave([EVENTS['area-changed'], EVENTS['checkpoint-activated']])).toBe(true);
  });
});

describe('a frame that calls for no save', () => {
  it('has no events at all', () => {
    expect(callsForSave([])).toBe(false);
  });

  it('has any other kind of event, alone', () => {
    for (const event of OTHER_EVENTS) {
      expect(callsForSave([event]), event.type).toBe(false);
    }
  });

  it('has every other kind of event at once', () => {
    expect(callsForSave(OTHER_EVENTS)).toBe(false);
  });

  it('has a defeat of the hero, a monster that is not the Guardian beaten, or the ending reached', () => {
    // The defeat returns the hero to its Checkpoint (`area-changed` follows it only when that is in another area), and at
    // the ending the core is at the title, where there is no game to save.
    expect(callsForSave([EVENTS['hero-defeated']])).toBe(false);
    expect(callsForSave([EVENTS['monster-defeated']])).toBe(false);
    expect(callsForSave([EVENTS['ending-reached']])).toBe(false);
  });
});
