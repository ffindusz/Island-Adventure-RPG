// What draws above what in the world, from the ground up. The Graphics layers of the ground, the telegraphs, the chests
// and the monsters share the lowest depth, in the order they are added. The HUD, the text, the notice and the overlay
// set their own, higher depths.
export const DEPTH = {
  arrow: 10,
  /** The bow held out facing up is behind the hero, so the hero's head covers its middle; any other weapon is in front. */
  heroWeaponBehind: 19,
  hero: 20,
  heroWeapon: 21,
  slash: 25,
  /** The strikes of the monsters, over everything of the world. */
  effects: 30,
} as const;
