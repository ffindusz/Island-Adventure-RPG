/** The Game core advances in fixed steps of 1/60 of a second. */
export const STEPS_PER_SECOND = 60;

/** The length of one fixed step, in milliseconds. */
export const STEP_MS = 1000 / STEPS_PER_SECOND;

/** The whole number of fixed steps closest to a duration. */
export function msToSteps(ms: number): number {
  return Math.round((ms * STEPS_PER_SECOND) / 1000);
}
