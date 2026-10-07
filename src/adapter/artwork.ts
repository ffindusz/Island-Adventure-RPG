// Every picture the adapter can show, by name: one line each. The files are under public/art/, and
// docs/assets/licences.md says where each one comes from. Content asks for art by id only, so the names it needs follow
// one rule: `gear-<id>` for each Gear and `consumable-<id>` for each consumable. `neededArt` lists them, and the
// game refuses to start while one is missing here.
import { CONSUMABLE_IDS } from '../core';
import type { ConsumableId, ContentDefinition } from '../core';
import { drawn, image, sheet } from './asset-manifest';
import type { ArtManifest } from './asset-manifest';
import { MAIL_ROWS, PACK_PALETTE, TUNIC_ROWS } from './drawn-icons';

export const ARTWORK = {
  // The hero is the Hunter: a 4 by 7 sheet of 16 pixel cells, see hero-sprite.ts for which cell is which.
  hero: sheet('hero.png', 16),
  'sword-held': image('sword-held.png'),
  'bow-held': image('gear-short-bow.png'),
  arrow: image('arrow.png'),
  // The four frames of the sword's slash, 32 pixels square.
  slash: sheet('slash.png', 32),
  'gear-basic-sword': image('gear-basic-sword.png'),
  'gear-steel-sword': image('gear-steel-sword.png'),
  'gear-short-bow': image('gear-short-bow.png'),
  'gear-basic-armor': drawn(TUNIC_ROWS, PACK_PALETTE),
  'gear-chain-mail': drawn(MAIL_ROWS, PACK_PALETTE),
  'consumable-ammunition': image('consumable-ammunition.png'),
  'consumable-healing-potion': image('consumable-healing-potion.png'),
  // The icon of every key, in the notice of finding one and in the inventory page.
  key: image('key.png'),
  // The pieces the HUD and the pages are built from, see ui-layer.ts: a dark panel, the orange frame of a window, the
  // orange button behind the line the cursor is on, and the heart of Health.
  'ui-panel': image('ui-panel.png'),
  'ui-window': image('ui-window.png'),
  'ui-button': image('ui-button.png'),
  'ui-heart': image('ui-heart.png'),
} as const satisfies ArtManifest;

/** The name of a picture the adapter itself asks for. */
export type ArtName = keyof typeof ARTWORK;

/** The name of the icon of the Gear with this id. */
export function gearIcon(id: string): string {
  return `gear-${id}`;
}

/** The name of the icon of the consumable with this id. */
export function consumableIcon(id: ConsumableId): string {
  return `consumable-${id}`;
}

/** The name of the icon of a key. Every key has the same one: the keys differ in their names. */
export const KEY_ICON = 'key' satisfies ArtName;

/** The names of the pictures the content needs: an icon for each Gear and for each consumable. */
export function neededArt(content: ContentDefinition): string[] {
  return [...Object.keys(content.gear).map(gearIcon), ...CONSUMABLE_IDS.map(consumableIcon)];
}
