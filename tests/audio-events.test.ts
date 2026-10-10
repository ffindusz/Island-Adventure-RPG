import { describe, expect, it } from 'vitest';
import { PAGE_IDS, STAT_IDS } from '../src/core';
import type {
  AreaDefinition,
  ContentDefinition,
  ExitDefinition,
  Game,
  GameEvent,
  GuardianMonsterDefinition,
  PageId,
  StatId,
} from '../src/core';
import {
  FIELD_LAYOUT,
  advance,
  arena,
  biterAt,
  defeatPrize,
  face,
  gameAtTitle,
  gameWithPrizes,
  monsterAction,
  newGame,
  playingView,
  throughStorage,
  walk,
} from './fixtures';
import type { ArenaOptions } from './fixtures';
import { askingGame } from './harbor-fixtures';
import { GUARDIAN, guardianAt, guardianContent, guardianInOrder } from './guardian-fixtures';

// Four things the player does or meets that the core did not tell by an event, though the adapter has a use for each:
// a page opened, a page closed, a Stat Point spent, and the Guardian's fight begun. The core tells only that they
// happened, and only when something changed: a command that is ignored, or that finds nothing to do, tells nothing.

const open = (page: PageId) => ({ type: 'open-page', page }) as const;
const close = (page: PageId) => ({ type: 'close-page', page }) as const;
const assign = (stat: StatId) => ({ type: 'assign-stat-point', stat }) as const;

describe('opening a page', () => {
  it.each(PAGE_IDS)('tells that the %s page opened, once', (page) => {
    const game = newGame();

    expect(game.send(open(page))).toEqual([{ type: 'page-opened', page }]);

    expect(playingView(game).page?.id).toBe(page);
  });

  it('tells nothing when a page is open already: the page stays, and so does the game', () => {
    const game = newGame();
    game.send(open('stats'));
    const before = game.snapshot();

    expect(game.send(open('inventory'))).toEqual([]);
    expect(game.send(open('stats'))).toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('tells nothing while a Stat Point waits to be assigned, nor while the question of sailing home is open', () => {
    const waiting = gameWithPrizes(10);
    defeatPrize(waiting, 1);
    const beforeWaiting = waiting.snapshot();
    const asking = askingGame();
    const beforeAsking = asking.snapshot();

    expect(waiting.send(open('inventory'))).toEqual([]);
    expect(asking.send(open('stats'))).toEqual([]);

    expect(waiting.snapshot()).toEqual(beforeWaiting);
    expect(asking.snapshot()).toEqual(beforeAsking);
  });

  it('tells nothing at the title, where there is no page to open', () => {
    expect(gameAtTitle().send(open('stats'))).toEqual([]);
  });
});

describe('closing a page', () => {
  it.each(PAGE_IDS)('tells that the %s page closed, once', (page) => {
    const game = newGame();
    game.send(open(page));

    expect(game.send(close(page))).toEqual([{ type: 'page-closed', page }]);

    expect(playingView(game).page).toBeNull();
    expect(game.send(close(page))).toEqual([]);
  });

  it('tells nothing for a page that is not the one open: the open page stays', () => {
    const game = newGame();
    game.send(open('stats'));
    const before = game.snapshot();

    expect(game.send(close('inventory'))).toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('tells nothing when no page is open, and nothing at the title', () => {
    const game = newGame();
    const before = game.snapshot();

    expect(game.send(close('stats'))).toEqual([]);

    expect(game.snapshot()).toEqual(before);
    expect(gameAtTitle().send(close('stats'))).toEqual([]);
  });

  it('tells once when every page is closed together, as the Escape key does: only the open one closes', () => {
    const game = newGame();
    game.send(open('automap'));

    const events = PAGE_IDS.flatMap((page) => game.send(close(page)));

    expect(events).toEqual([{ type: 'page-closed', page: 'automap' }]);
  });
});

describe('assigning a Stat Point', () => {
  it.each(STAT_IDS)('tells that the Stat Point went to %s, and the stat rose', (stat) => {
    const game = gameWithPrizes(10);
    defeatPrize(game, 1);
    const before = game.snapshot().state.hero.statPoints[stat];

    expect(game.send(assign(stat))).toEqual([{ type: 'stat-point-assigned', stat }]);

    expect(game.snapshot().state.hero.statPoints[stat]).toBe(before + 1);
  });

  it('tells once for each Stat Point spent, and nothing once none waits', () => {
    const game = gameWithPrizes(25);
    defeatPrize(game, 1);

    expect(game.send(assign('attack'))).toEqual([{ type: 'stat-point-assigned', stat: 'attack' }]);
    expect(game.send(assign('health'))).toEqual([{ type: 'stat-point-assigned', stat: 'health' }]);
    const before = game.snapshot();

    expect(game.send(assign('defense'))).toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('tells nothing when no Stat Point waits: nothing changes', () => {
    const game = newGame();
    const before = game.snapshot();

    expect(game.send(assign('attack'))).toEqual([]);

    expect(game.snapshot()).toEqual(before);
  });

  it('tells nothing at the title', () => {
    expect(gameAtTitle().send(assign('attack'))).toEqual([]);
  });
});

// The Guardian's fight begins when it notices the hero: it was idle in one step and is not in the next. The test field
// is the wide one of fixtures.ts, with the Guardian of guardian-fixtures.ts on tile (11, 3), whose body spans x 11 to 12
// and which notices the hero within 6 tiles of its body, from x = 5. The hero begins on tile (1, 3), at (1.5, 3.5): its
// right edge is at 1.75, and each step takes it 0.125 farther. After 26 steps the edge touches x = 5, which is not
// inside the Guardian's reach, and in the 27th it is.

const GUARDIAN_ID = 'guardian-1';
const ENGAGED = { type: 'guardian-engaged', monsterId: GUARDIAN_ID } as const;
const STEPS_TO_NOTICE = 27;

const engagements = (events: readonly GameEvent[]): GameEvent[] =>
  events.filter((event) => event.type === 'guardian-engaged');

/** The field with the Guardian far from the hero, who has to walk to it. */
function farField(guardian: GuardianMonsterDefinition = GUARDIAN, options: ArenaOptions = {}): ContentDefinition {
  return guardianContent([guardianAt(GUARDIAN_ID, 11, 3)], {
    start: { area: 'arena', tile: { col: 1, row: 3 } },
    ...options,
    monsterTypes: { guardian },
  });
}

/** Steps the game until the hero is defeated, which has to happen within 120 steps. Returns the events of all of them. */
function untilDefeated(game: Game): GameEvent[] {
  const events: GameEvent[] = [];
  for (let step = 0; step < 120; step += 1) {
    events.push(...game.step());
    if (events.some((event) => event.type === 'hero-defeated')) {
      return events;
    }
  }
  throw new Error('The hero was not defeated within 120 steps');
}

describe('the Guardian engaged', () => {
  it('is told in the step in which the Guardian notices the hero, and in no step before', () => {
    const game = newGame(farField());

    expect(walk(game, 'right', STEPS_TO_NOTICE - 1)).toEqual([]);
    expect(monsterAction(game, GUARDIAN_ID)).toEqual({ type: 'idle' });

    expect(walk(game, 'right', 1)).toEqual([ENGAGED]);
    expect(monsterAction(game, GUARDIAN_ID).type).not.toBe('idle');
  });

  it('is told once for the whole fight: the patterns it makes one after the other do not begin it again', () => {
    const game = newGame(farField(GUARDIAN, { hero: { health: 1000 } }));

    const events = [...walk(game, 'right', STEPS_TO_NOTICE), ...advance(game, 600)];

    expect(engagements(events)).toEqual([ENGAGED]);
    expect(events.filter((event) => event.type === 'monster-attacked').length).toBeGreaterThanOrEqual(3);
  });

  it('is told again when the Guardian has lost the hero, which outwalks it, and notices it again', () => {
    const game = newGame(farField(guardianInOrder('sweep', 'smite')));
    expect(walk(game, 'right', STEPS_TO_NOTICE)).toEqual([ENGAGED]);

    expect(walk(game, 'left', 8)).toEqual([]);
    expect(monsterAction(game, GUARDIAN_ID)).toEqual({ type: 'idle' });

    expect(engagements(walk(game, 'right', 8))).toEqual([ENGAGED]);
  });

  it('is told for a Guardian that has not fallen only: one struck down before it noticed the hero never fights', () => {
    const game = newGame(guardianContent([guardianAt(GUARDIAN_ID, 7, 3)], { hero: { attack: 12 } }));
    face(game, 'right');

    expect(game.send({ type: 'attack' })).toContainEqual({ type: 'guardian-defeated', monsterId: GUARDIAN_ID });
    game.send(assign('health'));

    expect(engagements(advance(game, 100))).toEqual([]);
  });

  it('is told again for the Guardian that is put back when the hero is defeated, and begins its fight again', () => {
    const game = newGame(guardianContent([guardianAt(GUARDIAN_ID, 7, 3)], { hero: { health: 4 } }));

    const fight = untilDefeated(game);

    expect(engagements(fight)).toEqual([ENGAGED]);
    expect(monsterAction(game, GUARDIAN_ID)).toEqual({ type: 'idle' });
    expect(advance(game, 1)).toEqual([ENGAGED]);
  });

  it('is told again when the hero leaves the Guardian\'s Adventure Area and comes back: the Guardian is put back', () => {
    const toCellar: ExitDefinition = {
      id: 'to-cellar',
      zone: { col: 8, row: 3, width: 1, height: 1 },
      to: { area: 'cellar', entrance: 'from-arena' },
    };
    const cellar: AreaDefinition = {
      id: 'cellar',
      name: 'Cellar',
      layout: FIELD_LAYOUT,
      monsters: [],
      entrances: [{ id: 'from-arena', tile: { col: 2, row: 3 } }],
      exits: [
        { id: 'to-arena', zone: { col: 1, row: 3, width: 1, height: 1 }, to: { area: 'arena', entrance: 'from-cellar' } },
      ],
    };
    const game = newGame(
      guardianContent([guardianAt(GUARDIAN_ID, 11, 3)], {
        start: { area: 'arena', tile: { col: 10, row: 3 } },
        entrances: [{ id: 'from-cellar', tile: { col: 10, row: 3 } }],
        exits: [toCellar],
        otherAreas: [cellar],
      }),
    );

    const leaving = walk(game, 'left', 11);
    const returning = walk(game, 'left', 3);

    expect(engagements(leaving)).toEqual([ENGAGED]);
    expect(leaving).toContainEqual({ type: 'area-changed', areaId: 'cellar' });
    expect(returning).toContainEqual({ type: 'area-changed', areaId: 'arena' });
    expect(advance(game, 1)).toEqual([ENGAGED]);
  });

  it('is not told for a Guardian that was fighting when the game was saved: it had been told already', () => {
    const content = farField(GUARDIAN, { hero: { health: 1000 } });
    const game = newGame(content);
    walk(game, 'right', STEPS_TO_NOTICE);
    const continued = gameAtTitle(content);

    continued.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(monsterAction(continued, GUARDIAN_ID).type).not.toBe('idle');
    expect(engagements(advance(continued, 300))).toEqual([]);
  });

  it('is told for the Guardian only: a monster that notices the hero and goes for it tells nothing', () => {
    const game = newGame(arena({ monsters: [biterAt('biter', 4, 3)] }));

    const events = advance(game, 40);

    expect(monsterAction(game, 'biter').type).not.toBe('idle');
    expect(engagements(events)).toEqual([]);
  });
});
