import { startAdapter } from './adapter';
import { gameContent } from './content';
import { createGame } from './core';

// The composition root: the only file that knows the Game core, the content and the adapter together.
const core = createGame({ content: gameContent, random: Math.random });

// Opening the page with ?debug exposes the running Game core as window.gameCore, so the smoke tool's --eval can read
// gameCore.view(). It is a handle for checking the build, not something the game itself uses.
if (new URLSearchParams(window.location.search).has('debug')) {
  Object.assign(window, { gameCore: core });
}

/** The browser's localStorage, which holds the saved game, or null when the browser blocks it: even asking can throw. */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// The game opens on the title screen: it is the player who starts the adventure there, or continues the saved one.
startAdapter(core, gameContent, browserStorage());
