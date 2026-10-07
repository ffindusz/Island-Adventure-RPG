import type Phaser from 'phaser';
import type { LevelUpView, PageView, PlayingView, StatId, StatPageView } from '../core';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { drawText, TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Graphics } from './pixel-font';
import { statKeyLabel } from './player-input';

// The overlay: what covers the game while it waits for the player. It shows the level-up choice or the page that is
// open, or says the game is paused when the window has lost focus. It is drawn from the Game core's view alone, on a
// dimmed copy of the game, and every number on it is a number the view gives: it works out nothing.

/** Above the HUD. */
const OVERLAY_DEPTH = 200;

const WIDE_PANEL = 160;
const NARROW_PANEL = 96;
/** From the panel's edge to what it holds, and the border around the panel, in canvas pixels. */
const PADDING = 8;
const BORDER = 2;
/** The space between rows, the height of a bar, and the space between a stat's value and its gain. */
const ROW_GAP = 4;
const BAR_HEIGHT = 4;
const COLUMN_GAP = 8;

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

const STAT_NAMES: Readonly<Record<StatId, string>> = { health: 'HEALTH', attack: 'ATTACK', defense: 'DEFENSE' };

type Row =
  /** Centred. */
  | { readonly kind: 'text'; readonly text: string; readonly colour: number }
  /** A name on the left and a value on the right, and a gain after the value when there is one. */
  | { readonly kind: 'stat'; readonly label: string; readonly value: string; readonly gain: string | null }
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
  draw(view: PlayingView, focused: boolean): void {
    const panel = panelFor(view, focused);
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
function panelFor(view: PlayingView, focused: boolean): Panel | null {
  if (view.levelUp !== null) {
    return levelUpPanel(view.levelUp);
  }
  if (view.page !== null) {
    return pagePanel(view.page);
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

function pagePanel(page: PageView): Panel {
  switch (page.id) {
    case 'stats':
      return statPagePanel(page);
  }
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

/** A number as the player reads it: whole when it is whole, with no more than two decimals otherwise. */
function shown(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function heightOf(row: Row): number {
  switch (row.kind) {
    case 'text':
    case 'stat':
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
