# 21: Audio

**What to build:** The game gets light adventure music and essential sound effects. Music plays on the title screen, in each of the five Adventure Areas, during the Guardian fight, and at the ending. Sound effects confirm the hero's actions and the important moments. Mute and volume controls are available on the title screen and during play, and the player's choice persists in the browser. There is no voice acting.

**Blocked by:** 20: The forgotten harbor and the ending

**Status:** resolved

**Spec stories:** 45, 97, 98

- [x] Music exists for the title screen, each Adventure Area (coast, woods, mountain, cave, old castle), the Guardian fight, and the ending. It changes when the hero changes area, when the Guardian fight begins, and when the ending starts.
- [x] Essential sound effects exist for sword and bow attacks, a hit landing (on a monster and on the hero), a monster being defeated, any pickup, opening and closing a page and confirming a menu choice, a level-up, a Checkpoint activating, and the hero being defeated.
- [x] Audio is driven by the Game core's events, and the core knows nothing about sound. Any event audio needs that the core does not yet emit (for example area change, Guardian engaged, ending reached) is added. Tests at the Game core's interface confirm each such event is emitted once, in the right situation.
- [x] Mute and volume are available on the title screen and during play, using a control that does not collide with the existing keys. The choice persists in the browser separately from the saved game, so New Game and a bad save never reset it. An unreadable stored setting falls back to the defaults (tested at the settings store's boundary).
- [x] Music starts only after the player's first input, so the browser's autoplay policy never blocks it or raises errors, and sound works normally afterward.
- [x] Every audio asset has an entry in the asset licence record (created by whichever of tickets 02 and 21 lands first) with a licence that allows public and commercial use, and each required attribution appears in the credits screen content.
- [x] There is no voice acting.
- [x] Reviewer play check (manual, in a browser): play from the title screen to the ending with sound on and confirm the music changes per area and for the Guardian, each sound effect fires, mute and volume work, and the settings survive a page reload.

## Comments

Resolved on integration/island-adventure-rpg at 17eed74

Implemented on `ticket/21-audio`, from `integration/island-adventure-rpg` at f70cddf ("Resolve ticket 20"). The Status line is as it was.

Criteria 1 to 7 are ticked on what the sound manager held and was asked to play in a real browser (the keys of the sounds playing, the effects started, `mute`, `volume` and `locked`, read from the page) and on the tests named below. **Nobody has listened to any of it**: I cannot hear. The music and the effects were chosen by name, length and measured loudness, and every volume is a guess. Criterion 8, the play check, is left unticked.

### What was built

- **Four new events in the core, and nothing else** (`interface.ts`, `pages.ts`, `progression.ts`, `behaviors.ts`, `game.ts`). `page-opened` and `page-closed` (each with the page) are told exactly when a page opens or closes, and `stat-point-assigned` (with the stat) when a Stat Point is spent. `guardian-engaged` (with the monster's id) is told in the step in which an undefeated Guardian goes from `idle` to any other action: `stepMonsters` works it out from the actions before and after the monsters act, so nothing new is saved and `SNAPSHOT_VERSION` stays 4. A command that changes nothing tells nothing. The doc comments say nothing of sound, and no file of `src/core` or `src/content` has the word. `area-changed` and `ending-reached` were already told once, in the right situation, by `area-connections.test.ts`, `ending.test.ts` and `ending-route.test.ts`, so I added no test for them.
- **The audio manifest** (`src/adapter/audio-manifest.ts`, pure, no Phaser). `AUDIO` names the 24 sounds by the keys of Phaser's audio cache (`music-title`, `music-area-<area id>`, `music-fight`, `music-ending`, `sfx-<effect>`), each with its file and base volume. `trackFor(place)` says which track a place wants. `sfxFor(event)` is one exhaustive switch over every event of the core with a `never` check, so an event added to the core cannot be forgotten: each is a sound or a deliberate `null`. `effectsFor`, `effectsOfFrame` and `fightAfter` are the small pure rules the service uses. `neededAudio(content)` goes through `requireArt` in `startAdapter` beside the art check, so an area added without music stops the game at start-up, naming itself, instead of playing silence.
- **The service** (`src/adapter/audio.ts`, `GameAudio`; not `Audio`, which is the browser's own constructor). Made in `startAdapter` and handed to the title, play and ending scenes by their constructors, as `saves` is. It holds the sound manager's mute and volume, the one music instance and the gate before the first input. Every scene queues the manifest in `preload` (a key already in the cache is skipped, so the title loads the 24 files and the others find them) and calls `requireLoaded` in `create`, which names any sound that this browser can play and that did not load: a missing or undecodable file is never silence.
- **The settings** (`src/adapter/audio-settings.ts`, pure): `{ muted, volume }`, the volume in ten whole steps, kept under `island-adventure-rpg:audio-settings`. `parseAudioSettings`, `raiseVolume`, `lowerVolume`, `toggleMute`, `changeSettings` and `createAudioSettingsStore(storage)`, which takes the storage as `save-store.ts` does.
- **The keys and the line** (`player-input.ts`, `audio-line.ts`, `title-scene.ts`, `play-scene.ts`, `ending-scene.ts`). N, - and + (the keypad's too), polled every frame in every scene. `AudioLine`, at the top right and above the pages and the cards, says SOUND OFF, SOUND ON or VOLUME n/10 for a second and a half. The title lists the keys in two hint rows.
- **The pack and the record.** 24 files copied unchanged from the pack into `public/audio/` (8 `.ogg`, 16 `.wav`, 13.2 MB), each named in the new "Used so far (ticket 21, audio)" list of entry A1 in `docs/assets/licences.md`, with the summary row, the "Last updated" paragraph and "Audio in the pack" brought up to date.
- **Tests**: 3 new files, 165 tests (`audio-events` 27, `audio-settings` 59, `shipped-audio` 79), and rows changed in two earlier files (see Forced changes).
- **README**: a section, Audio, and phrase-level edits where it speaks of the controls, the waits, the layout, the saves, the tests and `?debug`.
- **Commits**: `96d7dbd` (page events), `ca62ffd` (the stat-point event), `198152f` (`guardian-engaged`, with the forced test rows), `a44f07c` (the settings store), `23c6326` (the pack, the manifest and the on-disk test), `c0f34b1` (`changeSettings`), `c4692d5` (service, keys, line and scenes), `7b926b0` (README and record), `4a030d5` (a comment).

### Decisions and defaults

- **A cut, not a fade** (the brief left the choice). A new track begins as the old one is removed. A fade would have to run on frame time from every scene's `update`, and a cut cannot leave two tracks sounding. If the play check finds the changes abrupt, a fade is a change inside `GameAudio` only.
- **Music is a state, effects are events.** Each frame the scene says which place it is in (`trackFor`: the title; an area, with the fight on or off; the ending), and the service changes track only when the wanted one differs. That keeps the music right after Continue, after a fall into another area and under the debug placement, without handling `area-changed`. Effects come from the events of the frame, next to `feedback.show`: each distinct effect plays once per frame (a strike that hits three monsters is one sound, and the Guardian's defeat, which levels the hero up twice in one step, is one fanfare). They are dropped while the sound is locked and never kept for later.
- **One music instance, and no key that is not in the cache.** The old track is removed, then the new one is added looping and played. A key that is not in the cache is never added or played, since Phaser throws for it. `requireLoaded` (in every scene's `create`) throws, naming them, when a sound that this browser can play did not load.
- **Nothing before the first input.** The service takes the wanted track at once but starts it only after the first key press, click or touch (a capturing listener on the window) and once `sound.locked` is false. `playMusic` runs every frame, so the track that is wanted at the moment of the unlock is the one that starts, and no listener of Phaser's `UNLOCKED` event is needed. The first-input listener matters: a browser that lets the page play from the start gives a context that is already running, and the music would otherwise begin before any input. The title's music begins at the first key, Enter included. `pauseOnBlur` is at its default.
- **The fight.** `PlayScene.fight` is set by `guardian-engaged`, cleared by `guardian-defeated`, `hero-defeated`, `area-changed` and `ending-reached` (the pure `fightAfter`), and reset in `init`, since the fields of a scene survive into the next session. **When the Guardian falls, the castle's own track returns**: there is no victory music, only `sfx-victory` once.
- **A second `guardian-engaged` is told.** A Guardian that has lost the hero goes back to idle and notices it again, and the core tells it again. The fight is on already, so the music is the same, and the event has no effect of its own (a deliberate `null`: the fight's track is its cue), so nothing sounds a second time. Pinned by a test. A fresh Guardian (put back at a defeat of the hero, or when the hero leaves its area and returns) engages again, also pinned. A Guardian that was already fighting when the game was saved tells nothing after Continue (it told already, pinned too), so the castle's track plays until the Guardian goes idle and notices the hero again (see Assumptions).
- **The card of the opening and a fall.** The coast's track starts with the card of a New Game (`holdForOpening` syncs the music). During a fall (`showFall`) the music is not synced: the track that was playing runs until the fall ends, then the track of the place the hero fell back into comes in (the smoke checks that it comes between 0.8 and 3 seconds after the defeat). The frame of the defeat plays `sfx-hero-defeated` and clears the fight.
- **A killing blow plays the hit and the defeat together**, for a monster (`sfx-monster-hit` and `sfx-monster-defeated`) and for the hero (`sfx-hero-hit` and `sfx-hero-defeated`): two events of one frame, each heard (the brief left it to me).
- **Silent on purpose** (a `null` in `sfxFor`): `opening`, `guardian-engaged`, `monster-attacked` and `monster-fired` (the strike or shot is heard when it lands, as `hero-hit`), `experience-gained`, `milestone-reached`, `area-changed`, `area-text`, `chest-opened` (its pickup follows), `door-opened`, `lever-toggled` and `sign-read`. The pack has no obvious sound for a door, a lever, a chest or a sign, and no other source may be used.
- **The question of sailing home has no event in the core.** `effectsOfFrame` hears the view's `departure` going from null to a value as `page-open`, and back as `page-close`. Answering yes plays only `confirm`, from `ending-reached`. At the title, New Game, Continue and the replace-the-save answer play `confirm`, and the replace-the-save question plays `page-open` when it opens and `page-close` when it is declined.
- **Settings defaults** (no spec default; flagged for the user): a first visit is not muted at volume 6 of 10. A stored text that is not a JSON object gives both defaults, and an object gives each field that is fit and the default for the other. A volume that is a number is rounded to a whole step and **clamped** to 0 to 10 (25 gives 10, -3 gives 0); NaN, infinity and a non-number give the default volume. A `muted` that is not a boolean gives the default. Extra fields are ignored. Raising or lowering the volume unmutes, since the player would not hear the change otherwise. **Unmuting with N at volume 0 gives volume 6**, since it would still be silent. Mute keeps the music running silently, so unmuting resumes in place. Nothing is written until a key of the sound is pressed.
- **The settings are apart from the save, both ways.** The store never touches `SAVE_KEY`, no code of the save reads or writes the settings, and a test with one storage that holds both pins it. The store never throws: with no storage (blocked) it gives the defaults and `write` says false, and the keys still work for as long as the page is open.
- **Keys** (the brief's suggestion, kept): N toggles mute, - and + (`MINUS`, `PLUS` and the keypad's subtract and add) lower and raise the volume. None is captured. Ctrl and Meta turn them off, so the browser's zoom keys keep working. A held key acts once (`pressedAgain`). `checkAudioKeys` runs at start-up and throws, naming the key, when an audio key is also bound to anything else (proved by binding the weapon switch to N). Every scene polls them each frame: the card of the opening, a fall, an open page, the Stat Point wait, the question of sailing home and the ending included.
- **Names.** The class is `GameAudio`, not `Audio`. The fight's key is `music-fight`, not the brief's suggested `music-guardian`, after the term proposed below.
- **`window.gamePhaser`.** `main.ts` exposes the running Phaser game beside `gameCore` under the same `?debug` guard, so it is there in the production build when the URL asks for it, as `gameCore` is. It is the only change for the smoke: no hook in `src` changes production behaviour.

### The music

| Where | Name in the manifest | File in the pack (`Audio\Musics\`) | Shipped as (`public/audio/music/`) | Base volume | Size |
|---|---|---|---|---|---|
| Title screen | `music-title` | `38 - Intro.ogg` | `intro.ogg` | 0.95 | 1,910,352 B |
| Coast (`shipwreck-coast`) | `music-area-shipwreck-coast` | `39 - Boat.ogg` | `boat.ogg` | 1 | 2,333,552 B |
| Woods (`woods`) | `music-area-woods` | `5 - Peaceful.ogg` | `peaceful.ogg` | 0.43 | 1,198,029 B |
| Mountain (`mountain`) | `music-area-mountain` | `19 - Ascension.ogg` | `ascension.ogg` | 1 | 1,063,257 B |
| Cave (`cave`) | `music-area-cave` | `2 - The Cave.ogg` | `the-cave.ogg` | 0.41 | 893,933 B |
| Old castle (`castle`) | `music-area-castle` | `10 - Dark Castle.ogg` | `dark-castle.ogg` | 0.53 | 676,245 B |
| The fight with the Guardian | `music-fight` | `34  - Fight.ogg` (two spaces after the 34) | `fight.ogg` | 0.54 | 3,066,690 B |
| The ending and the credits | `music-ending` | `8 - End Theme.ogg` | `end-theme.ogg` | 0.35 | 780,327 B |

The tracks are the brief's suggested defaults, picked by name, length and measured level (`measure-music.mjs`, outside git, decodes each track and reports its length and its average level). The base volume brings each track's average level to about -24 dBFS, no louder than 1, since the tracks of the pack differ by as much as 15 dB. `11 - Clearing` was passed over because it ends in about 1.5 seconds of silence, a gap in a loop. Other candidates by name only, not measured: `1 - Adventure Begin` (title), `18 - Aquatic` or `31 - Sunny` (coast), `35 - Adventure` (mountain), `21 - Dungeon` (cave), `32 - Manor` or `40 - Crypt` (castle), `17 - Fight` or `24 - Final Area` (the fight), `25 - End Theme 2` (ending). A swapped track needs a new volume guess.

### The effects

| Effect | Heard for | File in the pack (`Audio\Sounds\`) | Shipped as (`public/audio/sfx/`) | Base volume | Size |
|---|---|---|---|---|---|
| `sfx-sword` | `hero-attacked` | `Whoosh & Slash\Slash.wav` | `slash.wav` | 0.7 | 59,344 B |
| `sfx-bow` | `hero-shot` | `Whoosh & Slash\Whoosh2.wav` | `whoosh2.wav` | 0.7 | 78,332 B |
| `sfx-monster-hit` | `monster-hit` | `Hit & Impact\Hit1.wav` | `hit1.wav` | 0.8 | 60,200 B |
| `sfx-hero-hit` | `hero-hit` | `Hit & Impact\Hit2.wav` | `hit2.wav` | 1 | 123,100 B |
| `sfx-monster-defeated` | `monster-defeated` | `Hit & Impact\Impact5.wav` | `impact5.wav` | 0.9 | 85,928 B |
| `sfx-pickup` | `pickup` | `Bonus\Coin.wav` | `coin.wav` | 0.7 | 51,508 B |
| `sfx-level-up` | `level-up` | `Bonus\PowerUp1.wav` | `powerup1.wav` | 1 | 83,304 B |
| `sfx-chime` | `checkpoint-activated`, `vessel-prepared` | `Magic & Skill\Magic1.wav` | `magic1.wav` | 0.9 | 70,608 B |
| `sfx-hero-defeated` | `hero-defeated` | `Alert\Alert.wav` | `alert.wav` | 1 | 87,296 B |
| `sfx-page-open` | `page-opened`; the question of sailing home opening; the title's replace-the-save question opening | `Menu\Menu5.wav` | `menu5.wav` | 0.6 | 48,432 B |
| `sfx-page-close` | `page-closed`; those two questions put away | `Menu\Menu6.wav` | `menu6.wav` | 0.6 | 45,644 B |
| `sfx-confirm` | `gear-equipped`, `stat-point-assigned`, `ending-reached`; the title's New Game, Continue and replace-the-save answer | `Menu\Accept3.wav` | `accept3.wav` | 0.8 | 69,968 B |
| `sfx-heal` | `healing-potion-used` | `Magic & Skill\Heal.wav` | `heal.wav` | 0.8 | 54,816 B |
| `sfx-refusal` | `door-locked`, `out-of-ammunition` | `Menu\Cancel2.wav` | `cancel2.wav` | 0.7 | 54,900 B |
| `sfx-switch` | `weapon-switched` | `Menu\Move3.wav` | `move3.wav` | 0.6 | 33,804 B |
| `sfx-victory` | `guardian-defeated` | `Bonus\Bonus.wav` | `bonus.wav` | 1 | 264,804 B |

The effects of the pack are all normalised to the same peak, so their volumes are only weights: the ones heard all the time are softer than the rare ones. `Launch` was too quiet for the bow, so it is `Whoosh2`. **Total shipped: 11,922,385 B of music and 1,271,988 B of effects, 13,194,373 B in 24 files (13.2 MB, 12.6 MiB), under the brief's 15 MB flag.** All 24 are loaded before the title shows.

### Assumptions

- **OGG only, no MP3 fallback** (there is no converter here). A browser that cannot play OGG, such as an older Safari, gets one console warning ("This browser cannot play the game's music (ogg), so the game runs without them.") and plays on without music. The effects are WAV, which every browser plays. Driven in the smoke by a browser that says it cannot play OGG.
- **- and + are the keys Phaser calls `MINUS` and `PLUS`, and the keypad's.** The main row's - and = of Firefox, and keyboards with those keys elsewhere, are not mapped: N and the keypad work everywhere.
- **The title waits for all 24 files** (13.2 MB) with no loading bar: on a slow link it appears late.
- **An effect asked for while the sound is locked is dropped**, so the very first Enter on a title that is still locked may lose its confirm sound.
- **The base volumes are guesses**, and so are the choices of tracks and effects. Ticket 26's playtest checklist is to ask the user to check them.
- **The loop seams and the tracks' own endings were not heard.** Phaser 4.2.1 loops a track without a gap by starting a second source of the same buffer one length later, so a looping track shows two `AudioBufferSourceNode.start()` calls and an effect shows one. That is the gapless loop, not a double play: anyone counting calls should expect it.
- **One master volume and one mute** (separate volumes for music and effects are out of scope).
- **The fight's music has two gaps**, both from the brief's clearing events. The fight lasts until the Guardian or the hero falls, the hero changes area or the game ends, so a hero that backs out of the arena inside the castle, with the Guardian gone idle again, still hears the fight's track. And a Continue into a saved fight that is already on gives the castle's track (above).
- **`checkpoint-activated` is told each time the hero comes onto a Checkpoint**, even one that is active already (the core's rule: standing on it does nothing more, coming onto it does), so the chime sounds each time.
- **The headless browser starts the audio context suspended** (the brief expected it running). The real lock path was therefore driven by default, and a context that is running from the start was driven by the browser's `--autoplay-policy=no-user-gesture-required`.
- Seen in the smoke, not mine and not touched: the autosave at the Guardian's defeat is taken before the Stat Points are assigned, so Continue asks for them again.

### How to run it

- `npm.cmd run dev`, then open the URL with `?debug` and press any key on the title (the first input unlocks the sound and starts the title's music). In the console, `gamePhaser.sound.getAllPlaying().map((s) => s.key)` is what plays, and `gamePhaser.sound.mute`, `.volume` and `.locked` are its state. Press N, - and + and watch the line; reload, and the settings are as they were (`localStorage.getItem('island-adventure-rpg:audio-settings')`). Walk east through the areas for their music. For the fight and the ending, set the scene up as the README's "The Guardian" and "The harbor and the ending" recipes say (a `gameCore.snapshot()` with the hero placed, then `send({ type: 'continue', snapshot })`).
- `npx.cmd vitest run tests/audio-events.test.ts tests/audio-settings.test.ts tests/shipped-audio.test.ts` runs the three new files. `npm.cmd run check` is the gate.
- To swap a sound: copy the new file from the pack unchanged into `public/audio/music/` or `public/audio/sfx/`, change its entry in `AUDIO` (the file and, if it needs one, the volume), and change the record in the same commit. `shipped-audio.test.ts` is red until the three agree.
- The smoke scripts are in `.worktrees/_notes/t21-work/` (outside git): `lib21.mjs` and `s1-gate.mjs` to `s8-nodebug.mjs`. They take `SMOKE_SITE` for the URL.

### How it was verified

- `npm.cmd run check` at `4a030d5`, the last code commit: both typechecks exit 0, **2387 of 2387 tests in 100 files** (2222 in 97 before this branch), build OK. The banned-API grep over `src/core` and `src/content` has one match, the doc comment at `interface.ts:14`.
- Built in slices, each committed when green (the commits above). The core events and the settings were built test-first against small fixtures and the shipped castle. `shipped-audio.test.ts` came in the same commit as the pack it describes, so it is a characterization test. The Phaser side (the service, the scenes, the keys and the line) has no unit test, as the brief says, and was built against the smoke scripts.
- **Mutation checks**, each shown red for the intended reason and restored. Core events: emitting `page-opened` twice, `page-closed` for a page that is not open, `stat-point-assigned` with none waiting, and `guardian-engaged` at every step gave 17 of the 27 tests of `audio-events` red. Settings: 7 mutants (a `JSON.parse` with no catch, a `setItem` under the save's key, a dropped clamp, unmuting at 0 staying 0, raising that does not unmute, a `getItem` that throws uncaught, `Boolean(muted)`) gave 23 of the 59 tests of `audio-settings` red. The files of `shipped-audio`: files renamed, an extra `voice-x.wav` and an ogg copied over `heal.wav` gave 6 red, and mutations of the record gave 5. The five forced rows below were each proved too. Phaser cannot be imported in Node, so the adapter was proved in the browser: about fourteen mutations of it, in two rounds (among them the unlock, the first input, the track change, the settings and blocked storage), each turned the smoke red and was restored; I did not keep a list of them one by one. The clash check was proved by binding `SWITCH_WEAPON_KEY` to N.
- **Smoke**, first on the dev server while building, then all of it again on the production build served by `vite preview` on port 5121: headless Edge at 960 by 720 through playwright-core (from the shared `_tools`), with an init script in the page, outside `src`, that logs what the sound manager is asked to play and what the core tells, and can lock the context, hide OGG or block the storage. Every script ended with no console error or warning, page error, failed request or HTTP 4xx and 5xx (`s6-noogg` expects one warning, checks it and sets it aside). `s1-gate` (6 modes: the context as Edge starts it, a lock and unlock simulated, a context running from the start, and a key or a click as the first input): nothing plays or throws before the first input, and the title's track starts at it. `s1b-slow` (10): a slow unlock. `s2-walk` (74): New Game, the coast's track during the card, and a real crossing of each exit in turn over all five areas, the track changing each time with exactly one music instance at all times. `s3-flow` (75): the arena gives the fight's track; a fall plays the defeat effect once and the castle's track comes back when it ends; the Guardian's defeat does the same without a fall; departing gives the ending's track and the ending's end gives the title's; a second voyage has no stale music, no second instance and the settings intact; the replace-the-save question. `s4-effects` (60): each essential effect fires once per event, with no doubles. `s5-settings` (127): N, - and + on the title, in play, with a page open and in the ending, each showing its line; a reload keeps them; a New Game and a garbage save (set by `localStorage.setItem`) leave them alone; garbage under the settings key gives the defaults at the next start. `s5b-blocked` (7): blocked storage gives the defaults and no error. `s6-noogg` (17): no OGG gives one warning, no music and working effects. `s7-clash` (2, and the clash mode throws at start-up naming the key). `s8-nodebug` (7): the production build without `?debug` exposes nothing on the window, requests the 24 files and gets 200 for each, starts no sound before the first input, and then plays the title's track, the confirm effect of New Game and the next track.
- All 24 audio URLs answer 200 under the build's relative base, each with the size of its file, a made-up one answers 404, and no 404 appears in the console.
- The screenshots (`.worktrees/_notes/t21-*.png`) were opened and looked at: the line over the title, the card, play, a page, the question of sailing home, the ending and the credits, with a damaged save and with blocked storage. The title's two hint rows fit inside its panel in the production build.
- Honest limits: what was read is the sound manager and the calls the game made, not the speakers. The Guardian was set up by the debug snapshot as the README's recipes do (at 1 Health for its defeat), and walking into the arena engaged it for real.

### Forced changes to earlier tests

- `tests/guardian-patterns.test.ts`, 4 rows: the step in which a Guardian first notices the hero expected `[]`, and now expects `[ENGAGED]` (a new constant at the top, `{ type: 'guardian-engaged', monsterId: 'guardian-1' }`). They are the sweep, the charge, the smite, and the Guardian that has noticed the hero but has no pattern that reaches it.
- `tests/guardian-gate.test.ts`, 1 row: the list of events of the arrow that kills the Guardian now begins with `guardian-engaged`, since the Guardian notices the hero in step 1, the first step of that test. A comment says so.
- Each of the five was proved by mutation: with `guardian-engaged` not told, each is red. No test expected `[]` from a page or stat command that now acts: `stat-points.test.ts` line 82 expects `[]` for an assign at the title, where there is no hero, and stays true. `the-credits.test.ts` stays green: A1's credits text is in the credits already, and CC0 needs nothing more.

### Left for manual review

- The reviewer play check (the last criterion, unticked): play from the title to the ending with sound on, and confirm the music changes per area and for the Guardian, each effect fires, mute and volume work, and the settings survive a reload.
- Everything that needs ears: whether each track suits its place, the base volumes of every track and effect against each other, the loop seams, how the tracks end, whether a cut between tracks is welcome or a fade is wanted, and whether the keys feel right.
- A real window in each browser: the autoplay policies of Chrome, Edge, Firefox and Safari (the lock was driven only in headless Edge), OGG in Safari, `-` and `+` on Firefox and on a non-US keyboard, and Ctrl and minus (the browser's zoom) leaving the volume alone.

### Suggestions for other tickets

- **Ticket 26 (balance and the last check)**: the playtest checklist should ask for the base volumes by ear, the loop seams, the persistence across a reload and the assumptions above. It should also widen the licence-record check to every asset, with `shipped-audio.test.ts` as the model (it checks the files, the manifest and the record against each other).
- **Ticket 25 (art)**: restyle the audio line (`audio-line.ts`) and the title's two hint rows with the final interface style. The line is a small dark panel at the top right, in the pixel font, at depth 400.
- **Later**: a loading bar, or music that loads after the title (the title waits for 13.2 MB today); a sound for moving in a menu (the pack has `Menu\Move*`); the fight derived from the view, or a core event for a Guardian that lost the hero, to close the two gaps of the fight's music; sounds for a door, a lever, a chest and a sign, which need a source other than A1, so the user must approve one first.

### Glossary proposals (`GLOSSARY.md` untouched)

- **Track**: one piece of the game's music. One track plays at a time, over and over, until another is wanted. Each place has one: the title, each Adventure Area, the fight, the ending.
- **Effect** (sound effect): a short sound played once for something that happened, such as a swing, a hit, a pickup, a page opening or a choice. It is not the on-screen feedback.
- **The fight**: the stretch of play from the moment the Guardian notices the hero until the Guardian or the hero falls, the hero comes into another area or the game ends. It has a track of its own.
- Optionally **audio settings**: the player's mute and volume, kept apart from the saved game.

### Proposed ADRs (none written)

1. The audio settings are kept apart from the saved game: a key of their own, never read or written by the save code, never reset by a New Game or a bad save.
2. The music is a state of the place (level-triggered, one track at a time) and the effects are events (edge-triggered, each once per frame), and `sfxFor` is an exhaustive switch over the core's events, so an event added later must be given a sound or a deliberate silence.

### Seam drift

- `tests/shipped-audio.test.ts` reads `public/audio/` and `docs/assets/licences.md` from disk, like `tests/final-art.test.ts`, and is outside the three exceptions of ADR 0002. It is flagged for the user's veto, and it is proved by mutation.
- `tests/audio-settings.test.ts` is the settings boundary, ADR 0002's exception 2 (like the parser of the saved game). `tests/audio-events.test.ts` is at the Game core's interface.
- ADR 0002 may deserve a line on what the suite may test beyond its three exceptions (ticket 20 proposed the same).

Made by the player on 2026-10-14 (recorded on integration/island-adventure-rpg at 4259c95): the player said that their playthroughs of the game covered this check, and that all their comments have already been fixed with other tickets. There is no step-by-step log. The box above was ticked on that word.
