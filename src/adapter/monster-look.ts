// What a monster looks like in motion, however it is drawn: as the pictures of its sheet (monster-sprites.ts) or, in an
// area without art, as flat shapes (art.ts). What the two share is here, so that a flat monster warns, dashes and shows
// its Health the way a pictured one does. All of it is cosmetic.

/** The dark of a monster's outline: the flat body's, and the Health bar's. */
export const OUTLINE_COLOUR = 0x1b1b24;
/** The green of the Health in its bar. */
export const HEALTH_COLOUR = 0x7bd35f;

/** A wind-up shows its red in the first of this many equal parts of it, hides it in the next, and so on, so that it ends on. */
export const WARN_PARTS = 7;

/** Whether a wind-up that is `progress` of the way through is showing its red at this moment: on at the very end. */
export function warnsNow(progress: number): boolean {
  return Math.floor(progress * WARN_PARTS) % 2 === 0;
}

/** The faded copies of a dashing monster left behind it, nearest first, by how much of it shows. */
export const DASH_TRAIL_ALPHAS: readonly number[] = [0.5, 0.3, 0.15];
