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
import { consumableIcon, gearIcon, KEY_ICON } from './artwork';
import { ChangeGuard } from './change-guard';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { closePageKeyLabel, confirmKeyLabel, statKeyLabel } from './controls';
import { DEPTH } from './depths';
import { potionLineOf } from './inventory-menu';
import {
  CONSUMABLE_NAMES,
  experienceShare,
  GEAR_STAT_ABBREVIATIONS,
  healthText,
  numberText,
  STAT_NAMES,
} from './labels';
import { bitmapHeight, bitmapWidth, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Bitmap, Graphics } from './pixel-font';
import { stackHeight, stackRows } from './row-stack';
import type { RowRules } from './row-stack';
import { INK, UiLayer, WINDOW_PADDING } from './ui-layer';

// The overlay: what covers the game while it waits for the player. It shows the level-up choice, the page that is open
// or the question whether to sail home, or says the game is paused when the window has lost focus. It is drawn from
// the Game core's view alone, in a window over a dimmed copy of the game, and every number on it is a number the view
// gives: it works out nothing. The one thing it is given besides the view is where the player's cursor is on the
// inventory page.

const WIDE_WINDOW = 160;
const NARROW_WINDOW = 96;
/** The space between rows, the height of a bar, and the space between a stat's value and its gain. */
const ROW_GAP = 4;
const BAR_HEIGHT = 5;
const COLUMN_GAP = 8;

/**
 * The inventory has two columns: the Gear on the left, and on the right what the hero carries and its stats. The
 * window is as wide as the two and the space between them need.
 */
const GEAR_COLUMN = 144;
const SUPPLY_COLUMN = 122;
const COLUMN_SPACING = 8;
const INVENTORY_WINDOW = GEAR_COLUMN + COLUMN_SPACING + SUPPLY_COLUMN + 2 * WINDOW_PADDING;

/** How many pieces of Gear the inventory page lists at once. A longer list scrolls to keep the cursor in view. */
const VISIBLE_GEAR = 5;

/** How many keys the inventory page lists at once, so that the window stays on the screen. The rest are counted. */
const VISIBLE_KEYS = 2;

/** A line with a picture is as high as the picture, which is 16 pixels, and a pixel of air above and below it. */
const ITEM_HEIGHT = 18;
const ICON_ROOM = 16;
/** From the left edge of such a line to its text, and from the right edge to what ends the line. */
const TEXT_INDENT = 22;
const TEXT_OUTDENT = 4;

const BACKDROP_COLOUR = 0x000000;
const BACKDROP_ALPHA = 0.55;

/** The tick behind a piece of Gear that is equipped. */
const TICK: Bitmap = ['......#', '.....#.', '#...#..', '.#.#...', '..#....'];

/** Where the parts of a piece of Gear's line start: its name, its bonus and its tick, and the room the name has. */
interface GearLine {
  readonly nameLeft: number;
  readonly nameRoom: number;
  readonly bonusLeft: number;
  readonly tickLeft: number;
}

/**
 * The line of a piece of Gear between two edges: the picture and the name from the left, and from the right edge the
 * tick, the bonus before it and the room for the name before that, with a gap in front of each.
 */
function gearLineOf(left: number, right: number, bonus: string): GearLine {
  const tickLeft = right - TEXT_OUTDENT - bitmapWidth(TICK);
  const bonusLeft = tickLeft - TEXT_OUTDENT - textWidthOf(bonus);
  const nameLeft = left + TEXT_INDENT;
  return { nameLeft, nameRoom: bonusLeft - TEXT_OUTDENT - nameLeft, bonusLeft, tickLeft };
}

/**
 * The most characters that a piece of Gear's name can have to be shown whole on the inventory page: on its line in the
 * Gear column it has what the picture, a bonus of one digit such as "+2 ATK" and the tick leave. `fitted` cuts a longer
 * name off at the end without a word, so every piece of Gear in the content must keep to this.
 */
export const LONGEST_GEAR_NAME = fitted('W'.repeat(GEAR_COLUMN), gearLineOf(0, GEAR_COLUMN, '+9 ATK').nameRoom).length;

type Row =
  /** Centred. */
  | { readonly kind: 'text'; readonly text: string; readonly colour: number }
  /** A name on the left and a value on the right, and a gain after the value when there is one. */
  | { readonly kind: 'stat'; readonly label: string; readonly value: string; readonly gain: string | null }
  /** A piece of Gear: its picture, name and bonus, and a tick when it is equipped. The cursor's button is behind it. */
  | {
      readonly kind: 'gear';
      readonly icon: string;
      readonly name: string;
      readonly bonus: string;
      readonly equipped: boolean;
      readonly highlighted: boolean;
    }
  /** A consumable: its picture, name and count. The cursor's button is behind it, when the cursor can rest on it. */
  | {
      readonly kind: 'consumable';
      readonly icon: string;
      readonly label: string;
      readonly count: string;
      readonly highlighted: boolean;
    }
  /** A key the hero holds: its picture and name. The cursor never rests on it. */
  | { readonly kind: 'key'; readonly icon: string; readonly name: string }
  /** A bar across the window, filled by `share` from 0 to 1. */
  | { readonly kind: 'bar'; readonly share: number }
  /** A little more room. */
  | { readonly kind: 'space'; readonly height: number }
  /** Two columns of rows side by side, as tall as the taller. */
  | {
      readonly kind: 'columns';
      readonly leftWidth: number;
      readonly left: readonly Row[];
      readonly right: readonly Row[];
    };

export interface Panel {
  readonly width: number;
  readonly rows: readonly Row[];
}

/** The level-up choice, the open page, the question whether to sail home, or the pause notice, whichever is showing. */
export class Overlay {
  private readonly backdrop: Graphics;
  private readonly layer: UiLayer;
  private readonly shown = new ChangeGuard();

  constructor(scene: Phaser.Scene) {
    // The dimming sits just under the window.
    this.backdrop = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.overlay - 1);
    this.layer = new UiLayer(scene, DEPTH.overlay);
  }

  /** Shows what the view says. It draws again only when what it shows has changed. */
  draw(view: PlayingView, focused: boolean, inventoryCursor: number): void {
    const panel = panelFor(view, focused, inventoryCursor);
    if (!this.shown.changed(panel)) {
      return;
    }
    this.backdrop.clear();
    this.layer.clear();
    if (panel !== null) {
      this.backdrop.fillStyle(BACKDROP_COLOUR, BACKDROP_ALPHA);
      this.backdrop.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      drawPanel(this.layer, panel);
    }
  }
}

/**
 * The choice that waits comes first, then the page that is open, then the question whether to sail home, then the
 * notice that the window lost focus. The question waits for an answer, so it shows over that notice: the player who
 * comes back to the window finds it there.
 */
export function panelFor(view: PlayingView, focused: boolean, inventoryCursor: number): Panel | null {
  if (view.levelUp !== null) {
    return levelUpPanel(view.levelUp);
  }
  if (view.page !== null) {
    return pagePanel(view.page, view.hero, inventoryCursor);
  }
  if (view.departure !== null) {
    return departurePanel();
  }
  if (!focused) {
    return { width: NARROW_WINDOW, rows: [{ kind: 'text', text: 'PAUSED', colour: INK.title }] };
  }
  return null;
}

/** The question before the game's one point of no return: sailing home ends the adventure. */
function departurePanel(): Panel {
  return {
    width: WIDE_WINDOW,
    rows: [
      { kind: 'text', text: 'SAIL HOME?', colour: INK.title },
      { kind: 'text', text: 'THE ADVENTURE ENDS.', colour: INK.warning },
      { kind: 'space', height: 0 },
      { kind: 'text', text: `${confirmKeyLabel()} TO SAIL`, colour: INK.text },
      { kind: 'text', text: `${closePageKeyLabel()} TO STAY`, colour: INK.text },
    ],
  };
}

function levelUpPanel(levelUp: LevelUpView): Panel {
  const rows: Row[] = [
    { kind: 'text', text: 'LEVEL UP!', colour: INK.title },
    { kind: 'text', text: `LEVEL ${levelUp.level}`, colour: INK.text },
    { kind: 'space', height: 0 },
    ...levelUp.options.map(
      (option): Row => ({
        kind: 'stat',
        label: `${statKeyLabel(option.stat)} ${STAT_NAMES[option.stat]}`,
        value: numberText(option.value),
        gain: `+${numberText(option.gain)}`,
      }),
    ),
    { kind: 'space', height: 0 },
  ];
  if (levelUp.points > 1) {
    rows.push({ kind: 'text', text: `POINTS LEFT: ${levelUp.points}`, colour: INK.hint });
  }
  rows.push({ kind: 'text', text: 'PICK A STAT', colour: INK.hint });
  return { width: WIDE_WINDOW, rows };
}

function pagePanel(page: PageView, hero: HeroView, inventoryCursor: number): Panel | null {
  switch (page.id) {
    case 'stats':
      return statPagePanel(page);
    case 'inventory':
      return inventoryPagePanel(page, hero, inventoryCursor);
    case 'automap':
      // The Automap is a map, not rows of text: it draws itself (automap-page.ts), and the overlay shows nothing for it.
      return null;
  }
}

/** The title, with the cursor's place in the list of Gear while the list is longer than the window shows. */
function inventoryTitle(gearCount: number, cursor: number): string {
  return gearCount > VISIBLE_GEAR && cursor < gearCount ? `INVENTORY ${cursor + 1}/${gearCount}` : 'INVENTORY';
}

/** A consumable's line: the Healing Potion is one the cursor can rest on, to use it; the others are only counted. */
function consumableRow(id: ConsumableId, page: InventoryPageView, cursor: number): Row {
  return {
    kind: 'consumable',
    icon: consumableIcon(id),
    label: CONSUMABLE_NAMES[id],
    count: String(page.consumables[id]),
    highlighted: id === 'healing-potion' && cursor === potionLineOf(page),
  };
}

function inventoryPagePanel(page: InventoryPageView, hero: HeroView, cursor: number): Panel {
  const { gear } = page;
  // The window shows the cursor in the middle of the list when it can, and never runs past either end of it.
  const first = Math.min(Math.max(0, cursor - Math.floor(VISIBLE_GEAR / 2)), Math.max(0, gear.length - VISIBLE_GEAR));
  const gearRows: Row[] = gear.slice(first, first + VISIBLE_GEAR).map(
    (piece, offset): Row => ({
      kind: 'gear',
      icon: gearIcon(piece.id),
      name: piece.name,
      bonus: `+${numberText(piece.bonus)} ${GEAR_STAT_ABBREVIATIONS[piece.stat]}`,
      equipped: piece.equipped,
      highlighted: first + offset === cursor,
    }),
  );
  if (gear.length === 0) {
    gearRows.push({ kind: 'text', text: 'NO GEAR YET', colour: INK.hint });
  }
  const keyRows: Row[] = page.keys
    .slice(0, VISIBLE_KEYS)
    .map((key): Row => ({ kind: 'key', icon: KEY_ICON, name: key.name }));
  if (page.keys.length > VISIBLE_KEYS) {
    keyRows.push({ kind: 'text', text: `+${page.keys.length - VISIBLE_KEYS} MORE`, colour: INK.hint });
  }
  const supplyRows: Row[] = [
    ...CONSUMABLE_IDS.map((id): Row => consumableRow(id, page, cursor)),
    ...keyRows,
    { kind: 'space', height: 0 },
    ...statRows({ health: hero.health, maxHealth: hero.maxHealth, attack: page.attack, defense: page.defense }),
  ];
  const rows: Row[] = [
    { kind: 'text', text: inventoryTitle(gear.length, cursor), colour: INK.title },
    { kind: 'space', height: 0 },
    { kind: 'columns', leftWidth: GEAR_COLUMN, left: gearRows, right: supplyRows },
    { kind: 'space', height: 0 },
    {
      kind: 'text',
      text: `UP/DOWN PICK ${confirmKeyLabel()} ${cursor === potionLineOf(page) ? 'USE' : 'EQUIP'}`,
      colour: INK.hint,
    },
    { kind: 'text', text: `${closePageKeyLabel()} TO CLOSE`, colour: INK.hint },
  ];
  return { width: INVENTORY_WINDOW, rows };
}

/** The three stats as the inventory and the stat page both show them: Health, then Attack, then Defense. */
function statRows(stats: Pick<StatPageView, 'health' | 'maxHealth' | 'attack' | 'defense'>): Row[] {
  return [
    { kind: 'stat', label: STAT_NAMES.health, value: healthText(stats.health, stats.maxHealth), gain: null },
    { kind: 'stat', label: STAT_NAMES.attack, value: numberText(stats.attack), gain: null },
    { kind: 'stat', label: STAT_NAMES.defense, value: numberText(stats.defense), gain: null },
  ];
}

function statPagePanel(page: StatPageView): Panel {
  const { experience } = page;
  return {
    width: WIDE_WINDOW,
    rows: [
      { kind: 'text', text: 'STATS', colour: INK.title },
      { kind: 'space', height: 0 },
      { kind: 'stat', label: 'LEVEL', value: `${page.level}/${page.maxLevel}`, gain: null },
      {
        kind: 'stat',
        label: 'EXP',
        value: experience === null ? 'MAX' : `${numberText(experience.earned)}/${numberText(experience.needed)}`,
        gain: null,
      },
      { kind: 'bar', share: experienceShare(experience) },
      ...statRows(page),
      { kind: 'space', height: 0 },
      { kind: 'text', text: `${closePageKeyLabel()} TO CLOSE`, colour: INK.hint },
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
      return TEXT_HEIGHT;
    case 'gear':
    case 'consumable':
    case 'key':
      return ITEM_HEIGHT;
    case 'bar':
      return BAR_HEIGHT;
    case 'space':
      return row.height;
    case 'columns':
      return Math.max(stackHeight(row.left, ROW_RULES), stackHeight(row.right, ROW_RULES));
  }
}

function isItem(row: Row): boolean {
  return row.kind === 'gear' || row.kind === 'consumable' || row.kind === 'key';
}

/** The space between two rows one under the other: none between lines with a picture, which have their own air. */
function gapBetween(above: Row, below: Row): number {
  return isItem(above) && isItem(below) ? 0 : ROW_GAP;
}

const ROW_RULES: RowRules<Row> = { heightOf, gapBetween };

function drawPanel(layer: UiLayer, panel: Panel): void {
  const { width, rows } = panel;
  const height = stackHeight(rows, ROW_RULES) + 2 * WINDOW_PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  const top = Math.floor((VIEW_HEIGHT - height) / 2);
  layer.window(left, top, width, height);
  drawStack(layer, rows, {
    left: left + WINDOW_PADDING,
    right: left + width - WINDOW_PADDING,
    top: top + WINDOW_PADDING,
  });
}

interface RowSpace {
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** Draws the rows one under the other, from the top of the space down. */
function drawStack(layer: UiLayer, rows: readonly Row[], space: RowSpace): void {
  // Values line up in a column to the left of the widest gain.
  const gainColumn = Math.max(
    0,
    ...rows.map((row) => (row.kind === 'stat' && row.gain !== null ? textWidthOf(row.gain) + COLUMN_GAP : 0)),
  );
  for (const placed of stackRows(rows, space.top, ROW_RULES)) {
    drawRow(layer, placed.row, { left: space.left, right: space.right, top: placed.top }, gainColumn);
  }
}

/** The line with a picture: the button behind it when the cursor is on it, and the picture in its first 18 pixels. */
function drawItemBase(layer: UiLayer, icon: string, highlighted: boolean, space: RowSpace): void {
  if (highlighted) {
    layer.frame('button', space.left, space.top, space.right - space.left, ITEM_HEIGHT);
  }
  layer.icon(icon, space.left + 1, space.top + 1, ICON_ROOM, ICON_ROOM);
}

function drawRow(layer: UiLayer, row: Row, space: RowSpace, gainColumn: number): void {
  const { left, right, top } = space;
  switch (row.kind) {
    case 'text':
      layer.text(row.text, left + Math.floor((right - left - textWidthOf(row.text)) / 2), top, row.colour);
      return;
    case 'stat':
      layer.text(row.label, left, top, INK.text);
      if (row.gain !== null) {
        layer.text(row.gain, right - textWidthOf(row.gain), top, INK.gain);
      }
      layer.text(row.value, right - gainColumn - textWidthOf(row.value), top, INK.text);
      return;
    case 'gear': {
      drawItemBase(layer, row.icon, row.highlighted, space);
      const ink = row.highlighted ? INK.onButton : row.equipped ? INK.gain : INK.text;
      const textTop = top + Math.floor((ITEM_HEIGHT - TEXT_HEIGHT) / 2);
      const line = gearLineOf(left, right, row.bonus);
      if (row.equipped) {
        layer.bitmap(TICK, line.tickLeft, top + Math.floor((ITEM_HEIGHT - bitmapHeight(TICK)) / 2), ink);
      }
      layer.text(row.bonus, line.bonusLeft, textTop, ink);
      layer.text(fitted(row.name, line.nameRoom), line.nameLeft, textTop, ink);
      return;
    }
    case 'consumable': {
      drawItemBase(layer, row.icon, row.highlighted, space);
      const ink = row.highlighted ? INK.onButton : row.count === '0' ? INK.dim : INK.text;
      const textTop = top + Math.floor((ITEM_HEIGHT - TEXT_HEIGHT) / 2);
      layer.text(row.label, left + TEXT_INDENT, textTop, ink);
      layer.text(row.count, right - TEXT_OUTDENT - textWidthOf(row.count), textTop, ink);
      return;
    }
    case 'key': {
      drawItemBase(layer, row.icon, false, space);
      const textTop = top + Math.floor((ITEM_HEIGHT - TEXT_HEIGHT) / 2);
      layer.text(fitted(row.name, right - TEXT_OUTDENT - (left + TEXT_INDENT)), left + TEXT_INDENT, textTop, INK.text);
      return;
    }
    case 'bar':
      layer.bar(left, top, right - left, BAR_HEIGHT, row.share, INK.experience);
      return;
    case 'space':
      return;
    case 'columns':
      drawStack(layer, row.left, { left, right: left + row.leftWidth, top });
      drawStack(layer, row.right, { left: left + row.leftWidth + COLUMN_SPACING, right, top });
      return;
  }
}
