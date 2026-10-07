import type { Box, GameEvent } from '../core';
import type { NoticeContent } from './notice';

/** How long each kind of feedback stays on screen, in milliseconds. */
const SWING_MS = 120;
const HIT_FLASH_MS = 100;
const STRIKE_MS = 160;
const HERO_HURT_MS = 200;
const NOTICE_MS = 3000;

interface ZoneFlash {
  readonly zone: Box;
  readonly msLeft: number;
}

/**
 * Short-lived visual feedback for Game core events. It is cosmetic only: it runs on frame time, and nothing the
 * Game core decides ever depends on it.
 */
export class Feedback {
  private swings: ZoneFlash[] = [];
  private strikes: ZoneFlash[] = [];
  private readonly flashes = new Map<string, number>();
  private heroHurtMsLeft = 0;
  private told: { readonly content: NoticeContent; readonly msLeft: number } | null = null;

  /** Starts the feedback for events the Game core just reported. */
  show(events: readonly GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'hero-attacked':
          this.swings.push({ zone: event.zone, msLeft: SWING_MS });
          break;
        case 'monster-hit':
          this.flashes.set(event.monsterId, HIT_FLASH_MS);
          break;
        case 'monster-defeated':
          this.flashes.delete(event.monsterId);
          break;
        case 'monster-attacked':
          this.strikes.push({ zone: event.zone, msLeft: STRIKE_MS });
          break;
        case 'hero-hit':
          this.heroHurtMsLeft = HERO_HURT_MS;
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
        case 'area-changed':
          this.clearFight();
          break;
        case 'hero-defeated':
          // The fight is over and the monsters are back as they began: nothing of it should linger on the new scene.
          // The notice on the screen told of what happened before the fall, and what the hero found since the Checkpoint
          // is back where it was, so it goes too.
          this.clearFight();
          this.heroHurtMsLeft = 0;
          this.told = null;
          break;
      }
    }
  }

  /** Forgets the swings, strikes and flashes of a fight, such as when its monsters are left behind in another area. */
  private clearFight(): void {
    this.swings = [];
    this.strikes = [];
    this.flashes.clear();
  }

  /** Lets one frame's time pass; feedback that has run out disappears. */
  age(frameMs: number): void {
    this.swings = remaining(this.swings, frameMs);
    this.strikes = remaining(this.strikes, frameMs);
    this.heroHurtMsLeft = Math.max(0, this.heroHurtMsLeft - frameMs);
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

  /** The areas of the hero's swings to draw now. */
  swingZones(): Box[] {
    return this.swings.map((swing) => swing.zone);
  }

  /** The areas of the monsters' strikes to draw now. */
  strikeZones(): Box[] {
    return this.strikes.map((strike) => strike.zone);
  }

  isFlashing(monsterId: string): boolean {
    return this.flashes.has(monsterId);
  }

  /** Whether the hero is showing that it was just hit. */
  isHeroHurt(): boolean {
    return this.heroHurtMsLeft > 0;
  }

  /** What the player is being told about: the latest of what the hero found, a Checkpoint touched, or the empty bow. */
  notice(): NoticeContent | null {
    return this.told === null ? null : this.told.content;
  }

  /** Stops telling the player about it: they have moved on to something that covers it. */
  dismissNotice(): void {
    this.told = null;
  }
}

function remaining(flashes: readonly ZoneFlash[], frameMs: number): ZoneFlash[] {
  return flashes
    .map((flash) => ({ zone: flash.zone, msLeft: flash.msLeft - frameMs }))
    .filter((flash) => flash.msLeft > 0);
}
