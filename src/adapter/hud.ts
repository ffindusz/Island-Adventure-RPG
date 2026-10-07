import type Phaser from 'phaser';
import type { HeroView, PlayingView, WeaponSlot } from '../core';
import { bitmapHeight, bitmapWidth, drawBitmap, drawText, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Bitmap, Graphics } from './pixel-font';

// The heads-up display: what the player must always see, drawn from the Game core's view and nothing else. It sits at
// the top left, fixed to the screen. Text objects blur at this size, so the digits are a tiny bitmap font drawn with
// rectangles, which stays sharp at every zoom.

/** Above everything the play screen draws. */
const HUD_DEPTH = 100;

/** Distance from the screen's edge to the panel, and from the panel's edge to what it holds, in canvas pixels. */
const MARGIN = 2;
const PADDING = 3;
/** Gap between the heart and the numbers, and between the numbers and the bar, in canvas pixels. */
const GAP = 4;
const BAR_HEIGHT = 4;

const PANEL_COLOUR = 0x1b1b24;
const PANEL_ALPHA = 0.85;
const TEXT_COLOUR = 0xffffff;
const HEART_COLOUR = 0xe8505b;
const BAR_COLOUR = 0x7bd35f;
const BAR_TRACK_COLOUR = 0x4a4a5a;
const ARROW_COLOUR = 0xe8d8a8;
const POTION_COLOUR = 0xff6b81;
/** The count of a consumable when there is none left, greyed like an empty slot. */
const NONE_LEFT_COLOUR = 0x8a8a9a;

const HEART: Bitmap = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
const SWORD: Bitmap = ['..#..', '..#..', '..#..', '..#..', '#####', '..#..', '.###.'];
const BOW: Bitmap = ['..###', '.#..#', '#...#', '#...#', '#...#', '.#..#', '..###'];
const ARROW: Bitmap = ['....#..', '##...#.', '#######', '##...#.', '....#..'];
const POTION: Bitmap = ['.###.', '..#..', '.###.', '#####', '#####', '#####', '.###.'];

/** What shows the weapon in hand, by the slot it is equipped in. */
const WEAPON_ICONS: Readonly<Record<WeaponSlot, { readonly bitmap: Bitmap; readonly colour: number }>> = {
  'melee-weapon': { bitmap: SWORD, colour: 0xdfe6ee },
  'ranged-weapon': { bitmap: BOW, colour: 0xd9a441 },
};

/** The room the weapon's picture takes, whichever it is, so that the panel does not change size with the weapon. */
const WEAPON_WIDTH = Math.max(...Object.values(WEAPON_ICONS).map((icon) => bitmapWidth(icon.bitmap)));
const WEAPON_HEIGHT = Math.max(...Object.values(WEAPON_ICONS).map((icon) => bitmapHeight(icon.bitmap)));

/** How many digits of a count the panel keeps room for, so that it does not change size as the counts do. */
const COUNT_DIGITS = 2;

/** The room a count takes: two digits, or more if it needs them. */
function countWidth(count: string): number {
  return Math.max(textWidthOf(count), textWidthOf('0'.repeat(COUNT_DIGITS)));
}

/** The height of the row of the heart and the numbers of Health. */
const HEALTH_ROW_HEIGHT = bitmapHeight(HEART);
/** The height of the panel: its rows one under the other with a gap between, inside the padding. Add a new row here. */
const PANEL_HEIGHT = HEALTH_ROW_HEIGHT + GAP + BAR_HEIGHT + GAP + WEAPON_HEIGHT + 2 * PADDING;

/**
 * The canvas pixel row where the HUD ends. What else sits at the top of the screen, the text of an Adventure Area for
 * one, starts below it and so follows when the panel grows.
 */
export const HUD_BOTTOM = MARGIN + PANEL_HEIGHT;

/**
 * The hero's Health, as a heart, "current/maximum" and a bar, and under it the weapon in hand, the Ammunition and the
 * Healing Potions.
 */
export class Hud {
  private readonly graphics: Graphics;
  private shown = 'nothing';

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH);
  }

  /** Shows what the view says. It draws again only when what it shows has changed. */
  draw(view: PlayingView): void {
    const { health, maxHealth, activeWeapon, consumables } = view.hero;
    const key = [health, maxHealth, activeWeapon, consumables.ammunition, consumables['healing-potion']].join('/');
    if (key === this.shown) {
      return;
    }
    this.shown = key;
    this.drawPanel(view.hero);
  }

  private drawPanel({ health, maxHealth, activeWeapon, consumables }: HeroView): void {
    // Rounded up, so a hero that is still standing never reads as 0.
    const current = Math.ceil(health);
    const maximum = Math.ceil(maxHealth);
    const ammunition = String(consumables.ammunition);
    const potions = String(consumables['healing-potion']);
    const weapon = WEAPON_ICONS[activeWeapon];
    // The panel is as wide as the numbers are when Health is full, so it does not change size as Health drops.
    const textWidth = textWidthOf(`${maximum}/${maximum}`);
    const heartWidth = bitmapWidth(HEART);
    const arrowWidth = bitmapWidth(ARROW);
    const potionWidth = bitmapWidth(POTION);
    const healthWidth = heartWidth + GAP + textWidth;
    const left = MARGIN + PADDING;
    const top = MARGIN + PADDING;
    const barTop = top + HEALTH_ROW_HEIGHT + GAP;
    const weaponTop = barTop + BAR_HEIGHT + GAP;
    const arrowLeft = left + WEAPON_WIDTH + GAP;
    const ammunitionLeft = arrowLeft + arrowWidth + GAP;
    const potionLeft = ammunitionLeft + countWidth(ammunition) + 2 * GAP;
    const potionCountLeft = potionLeft + potionWidth + GAP;
    const supplyWidth = potionCountLeft + countWidth(potions) - left;
    const contentWidth = Math.max(healthWidth, supplyWidth);

    const graphics = this.graphics;
    graphics.clear();
    graphics.fillStyle(PANEL_COLOUR, PANEL_ALPHA);
    graphics.fillRect(MARGIN, MARGIN, contentWidth + 2 * PADDING, PANEL_HEIGHT);
    drawBitmap(graphics, HEART, left, top, HEART_COLOUR);
    const textTop = top + (HEALTH_ROW_HEIGHT - TEXT_HEIGHT) / 2;
    drawText(graphics, `${current}/${maximum}`, left + heartWidth + GAP, textTop, TEXT_COLOUR);
    graphics.fillStyle(BAR_TRACK_COLOUR);
    graphics.fillRect(left, barTop, contentWidth, BAR_HEIGHT);
    graphics.fillStyle(BAR_COLOUR);
    graphics.fillRect(left, barTop, filledWidth(contentWidth, health, maxHealth), BAR_HEIGHT);

    const countTop = weaponTop + (WEAPON_HEIGHT - TEXT_HEIGHT) / 2;
    drawBitmap(graphics, weapon.bitmap, left, weaponTop, weapon.colour);
    drawBitmap(graphics, ARROW, arrowLeft, weaponTop + (WEAPON_HEIGHT - bitmapHeight(ARROW)) / 2, ARROW_COLOUR);
    drawText(graphics, ammunition, ammunitionLeft, countTop, countColour(consumables.ammunition));
    drawBitmap(graphics, POTION, potionLeft, weaponTop + (WEAPON_HEIGHT - bitmapHeight(POTION)) / 2, POTION_COLOUR);
    drawText(graphics, potions, potionCountLeft, countTop, countColour(consumables['healing-potion']));
  }
}

/** A count is white, and greyed when there is none left. */
function countColour(count: number): number {
  return count === 0 ? NONE_LEFT_COLOUR : TEXT_COLOUR;
}

/** How much of a bar is filled: all of it at full Health, a sliver while any Health is left, none at 0. */
function filledWidth(width: number, health: number, maxHealth: number): number {
  if (health <= 0) {
    return 0;
  }
  return Math.min(width, Math.max(1, Math.round((width * health) / maxHealth)));
}
