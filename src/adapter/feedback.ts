import type { Box, GameEvent } from '../core';

/** How long the swing and the hit flash stay on screen, in milliseconds. */
const SWING_MS = 120;
const HIT_FLASH_MS = 100;

interface Swing {
  readonly zone: Box;
  readonly msLeft: number;
}

/**
 * Short-lived visual feedback for Game core events. It is cosmetic only: it runs on frame time, and nothing the
 * Game core decides ever depends on it.
 */
export class Feedback {
  private swings: Swing[] = [];
  private readonly flashes = new Map<string, number>();

  /** Starts the feedback for events the Game core just reported. */
  show(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'hero-attacked') {
        this.swings.push({ zone: event.zone, msLeft: SWING_MS });
      } else if (event.type === 'monster-hit') {
        this.flashes.set(event.monsterId, HIT_FLASH_MS);
      } else if (event.type === 'monster-defeated') {
        this.flashes.delete(event.monsterId);
      }
    }
  }

  /** Lets one frame's time pass; feedback that has run out disappears. */
  age(frameMs: number): void {
    this.swings = this.swings
      .map((swing) => ({ zone: swing.zone, msLeft: swing.msLeft - frameMs }))
      .filter((swing) => swing.msLeft > 0);
    for (const [monsterId, msLeft] of this.flashes) {
      if (msLeft <= frameMs) {
        this.flashes.delete(monsterId);
      } else {
        this.flashes.set(monsterId, msLeft - frameMs);
      }
    }
  }

  /** The areas of the swings to draw now. */
  swingZones(): Box[] {
    return this.swings.map((swing) => swing.zone);
  }

  isFlashing(monsterId: string): boolean {
    return this.flashes.has(monsterId);
  }
}
