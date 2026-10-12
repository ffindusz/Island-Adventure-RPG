import { describe, expect, it } from 'vitest';
import { PAGE_IDS } from '../src/core';
import type { Command, Game, PageId, Snapshot } from '../src/core';
import { askingGame, harborContent } from './harbor-fixtures';
import {
  advance,
  arena,
  biterAt,
  continuedFrom,
  gameAtTitle,
  gameWithPrizes,
  newGame,
  playingView,
  prizes,
} from './fixtures';

const toggle = (page: PageId): Command => ({ type: 'toggle-page', page });
const open = (page: PageId): Command => ({ type: 'open-page', page });
const close = (page: PageId): Command => ({ type: 'close-page', page });

/** The page the view shows as open, or null when none is. */
function openPageOf(game: Game): PageId | null {
  return playingView(game).page?.id ?? null;
}

/** The snapshot of a game, as if its page had been open when it was saved. */
function savedWithPageOpen(game: Game, page: PageId): Snapshot {
  const snapshot = game.snapshot();
  snapshot.state.page = page;
  return snapshot;
}

/** Every pair of two different pages: the one that is open, and the other. */
const PAIRS = PAGE_IDS.flatMap((shown) =>
  PAGE_IDS.filter((other) => other !== shown).map((other): [PageId, PageId] => [shown, other]),
);

describe.each(PAGE_IDS)('toggling the %s page', (page) => {
  it('opens it when no page is open: the same event and state as open-page, and the game waits', () => {
    const toggled = newGame();
    const opened = newGame();

    const events = toggled.send(toggle(page));

    expect(events).toEqual([{ type: 'page-opened', page }]);
    expect(events).toEqual(opened.send(open(page)));
    expect(openPageOf(toggled)).toBe(page);
    expect(toggled.snapshot()).toEqual(opened.snapshot());
  });

  it('closes it when it is open: the same event and state as close-page, and the game goes on', () => {
    const toggled = newGame();
    const closed = newGame();
    toggled.send(toggle(page));
    closed.send(open(page));

    const events = toggled.send(toggle(page));

    expect(events).toEqual([{ type: 'page-closed', page }]);
    expect(events).toEqual(closed.send(close(page)));
    expect(openPageOf(toggled)).toBeNull();
    expect(toggled.snapshot()).toEqual(closed.snapshot());
  });

  it('opens it again and closes it again, as often as it is pressed', () => {
    const game = newGame();

    const kinds = [1, 2, 3, 4].map(() => game.send(toggle(page)).map((event) => event.type));

    expect(kinds).toEqual([['page-opened'], ['page-closed'], ['page-opened'], ['page-closed']]);
    expect(openPageOf(game)).toBeNull();
  });

  it('closes a page that open-page opened, and its page is closed by close-page: how it was opened does not matter', () => {
    const game = newGame();
    game.send(open(page));
    expect(game.send(toggle(page))).toEqual([{ type: 'page-closed', page }]);

    game.send(toggle(page));
    expect(game.send(close(page))).toEqual([{ type: 'page-closed', page }]);
    expect(openPageOf(game)).toBeNull();
  });

  it('leaves open-page as it was: on the page that is open it stays ignored and does not close it', () => {
    const game = newGame();
    game.send(open(page));

    expect(game.send(open(page))).toEqual([]);

    expect(openPageOf(game)).toBe(page);
  });

  it('closes a page that was open when the game was saved, once the game is continued', () => {
    const game = newGame();
    game.send(toggle(page));

    const continued = continuedFrom(arena(), game.snapshot());

    expect(openPageOf(continued)).toBe(page);
    expect(continued.send(toggle(page))).toEqual([{ type: 'page-closed', page }]);
    expect(openPageOf(continued)).toBeNull();
  });

  it('does nothing at the title, now or later', () => {
    const game = gameAtTitle();

    expect(game.send(toggle(page))).toEqual([]);
    expect(game.view()).toEqual({ phase: 'title' });

    game.send({ type: 'new-game' });
    expect(openPageOf(game)).toBeNull();
  });

  it('opens nothing while a Stat Point waits to be assigned, and opens once it is assigned', () => {
    const game = gameWithPrizes(10);
    game.send({ type: 'attack' });
    expect(playingView(game).levelUp).not.toBeNull();
    const before = game.snapshot();

    expect(game.send(toggle(page))).toEqual([]);
    expect(game.snapshot()).toEqual(before);

    game.send({ type: 'assign-stat-point', stat: 'attack' });
    expect(game.send(toggle(page))).toEqual([{ type: 'page-opened', page }]);
  });

  it('opens nothing while the question whether to sail home is asked, and opens once it is declined', () => {
    const game = askingGame();
    expect(playingView(game).departure).not.toBeNull();
    const before = game.snapshot();

    expect(game.send(toggle(page))).toEqual([]);
    expect(game.snapshot()).toEqual(before);

    game.send({ type: 'cancel-departure' });
    expect(game.send(toggle(page))).toEqual([{ type: 'page-opened', page }]);
  });

  it('closes the page in a saved game that also waits for a Stat Point, where close-page would close it', () => {
    const waiting = gameWithPrizes(10);
    waiting.send({ type: 'attack' });

    const continued = continuedFrom(arena(prizes(10)), savedWithPageOpen(waiting, page));

    expect(continued.send(toggle(page))).toEqual([{ type: 'page-closed', page }]);
    expect(openPageOf(continued)).toBeNull();
    expect(playingView(continued).levelUp).not.toBeNull();
  });

  it('closes the page in a saved game that also asks whether to sail home, where close-page would close it', () => {
    const continued = continuedFrom(harborContent(), savedWithPageOpen(askingGame(), page));

    expect(continued.send(toggle(page))).toEqual([{ type: 'page-closed', page }]);
    expect(openPageOf(continued)).toBeNull();
    expect(playingView(continued).departure).not.toBeNull();
  });

  it('lets the game go on where it stopped once it closes the page', () => {
    const content = arena({ monsters: [biterAt('biter', 4, 3)] });
    const uninterrupted = newGame(content);
    const expected = advance(uninterrupted, 40);

    const interrupted = newGame(content);
    const events = advance(interrupted, 20);
    interrupted.send(toggle(page));
    expect(advance(interrupted, 100)).toEqual([]);
    interrupted.send(toggle(page));
    events.push(...advance(interrupted, 20));

    expect(expected.map((event) => event.type)).toContain('hero-hit');
    expect(events).toEqual(expected);
    expect(interrupted.snapshot()).toEqual(uninterrupted.snapshot());
  });
});

describe.each(PAIRS)('with the %s page open, toggling the %s page', (shown, other) => {
  it('does nothing: the page that is open stays open and the game stays as it was', () => {
    const game = newGame();
    game.send(toggle(shown));
    const before = game.snapshot();

    expect(game.send(toggle(other))).toEqual([]);

    expect(openPageOf(game)).toBe(shown);
    expect(game.snapshot()).toEqual(before);
  });

  it('leaves the page that is open to close with its own toggle', () => {
    const game = newGame();
    game.send(toggle(shown));
    game.send(toggle(other));

    expect(game.send(toggle(shown))).toEqual([{ type: 'page-closed', page: shown }]);
    expect(openPageOf(game)).toBeNull();
  });
});
