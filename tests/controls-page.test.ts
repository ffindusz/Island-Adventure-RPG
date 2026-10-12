import { describe, expect, it } from 'vitest';
import { parseSave } from '../src/adapter/saved-game';
import type { Command, PageId } from '../src/core';
import { askingGame } from './harbor-fixtures';
import { advance, arena, biterAt, continuedFrom, gameWithPrizes, newGame, playingView, prizes } from './fixtures';

// The Controls page is a page of the Game core like the stat page, the inventory and the Automap: the core knows that it
// is open, as it knows it of them, and nothing of what it lists, which is the adapter's business. The rules of every
// page are tried on each of the ids in toggle-page.test.ts, whatever ids there are; these are the ones that name this
// page, and the saves that carry it.

const OPEN: Command = { type: 'open-page', page: 'controls' };
const CLOSE: Command = { type: 'close-page', page: 'controls' };
const TOGGLE: Command = { type: 'toggle-page', page: 'controls' };

const OTHER_PAGES: readonly PageId[] = ['stats', 'inventory', 'automap'];

/** What the game of ticket 27 saved for a new game of the arena with the stat page open, to the letter. */
const SAVED_BEFORE = JSON.stringify({
  version: 4,
  state: {
    phase: 'playing',
    areaId: 'arena',
    checkpoint: {
      areaId: 'arena',
      tile: { col: 3, row: 3 },
      consumables: { ammunition: 0, 'healing-potion': 0 },
      collected: [],
    },
    areaText: null,
    hero: {
      position: { x: 3.5, y: 3.5 },
      facing: 'down',
      health: 10,
      attackCooldown: 0,
      experience: 0,
      statPoints: { health: 0, attack: 0, defense: 0 },
      gear: ['basic-sword', 'basic-armor'],
      equipped: { 'melee-weapon': 'basic-sword', armor: 'basic-armor' },
      activeWeapon: 'melee-weapon',
      consumables: { ammunition: 0, 'healing-potion': 0 },
      keys: [],
    },
    arrows: [],
    page: 'stats',
    departure: null,
    areas: {
      arena: {
        monsters: [],
        reachedMilestones: [],
        visited: true,
        interactables: {},
        revealed: [
          [false, true, true, true, true, true, false],
          [true, true, true, true, true, true, true],
          [true, true, true, true, true, true, true],
          [true, true, true, true, true, true, true],
          [true, true, true, true, true, true, true],
          [true, true, true, true, true, true, true],
        ],
      },
    },
  },
});

describe('the Controls page', () => {
  it('opens when it is asked for, and the view says it is the page that is open', () => {
    const game = newGame();

    expect(game.send(OPEN)).toEqual([{ type: 'page-opened', page: 'controls' }]);

    expect(playingView(game).page).toEqual({ id: 'controls' });
  });

  it('is opened and closed again by its toggle, with the events of the other pages', () => {
    const game = newGame();

    expect(game.send(TOGGLE)).toEqual([{ type: 'page-opened', page: 'controls' }]);
    expect(game.send(TOGGLE)).toEqual([{ type: 'page-closed', page: 'controls' }]);

    expect(playingView(game).page).toBeNull();
  });

  it('is closed by close-page, which is what Esc sends, with the event that its toggle gives', () => {
    const game = newGame();
    game.send(OPEN);

    expect(game.send(CLOSE)).toEqual([{ type: 'page-closed', page: 'controls' }]);

    expect(playingView(game).page).toBeNull();
  });

  it.each(OTHER_PAGES)('is not closed by close-page of the %s page', (other) => {
    const game = newGame();
    game.send(OPEN);

    expect(game.send({ type: 'close-page', page: other })).toEqual([]);

    expect(playingView(game).page).toEqual({ id: 'controls' });
  });

  it('makes the game wait: nothing moves and no time passes until it closes, and then the game goes on', () => {
    const content = arena({ monsters: [biterAt('biter', 4, 3)] });
    const uninterrupted = newGame(content);
    const expected = advance(uninterrupted, 40);

    const interrupted = newGame(content);
    const events = advance(interrupted, 20);
    interrupted.send(TOGGLE);
    expect(advance(interrupted, 100)).toEqual([]);
    interrupted.send(TOGGLE);
    events.push(...advance(interrupted, 20));

    expect(expected.map((event) => event.type)).toContain('hero-hit');
    expect(events).toEqual(expected);
    expect(interrupted.snapshot()).toEqual(uninterrupted.snapshot());
  });

  it.each(OTHER_PAGES)('does not open while the %s page is open, and the page that is open stays', (other) => {
    const game = newGame();
    game.send({ type: 'open-page', page: other });

    expect(game.send(OPEN)).toEqual([]);
    expect(game.send(TOGGLE)).toEqual([]);

    expect(playingView(game).page?.id).toBe(other);
  });

  it.each(OTHER_PAGES)('stays open when the key of the %s page is pressed, which does nothing', (other) => {
    const game = newGame();
    game.send(TOGGLE);

    expect(game.send({ type: 'toggle-page', page: other })).toEqual([]);
    expect(game.send({ type: 'open-page', page: other })).toEqual([]);

    expect(playingView(game).page).toEqual({ id: 'controls' });
  });

  it('does not open while a Stat Point waits to be assigned, and opens once it is assigned', () => {
    const game = gameWithPrizes(10);
    game.send({ type: 'attack' });
    expect(playingView(game).levelUp).not.toBeNull();

    expect(game.send(TOGGLE)).toEqual([]);
    expect(playingView(game).page).toBeNull();

    game.send({ type: 'assign-stat-point', stat: 'attack' });
    expect(game.send(TOGGLE)).toEqual([{ type: 'page-opened', page: 'controls' }]);
  });

  it('does not open while the question whether to sail home is asked, and opens once it is declined', () => {
    const game = askingGame();

    expect(game.send(TOGGLE)).toEqual([]);
    expect(playingView(game).page).toBeNull();

    game.send({ type: 'cancel-departure' });
    expect(game.send(TOGGLE)).toEqual([{ type: 'page-opened', page: 'controls' }]);
  });

  it.each([
    ['its toggle', TOGGLE],
    ['close-page', CLOSE],
  ])('is closed by %s when it was open at the save and the game is continued', (_, closing) => {
    const saved = newGame();
    saved.send(TOGGLE);

    const continued = continuedFrom(arena(), saved.snapshot());

    expect(playingView(continued).page).toEqual({ id: 'controls' });
    expect(continued.send(closing)).toEqual([{ type: 'page-closed', page: 'controls' }]);
    expect(playingView(continued).page).toBeNull();
  });

  it('waits when the game is continued from a save that had it open: no time passes', () => {
    const saved = newGame(arena({ monsters: [biterAt('biter', 4, 3)] }));
    saved.send(TOGGLE);

    const continued = continuedFrom(arena({ monsters: [biterAt('biter', 4, 3)] }), saved.snapshot());

    expect(advance(continued, 100)).toEqual([]);
  });
});

describe('a save with the Controls page open', () => {
  it('holds the page as its id, as the other pages are held', () => {
    const game = newGame();
    game.send(TOGGLE);

    expect(game.snapshot().state.page).toBe('controls');
  });

  it('is a save that the game can continue from', () => {
    const game = newGame(gameContentWithPrizes());
    game.send(TOGGLE);
    const text = JSON.stringify(game.snapshot());

    const parsed = parseSave(text, gameContentWithPrizes());

    expect(parsed).toEqual({ status: 'usable', snapshot: JSON.parse(text) });
  });
});

describe('a save made before the Controls page', () => {
  it('still loads, for the page that was open in it', () => {
    const parsed = parseSave(SAVED_BEFORE, arena());

    expect(parsed).toMatchObject({ status: 'usable' });
    if (parsed.status !== 'usable') {
      return;
    }
    const continued = continuedFrom(arena(), parsed.snapshot);
    expect(playingView(continued).page?.id).toBe('stats');
    expect(continued.send(TOGGLE)).toEqual([]);
    expect(continued.send({ type: 'toggle-page', page: 'stats' })).toEqual([{ type: 'page-closed', page: 'stats' }]);
    expect(continued.send(TOGGLE)).toEqual([{ type: 'page-opened', page: 'controls' }]);
  });

  it('still loads, for a game with no page open in it, which then opens the Controls page', () => {
    const noPage = SAVED_BEFORE.replace('"page":"stats"', '"page":null');
    expect(noPage).not.toBe(SAVED_BEFORE);

    const parsed = parseSave(noPage, arena());

    expect(parsed).toMatchObject({ status: 'usable' });
    if (parsed.status !== 'usable') {
      return;
    }
    const continued = continuedFrom(arena(), parsed.snapshot);
    expect(playingView(continued).page).toBeNull();
    expect(continued.send(TOGGLE)).toEqual([{ type: 'page-opened', page: 'controls' }]);
  });
});

/** The arena with the prizes of a level, so that the save has more in it than a new game. */
function gameContentWithPrizes() {
  return arena(prizes(10));
}
