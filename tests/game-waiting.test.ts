import { describe, expect, it } from 'vitest';
import { gameIsWaiting } from '../src/adapter/waiting';
import { gameAtTitle, playingView } from './fixtures';
import { askingGame, harborContent, harborGame, preparedGame } from './harbor-fixtures';

// When the play screen lets the game wait for the player: it leaves the walk keys alone, and takes the notice and the
// text of the area off the screen. The game waits while a page is open, while a Stat Point has to be assigned and while
// the question whether to sail home is open.

describe('the game waiting for the player', () => {
  it('does not wait while it is played, nor for a vessel that is only prepared', () => {
    expect(gameIsWaiting(harborGame().view())).toBe(false);
    expect(gameIsWaiting(preparedGame().view())).toBe(false);
  });

  it('does not wait at the title, where there is no game', () => {
    expect(gameIsWaiting(gameAtTitle(harborContent()).view())).toBe(false);
  });

  it('waits while a page is open', () => {
    const game = harborGame();
    game.send({ type: 'open-page', page: 'stats' });

    expect(gameIsWaiting(game.view())).toBe(true);
  });

  it('waits while a Stat Point has to be assigned', () => {
    const withStatPoint = { ...playingView(harborGame()), levelUp: { level: 2, points: 1, options: [] } };

    expect(gameIsWaiting(withStatPoint)).toBe(true);
  });

  it('waits while the question whether to sail home is open, and no longer once it is answered', () => {
    const game = askingGame();
    expect(gameIsWaiting(game.view())).toBe(true);

    game.send({ type: 'cancel-departure' });

    expect(gameIsWaiting(game.view())).toBe(false);
  });
});
