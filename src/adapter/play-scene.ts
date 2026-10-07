import Phaser from 'phaser';
import type { Command, Game, GameEvent, GameView, PlayingView } from '../core';
import { AreaBanner } from './area-banner';
import {
  drawCheckpoints,
  drawExits,
  drawInteractable,
  drawMonster,
  drawProjectile,
  drawStrike,
  drawTelegraph,
  drawTerrain,
} from './art';
import { ARTWORK } from './artwork';
import { buildDrawnArt, queueArt, requireLoadedArt } from './asset-loader';
import { AutomapPage } from './automap-page';
import { scrollFor } from './camera';
import { DEPTH } from './depths';
import { Fall, FALL_FADE_OUT_MS } from './fall';
import { Feedback } from './feedback';
import { FixedStepClock } from './fixed-step';
import { HeroSprite } from './hero-sprite';
import { checkHudFootprint, Hud } from './hud';
import { InventoryMenu } from './inventory-menu';
import { Notice } from './notice';
import { Overlay } from './overlay';
import { PlayerInput } from './player-input';
import { byShooter } from './projectiles';

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
  private heroSprite!: HeroSprite;
  private hud!: Hud;
  private banner!: AreaBanner;
  private notice!: Notice;
  private overlay!: Overlay;
  private automapPage!: AutomapPage;
  private terrainLayer!: Phaser.GameObjects.Graphics;
  private telegraphLayer!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Graphics;
  private effectLayer!: Phaser.GameObjects.Graphics;
  private drawnAreaId: string | null = null;
  /** The last frame drawn of the game in play, which is what the screen shows of the place the hero falls in. */
  private lastPlaying: PlayingView | null = null;
  /** The fall of the hero that is on the screen now, if any: no step of the Game core runs until it is over. */
  private fall: Fall | null = null;
  private fadingOut = false;

  constructor(core: Game) {
    super('play');
    this.core = core;
  }

  preload(): void {
    queueArt(this.load, ARTWORK);
  }

  create(): void {
    buildDrawnArt(this.textures, ARTWORK);
    requireLoadedArt(this.textures, ARTWORK);
    checkHudFootprint();
    // Added in drawing order: ground, then the telegraphs of monster attacks, then Checkpoints, chests, monsters and
    // their projectiles, which share the lowest depth. The hero and its arrows are sprites above them (see depths.ts),
    // and the strikes of the monsters above those. The HUD draws above them all, then the text of the area, the notice
    // above that, and the overlay above that, which shares its place with the Automap page. The world scrolls with the
    // camera; the HUD, the text, the notice, the overlay and the Automap page do not.
    this.terrainLayer = this.add.graphics();
    this.drawnAreaId = null;
    this.lastPlaying = null;
    this.fall = null;
    this.telegraphLayer = this.add.graphics();
    this.entityLayer = this.add.graphics();
    this.heroSprite = new HeroSprite(this);
    this.effectLayer = this.add.graphics().setDepth(DEPTH.effects);
    this.hud = new Hud(this);
    this.banner = new AreaBanner(this);
    this.notice = new Notice(this);
    this.overlay = new Overlay(this);
    this.automapPage = new AutomapPage(this);
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could control the hero.');
    }
    this.playerInput = new PlayerInput(keyboard);
  }

  override update(time: number, frameMs: number): void {
    const watching = playerIsWatching();
    if (this.fall !== null) {
      this.fall.age(frameMs);
      if (this.fall.stage !== 'over') {
        this.showFall(this.fall, frameMs, watching, time);
        return;
      }
      this.endFall();
    }
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
      const happened = this.core.step();
      events.push(...happened);
      if (happened.some((event) => event.type === 'hero-defeated')) {
        // The steps that remain would run in the place the hero returned to, which the player has yet to see.
        break;
      }
    }
    this.feedback.age(frameMs);
    this.heroSprite.age(frameMs);
    this.feedback.show(events);
    this.heroSprite.show(events);
    const view = this.core.view();
    if (view.phase === 'playing' && events.some((event) => event.type === 'hero-defeated')) {
      // The core has already put the hero back at its Checkpoint, which may be in another area. The screen first shows
      // the place the hero fell in (see fall.ts).
      this.fall = new Fall(this.lastPlaying ?? view);
      this.fadingOut = false;
      this.draw(this.fall.view, watching, time);
      return;
    }
    if (events.some((event) => event.type === 'area-changed')) {
      // The core has already put the hero into the next area; a short fade hides the cut. The world keeps running.
      this.cameras.main.fadeIn(AREA_FADE_MS, 0, 0, 0);
    }
    if (gameIsWaiting(view)) {
      // A page or a Stat Point covers the notice, and the player is already where it pointed them.
      this.feedback.dismissNotice();
    }
    this.draw(view, watching, time);
    if (view.phase === 'playing') {
      this.lastPlaying = view;
    }
  }

  /** One frame of a fall: the world stands still with the hero lying in it, and at the end the screen fades out. */
  private showFall(fall: Fall, frameMs: number, watching: boolean, time: number): void {
    // What the player presses meanwhile does not count. The walk keys are read again when the fall is over.
    this.playerInput.pollMenu();
    this.playerInput.pollActions();
    this.feedback.age(frameMs);
    this.heroSprite.age(frameMs);
    if (fall.stage === 'fading-out' && !this.fadingOut) {
      this.fadingOut = true;
      this.cameras.main.fadeOut(FALL_FADE_OUT_MS, 0, 0, 0);
    }
    this.draw(fall.view, watching, time);
  }

  /** The screen is black: the hero stands at its Checkpoint, whole again, and the place it returned to fades in. */
  private endFall(): void {
    this.fall = null;
    this.lastPlaying = null;
    this.heroSprite.getUp();
    this.feedback.endFall();
    // Whether the hero returned to another area or to this one, the ground is drawn afresh.
    this.drawnAreaId = null;
    this.cameras.main.fadeIn(DEFEAT_FADE_MS, 0, 0, 0);
  }

  private draw(view: GameView, watching: boolean, time: number): void {
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
    // The hero's arrows are sprites of the hero (hero-sprite.ts); a monster's projectile is an orb drawn here.
    for (const projectile of byShooter(view.arrows).monster) {
      drawProjectile(this.entityLayer, projectile);
    }
    this.heroSprite.draw(view.hero, view.arrows);
    this.effectLayer.clear();
    for (const zone of this.feedback.strikeZones()) {
      drawStrike(this.effectLayer, zone);
    }
    this.hud.draw(view);
    // A page or a Stat Point covers the text of the area; the core keeps its time frozen, so it is back afterwards.
    this.banner.draw(gameIsWaiting(view) ? null : view.areaText);
    this.notice.draw(this.feedback.notice());
    this.overlay.draw(view, watching, this.inventoryMenu.position);
    this.automapPage.draw(view, time);
  }
}
