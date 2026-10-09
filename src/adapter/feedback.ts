import type { Box, GameEvent } from '../core';
import type { NoticeContent } from './notice';

/** How long each kind of feedback stays on screen, in milliseconds. */
const HIT_FLASH_MS = 100;
const STRIKE_MS = 160;
const NOTICE_MS = 3000;

interface ZoneFlash {
  readonly zone: Box;
  readonly msLeft: number;
}

/**
 * Short-lived visual feedback for Game core events. It is cosmetic only: it runs on frame time, and nothing the
 * Game core decides ever depends on it. What the hero itself shows of its swings, shots and hits is in hero-sprite.ts.
 */
export class Feedback {
  private strikes: ZoneFlash[] = [];
  private readonly flashes = new Map<string, number>();
  private told: { readonly content: NoticeContent; readonly msLeft: number } | null = null;
  private falling = false;

  /** Starts the feedback for events the Game core just reported. */
  show(events: readonly GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'monster-hit':
          this.flashes.set(event.monsterId, HIT_FLASH_MS);
          break;
        case 'monster-defeated':
          this.flashes.delete(event.monsterId);
          break;
        case 'monster-attacked':
          this.strikes.push({ zone: event.zone, msLeft: STRIKE_MS });
          break;
        case 'pickup':
          this.told = { content: { kind: 'pickup', item: event.item }, msLeft: NOTICE_MS };
          break;
        case 'out-of-ammunition':
          this.told = { content: { kind: 'out-of-ammunition' }, msLeft: NOTICE_MS };
          break;
        case 'checkpoint-activated':
          this.told = { content: { kind: 'checkpoint' }, msLeft: NOTICE_MS };
          break;
        case 'door-locked':
          this.told = { content: { kind: 'door-locked', keyName: event.keyName }, msLeft: NOTICE_MS };
          break;
        case 'door-opened':
          this.told = { content: { kind: 'door-opened', keyName: event.keyName }, msLeft: NOTICE_MS };
          break;
        case 'lever-toggled':
          this.told = { content: { kind: 'lever-toggled', pulled: event.pulled }, msLeft: NOTICE_MS };
          break;
        case 'guardian-defeated':
          this.told = { content: { kind: 'gate-opened' }, msLeft: NOTICE_MS };
          break;
        case 'area-changed':
          // After a defeat the return to another area is shown only when the fall is over: see endFall.
          if (!this.falling) {
            this.clearFight();
          }
          break;
        case 'hero-defeated':
          // The blow that did it stays on the screen while the hero lies where it fell, and the fight goes at endFall.
          // The notice told of what happened before the fall, and what the hero found since the Checkpoint is back where
          // it was, so it goes now.
          this.falling = true;
          this.told = null;
          break;
      }
    }
  }

  /** The hero's fall is over: the fight that ended it is left behind, in the place the hero fell in. */
  endFall(): void {
    this.falling = false;
    this.clearFight();
  }

  /** Forgets the strikes and flashes of a fight, such as when its monsters are left behind in another area. */
  private clearFight(): void {
    this.strikes = [];
    this.flashes.clear();
  }

  /** Lets one frame's time pass; feedback that has run out disappears. */
  age(frameMs: number): void {
    this.strikes = remaining(this.strikes, frameMs);
    if (this.told !== null) {
      const { content, msLeft } = this.told;
      this.told = msLeft > frameMs ? { content, msLeft: msLeft - frameMs } : null;
    }
    for (const [monsterId, msLeft] of this.flashes) {
      if (msLeft <= frameMs) {
        this.flashes.delete(monsterId);
      } else {
        this.flashes.set(monsterId, msLeft - frameMs);
      }
    }
  }

  /** The areas of the monsters' strikes to draw now. */
  strikeZones(): Box[] {
    return this.strikes.map((strike) => strike.zone);
  }

  isFlashing(monsterId: string): boolean {
    return this.flashes.has(monsterId);
  }

  /** What the player is being told about: the latest of what the hero found, a Checkpoint touched, the empty bow, a door, a lever, or the fall of the Guardian. */
  notice(): NoticeContent | null {
    return this.told === null ? null : this.told.content;
  }

  /** Stops telling the player about it: they have moved on to something that covers it. */
  dismissNotice(): void {
    this.told = null;
  }

  /** Tells the player that the game could not be saved, over whatever the notice told. */
  saveFailed(): void {
    this.told = { content: { kind: 'save-failed' }, msLeft: NOTICE_MS };
  }
}

function remaining(flashes: readonly ZoneFlash[], frameMs: number): ZoneFlash[] {
  return flashes
    .map((flash) => ({ zone: flash.zone, msLeft: flash.msLeft - frameMs }))
    .filter((flash) => flash.msLeft > 0);
}
