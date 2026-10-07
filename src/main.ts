import { startAdapter } from './adapter';
import { gameContent } from './content';
import { createGame } from './core';

// The composition root: the only file that knows the Game core, the content and the adapter together.
const core = createGame({ content: gameContent, random: Math.random });

// There is no title screen yet, so the game starts straight into play.
core.send({ type: 'new-game' });

// Opening the page with ?debug exposes the running Game core as window.gameCore, so the smoke tool's --eval can read
// gameCore.view(). It is a handle for checking the build, not something the game itself uses.
if (new URLSearchParams(window.location.search).has('debug')) {
  Object.assign(window, { gameCore: core });
}

startAdapter(core, gameContent);
