# Island Adventure RPG

The language of a short, single-hero adventure across a remote island, from a shipwrecked coast to a castle harbor and a way home.

## Language

### The hero and its growth

**Hero**:
The shipwrecked castaway whom the player, the person at the keyboard, controls. There is only one, and it cannot be customized.
_Avoid_: character

**Experience (XP)**:
Progress earned from defeating monsters and reaching milestones; enough Experience raises the hero's Level.

**Level**:
A measure of the hero's growth that grants a Stat Point.

**Stat**:
One of the hero's three numbers: Health, Attack and Defense.

**Stat Point**:
A point that the hero earns with each Level and assigns to Health, Attack or Defense in the level-up choice.

**Health**:
The hero's maximum ability to withstand damage, a Stat.

**Current Health**:
How much of its Health the hero has left right now, never more than its Health. Damage lowers it and Healing Potions raise it.

**Attack**:
The hero's damage-dealing strength, a Stat; not the act of attacking.

**Defense**:
The hero's ability to reduce incoming damage, a Stat.

**Defeat**:
The moment a creature has no health left. A defeated monster gives Experience and may leave a drop; a defeated hero goes back to the latest Checkpoint at full Health, and there is no game over.

### Fighting

**Monster**:
A hostile creature that the hero meets in an Adventure Area and can defeat; the Guardian is one.
_Avoid_: enemy

**Guardian**:
The undead defender whose defeat grants access to the castle's forgotten harbor. There is exactly one.

**Telegraph**:
The visible wind-up that warns the hero of a monster's attack before it lands, so that the hero can avoid it by moving. There is no block or dodge.

### Gear and supplies

**Gear**:
Weapons and armor the hero equips: weapons raise Attack and armor raises Defense. One Melee Weapon, one Ranged Weapon and one set of armor are equipped at a time.

**Melee Weapon**:
A close-range weapon, such as the hero's sword.

**Ranged Weapon**:
A weapon that attacks from a distance, such as the hero's bow.

**Active weapon**:
The equipped Melee Weapon or Ranged Weapon that the hero attacks with right now; the hero switches between them on the fly.
_Avoid_: weapon in hand

**Consumable**:
A supply that the hero carries as a count and uses up: Ammunition and Healing Potions. Gear and keys are not consumables.

**Ammunition**:
The one kind of consumable that a Ranged Weapon spends, one for each shot.

**Healing Potion**:
A consumable that restores the hero's Current Health, never above its Health.

**Inventory**:
Everything the hero carries: its Gear, equipped or not, its consumables and its keys. It has no size limit.

**Chest**:
A container that the hero opens to take what is inside, which is a piece of Gear or an amount of a consumable.

**Ammunition cache**:
A chest that holds Ammunition.

**Pickup**:
A consumable lying on the ground, which the hero takes by walking onto it.

**Drop**:
A consumable that a defeated monster may leave behind, which the hero takes at once.

**Key**:
An item that the hero finds and carries to the one locked door it opens, which keeps it. A key is never a consumable and never a keyboard key.

**Puzzle**:
A light, mostly optional challenge made of a key and its door, or of a lever and the gates it moves, which a sign may give a clue to. The main route never needs one.
_Avoid_: obstacle

### The island

**Adventure Area**:
One distinct part of the island that the hero explores, such as the shipwreck coast, the woods, the mountain, the cave or the old castle.
_Avoid_: level, location

**Main route**:
The fixed order in which the hero passes through the Adventure Areas, from the shipwreck coast to the old castle. The hero may go back along it until Departure.

**Side path**:
An optional branch of an Adventure Area that holds extra Gear, Ammunition or Experience.

**Exit**:
Marked ground that leads from one Adventure Area into the one beside it on the main route; the hero is taken across when it walks onto it.

**Entrance**:
The place where the hero arrives in an Adventure Area when it comes through an exit from the one beside it.

**Milestone**:
A place in an Adventure Area that rewards the hero with Experience the first time it reaches it, once in the whole game.

**Area text**:
The short text that shows at the top of the screen the first time the hero enters an Adventure Area, and never again; a sign shows its clue the same way.
_Avoid_: description, banner

**Corner slide**:
The small sideways nudge that carries the hero past the corner of a one-tile-wide passage when it walks into the passage a little off its middle.

**Automap**:
A map of the island route that records terrain as the hero explores it and shows where the hero is.

**Vessel**:
The old craft waiting in the forgotten harbor to carry the hero home, not the ship that the storm wrecked on the coast.
_Avoid_: ship, boat

**Departure**:
The hero's sailing home on the Vessel, which ends the game. It is the one point of no return, so the game asks first.

### Checkpoints and saving

**Checkpoint**:
A safe place that the hero activates by touching it. It records where Defeat takes the hero back to and what Ammunition and Healing Potions it carries then, and it autosaves; it gives no Health back.

**Saved game**:
The one record of the adventure that the game keeps in the browser. The game writes it by itself (autosave) at each Checkpoint and at a few other fixed moments, such as an Adventure Area change, and Continue restores it; there is no manual saving.

### Pages and screens

**Page**:
A view laid over the game, one at a time, that the player opens with its own key and closes with that key or Esc: the stat page, the inventory page, the Automap and the Controls page.

**Level-up choice**:
The choice that waits when the hero gains a Level: which Stat receives the new Stat Point. Unlike a page it cannot be closed, and the game is paused until it is made.

**Controls page**:
The list of every keyboard key the game answers to, with what each does. In play it is a page that H opens; the title screen shows the same list from its Controls entry.

**Controls entry**:
The choice on the title screen's menu that shows the list of the Controls page.
_Avoid_: Controls line

**Controls line**:
The short line, H FOR CONTROLS, that shows at the top of the screen for a few seconds when play begins and tells the player which key opens the Controls page.
_Avoid_: Controls entry

**Title screen**:
The screen the game opens on and returns to after the ending, where the player chooses New Game, Continue or Controls.
_Avoid_: start screen

**Pause**:
The game standing still: nothing moves and no time runs. The game is paused behind an open page, while a level-up choice or the question whether to sail home waits, on the paused screen, and while the browser window is out of focus.

**Paused screen**:
The title screen as Esc brings it up during play, marked PAUSED with Resume on top. Resume, or Esc again, returns to the game exactly where it stood.
_Avoid_: pause screen
