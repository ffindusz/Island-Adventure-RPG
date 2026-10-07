import type Phaser from 'phaser';
import { CONSUMABLE_IDS } from '../core';
import type {
  ConsumableId,
  HeroView,
  InventoryPageView,
  LevelUpView,
  PageView,
  PlayingView,
  StatPageView,
} from '../core';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { potionLineOf } from './inventory-menu';
import { CONSUMABLE_NAMES, GEAR_STAT_ABBREVIATIONS, shown, STAT_NAMES } from './labels';
import { bitmapWidth, drawBitmap, drawText, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Bitmap, Graphics } from './pixel-font';
import { statKeyLabel } from './player-input';

// The overlay: what covers the game while it waits for the player. It shows the level-up choice or the page that is
// open, or says the game is paused when the window has lost focus. It is drawn from the Game core's view alone, on a
// dimmed copy of the game, and every number on it is a number the view gives: it works out nothing. The one thing it
// is given besides the view is where the player's cursor is on the inventory page.

/** Above the HUD. */
const OVERLAY_DEPTH = 200;

const WIDE_PANEL = 160;
const NARROW_PANEL = 96;
const INVENTORY_PANEL = 216;
/** From the panel's edge to what it holds, and the border around the panel, in canvas pixels. */
const PADDING = 8;
const BORDER = 2;
/** The space between rows, the height of a bar, and the space between a stat's value and its gain. */
const ROW_GAP = 4;
const BAR_HEIGHT = 4;
const COLUMN_GAP = 8;

/** How many pieces of Gear the inventory page lists at once. A longer list scrolls to keep the cursor in view. */
const VISIBLE_GEAR = 5;
/** The space between a piece of Gear's mark and its name, and how far its highlight reaches past the row. */
const MARK_GAP = 6;
const HIGHLIGHT_REACH = 4;

const BACKDROP_COLOUR = 0x000000;
const BACKDROP_ALPHA = 0.55;
const PANEL_COLOUR = 0x1b1b24;
const BORDER_COLOUR = 0x6a6a7a;
const TITLE_COLOUR = 0xf2c94c;
const TEXT_COLOUR = 0xffffff;
const HINT_COLOUR = 0xa0a0b0;
const GAIN_COLOUR = 0x7bd35f;
const EXPERIENCE_COLOUR = 0x58a6ff;
const BAR_TRACK_COLOUR = 0x4a4a5a;
const HIGHLIGHT_COLOUR = 0x3a3a52;

/** The mark in front of a piece of Gear: filled when it is equipped, hollow when the hero only carries it. */
const MARK_EQUIPPED: Bitmap = ['.###.', '#####', '#####', '#####', '.###.'];
const MARK_CARRIED: Bitmap = ['.###.', '#...#', '#...#', '#...#', '.###.'];

type Row =
  /** Centred. */
  | { readonly kind: 'text'; readonly text: string; readonly colour: number }
  /** A name on the left and a value on the right, and a gain after the value when there is one. */
  | { readonly kind: 'stat'; readonly label: string; readonly value: string; readonly gain: string | null }
  /** A name and a value like a stat's, that the cursor can rest on: highlighted when it does. */
  | { readonly kind: 'choice'; readonly label: string; readonly value: string; readonly highlighted: boolean }
  /** A piece of Gear: its mark, its name and its bonus on the right, highlighted when the cursor is on it. */
  | {
      readonly kind: 'gear';
      readonly name: string;
      readonly bonus: string;
      readonly equipped: boolean;
      readonly highlighted: boolean;
    }
  /** A bar across the panel, filled by `share` from 0 to 1. */
  | { readonly kind: 'bar'; readonly share: number }
  /** A little more room. */
  | { readonly kind: 'space' };

interface Panel {
  readonly width: number;
  readonly rows: readonly Row[];
}

/** The level-up choice, the open page, or the pause notice, whichever the game is showing. */
export class Overlay {
  private readonly graphics: Graphics;
  private shown = 'nothing';

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(OVERLAY_DEPTH);
  }

  /** Shows what the view says. It draws again only when what it shows has changed. */
  draw(view: PlayingView, focused: boolean, inventoryCursor: number): void {
    const panel = panelFor(view, focused, inventoryCursor);
    const key = JSON.stringify(panel);
    if (key === this.shown) {
      return;
    }
    this.shown = key;
    this.graphics.clear();
    if (panel !== null) {
      drawPanel(this.graphics, panel);
    }
  }
}

/** The choice that waits comes first, then the page that is open, then the notice that the window lost focus. */
function panelFor(view: PlayingView, focused: boolean, inventoryCursor: number): Panel | null {
  if (view.levelUp !== null) {
    return levelUpPanel(view.levelUp);
  }
  if (view.page !== null) {
    return pagePanel(view.page, view.hero, inventoryCursor);
  }
  if (!focused) {
    return { width: NARROW_PANEL, rows: [{ kind: 'text', text: 'PAUSED', colour: TITLE_COLOUR }] };
  }
  return null;
}

function levelUpPanel(levelUp: LevelUpView): Panel {
  const rows: Row[] = [
    { kind: 'text', text: 'LEVEL UP!', colour: TITLE_COLOUR },
    { kind: 'text', text: `LEVEL ${levelUp.level}`, colour: TEXT_COLOUR },
    { kind: 'space' },
    ...levelUp.options.map(
      (option): Row => ({
        kind: 'stat',
        label: `${statKeyLabel(option.stat)} ${STAT_NAMES[option.stat]}`,
        value: shown(option.value),
        gain: `+${shown(option.gain)}`,
      }),
    ),
    { kind: 'space' },
  ];
  if (levelUp.points > 1) {
    rows.push({ kind: 'text', text: `POINTS LEFT: ${levelUp.points}`, colour: HINT_COLOUR });
  }
  rows.push({ kind: 'text', text: 'PICK A STAT', colour: HINT_COLOUR });
  return { width: WIDE_PANEL, rows };
}

function pagePanel(page: PageView, hero: HeroView, inventoryCursor: number): Panel {
  switch (page.id) {
    case 'stats':
      return statPagePanel(page);
    case 'inventory':
      return inventoryPagePanel(page, hero, inventoryCursor);
    case 'automap':
      // Until the adapter draws the map, the page only says it is open.
      return { width: NARROW_PANEL, rows: [{ kind: 'text', text: 'AUTOMAP', colour: TITLE_COLOUR }] };
  }
}

/** The title, with the cursor's place in the list of Gear while the list is longer than the window shows. */
function inventoryTitle(gearCount: number, cursor: number): string {
  return gearCount > VISIBLE_GEAR && cursor < gearCount ? `INVENTORY ${cursor + 1}/${gearCount}` : 'INVENTORY';
}

/** A consumable's line: the Healing Potion is one the cursor can rest on, to use it; the others are only counted. */
function consumableRow(id: ConsumableId, page: InventoryPageView, cursor: number): Row {
  const label = CONSUMABLE_NAMES[id];
  const value = String(page.consumables[id]);
  if (id === 'healing-potion') {
    return { kind: 'choice', label, value, highlighted: cursor === potionLineOf(page) };
  }
  return { kind: 'stat', label, value, gain: null };
}

function inventoryPagePanel(page: InventoryPageView, hero: HeroView, cursor: number): Panel {
  const { gear } = page;
  // The window shows the cursor in the middle of the list when it can, and never runs past either end of it.
  const first = Math.min(Math.max(0, cursor - Math.floor(VISIBLE_GEAR / 2)), Math.max(0, gear.length - VISIBLE_GEAR));
  const rows: Row[] = [
    { kind: 'text', text: inventoryTitle(gear.length, cursor), colour: TITLE_COLOUR },
    { kind: 'space' },
    ...gear.slice(first, first + VISIBLE_GEAR).map(
      (piece, offset): Row => ({
        kind: 'gear',
        name: piece.name,
        bonus: `+${shown(piece.bonus)} ${GEAR_STAT_ABBREVIATIONS[piece.stat]}`,
        equipped: piece.equipped,
        highlighted: first + offset === cursor,
      }),
    ),
  ];
  if (gear.length === 0) {
    rows.push({ kind: 'text', text: 'NO GEAR YET', colour: HINT_COLOUR });
  }
  rows.push(
    { kind: 'space' },
    ...CONSUMABLE_IDS.map((id): Row => consumableRow(id, page, cursor)),
    // Health is rounded up, as on the HUD, so a hero that is still standing never reads as 0.
    {
      kind: 'stat',
      label: STAT_NAMES.health,
      value: `${Math.ceil(hero.health)}/${Math.ceil(hero.maxHealth)}`,
      gain: null,
    },
    { kind: 'text', text: `ATTACK ${shown(page.attack)}  DEFENSE ${shown(page.defense)}`, colour: TEXT_COLOUR },
    {
      kind: 'text',
      text: cursor === potionLineOf(page) ? 'UP/DOWN PICK ENTER USE' : 'UP/DOWN PICK ENTER EQUIP',
      colour: HINT_COLOUR,
    },
    { kind: 'text', text: 'ESC TO CLOSE', colour: HINT_COLOUR },
  );
  return { width: INVENTORY_PANEL, rows };
}

function statPagePanel(page: StatPageView): Panel {
  const { experience } = page;
  return {
    width: WIDE_PANEL,
    rows: [
      { kind: 'text', text: 'STATS', colour: TITLE_COLOUR },
      { kind: 'space' },
      { kind: 'stat', label: 'LEVEL', value: `${page.level}/${page.maxLevel}`, gain: null },
      {
        kind: 'stat',
        label: 'EXP',
        value: experience === null ? 'MAX' : `${shown(experience.earned)}/${shown(experience.needed)}`,
        gain: null,
      },
      { kind: 'bar', share: experience === null ? 1 : experience.earned / experience.needed },
      // Health is rounded up, as on the HUD, so a hero that is still standing never reads as 0.
      { kind: 'stat', label: 'HEALTH', value: `${Math.ceil(page.health)}/${Math.ceil(page.maxHealth)}`, gain: null },
      { kind: 'stat', label: 'ATTACK', value: shown(page.attack), gain: null },
      { kind: 'stat', label: 'DEFENSE', value: shown(page.defense), gain: null },
      { kind: 'space' },
      { kind: 'text', text: 'ESC TO CLOSE', colour: HINT_COLOUR },
    ],
  };
}

/** The text, cut short from the end until it fits the width. */
function fitted(text: string, width: number): string {
  let fitting = text;
  while (fitting.length > 0 && textWidthOf(fitting) > width) {
    fitting = fitting.slice(0, -1);
  }
  return fitting;
}

function heightOf(row: Row): number {
  switch (row.kind) {
    case 'text':
    case 'stat':
    case 'choice':
    case 'gear':
      return TEXT_HEIGHT;
    case 'bar':
      return BAR_HEIGHT;
    case 'space':
      return 0;
  }
}

function drawPanel(graphics: Graphics, panel: Panel): void {
  const { width, rows } = panel;
  const height = rows.reduce((total, row) => total + heightOf(row), 0) + ROW_GAP * (rows.length - 1) + 2 * PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  const top = Math.floor((VIEW_HEIGHT - height) / 2);
  graphics.fillStyle(BACKDROP_COLOUR, BACKDROP_ALPHA);
  graphics.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  graphics.fillStyle(BORDER_COLOUR);
  graphics.fillRect(left - BORDER, top - BORDER, width + 2 * BORDER, height + 2 * BORDER);
  graphics.fillStyle(PANEL_COLOUR);
  graphics.fillRect(left, top, width, height);

  // Values line up in a column to the left of the widest gain.
  const gainColumn = Math.max(
    0,
    ...rows.map((row) => (row.kind === 'stat' && row.gain !== null ? textWidthOf(row.gain) + COLUMN_GAP : 0)),
  );
  let rowTop = top + PADDING;
  for (const row of rows) {
    drawRow(graphics, row, { left: left + PADDING, right: left + width - PADDING, top: rowTop }, gainColumn);
    rowTop += heightOf(row) + ROW_GAP;
  }
}

interface RowSpace {
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** The bar behind the line that the cursor is on, with a gold edge. */
function drawHighlight(graphics: Graphics, left: number, right: number, top: number): void {
  graphics.fillStyle(HIGHLIGHT_COLOUR);
  graphics.fillRect(left - HIGHLIGHT_REACH, top - 1, right - left + 2 * HIGHLIGHT_REACH, TEXT_HEIGHT + 2);
  graphics.fillStyle(TITLE_COLOUR);
  graphics.fillRect(left - HIGHLIGHT_REACH, top - 1, 2, TEXT_HEIGHT + 2);
}

function drawRow(graphics: Graphics, row: Row, space: RowSpace, gainColumn: number): void {
  const { left, right, top } = space;
  switch (row.kind) {
    case 'text':
      drawText(graphics, row.text, left + Math.floor((right - left - textWidthOf(row.text)) / 2), top, row.colour);
      return;
    case 'stat':
      drawText(graphics, row.label, left, top, TEXT_COLOUR);
      if (row.gain !== null) {
        drawText(graphics, row.gain, right - textWidthOf(row.gain), top, GAIN_COLOUR);
      }
      drawText(graphics, row.value, right - gainColumn - textWidthOf(row.value), top, TEXT_COLOUR);
      return;
    case 'choice':
      if (row.highlighted) {
        drawHighlight(graphics, left, right, top);
      }
      drawText(graphics, row.label, left, top, TEXT_COLOUR);
      drawText(graphics, row.value, right - gainColumn - textWidthOf(row.value), top, TEXT_COLOUR);
      return;
    case 'gear': {
      if (row.highlighted) {
        drawHighlight(graphics, left, right, top);
      }
      const colour = row.equipped ? GAIN_COLOUR : TEXT_COLOUR;
      drawBitmap(graphics, row.equipped ? MARK_EQUIPPED : MARK_CARRIED, left, top, colour);
      const nameLeft = left + bitmapWidth(MARK_EQUIPPED) + MARK_GAP;
      const nameWidth = right - textWidthOf(row.bonus) - COLUMN_GAP - nameLeft;
      drawText(graphics, fitted(row.name, nameWidth), nameLeft, top, colour);
      drawText(graphics, row.bonus, right - textWidthOf(row.bonus), top, colour);
      return;
    }
    case 'bar':
      graphics.fillStyle(BAR_TRACK_COLOUR);
      graphics.fillRect(left, top, right - left, BAR_HEIGHT);
      graphics.fillStyle(EXPERIENCE_COLOUR);
      graphics.fillRect(left, top, Math.round((right - left) * row.share), BAR_HEIGHT);
      return;
    case 'space':
      return;
  }
}
