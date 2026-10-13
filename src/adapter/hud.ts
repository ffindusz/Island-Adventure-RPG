import type Phaser from 'phaser';
import { COVERED_CORNER } from '../core';
import type { PlayingView, WeaponSlot } from '../core';
import { ARROW, consumableIcon, gearIcon, HEART, SWORD_HELD } from './artwork';
import { ChangeGuard } from './change-guard';
import { TILE_SIZE } from './config';
import { DEPTH } from './depths';
import { experienceShare, healthText } from './labels';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { INK, UiLayer } from './ui-layer';

// The heads-up display: what the player must always see, drawn from the Game core's view and nothing else. It is a dark
// panel at the top left, fixed to the screen, with pictures of the pack and the bitmap font on it. Text objects blur
// at this size, so the numbers are drawn with rectangles, which stay sharp at every zoom.

/** Distance from the screen's edge to the panel, and from the panel's edge to what it holds, in canvas pixels. */
const MARGIN = 2;
const PADDING = 4;

/**
 * How much of the screen the HUD covers, in canvas pixels: a deliberate pair of numbers, so that growing the HUD is a
 * decision. Every area keeps the corner under the HUD solid (COVERED_CORNER in the Game core, which the game's content
 * asks the loader to check), so that nothing walkable hides there, and `checkHudFootprint` refuses to start the game
 * while the HUD is bigger than that corner.
 */
export const HUD_WIDTH = 88;
export const HUD_HEIGHT = 46;
export const HUD_RIGHT = MARGIN + HUD_WIDTH;

/**
 * The canvas pixel row where the HUD ends. What else sits at the top of the screen, the text of an Adventure Area for
 * one, starts below it and so follows when the panel grows.
 */
export const HUD_BOTTOM = MARGIN + HUD_HEIGHT;

/** The panel's inside, in canvas pixels. */
const LEFT = MARGIN + PADDING;
const INSIDE_RIGHT = HUD_RIGHT - PADDING;
const GAP = 2;

/** Three rows under the heart's: the two bars, then the weapon and the supplies. Each starts below the one before. */
const HEALTH_ROW_HEIGHT = 12;
const HEALTH_BAR_TOP = MARGIN + PADDING + HEALTH_ROW_HEIGHT + GAP;
const BAR_HEIGHT = 5;
const EXPERIENCE_BAR_TOP = HEALTH_BAR_TOP + BAR_HEIGHT + GAP;
const EXPERIENCE_BAR_HEIGHT = 4;
const SUPPLY_TOP = EXPERIENCE_BAR_TOP + EXPERIENCE_BAR_HEIGHT + GAP;
const SUPPLY_HEIGHT = 11;

/** The heart's picture is 14 wide; the numbers of Health start 3 pixels after it. */
const HEART_ROOM = 17;
/** The weapon has this much room, whichever it is, so that nothing moves when the hero switches. */
const WEAPON_ROOM = 15;
const ARROW_ROOM = 13;
const POTION_ROOM = 9;
/** How many digits of a count have room, so that nothing moves as the counts change. */
const COUNT_ROOM = textWidthOf('00');

/**
 * What shows the weapon in hand, by the slot it is equipped in: the picture the hero holds for the sword, upside down so
 * that its point is up, and the icon of the Long Bow, the only bow of the game, for the bow, which stands upright,
 * because the bow the hero holds lies flat and read as a bowl here.
 */
const WEAPON_ICONS: Readonly<Record<WeaponSlot, { readonly texture: string; readonly flipped: boolean }>> = {
  'melee-weapon': { texture: SWORD_HELD, flipped: true },
  'ranged-weapon': { texture: gearIcon('long-bow'), flipped: false },
};

const POTION_ICON = consumableIcon('healing-potion');

/**
 * Refuses to start the game when the HUD covers more than the corner the content keeps solid for it, because a hero
 * could then stand somewhere on the screen that it cannot see.
 */
export function checkHudFootprint(): void {
  const width = COVERED_CORNER.cols * TILE_SIZE;
  const height = COVERED_CORNER.rows * TILE_SIZE;
  if (HUD_RIGHT > width || HUD_BOTTOM > height) {
    throw new Error(
      `The HUD covers the top left ${HUD_RIGHT} by ${HUD_BOTTOM} pixels, but the content keeps only ${width} by ` +
        `${height} solid under it (COVERED_CORNER in the Game core): make the HUD smaller, or make that corner bigger.`,
    );
  }
}

/**
 * The hero's Health, as a heart, "current/maximum" and a bar, and its Level; then a bar of the Experience towards the
 * next Level, and under it the weapon in hand, the Ammunition and the Healing Potions.
 */
export class Hud {
  private readonly layer: UiLayer;
  private readonly shown = new ChangeGuard();

  constructor(scene: Phaser.Scene) {
    this.layer = new UiLayer(scene, DEPTH.hud);
  }

  /** Shows what the view says. It draws again only when what it shows has changed. */
  draw(view: PlayingView): void {
    const { hero, progress } = view;
    if (!this.shown.changed([hero.health, hero.maxHealth, hero.activeWeapon, hero.consumables, progress])) {
      return;
    }
    const layer = this.layer;
    const { health, maxHealth, activeWeapon, consumables } = hero;
    layer.clear();
    layer.frame('panel', MARGIN, MARGIN, HUD_WIDTH, HUD_HEIGHT);

    layer.icon(HEART, LEFT, MARGIN + PADDING);
    const textTop = MARGIN + PADDING + Math.ceil((HEALTH_ROW_HEIGHT - TEXT_HEIGHT) / 2);
    layer.text(healthText(health, maxHealth), LEFT + HEART_ROOM, textTop, INK.text);
    const level = `LV ${progress.level}`;
    layer.text(level, INSIDE_RIGHT - textWidthOf(level), textTop, INK.title);

    const barWidth = INSIDE_RIGHT - LEFT;
    layer.bar(LEFT, HEALTH_BAR_TOP, barWidth, BAR_HEIGHT, health / maxHealth, INK.health);
    const toNextLevel = experienceShare(progress.experience);
    layer.bar(LEFT, EXPERIENCE_BAR_TOP, barWidth, EXPERIENCE_BAR_HEIGHT, toNextLevel, INK.experience);

    const countTop = SUPPLY_TOP + Math.floor((SUPPLY_HEIGHT - TEXT_HEIGHT) / 2);
    const weapon = WEAPON_ICONS[activeWeapon];
    layer.icon(weapon.texture, LEFT, SUPPLY_TOP, WEAPON_ROOM, SUPPLY_HEIGHT, weapon.flipped);
    const arrowLeft = LEFT + WEAPON_ROOM + 4;
    layer.icon(ARROW, arrowLeft, SUPPLY_TOP, ARROW_ROOM, SUPPLY_HEIGHT);
    const ammunition = String(consumables.ammunition);
    const ammunitionLeft = arrowLeft + ARROW_ROOM + GAP;
    layer.text(ammunition, ammunitionLeft, countTop, countColour(consumables.ammunition));
    const potionLeft = ammunitionLeft + Math.max(COUNT_ROOM, textWidthOf(ammunition)) + 5;
    layer.icon(POTION_ICON, potionLeft, SUPPLY_TOP, POTION_ROOM, SUPPLY_HEIGHT);
    const potions = consumables['healing-potion'];
    layer.text(String(potions), potionLeft + POTION_ROOM + GAP, countTop, countColour(potions));
  }
}

/** A count is plain, and greyed when there is none left. */
function countColour(count: number): number {
  return count === 0 ? INK.dim : INK.text;
}
