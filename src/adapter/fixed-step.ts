import { STEP_MS } from '../core';

/** A frame longer than this counts as this long, so a stalled tab does not make the game try to catch up. */
const LONGEST_FRAME_MS = 250;

/** The most Game core steps run for one frame. Time owed beyond that is dropped: a slow machine slows the game down. */
const MOST_STEPS_PER_FRAME = 5;

/** Turns the uneven frame times of the browser into the fixed steps the Game core runs on. */
export class FixedStepClock {
  private owedMs = 0;

  /** How many whole steps to run for a frame that took `frameMs`. Time left over is kept for the next frame. */
  stepsDue(frameMs: number): number {
    this.owedMs += Math.min(frameMs, LONGEST_FRAME_MS);
    let steps = 0;
    while (this.owedMs >= STEP_MS && steps < MOST_STEPS_PER_FRAME) {
      this.owedMs -= STEP_MS;
      steps += 1;
    }
    if (this.owedMs >= STEP_MS) {
      this.owedMs = 0;
    }
    return steps;
  }
}
