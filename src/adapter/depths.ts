// What draws above what in the world, from the ground up. The Graphics layers of the ground, the telegraphs and the
// chests share the lowest depth, in the order they are added, with the monsters of an area whose art is not final.
// The HUD, the text, the notice and the overlay set their own, higher depths.
export const DEPTH = {
  /** The monsters, over the chests and the flat shapes of the ground; their Health bars over them; the hero is above. */
  monster: 5,
  monsterBar: 6,
  /** What a monster shoots, over the monsters and under the hero's arrows. */
  monsterShot: 8,
  /** The puff left where a monster fell. */
  puff: 9,
  arrow: 10,
  /** The bow held out facing up is behind the hero, so the hero's head covers its middle; any other weapon is in front. */
  heroWeaponBehind: 19,
  hero: 20,
  heroWeapon: 21,
  slash: 25,
  /** The strikes of the monsters, over everything of the world. */
  effects: 30,
  /** The title screen, a scene of its own: nothing of the world shares its display list, so this orders only its parts. */
  title: 300,
} as const;
