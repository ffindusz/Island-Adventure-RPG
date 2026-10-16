import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { startAdapter } from './adapter';
import { gameContent } from './content';
import { createGame } from './core';

// The composition root: the only file that knows the Game core, the content and the adapter together, and the only one
// that knows whether the game runs in the desktop app (ADR 0006).
const core = createGame({ content: gameContent, random: Math.random });

// Opening the page with ?debug exposes the running Game core as window.gameCore, so the smoke tool's --eval can read
// gameCore.view(). It is a handle for checking the build, not something the game itself uses.
const debug = new URLSearchParams(window.location.search).has('debug');
if (debug) {
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

/**
 * How the game closes itself: in the desktop app, by closing its window, which ends the app; in a browser, not at all,
 * since a page cannot close a tab it did not open, and the title then has no Quit.
 */
function quitApp(): (() => void) | null {
  if (!isTauri()) {
    return null;
  }
  return () => {
    getCurrentWindow()
      .close()
      .catch((error: unknown) => console.error('The window could not be closed:', error));
  };
}

// The game opens on the title screen: it is the player who starts the adventure there, or continues the saved one.
const game = startAdapter(core, gameContent, browserStorage(), quitApp());

// Under ?debug the running Phaser game is exposed too, as window.gamePhaser, for --eval to read what sounds are playing
// (gamePhaser.sound.getAllPlaying()), whether the sound is muted, its volume and whether the browser keeps it locked.
if (debug) {
  Object.assign(window, { gamePhaser: game });
}
