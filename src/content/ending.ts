/**
 * What the game ends with, one string for each line: the card that the hero sails home to (the core takes at most 4
 * lines, none blank) and the credits that follow it (as many lines as are needed, none blank). The game wraps each line
 * to fit the screen, and breaks a link at a slash, a hyphen or a dot.
 *
 * The pixel font draws letters (as capitals), digits, spaces and . , ! ? ' - + / : ( ) % = and nothing else: a
 * quotation mark, an ampersand, a semicolon or an accent in a line would not be drawn. tests/the-credits.test.ts looks at
 * every line, and the game refuses to start with one that the font cannot draw (`requireDrawableEnding` in
 * src/adapter/ending-pages.ts).
 */
export const ending: readonly string[] = [
  'The storm is long gone, and the sea is calm.',
  'The old vessel carries you from the island.',
  'You sail home with sword and armor.',
  'You have quite a story to tell.',
];

/**
 * The title, the tools the game is made with, the credits text of each asset of docs/assets/licences.md that is in use
 * (tests/the-credits.test.ts reads the record, and asks for the text of every entry that says it is in use), and thanks.
 * No person is named: a line for the author goes after the title, when there is a name to give.
 */
export const credits: readonly string[] = [
  'ISLAND ADVENTURE',
  'Made with Phaser, TypeScript and Vite.',
  'Ninja Adventure Asset Pack by Pixel-Boy and AAA (CC0), https://pixel-boy.itch.io/ninja-adventure-asset-pack',
  'Thank you for playing!',
];
