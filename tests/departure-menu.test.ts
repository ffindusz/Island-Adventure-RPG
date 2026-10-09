import { describe, expect, it } from 'vitest';
import { departureAnswer } from '../src/adapter/departure-menu';
import type { MenuInput } from '../src/adapter/player-input';
import { gameAtTitle, playingView } from './fixtures';
import { askingGame, harborContent, harborGame, preparedGame, VESSEL_ID } from './harbor-fixtures';

// What Enter does while the game asks whether to sail home: it is the answer yes. The answer no is Esc, which the
// player's keys turn into a command by themselves (player-input.ts), because Esc also closes a page.

const ENTER: MenuInput = { step: 0, confirm: true };
const SAIL = [{ type: 'confirm-departure' }];

describe('Enter at the question whether to sail home', () => {
  it('answers yes when the question is open', () => {
    expect(departureAnswer(askingGame().view(), ENTER)).toEqual(SAIL);
  });

  it('answers nothing when Enter was not pressed, whichever way the menu keys went', () => {
    for (const step of [-1, 0, 1] as const) {
      expect(departureAnswer(askingGame().view(), { step, confirm: false })).toEqual([]);
    }
  });

  it('answers nothing when no question is open, even for a vessel that is prepared', () => {
    expect(departureAnswer(harborGame().view(), ENTER)).toEqual([]);
    expect(departureAnswer(preparedGame().view(), ENTER)).toEqual([]);
  });

  it('answers nothing at the title, where there is no game', () => {
    expect(departureAnswer(gameAtTitle(harborContent()).view(), ENTER)).toEqual([]);
  });

  it('answers nothing for a question with a page or a Stat Point in front of it: Enter is for what the player sees', () => {
    const withPage = harborGame();
    withPage.send({ type: 'open-page', page: 'inventory' });
    const behindPage = { ...playingView(withPage), departure: { vesselId: VESSEL_ID } };
    const behindStatPoint = { ...playingView(askingGame()), levelUp: { level: 2, points: 1, options: [] } };

    expect(behindPage.page).not.toBeNull();
    expect(departureAnswer(behindPage, ENTER)).toEqual([]);
    expect(departureAnswer(behindStatPoint, ENTER)).toEqual([]);
  });
});
