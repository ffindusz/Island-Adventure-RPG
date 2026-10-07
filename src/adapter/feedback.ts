import type { Box, GameEvent, PickedUpItem } from '../core';

/** How long each kind of feedback stays on screen, in milliseconds. */
const SWING_MS = 120;
const HIT_FLASH_MS = 100;
const STRIKE_MS = 160;
const HERO_HURT_MS = 200;
const PICKUP_NOTICE_MS = 3000;

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
  private pickup: { readonly item: PickedUpItem; readonly msLeft: number } | null = null;

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
          this.pickup = { item: event.item, msLeft: PICKUP_NOTICE_MS };
          break;
        case 'area-changed':
          this.clearFight();
          break;
        case 'hero-defeated':
          // The fight is over and the monsters are back as they began: nothing of it should linger on the new scene.
          this.clearFight();
          this.heroHurtMsLeft = 0;
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
    if (this.pickup !== null) {
      const { item, msLeft } = this.pickup;
      this.pickup = msLeft > frameMs ? { item, msLeft: msLeft - frameMs } : null;
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

  /** What the hero found a moment ago, for the player to be told about. */
  pickupNotice(): PickedUpItem | null {
    return this.pickup === null ? null : this.pickup.item;
  }

  /** Stops telling the player about what the hero found: they have moved on to something that covers it. */
  dismissPickup(): void {
    this.pickup = null;
  }
}

function remaining(flashes: readonly ZoneFlash[], frameMs: number): ZoneFlash[] {
  return flashes
    .map((flash) => ({ zone: flash.zone, msLeft: flash.msLeft - frameMs }))
    .filter((flash) => flash.msLeft > 0);
}
