import { describe, expect, it } from 'vitest';
import { Feedback } from '../src/adapter/feedback';
import { VESSEL_ID } from './harbor-fixtures';

// When the player is told that the vessel is prepared, and for how long. The rest of what feedback.ts shows is told of
// by the play scene, and looked at in the smoke test.

const PREPARED = { type: 'vessel-prepared', vesselId: VESSEL_ID } as const;
const A_NOTICE_BEFORE = { type: 'checkpoint-activated', checkpointId: 'any' } as const;

describe('the notice that the vessel is prepared', () => {
  it('tells the player when the game reports that the vessel is prepared, and not before', () => {
    const feedback = new Feedback();
    expect(feedback.notice()).toBeNull();

    feedback.show([PREPARED]);

    expect(feedback.notice()).toEqual({ kind: 'vessel-prepared' });
  });

  it('stays for three seconds, as a notice does, and then goes', () => {
    const feedback = new Feedback();
    feedback.show([PREPARED]);

    feedback.age(2999);
    expect(feedback.notice()).toEqual({ kind: 'vessel-prepared' });

    feedback.age(1);
    expect(feedback.notice()).toBeNull();
  });

  it('is told over a notice that was still showing', () => {
    const feedback = new Feedback();
    feedback.show([A_NOTICE_BEFORE]);
    expect(feedback.notice()).toEqual({ kind: 'checkpoint' });

    feedback.show([PREPARED]);

    expect(feedback.notice()).toEqual({ kind: 'vessel-prepared' });
  });

  it('is not told for the ending, which is shown by a screen of its own', () => {
    const feedback = new Feedback();

    feedback.show([{ type: 'ending-reached', ending: ['THE END.'], credits: ['THANKS.'] }]);

    expect(feedback.notice()).toBeNull();
  });
});
