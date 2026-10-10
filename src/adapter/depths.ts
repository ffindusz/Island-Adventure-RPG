// What draws above what in the world, from the ground up. The ground is at the lowest depth. The marks of the way out are
// painted on it, and the props (chests, Checkpoints, what lies on the ground, doors, signs) stand on it. The telegraphs of
// the monsters' attacks come over those, so that nothing hides one, then the flat shapes of what has no picture yet (the
// monsters of an area whose art is not final, the gates, the levers), then the monsters of final art. The HUD, the text,
// the notice and the overlay set their own, higher depths.
export const DEPTH = {
  /** The marks of the way out, painted on the ground. */
  exit: 1,
  /** Chests, Checkpoints, what lies on the ground, doors and signs. */
  prop: 2,
  /** Where a monster's attack is about to land: over the props, under every monster and the hero. */
  telegraph: 3,
  /** The flat shapes of what has no picture yet, so that a monster in colours walks over a pickup. */
  flatShapes: 4,
  /** The monsters of final art, over the flat shapes; their Health bars over them; the hero is above. */
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
  /** The picture of what the hero just picked up, rising over its head: over the strikes, under the HUD. */
  pickupRise: 35,
  /** The title screen, a scene of its own: nothing of the world shares its display list, so this orders only its parts. */
  title: 300,
  /** The ending and the credits, a scene of its own as the title is. */
  ending: 300,
  /** The picture behind the title screen, and behind the ending and the credits: under their windows, text and logo. */
  backdrop: 290,
} as const;
