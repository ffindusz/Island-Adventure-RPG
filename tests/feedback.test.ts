import { describe, expect, it } from 'vitest';
import { Feedback } from '../src/adapter/feedback';
import { VESSEL_ID } from './harbor-fixtures';

// When the player is told that the vessel is prepared, and for how long, how long the picture of what the hero
// picked up rises over it, and that the notice that the game could not be saved is told once. The rest of what
// feedback.ts shows is told of by the play scene, and looked at in the smoke test.

const PREPARED = { type: 'vessel-prepared', vesselId: VESSEL_ID } as const;
const A_NOTICE_BEFORE = { type: 'checkpoint-activated', checkpointId: 'any' } as const;
const POTION = { kind: 'consumable', id: 'healing-potion', amount: 1 } as const;
const ARROWS = { kind: 'consumable', id: 'ammunition', amount: 12 } as const;
const PICKED_UP_POTION = { type: 'pickup', item: POTION } as const;
const PICKED_UP_ARROWS = { type: 'pickup', item: ARROWS } as const;

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

describe('the picture of what the hero picked up, rising over it', () => {
  it('starts when the game reports a pickup, and not before', () => {
    const feedback = new Feedback();
    expect(feedback.pickupRises()).toEqual([]);

    feedback.show([PICKED_UP_POTION]);

    expect(feedback.pickupRises()).toEqual([{ item: POTION, progress: 0, lane: 0 }]);
  });

  it('lasts half a second, and then goes', () => {
    const feedback = new Feedback();
    feedback.show([PICKED_UP_POTION]);

    feedback.age(499);
    expect(feedback.pickupRises()).toHaveLength(1);

    feedback.age(1);
    expect(feedback.pickupRises()).toEqual([]);
  });

  it('tells how far through its half second it is', () => {
    const feedback = new Feedback();
    feedback.show([PICKED_UP_POTION]);

    feedback.age(125);
    expect(feedback.pickupRises()).toEqual([{ item: POTION, progress: 0.25, lane: 0 }]);

    feedback.age(125);
    expect(feedback.pickupRises()).toEqual([{ item: POTION, progress: 0.5, lane: 0 }]);
  });

  it('keeps one rise for each pickup, each at its own point in its time, the oldest first', () => {
    const feedback = new Feedback();
    feedback.show([PICKED_UP_POTION]);
    feedback.age(200);

    feedback.show([PICKED_UP_ARROWS]);

    expect(feedback.pickupRises()).toEqual([
      { item: POTION, progress: 0.4, lane: 0 },
      { item: ARROWS, progress: 0, lane: 1 },
    ]);
  });

  it('puts a picture that starts while another still rises beside it, and gives the place back when it is gone', () => {
    const feedback = new Feedback();
    const lanes = (): number[] => feedback.pickupRises().map((rise) => rise.lane);
    feedback.show([PICKED_UP_POTION]);
    feedback.age(100);
    feedback.show([PICKED_UP_ARROWS]);
    expect(lanes()).toEqual([0, 1]);

    // The potion's half second is over, and the arrows have 100 ms left: they keep their place and do not jump.
    feedback.age(400);
    expect(lanes()).toEqual([1]);

    feedback.show([PICKED_UP_POTION]);
    expect(lanes()).toEqual([1, 0]);
  });

  it('puts the pictures of two pickups of one frame beside each other', () => {
    const feedback = new Feedback();

    feedback.show([PICKED_UP_POTION, PICKED_UP_ARROWS]);

    expect(feedback.pickupRises()).toEqual([
      { item: POTION, progress: 0, lane: 0 },
      { item: ARROWS, progress: 0, lane: 1 },
    ]);
  });

  it('goes with the hero when it is defeated, as the notice does: what it found since the Checkpoint is back where it was', () => {
    const feedback = new Feedback();
    feedback.show([PICKED_UP_POTION]);

    feedback.show([{ type: 'hero-defeated' }]);

    expect(feedback.pickupRises()).toEqual([]);
  });

  it('leaves the notice of the pickup as it was: the notice is still up when the picture has gone', () => {
    const feedback = new Feedback();
    feedback.show([PICKED_UP_POTION]);

    feedback.age(500);

    expect(feedback.pickupRises()).toEqual([]);
    expect(feedback.notice()).toEqual({ kind: 'pickup', item: POTION });
  });
});

describe('the notice that the game could not be saved', () => {
  it('tells the player when a save fails, over a notice that was still showing, and not before', () => {
    const feedback = new Feedback();
    expect(feedback.notice()).toBeNull();
    feedback.show([A_NOTICE_BEFORE]);
    expect(feedback.notice()).toEqual({ kind: 'checkpoint' });

    feedback.saveFailed();

    expect(feedback.notice()).toEqual({ kind: 'save-failed' });
  });

  it('stays for three seconds, as a notice does, and then goes', () => {
    const feedback = new Feedback();
    feedback.saveFailed();

    feedback.age(2999);
    expect(feedback.notice()).toEqual({ kind: 'save-failed' });

    feedback.age(1);
    expect(feedback.notice()).toBeNull();
  });

  it('is told once: a second failed save says nothing, once the first notice has gone', () => {
    const feedback = new Feedback();
    feedback.saveFailed();
    feedback.age(3000);

    feedback.saveFailed();

    expect(feedback.notice()).toBeNull();
  });

  it('does not start its three seconds again when a second save fails while it is still up', () => {
    const feedback = new Feedback();
    feedback.saveFailed();
    feedback.age(2000);

    feedback.saveFailed();
    feedback.age(1000);

    expect(feedback.notice()).toBeNull();
  });

  it('counts as told when a page covered it at once: the second failed save says nothing either', () => {
    const feedback = new Feedback();
    feedback.saveFailed();
    feedback.dismissNotice();

    feedback.saveFailed();

    expect(feedback.notice()).toBeNull();
  });

  it('leaves the notice of a Checkpoint showing when a second save fails over it', () => {
    const feedback = new Feedback();
    feedback.saveFailed();
    feedback.age(3000);
    feedback.show([A_NOTICE_BEFORE]);

    feedback.saveFailed();

    expect(feedback.notice()).toEqual({ kind: 'checkpoint' });
  });

  it('is told again in a play of its own: each play has a Feedback of its own, and the title said so before it', () => {
    const first = new Feedback();
    first.saveFailed();

    const second = new Feedback();
    second.saveFailed();

    expect(second.notice()).toEqual({ kind: 'save-failed' });
  });
});
