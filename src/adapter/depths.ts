// What draws above what, from the ground up. The ground is at the lowest depth. The marks of the way out are painted on
// it, and the props (chests, Checkpoints, what lies on the ground, doors, signs) stand on it. The telegraphs of the
// monsters' attacks come over those, so that nothing hides one, then the flat shapes of what has no picture yet (the
// monsters of an area whose art is not final, the gates, the levers), then the monsters of final art. Over the world
// come the parts of the play screen that are fixed to the screen, each over the one before: the HUD, the text of an
// area, the line that says H FOR CONTROLS, the notice, the pages of the overlay and the card of the opening. The title
// and the ending are scenes of their own, and the audio line, whose keys work on every screen, is over all of them.
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
  /** The HUD, over everything of the world. */
  hud: 100,
  /** The text of an Adventure Area, over the HUD and under the notice. */
  areaBanner: 120,
  /** The line that says H FOR CONTROLS when play begins: over the HUD and the text of an area, under the notice and every page. */
  controlsLine: 130,
  /** The notice of what the hero found or touched, over the HUD and the banner and under every page. */
  notice: 150,
  /**
   * The level-up choice, the open page (the Automap's too: the overlay draws nothing while it is open), the question
   * whether to sail home and the pause: over the notice, so that a page that opens covers it.
   */
  overlay: 200,
  /** The card of the opening, over the pages: the whole play screen is under it. */
  openingCard: 250,
  /** The title screen, a scene of its own: nothing of the world shares its display list, so this orders only its parts. */
  title: 300,
  /** The ending and the credits, a scene of its own as the title is. */
  ending: 300,
  /** The picture behind the title screen, and behind the ending and the credits: under their windows, text and logo. */
  backdrop: 290,
  /** The line that says what a key of the audio did: the keys work on every screen, so it is over everything on each. */
  audioLine: 400,
} as const;
