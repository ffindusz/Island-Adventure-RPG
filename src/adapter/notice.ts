import type Phaser from 'phaser';
import type { PickedUpItem } from '../core';
import { consumableIcon, gearIcon, KEY_ICON } from './artwork';
import { ChangeGuard } from './change-guard';
import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { interactKeyLabel, pageKeyLabel, switchWeaponKeyLabel } from './controls';
import { DEPTH } from './depths';
import { CONSUMABLE_NAMES, numberText, STAT_NAMES } from './labels';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import { INK, UiLayer } from './ui-layer';

// The notice of what the hero just found, that the bow has nothing to shoot, that it touched a Checkpoint, that a door
// is locked or has opened, that a lever moved, that the Guardian fell and its gate opened, that the vessel is ready to
// sail, or that the game could not be saved, low on the screen where it covers neither the hero nor the HUD. It is
// drawn from what the Game core reported and nothing else.

/**
 * What the notice tells the player: the item the hero picked up, that an arrow was asked for and there is none, that
 * the hero touched a Checkpoint, that a door is locked and which key it needs or that a key opened it, that a lever was
 * pulled or put back, that the Guardian fell and the gate it kept opened, that the vessel is prepared and the key that
 * sails it, or that the browser refused to keep the saved game.
 */
export type NoticeContent =
  | { readonly kind: 'pickup'; readonly item: PickedUpItem }
  | { readonly kind: 'out-of-ammunition' }
  | { readonly kind: 'checkpoint' }
  | { readonly kind: 'door-locked'; readonly keyName: string }
  | { readonly kind: 'door-opened'; readonly keyName: string }
  | { readonly kind: 'lever-toggled'; readonly pulled: boolean }
  | { readonly kind: 'gate-opened' }
  | { readonly kind: 'vessel-prepared' }
  | { readonly kind: 'save-failed' };

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
 * Tells the player what the hero picked up, that the bow is out of Ammunition, that a Checkpoint is touched, that a door
 * is locked or has opened, that a lever moved, that the Guardian fell and its gate opened, that the vessel is prepared,
 * or that the game could not be saved.
 */
export class Notice {
  private readonly layer: UiLayer;
  private readonly shown = new ChangeGuard();

  constructor(scene: Phaser.Scene) {
    this.layer = new UiLayer(scene, DEPTH.notice);
  }

  /** Shows the content, or nothing. It draws again only when what it shows has changed. */
  draw(content: NoticeContent | null): void {
    if (!this.shown.changed(content)) {
      return;
    }
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
    case 'door-locked':
    case 'door-opened':
      return KEY_ICON;
    case 'lever-toggled':
    case 'gate-opened':
    case 'vessel-prepared':
    case 'save-failed':
      return null;
  }
}

/** The picture of the item, which the notice shows beside its lines and the hero's pickup shows rising over it. */
export function pickupIcon(item: PickedUpItem): string {
  switch (item.kind) {
    case 'gear':
      return gearIcon(item.id);
    case 'consumable':
      return consumableIcon(item.id);
    case 'key':
      return KEY_ICON;
  }
}

/** The lines the notice says, from the top down. */
export function linesFor(content: NoticeContent): Line[] {
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
    case 'door-locked':
      return [
        { text: 'LOCKED', colour: WARNING_COLOUR },
        { text: `NEEDS ${content.keyName}`, colour: HINT_COLOUR },
      ];
    case 'door-opened':
      return [
        { text: 'DOOR OPENED', colour: TITLE_COLOUR },
        { text: `USED ${content.keyName}`, colour: HINT_COLOUR },
      ];
    case 'lever-toggled':
      return [
        { text: content.pulled ? 'LEVER PULLED' : 'LEVER PUT BACK', colour: TITLE_COLOUR },
        { text: 'SOMETHING MOVED', colour: HINT_COLOUR },
      ];
    case 'gate-opened':
      return [
        { text: 'GUARDIAN DEFEATED', colour: TITLE_COLOUR },
        { text: 'THE GATE OPENED', colour: HINT_COLOUR },
      ];
    case 'vessel-prepared':
      return [
        { text: 'THE VESSEL IS READY', colour: TITLE_COLOUR },
        { text: `PRESS ${interactKeyLabel()} AGAIN TO SAIL`, colour: HINT_COLOUR },
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
        { text: `+${numberText(item.bonus)} ${STAT_NAMES[item.stat]}`, colour: GAIN_COLOUR },
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
