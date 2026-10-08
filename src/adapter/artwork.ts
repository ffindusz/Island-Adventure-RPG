// Every picture the adapter can show, by name: one line each. The files are under public/art/, and
// docs/assets/licences.md says where each one comes from. Content asks for art by id only, so the names it needs follow
// one rule: `gear-<id>` for each Gear and `consumable-<id>` for each consumable, and for the Adventure Areas whose art
// is final (FINAL_ART_AREAS) `terrain-<kind>` for each kind of terrain laid out in them and `monster-<type>` for each
// type of monster placed in them. `neededArt` lists them, and the game refuses to start while one is missing here. A
// kind or a type of an area that is not listed has no picture of its own yet: it is drawn in its colour (art.ts).
import { CONSUMABLE_IDS } from '../core';
import type { ConsumableId, ContentDefinition } from '../core';
import { drawn, image, sheet } from './asset-manifest';
import type { ArtManifest } from './asset-manifest';
import { KNIGHT_ROWS, MAIL_ROWS, PACK_PALETTE, PLATE_ROWS, TUNIC_ROWS } from './drawn-icons';

export const ARTWORK = {
  // The hero is the Hunter: a 4 by 7 sheet of 16 pixel cells, see hero-sprite.ts for which cell is which.
  hero: sheet('hero.png', 16),
  'sword-held': image('sword-held.png'),
  'bow-held': image('bow-held.png'),
  arrow: image('arrow.png'),
  // The four frames of the sword's slash, 32 pixels square.
  slash: sheet('slash.png', 32),
  'gear-basic-sword': image('gear-basic-sword.png'),
  'gear-steel-sword': image('gear-steel-sword.png'),
  'gear-katana': image('gear-katana.png'),
  'gear-short-bow': image('gear-short-bow.png'),
  'gear-long-bow': image('gear-long-bow.png'),
  'gear-basic-armor': drawn(TUNIC_ROWS, PACK_PALETTE),
  'gear-chain-mail': drawn(MAIL_ROWS, PACK_PALETTE),
  'gear-plate-armor': drawn(PLATE_ROWS, PACK_PALETTE),
  'gear-knight-armor': drawn(KNIGHT_ROWS, PACK_PALETTE),
  'consumable-ammunition': image('consumable-ammunition.png'),
  'consumable-healing-potion': image('consumable-healing-potion.png'),
  // The icon of every key, in the notice of finding one and in the inventory page.
  key: image('key.png'),
  // Terrain, a sheet of 16 pixel frames for each kind: what the frames are, and who draws them, is in terrain-baker.ts.
  'terrain-water': sheet('terrain-water.png', 16),
  'terrain-sand': sheet('terrain-sand.png', 16),
  'terrain-grass': sheet('terrain-grass.png', 16),
  'terrain-rock': sheet('terrain-rock.png', 16),
  'terrain-tree': sheet('terrain-tree.png', 16),
  'terrain-wreckage': sheet('terrain-wreckage.png', 16),
  // Monsters, a sheet for each type: four columns (down, up, left, right), the frames of its walk, then a white frame
  // for a hit and a red one for a wind-up; see monster-sprites.ts.
  'monster-crab': sheet('monster-crab.png', 16),
  'monster-slime': sheet('monster-slime.png', 16),
  'monster-spitter': sheet('monster-spitter.png', 16),
  'monster-wolf': sheet('monster-wolf.png', 18, 17),
  'monster-boar': sheet('monster-boar.png', 17, 16),
  // What monsters share: the orb that a ranged monster shoots (four frames of 16 pixels), and the puff left where one
  // fell (six frames of 32 pixels).
  'projectile-orb': sheet('projectile-orb.png', 16),
  'fx-puff': sheet('fx-puff.png', 32),
  // What every area shares, see prop-sprites.ts for which frame is which: chests and caches (closed and open), what lies
  // on the ground (plain and with a glint), the Checkpoint's flags (16 by 26 pixels), the marks of an exit (one way each),
  // the door (shut and open) and the sign.
  'prop-chest': sheet('prop-chest.png', 16),
  'prop-pickup': sheet('prop-pickup.png', 16),
  'prop-checkpoint': sheet('prop-checkpoint.png', 16, 26),
  'prop-exit': sheet('prop-exit.png', 16),
  'prop-door': sheet('prop-door.png', 16),
  'prop-sign': image('prop-sign.png'),
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

/** The name of the picture that terrain of this kind is drawn with. */
export function terrainArt(kind: string): string {
  return `terrain-${kind}`;
}

/** The name of the picture that monsters of this type are drawn with. */
export function monsterArt(type: string): string {
  return `monster-${type}`;
}

/**
 * The ids of the Adventure Areas whose terrain and monsters have their final art. Tickets that draw a new area add its id
 * here once its kinds and types have their pictures; until then it is drawn in colours, and the game still starts.
 */
export const FINAL_ART_AREAS: readonly string[] = ['shipwreck-coast', 'woods'];

/** Whether the terrain and the monsters of the area with this id are drawn with their final art, and not in colours. */
export function hasFinalArt(areaId: string): boolean {
  return FINAL_ART_AREAS.includes(areaId);
}

/**
 * The names of the pictures the content needs, each once: an icon for each Gear and for each consumable, and the picture
 * of every kind of terrain laid out in, and every type of monster placed in, the areas whose art is final. Throws if one
 * of those areas is not in the content.
 */
export function neededArt(content: ContentDefinition, finalAreas: readonly string[] = FINAL_ART_AREAS): string[] {
  const names = [...Object.keys(content.gear).map(gearIcon), ...CONSUMABLE_IDS.map(consumableIcon)];
  for (const id of finalAreas) {
    const area = content.areas.find((candidate) => candidate.id === id);
    if (!area) throw new Error(`The art of the area "${id}" is final, but the content has no such area`);
    for (const row of area.layout) {
      for (const symbol of row) {
        const terrain = content.terrain[symbol];
        if (terrain) names.push(terrainArt(terrain.kind));
      }
    }
    names.push(...area.monsters.map((monster) => monsterArt(monster.type)));
  }
  return [...new Set(names)];
}
