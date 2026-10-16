# 0006. A Windows desktop build with Tauri, beside the browser build

Status: **Accepted** on 2026-10-14: the user chose Windows only and Tauri, so that the game can be handed to friends as a program.

## Decision

Ship the game also as a Windows desktop app, made with Tauri 2 (`src-tauri/`). The app is a window of the system's WebView2 that shows the build in `dist/`, embedded in the executable. It has no plugins and calls one Tauri API, to close its window (see the amendment below); nothing in `src/adapter` or `src/core` knows that it runs in it. `npm run desktop:build` makes two files: an NSIS installer, which is the one to hand out, and a portable executable. The browser build stays the primary target, and ADR 0001 still holds.

## Why

- The game is static files with no server part, and `base: './'` already lets it run from anywhere. The save is in `localStorage`, which WebView2 keeps in the app's data folder under `%LOCALAPPDATA%`, named by the identifier `io.github.ffindusz.islandadventure`.
- Tauri uses the WebView2 that every Windows 11 PC, and nearly every updated Windows 10 PC, already has, so the download is a few MB. Electron would ship its own Chromium at about 100 MB. The installer fetches WebView2 on the rare PC that lacks it (`downloadBootstrapper`).
- A zip with a launcher was rejected: the game can't load from `file://`, so friends would need a local server.
- Every shipped asset is CC0 (`docs/assets/licences.md`), so the game can be redistributed.

## Consequences

- Building the desktop app needs Rust (stable, at least 1.90 as `src-tauri/Cargo.toml` says) and the MSVC C++ build tools, besides Node. The browser build, the tests and `npm run check` don't.
- The executables are not signed. Windows SmartScreen warns on first run, and friends click "More info" and then "Run anyway". Signing would need a certificate and is out of scope.
- Only Windows is built. macOS and Linux would need their own machines or a CI workflow, and macOS would also need signing.
- The version of the app is the `version` of `package.json`.

## Amendment, 2026-10-16: Quit

The player asked for a way to quit the game. A browser page cannot close a tab it did not open, so Quit is the desktop app's alone: the menu of the title and of the paused screen ends with QUIT there, and nowhere else. `src/main.ts`, the composition root, asks `isTauri()` and hands the adapter a function that closes the window (`getCurrentWindow().close()` from `@tauri-apps/api`, allowed by `core:window:allow-close`), or null in a browser; the adapter offers Quit only when it is given one, and knows nothing of Tauri. `@tauri-apps/api` is the one runtime dependency besides Phaser, and in a browser it does nothing but answer `isTauri()`. The other ways were not taken: `withGlobalTauri` would put an untyped `window.__TAURI__` in the page for the same call, and a Rust command to exit would need the same API to invoke it.
