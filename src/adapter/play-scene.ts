import Phaser from 'phaser';
import type { Game, GameEvent, GameView } from '../core';
import { drawHero, drawMonster, drawSwing, drawTerrain } from './art';
import { Feedback } from './feedback';
import { FixedStepClock } from './fixed-step';
import { PlayerInput } from './player-input';

/**
 * The play screen. Every frame it turns the keyboard into commands, runs the Game core's fixed steps, and draws
 * what the core's view says. It decides nothing about the game.
 */
export class PlayScene extends Phaser.Scene {
  private readonly core: Game;
  private readonly clock = new FixedStepClock();
  private readonly feedback = new Feedback();
  private playerInput!: PlayerInput;
  private terrainLayer!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Graphics;
  private effectLayer!: Phaser.GameObjects.Graphics;
  private drawnAreaId: string | null = null;

  constructor(core: Game) {
    super('play');
    this.core = core;
  }

  create(): void {
    // Added in drawing order: ground, then hero and monsters, then the swing on top.
    this.terrainLayer = this.add.graphics();
    this.entityLayer = this.add.graphics();
    this.effectLayer = this.add.graphics();
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could control the hero.');
    }
    this.playerInput = new PlayerInput(keyboard);
  }

  override update(_time: number, frameMs: number): void {
    const events: GameEvent[] = [];
    for (const command of this.playerInput.poll()) {
      events.push(...this.core.send(command));
    }
    for (let steps = this.clock.stepsDue(frameMs); steps > 0; steps -= 1) {
      events.push(...this.core.step());
    }
    this.feedback.age(frameMs);
    this.feedback.show(events);
    this.draw(this.core.view());
  }

  private draw(view: GameView): void {
    if (view.phase !== 'playing') {
      return;
    }
    if (this.drawnAreaId !== view.area.id) {
      drawTerrain(this.terrainLayer, view.area);
      this.drawnAreaId = view.area.id;
    }
    this.entityLayer.clear();
    for (const monster of view.monsters) {
      drawMonster(this.entityLayer, monster, this.feedback.isFlashing(monster.id));
    }
    drawHero(this.entityLayer, view.hero);
    this.effectLayer.clear();
    for (const zone of this.feedback.swingZones()) {
      drawSwing(this.effectLayer, zone);
    }
  }
}
