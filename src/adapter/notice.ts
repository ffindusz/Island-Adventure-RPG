import type Phaser from 'phaser';
import type { PickedUpItem } from '../core';
import { consumableIcon, gearIcon, KEY_ICON } from './artwork';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { CONSUMABLE_NAMES, shown, STAT_NAMES } from './labels';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { pageKeyLabel, switchWeaponKeyLabel } from './player-input';
import { INK, UiLayer } from './ui-layer';

// The notice of what the hero just found, that the bow has nothing to shoot, that it touched a Checkpoint, or that the
// game could not be saved, low on the screen where it covers neither the hero nor the HUD. It is drawn from what the
// Game core reported and nothing else.

/**
 * What the notice tells the player: the item the hero picked up, that an arrow was asked for and there is none, that
 * the hero touched a Checkpoint, or that the browser refused to keep the saved game.
 */
export type NoticeContent =
  | { readonly kind: 'pickup'; readonly item: PickedUpItem }
  | { readonly kind: 'out-of-ammunition' }
  | { readonly kind: 'checkpoint' }
  | { readonly kind: 'save-failed' };

/** Above the HUD, below the overlay: a page that opens covers the notice. */
const NOTICE_DEPTH = 150;

/** From the panel's edge, whose frame is 3 pixels wide, to what it holds. */
const PADDING = 7;
const LINE_GAP = 4;
const BOTTOM_MARGIN = 10;
/** The room of the item's picture, which is 16 pixels square at most, and the air between it and the text. */
const ICON_ROOM = 16;
const ICON_GAP = 6;

const TITLE_COLOUR = INK.title;
const GAIN_COLOUR = INK.gain;
const HINT_COLOUR = INK.hint;
const WARNING_COLOUR = INK.warning;

interface Line {
  readonly text: string;
  readonly colour: number;
}

/**
 * Tells the player what the hero picked up, that the bow is out of Ammunition, that a Checkpoint is touched, or that
 * the game could not be saved.
 */
export class Notice {
  private readonly layer: UiLayer;
  private shown = 'null';

  constructor(scene: Phaser.Scene) {
    this.layer = new UiLayer(scene, NOTICE_DEPTH);
  }

  /** Shows the content, or nothing. It draws again only when what it shows has changed. */
  draw(content: NoticeContent | null): void {
    const key = JSON.stringify(content);
    if (key === this.shown) {
      return;
    }
    this.shown = key;
    this.layer.clear();
    if (content !== null) {
      drawLines(this.layer, linesFor(content), iconFor(content));
    }
  }
}

/** The picture of what the notice is about, to the left of the lines, if it has one. */
function iconFor(content: NoticeContent): string | null {
  switch (content.kind) {
    case 'pickup':
      return pickupIcon(content.item);
    case 'out-of-ammunition':
      return consumableIcon('ammunition');
    case 'checkpoint':
      return 'ui-heart';
    case 'save-failed':
      return null;
  }
}

function pickupIcon(item: PickedUpItem): string {
  switch (item.kind) {
    case 'gear':
      return gearIcon(item.id);
    case 'consumable':
      return consumableIcon(item.id);
    case 'key':
      return KEY_ICON;
  }
}

function linesFor(content: NoticeContent): Line[] {
  switch (content.kind) {
    case 'pickup':
      return pickupLines(content.item);
    case 'out-of-ammunition':
      return [
        { text: 'OUT OF AMMUNITION', colour: WARNING_COLOUR },
        { text: `PRESS ${switchWeaponKeyLabel()} TO SWITCH`, colour: HINT_COLOUR },
      ];
    case 'checkpoint':
      return [
        { text: 'CHECKPOINT', colour: TITLE_COLOUR },
        { text: 'HEALTH FULL', colour: GAIN_COLOUR },
      ];
    case 'save-failed':
      return [{ text: 'COULD NOT SAVE THE GAME', colour: WARNING_COLOUR }];
  }
}

function pickupLines(item: PickedUpItem): Line[] {
  switch (item.kind) {
    case 'gear':
      return [
        { text: `FOUND ${item.name}`, colour: TITLE_COLOUR },
        { text: `+${shown(item.bonus)} ${STAT_NAMES[item.stat]}`, colour: GAIN_COLOUR },
        { text: `PRESS ${pageKeyLabel('inventory')} TO EQUIP`, colour: HINT_COLOUR },
      ];
    case 'consumable':
      return [
        { text: `FOUND ${CONSUMABLE_NAMES[item.id]}`, colour: TITLE_COLOUR },
        { text: `+${item.amount}`, colour: GAIN_COLOUR },
      ];
    case 'key':
      return [
        { text: `FOUND ${item.name}`, colour: TITLE_COLOUR },
        { text: 'IT OPENS A DOOR', colour: HINT_COLOUR },
      ];
  }
}

function drawLines(layer: UiLayer, lines: readonly Line[], icon: string | null): void {
  const textWidth = Math.max(...lines.map((line) => textWidthOf(line.text)));
  const textHeight = lines.length * TEXT_HEIGHT + (lines.length - 1) * LINE_GAP;
  const iconRoom = icon === null ? 0 : ICON_ROOM + ICON_GAP;
  const contentHeight = icon === null ? textHeight : Math.max(textHeight, ICON_ROOM);
  const width = iconRoom + textWidth + 2 * PADDING;
  const height = contentHeight + 2 * PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  const top = VIEW_HEIGHT - height - BOTTOM_MARGIN;
  layer.frame('panel', left, top, width, height);
  if (icon !== null) {
    layer.icon(icon, left + PADDING, top + PADDING, ICON_ROOM, contentHeight);
  }
  const textLeft = left + PADDING + iconRoom;
  const textTop = top + PADDING + Math.floor((contentHeight - textHeight) / 2);
  lines.forEach((line, index) => {
    const lineLeft = textLeft + Math.floor((textWidth - textWidthOf(line.text)) / 2);
    layer.text(line.text, lineLeft, textTop + index * (TEXT_HEIGHT + LINE_GAP), line.colour);
  });
}
