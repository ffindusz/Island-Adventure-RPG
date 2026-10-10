import Phaser from 'phaser';
import type { AreaDefinition, Command, Game, GameEvent, GameView, PlayingView } from '../core';
import { AreaBanner } from './area-banner';
import { drawMonster, drawStrike, drawTelegraph, drawTerrain } from './art';
import { ARTWORK, hasFinalArt } from './artwork';
import { buildDrawnArt, queueArt, requireLoadedArt } from './asset-loader';
import { AutomapPage } from './automap-page';
import type { GameAudio } from './audio';
import { AudioLine } from './audio-line';
import { effectsOfFrame, fightAfter } from './audio-manifest';
import { callsForSave } from './autosave';
import { scrollFor } from './camera';
import { departureAnswer } from './departure-menu';
import { DEPTH } from './depths';
import { Fall, FALL_FADE_OUT_MS } from './fall';
import { Feedback } from './feedback';
import { FixedStepClock } from './fixed-step';
import { HeroSprite } from './hero-sprite';
import { checkHudFootprint, Hud } from './hud';
import { InventoryMenu } from './inventory-menu';
import { MonsterSprites } from './monster-sprites';
import { Notice } from './notice';
import { OpeningCard } from './opening-card';
import { Overlay } from './overlay';
import { PickupRiseSprites } from './pickup-rise-sprites';
import { PlayerInput } from './player-input';
import { byShooter } from './projectiles';
import { ProjectileSprites } from './projectile-sprites';
import { PropSprites } from './prop-sprites';
import type { SaveStore } from './save-store';
import { SCENE_KEYS, startOfEnding } from './scene-keys';
import type { PlayStart } from './scene-keys';
import { bakeGround } from './terrain-baker';
import { gameIsWaiting } from './waiting';

/** How long the screen takes to fade in after the hero is defeated and returned, in milliseconds. */
const DEFEAT_FADE_MS = 500;

/** How long the screen takes to fade in after the hero comes into another Adventure Area, in milliseconds. */
const AREA_FADE_MS = 250;

/** How long the screen takes to fade in after the opening, as the hero wakes on the coast, in milliseconds. */
const OPENING_FADE_MS = 600;

/** Whether the player can be looking at the game: its tab is showing and its window has the keyboard focus. */
function playerIsWatching(): boolean {
  return document.hasFocus() && !document.hidden;
}

/**
 * The play screen. Every frame it turns the keyboard into commands, runs the Game core's fixed steps, and draws
 * what the core's view says. It decides nothing about the game, except that no step runs while nobody is watching.
 * It also saves the game when the hero touches a Checkpoint or comes into another area (autosave.ts), and takes the
 * player back to the title when the core has gone back to it, or on to the ending when it went back because the hero
 * sailed home (ending-scene.ts), which saves nothing. A New Game starts with the card of the opening: until the
 * player presses Enter, the game is held and nothing but the card is on the screen (opening-card.ts). The scene is
 * started again for every game of a session, so what it keeps from one is made anew in `init`. It tells the audio
 * service what the frame's events sound like and which place the music is for (audio.ts), and polls the keys of the
 * audio in every frame, the card, the falls and the pages included.
 */
export class PlayScene extends Phaser.Scene {
  private readonly core: Game;
  private readonly saves: SaveStore;
  private readonly audio: GameAudio;
  /** The areas of the content: the Automap draws a link at the side of a map where the exit of its area is. */
  private readonly areas: readonly AreaDefinition[];
  private clock!: FixedStepClock;
  private feedback!: Feedback;
  private readonly inventoryMenu = new InventoryMenu();
  private playerInput!: PlayerInput<Phaser.Input.Keyboard.Key>;
  private heroSprite!: HeroSprite;
  private pickupRiseSprites!: PickupRiseSprites;
  private monsterSprites!: MonsterSprites;
  private projectileSprites!: ProjectileSprites;
  private propSprites!: PropSprites;
  private hud!: Hud;
  private banner!: AreaBanner;
  private notice!: Notice;
  private overlay!: Overlay;
  private automapPage!: AutomapPage;
  private audioLine!: AudioLine;
  private terrainLayer!: Phaser.GameObjects.Graphics;
  /** The ground of an area whose art is final, painted once (terrain-baker.ts); hidden for any other area. */
  private groundImage!: Phaser.GameObjects.Image;
  private telegraphLayer!: Phaser.GameObjects.Graphics;
  /** The flat shapes of what has no picture yet: the monsters of an area whose art is not final, the gates and the levers. */
  private entityLayer!: Phaser.GameObjects.Graphics;
  private effectLayer!: Phaser.GameObjects.Graphics;
  private drawnAreaId: string | null = null;
  /** The last frame drawn of the game in play, which is what the screen shows of the place the hero falls in. */
  private lastPlaying: PlayingView | null = null;
  /** The fall of the hero that is on the screen now, if any: no step of the Game core runs until it is over. */
  private fall: Fall | null = null;
  private fadingOut = false;
  /** Whether the first frame saves the game: a New Game counts as a Checkpoint, so that it replaces the old save. */
  private saveAtOnce = false;
  /** The lines of the opening this start brings, if any. */
  private openingLines: readonly string[] = [];
  /** The card of the opening while it shows: no step runs and no key but Enter counts until the player ends it. */
  private card: OpeningCard | null = null;
  /** Whether the fight with the Guardian is on, which the music of the fight plays for (audio-manifest.ts, `fightAfter`). */
  private fight = false;

  constructor(core: Game, saves: SaveStore, audio: GameAudio, areas: readonly AreaDefinition[]) {
    super(SCENE_KEYS.play);
    this.core = core;
    this.saves = saves;
    this.audio = audio;
    this.areas = areas;
  }

  init(start: PlayStart): void {
    // A game that follows another in the same session (the title is reached again after the ending) starts with no time
    // owed to the steps, nothing of the last game's flashes and notice left on the screen, and no fight on.
    this.clock = new FixedStepClock();
    this.feedback = new Feedback();
    this.saveAtOnce = start.saveAtOnce === true;
    this.openingLines = start.opening ?? [];
    this.fight = false;
  }

  preload(): void {
    queueArt(this.load, ARTWORK);
    this.audio.queue(this);
  }

  create(): void {
    buildDrawnArt(this.textures, ARTWORK);
    requireLoadedArt(this.textures, ARTWORK);
    this.audio.requireLoaded();
    checkHudFootprint();
    // The ground is added first, at the lowest depth: in colours, or the picture of it where the art is final. Everything
    // above it has its depth in depths.ts: the marks of the exits and the props are sprites, then the telegraphs of
    // monster attacks, then the flat shapes of what has no picture yet, then the monsters of final art, what they shoot,
    // and the hero and its arrows, which are sprites too, and the strikes of the monsters above those, and above them the
    // picture of what the hero just picked up, rising over its head. The HUD draws above them all, then the text of the
    // area, the notice above that, and the overlay above that, which shares its place with the Automap page. The world
    // scrolls with the camera; the HUD, the text, the notice, the overlay and the Automap page do not.
    this.terrainLayer = this.add.graphics();
    this.groundImage = this.add.image(0, 0, '__WHITE').setOrigin(0, 0).setVisible(false);
    this.drawnAreaId = null;
    this.lastPlaying = null;
    this.fall = null;
    this.propSprites = new PropSprites(this);
    this.telegraphLayer = this.add.graphics().setDepth(DEPTH.telegraph);
    this.entityLayer = this.add.graphics().setDepth(DEPTH.flatShapes);
    this.monsterSprites = new MonsterSprites(this);
    this.projectileSprites = new ProjectileSprites(this);
    this.heroSprite = new HeroSprite(this);
    this.effectLayer = this.add.graphics().setDepth(DEPTH.effects);
    this.pickupRiseSprites = new PickupRiseSprites(this);
    this.hud = new Hud(this);
    this.banner = new AreaBanner(this);
    this.notice = new Notice(this);
    this.overlay = new Overlay(this);
    this.automapPage = new AutomapPage(this, this.areas);
    this.audioLine = new AudioLine(this);
    const keyboard = this.input.keyboard;
    if (keyboard === null) {
      throw new Error('The keyboard plugin is not available, so nothing could control the hero.');
    }
    this.playerInput = new PlayerInput(keyboard, Phaser.Input.Keyboard.JustDown);
    this.card = this.openingLines.length > 0 ? new OpeningCard(this, this.openingLines) : null;
  }

  override update(time: number, frameMs: number): void {
    // The keys of the audio work in every frame of this screen: the opening card, a fall, a page and a Stat Point wait.
    this.audioLine.update(this.audio.press(this.playerInput.pollAudio()), frameMs);
    if (this.card !== null) {
      this.holdForOpening(this.card);
      return;
    }
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
    const menu = this.playerInput.pollMenu();
    send(this.inventoryMenu.update(viewAtStart, menu));
    send(this.playerInput.pollActions());
    // After the actions, so that Esc, which declines the question, goes first and the core then ignores an Enter that
    // answers it in the same frame. Decided from the view before the commands, so that the Interact that opens the
    // question cannot be answered by an Enter pressed with it.
    send(departureAnswer(viewAtStart, menu));
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
    this.monsterSprites.age(frameMs);
    this.projectileSprites.age(frameMs);
    this.propSprites.age(frameMs);
    this.feedback.show(events);
    this.heroSprite.show(events);
    this.monsterSprites.show(events);
    const view = this.core.view();
    // What the frame sounded like, once for each kind of sound, before the screen changes: the effect of the sailing home
    // too, and the fight that begins or ends in it.
    this.audio.hear(effectsOfFrame(events, viewAtStart, view));
    this.fight = fightAfter(this.fight, events);
    if (view.phase === 'title') {
      // The core went back to the title, which is how the game ends when the hero sails home: the ending shows first, and
      // the title screen after it. The core is at the title, where there is nothing to save, so this comes before the
      // autosave.
      const ending = startOfEnding(events);
      if (ending === null) {
        this.scene.start(SCENE_KEYS.title);
      } else {
        this.scene.start(SCENE_KEYS.ending, ending);
      }
      return;
    }
    this.autosave(events);
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
    // After the fall above, which keeps the music of the place the hero fell in until it is over, and so after the frame in
    // which the hero was defeated.
    this.playMusicFor(view);
  }

  /** Asks for the music of the place the hero is in: the area's own, or the fight's while the fight is on. */
  private playMusicFor(view: GameView): void {
    if (view.phase === 'playing') {
      this.audio.playMusic({ at: 'play', areaId: view.area.id, fight: this.fight });
    }
  }

  /**
   * One frame of the opening. The game is held: no step runs, and nothing the player presses reaches it. Enter ends the
   * opening, and the screen fades in on the hero. The walk keys are read again from the next frame, and a New Game is
   * saved even now, so that a tab closed at the card brings back this game and not the old one. The music of the coast
   * plays under the card.
   */
  private holdForOpening(card: OpeningCard): void {
    this.autosave([]);
    this.playMusicFor(this.core.view());
    const { confirm } = this.playerInput.pollMenu();
    this.playerInput.pollActions();
    if (confirm) {
      card.hide();
      this.card = null;
      this.cameras.main.fadeIn(OPENING_FADE_MS, 0, 0, 0);
    }
  }

  /**
   * Saves the game as it stands when the frame's events call for it, or when this is the first frame of a New Game. A
   * save the browser refuses does not stop the game: the player is told, and the earlier save stays as it was.
   */
  private autosave(events: readonly GameEvent[]): void {
    if (!this.saveAtOnce && !callsForSave(events)) {
      return;
    }
    this.saveAtOnce = false;
    if (!this.saves.write(this.core.snapshot())) {
      this.feedback.saveFailed();
    }
  }

  /** One frame of a fall: the world stands still with the hero lying in it, and at the end the screen fades out. */
  private showFall(fall: Fall, frameMs: number, watching: boolean, time: number): void {
    // What the player presses meanwhile does not count. The walk keys are read again when the fall is over.
    this.playerInput.pollMenu();
    this.playerInput.pollActions();
    this.feedback.age(frameMs);
    this.heroSprite.age(frameMs);
    this.monsterSprites.age(frameMs);
    this.projectileSprites.age(frameMs);
    this.propSprites.age(frameMs);
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

  /**
   * The ground of the area the hero is in, drawn once: the picture of it where the art of the area is final, flat colours
   * where it is not.
   */
  private drawGround(view: PlayingView): void {
    // The monsters of the place the hero left are gone, and those of this one start from where they stand.
    this.monsterSprites.clear();
    this.terrainLayer.clear();
    if (hasFinalArt(view.area.id)) {
      this.groundImage.setTexture(bakeGround(this.textures, view.area)).setVisible(true);
    } else {
      this.groundImage.setVisible(false);
      drawTerrain(this.terrainLayer, view.area);
    }
  }

  private draw(view: GameView, watching: boolean, time: number): void {
    if (view.phase !== 'playing') {
      return;
    }
    if (this.drawnAreaId !== view.area.id) {
      this.drawGround(view);
      this.drawnAreaId = view.area.id;
    }
    // The camera follows the hero, and shows a small area in the middle of the screen.
    const scroll = scrollFor(view.hero.position, view.area);
    this.cameras.main.setScroll(scroll.x, scroll.y);
    this.telegraphLayer.clear();
    this.entityLayer.clear();
    this.propSprites.draw(view);
    const monstersAreSprites = hasFinalArt(view.area.id);
    for (const monster of view.monsters) {
      if (monster.action.type === 'winding-up') {
        drawTelegraph(this.telegraphLayer, monster.action.zone, monster.action.progress);
      }
      if (!monstersAreSprites) {
        drawMonster(this.entityLayer, monster, this.feedback.isFlashing(monster.id));
      }
    }
    if (monstersAreSprites) {
      this.monsterSprites.draw(view, (monsterId) => this.feedback.isFlashing(monsterId));
    } else {
      this.monsterSprites.clear();
    }
    // The hero's arrows are sprites of the hero (hero-sprite.ts); what a monster shoots is an orb (projectile-sprites.ts).
    this.projectileSprites.draw(byShooter(view.arrows).monster);
    this.heroSprite.draw(view.hero, view.arrows);
    this.effectLayer.clear();
    for (const zone of this.feedback.strikeZones()) {
      drawStrike(this.effectLayer, zone);
    }
    this.pickupRiseSprites.draw(this.feedback.pickupRises(), view.hero.position);
    this.hud.draw(view);
    // A page or a Stat Point covers the text of the area; the core keeps its time frozen, so it is back afterwards.
    this.banner.draw(gameIsWaiting(view) ? null : view.areaText);
    this.notice.draw(this.feedback.notice());
    this.overlay.draw(view, watching, this.inventoryMenu.position);
    this.automapPage.draw(view, time);
  }
}
