import type { Box, GameEvent, PickedUpItem } from '../core';
import type { NoticeContent } from './notice';

/** How long each kind of feedback stays on screen, in milliseconds. */
const HIT_FLASH_MS = 100;
const STRIKE_MS = 160;
const NOTICE_MS = 3000;
const PICKUP_RISE_MS = 500;

interface ZoneFlash {
  readonly zone: Box;
  readonly msLeft: number;
}

interface Rising {
  readonly item: PickedUpItem;
  readonly msIn: number;
  readonly lane: number;
}

/** The picture of what the hero picked up, rising over it: what it shows, how far through its time it is, and where. */
export interface PickupRise {
  readonly item: PickedUpItem;
  /** 0 as the picture starts, and under 1 for as long as it shows. */
  readonly progress: number;
  /** The place beside the pictures that rise together, 0 for the first. A picture keeps its place until it is gone. */
  readonly lane: number;
}

/**
 * Short-lived visual feedback for Game core events. It is cosmetic only: it runs on frame time, and nothing the
 * Game core decides ever depends on it. What the hero itself shows of its swings, shots and hits is in hero-sprite.ts.
 */
export class Feedback {
  private strikes: ZoneFlash[] = [];
  private readonly flashes = new Map<string, number>();
  private told: { readonly content: NoticeContent; readonly msLeft: number } | null = null;
  private rises: Rising[] = [];
  private falling = false;
  private saveFailureTold = false;

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
          this.rises.push({ item: event.item, msIn: 0, lane: this.freeLane() });
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
        case 'vessel-prepared':
          this.told = { content: { kind: 'vessel-prepared' }, msLeft: NOTICE_MS };
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
          // it was, so the notice goes now, and the pictures of what it found with it.
          this.falling = true;
          this.told = null;
          this.rises = [];
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
    this.rises = this.rises
      .map((rise) => ({ item: rise.item, msIn: rise.msIn + frameMs, lane: rise.lane }))
      .filter((rise) => rise.msIn < PICKUP_RISE_MS);
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

  /** The pictures of what the hero just picked up that are rising now, the oldest first. */
  pickupRises(): PickupRise[] {
    return this.rises.map(({ item, msIn, lane }) => ({ item, progress: msIn / PICKUP_RISE_MS, lane }));
  }

  /** The first place beside the pictures that are rising which none of them has. */
  private freeLane(): number {
    let lane = 0;
    while (this.rises.some((rise) => rise.lane === lane)) {
      lane += 1;
    }
    return lane;
  }

  /**
   * What the player is being told about: the latest of what the hero found, a Checkpoint touched, the empty bow, a door,
   * a lever, the fall of the Guardian, or the vessel made ready.
   */
  notice(): NoticeContent | null {
    return this.told === null ? null : this.told.content;
  }

  /** Stops telling the player about it: they have moved on to something that covers it. */
  dismissNotice(): void {
    this.told = null;
  }

  /**
   * Tells the player that the game could not be saved, over whatever the notice told. Only the first save that fails in
   * a play is told: with no storage at all every save fails, and the title has already said so, so the rest would cover
   * the notice of each Checkpoint.
   */
  saveFailed(): void {
    if (this.saveFailureTold) {
      return;
    }
    this.saveFailureTold = true;
    this.told = { content: { kind: 'save-failed' }, msLeft: NOTICE_MS };
  }
}

function remaining(flashes: readonly ZoneFlash[], frameMs: number): ZoneFlash[] {
  return flashes
    .map((flash) => ({ zone: flash.zone, msLeft: flash.msLeft - frameMs }))
    .filter((flash) => flash.msLeft > 0);
}
