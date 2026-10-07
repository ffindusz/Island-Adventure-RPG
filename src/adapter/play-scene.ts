import Phaser from 'phaser';
import type { Game, GameEvent, GameView } from '../core';
import { drawHero, drawMonster, drawStrike, drawSwing, drawTelegraph, drawTerrain } from './art';
import { Feedback } from './feedback';
import { FixedStepClock } from './fixed-step';
import { Hud } from './hud';
import { Overlay } from './overlay';
import { PlayerInput } from './player-input';

/** How long the screen takes to fade in after the hero is defeated and returned, in milliseconds. */
const DEFEAT_FADE_MS = 500;

/** Whether the player can be looking at the game: its tab is showing and its window has the keyboard focus. */
function playerIsWatching(): boolean {
  return document.hasFocus() && !document.hidden;
}

/**
 * The play screen. Every frame it turns the keyboard into commands, runs the Game core's fixed steps, and draws
 * what the core's view says. It decides nothing about the game, except that no step runs while nobody is watching.
 */
export class PlayScene extends Phaser.Scene {
  private readonly core: Game;
  private readonly clock = new FixedStepClock();
  private readonly feedback = new Feedback();
  private playerInput!: PlayerInput;
  private hud!: Hud;
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
    // Added in drawing order: ground, then the telegraphs of monster attacks, then hero and monsters, then the
    // swings and strikes on top. The HUD draws above them all, and the overlay above the HUD.
    this.terrainLayer = this.add.graphics();
    this.telegraphLayer = this.add.graphics();
    this.entityLayer = this.add.graphics();
    this.effectLayer = this.add.graphics();
    this.hud = new Hud(this);
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
    for (const command of this.playerInput.poll()) {
      events.push(...this.core.send(command));
    }
    // The clock is left alone while nobody is watching, so no time is owed afterwards: the game does not catch up.
    if (watching) {
      for (let steps = this.clock.stepsDue(frameMs); steps > 0; steps -= 1) {
        events.push(...this.core.step());
      }
    }
    this.feedback.age(frameMs);
    this.feedback.show(events);
    if (events.some((event) => event.type === 'hero-defeated')) {
      // The core has already put the hero back; the fade hides the cut. The world keeps running while it plays.
      this.cameras.main.fadeIn(DEFEAT_FADE_MS, 0, 0, 0);
    }
    this.draw(this.core.view(), watching);
  }

  private draw(view: GameView, watching: boolean): void {
    if (view.phase !== 'playing') {
      return;
    }
    if (this.drawnAreaId !== view.area.id) {
      drawTerrain(this.terrainLayer, view.area);
      this.drawnAreaId = view.area.id;
    }
    this.telegraphLayer.clear();
    this.entityLayer.clear();
    for (const monster of view.monsters) {
      if (monster.action.type === 'winding-up') {
        drawTelegraph(this.telegraphLayer, monster.action.zone, monster.action.progress);
      }
      drawMonster(this.entityLayer, monster, this.feedback.isFlashing(monster.id));
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
    this.overlay.draw(view, watching);
  }
}
