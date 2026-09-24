# BREAK THE ROCK — Development Guide

## Product principles

- The game is BREAK THROUGH: a short, one-button incremental breaking game. Core loop: BREAK → break walls in a row → stop just short → upgrade → break through the wall that stopped you.
- Game feel beats feature count. Do not add movement, aiming, tapping minigames, gacha, dailies, quests or padding.
- A stop is never a failure: show how close the player got (`87% / 13% TO BREAK`), never "FAILED" or "GAME OVER".
- Progress is additive and persistent.

## Architecture

- Use TypeScript in strict mode and Vite. Keep source code out of `index.html`.
- Phaser 4. Organize `src/` into `scenes`, `systems`, `entities`, `ui`, `data`, `config`, `save`, `effects`, `audio`, `utils`. Systems stay Phaser-free so `node --test` can cover them.
- Balance lives in `src/config/tuning.ts` and `src/data/`; presentation timing in `src/config/feel.ts`. Do not scatter constants through scenes.
- Systems own game rules; scenes orchestrate; UI renders state and emits intent.
- Keep save migrations/versioning explicit. New save fields must have safe defaults so old saves continue to load.

## Interaction and visual direction

- Portrait mobile first (9:16 base, taller phones extend the space between HUD and field). Touch targets at least 44 CSS px.
- Use the supplied pixel-art sprites (cut from `art/source` by `tools/extract-assets.py`); modern, readable UI that does not overpower the game view. No constant neon glow.
- Impacts: brief hit-stop, debris cut from the wall art, restrained shake. Debris lives 0.3–0.8 s and is pooled.
- One gameplay scene; results, special picks and settings are overlays. Never block the flow with long animations (>1 s).
- Shake, flash, vibration and volumes are user-adjustable and never carry required information.

## Quality bar

- Before completing a change, run formatting/linting, type checking, tests, and a production build.
- For perceptible UI changes, verify a phone-sized viewport and capture a screenshot when tooling allows.
- Add or update tests for game-rule and persistence changes.
- Do not commit generated build output, dependencies, credentials, or local save data.
- Keep GitHub Pages deployment functional and ensure Vite's base path matches the repository deployment model.

