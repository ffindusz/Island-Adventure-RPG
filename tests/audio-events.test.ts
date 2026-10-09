import { describe, expect, it } from 'vitest';
import { PAGE_IDS, STAT_IDS } from '../src/core';
import type { PageId, StatId } from '../src/core';
import { defeatPrize, gameAtTitle, gameWithPrizes, newGame, playingView } from './fixtures';
import { askingGame } from './harbor-fixtures';

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
