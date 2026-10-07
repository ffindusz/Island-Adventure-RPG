import Phaser from 'phaser';
import type { Command, Game, GameEvent, GameView } from '../core';
import { AreaBanner } from './area-banner';
import {
  drawArrow,
  drawCheckpoints,
  drawExits,
  drawHero,
  drawInteractable,
  drawMonster,
  drawStrike,
  drawSwing,
  drawTelegraph,
  drawTerrain,
} from './art';
import { scrollFor } from './camera';
import { Feedback } from './feedback';
import { FixedStepClock } from './fixed-step';
import { Hud } from './hud';
import { InventoryMenu } from './inventory-menu';
import { Notice } from './notice';
import { Overlay } from './overlay';
import { PlayerInput } from './player-input';

/** How long the screen takes to fade in after the hero is defeated and returned, in milliseconds. */
const DEFEAT_FADE_MS = 500;

/** How long the screen takes to fade in after the hero comes into another Adventure Area, in milliseconds. */
const AREA_FADE_MS = 250;

/** Whether the player can be looking at the game: its tab is showing and its window has the keyboard focus. */
function playerIsWatching(): boolean {
  return document.hasFocus() && !document.hidden;
}

/** Whether the game waits for the player: a page is open, or a Stat Point has to be assigned. */
function gameIsWaiting(view: GameView): boolean {
  return view.phase === 'playing' && (view.page !== null || view.levelUp !== null);
}

/**
 * The play screen. Every frame it turns the keyboard into commands, runs the Game core's fixed steps, and draws
 * what the core's view says. It decides nothing about the game, except that no step runs while nobody is watching.
 */
export class PlayScene extends Phaser.Scene {
  private readonly core: Game;
  private readonly clock = new FixedStepClock();
  private readonly feedback = new Feedback();
  private readonly inventoryMenu = new InventoryMenu();
  private playerInput!: PlayerInput;
  private hud!: Hud;
  private banner!: AreaBanner;
  private notice!: Notice;
  private overlay!: Overlay;
  private terrainLayer!: Phaser.GameObjects.Graphics;
  private telegraphLayer!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Graphics;
  private effectLayer!: Phaser.GameObjects.Graphics;
  private drawnAreaId: string | null = null;

  constructor(core: Game) {
    super('play');
    this.core = core;
  }

  create(): void {
    // Added in drawing order: ground, then the telegraphs of monster attacks, then Checkpoints, chests, hero and
    // monsters, then the swings and strikes on top. The HUD draws above them all, then the text of the area, the notice
    // above that, and the overlay above that. The world scrolls with the camera; the HUD, the text, the notice and the
    // overlay do not.
    this.terrainLayer = this.add.graphics();
    this.telegraphLayer = this.add.graphics();
    this.entityLayer = this.add.graphics();
    this.effectLayer = this.add.graphics();
    this.hud = new Hud(this);
    this.banner = new AreaBanner(this);
    this.notice = new Notice(this);
    this.overlay = new Overlay(this);
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could control the hero.');
    }
    this.playerInput = new PlayerInput(keyboard);
  }

  override update(_time: number, frameMs: number): void {
    const watching = playerIsWatching();
    const events: GameEvent[] = [];
    const send = (commands: readonly Command[]): void => {
      for (const command of commands) {
        events.push(...this.core.send(command));
      }
    };
    const viewAtStart = this.core.view();
    const waiting = gameIsWaiting(viewAtStart);
    if (!waiting) {
      send(this.playerInput.pollWalking());
    }
    send(this.inventoryMenu.update(viewAtStart, this.playerInput.pollMenu()));
    send(this.playerInput.pollActions());
    if (waiting && !gameIsWaiting(this.core.view())) {
      // The wait ended just now. The walk keys were left alone during it, so the hero walks by the keys that are down
      // now, from the first step of this frame.
      send(this.playerInput.pollWalking());
    }
    for (let steps = this.clock.stepsDue(frameMs, watching); steps > 0; steps -= 1) {
      events.push(...this.core.step());
    }
    this.feedback.age(frameMs);
    this.feedback.show(events);
    if (events.some((event) => event.type === 'hero-defeated')) {
      // The core has already put the hero back; the fade hides the cut. The world keeps running while it plays.
      this.cameras.main.fadeIn(DEFEAT_FADE_MS, 0, 0, 0);
    } else if (events.some((event) => event.type === 'area-changed')) {
      // The core has already put the hero into the next area; a short fade hides the cut. The world keeps running.
      this.cameras.main.fadeIn(AREA_FADE_MS, 0, 0, 0);
    }
    const view = this.core.view();
    if (gameIsWaiting(view)) {
      // A page or a Stat Point covers the notice, and the player is already where it pointed them.
      this.feedback.dismissNotice();
    }
    this.draw(view, watching);
  }

  private draw(view: GameView, watching: boolean): void {
    if (view.phase !== 'playing') {
      return;
    }
    if (this.drawnAreaId !== view.area.id) {
      drawTerrain(this.terrainLayer, view.area);
      drawExits(this.terrainLayer, view.exits);
      this.drawnAreaId = view.area.id;
    }
    // The camera follows the hero, and shows a small area in the middle of the screen.
    const scroll = scrollFor(view.hero.position, view.area);
    this.cameras.main.setScroll(scroll.x, scroll.y);
    this.telegraphLayer.clear();
    this.entityLayer.clear();
    drawCheckpoints(this.entityLayer, view.checkpoints);
    for (const interactable of view.interactables) {
      drawInteractable(this.entityLayer, interactable);
    }
    for (const monster of view.monsters) {
      if (monster.action.type === 'winding-up') {
        drawTelegraph(this.telegraphLayer, monster.action.zone, monster.action.progress);
      }
      drawMonster(this.entityLayer, monster, this.feedback.isFlashing(monster.id));
    }
    for (const arrow of view.arrows) {
      drawArrow(this.entityLayer, arrow);
    }
    drawHero(this.entityLayer, view.hero, this.feedback.isHeroHurt());
    this.effectLayer.clear();
    for (const zone of this.feedback.swingZones()) {
      drawSwing(this.effectLayer, zone);
    }
    for (const zone of this.feedback.strikeZones()) {
      drawStrike(this.effectLayer, zone);
    }
    this.hud.draw(view);
    // A page or a Stat Point covers the text of the area; the core keeps its time frozen, so it is back afterwards.
    this.banner.draw(gameIsWaiting(view) ? null : view.areaText);
    this.notice.draw(this.feedback.notice());
    this.overlay.draw(view, watching, this.inventoryMenu.position);
  }
}
