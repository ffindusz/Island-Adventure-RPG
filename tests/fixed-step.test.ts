import { describe, expect, it } from 'vitest';
import { FixedStepClock } from '../src/adapter/fixed-step';
import { STEP_MS } from '../src/core';

// The clock that turns the frames of the browser into the steps of the Game core, and so the one place where the game
// pauses while nobody is looking at it: the play screen asks it for the steps due with `watching` false whenever its
// tab is hidden or its window has lost the keyboard focus. Whole fractions of a step are used for the times, never a
// number of milliseconds, so that the tests hold for whatever the length of a step is.

describe('the clock of fixed steps', () => {
  it('runs a step for each step of time that passes', () => {
    const clock = new FixedStepClock();

    expect(clock.stepsDue(STEP_MS, true)).toBe(1);
    expect(clock.stepsDue(2 * STEP_MS, true)).toBe(2);
  });

  it('keeps the part of a step that is left over for the next frame', () => {
    const clock = new FixedStepClock();

    expect(clock.stepsDue(3.5 * STEP_MS, true)).toBe(3);
    // Half a step was left; with the 0.6 of this frame it is a whole step and a tenth.
    expect(clock.stepsDue(0.6 * STEP_MS, true)).toBe(1);
    expect(clock.stepsDue(0.8 * STEP_MS, true)).toBe(0);
  });

  it('runs no step while nobody is watching, however much time passes', () => {
    const clock = new FixedStepClock();

    expect(clock.stepsDue(STEP_MS, false)).toBe(0);
    expect(clock.stepsDue(10 * STEP_MS, false)).toBe(0);
    expect(clock.stepsDue(100_000, false)).toBe(0);
  });

  it('does not owe the time nobody watched, so the game does not rush on when the window comes back', () => {
    const clock = new FixedStepClock();
    // Nine tenths of a step are owed when the window loses the focus.
    clock.stepsDue(0.9 * STEP_MS, true);

    clock.stepsDue(100 * STEP_MS, false);

    // Neither the long wait nor the nine tenths that were owed before it: a fifth of a step is not a step.
    expect(clock.stepsDue(0.2 * STEP_MS, true)).toBe(0);
  });

  it('runs no more than five steps for a frame, however long it was', () => {
    const clock = new FixedStepClock();

    expect(clock.stepsDue(100 * STEP_MS, true)).toBe(5);
    expect(clock.stepsDue(5.5 * STEP_MS, true)).toBe(5);
  });

  it('drops the time it cannot run steps for, so a slow machine slows the game down and does not make it catch up', () => {
    const clock = new FixedStepClock();
    clock.stepsDue(100 * STEP_MS, true);

    expect(clock.stepsDue(0, true)).toBe(0);
    expect(clock.stepsDue(0.5 * STEP_MS, true)).toBe(0);
  });
});
