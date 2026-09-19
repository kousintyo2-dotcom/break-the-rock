# BREAK THE ROCK — Development Guide

## Product principles

- Build a maintainable, mobile-first collection mining game—not a number-only clicker.
- Preserve the tactile loop: strike a rock, see finds physically drop and settle, tap to collect them, then review and improve the expedition.
- Keep gameplay, progression, content data, persistence, effects, and interface concerns separated.
- Prefer small, complete vertical slices over broad placeholder features.
- Progress is additive and persistent. Do not introduce broad resets as the default progression model.

## Architecture

- Use TypeScript in strict mode and Vite. Keep source code out of `index.html`.
- Organize responsibilities under `src/` into `scenes`, `systems`, `entities`, `ui`, `data`, `save`, `effects`, and `assets` as appropriate.
- Define content (items, rocks, areas, upgrades) as typed data rather than scattering balance constants through scenes.
- Systems own game rules; scenes orchestrate; UI renders state and emits intent.
- Keep save migrations/versioning explicit. New save fields must have safe defaults so old saves continue to load.
- Design inventory entries so duplicate discoveries can later be converted into permanent CORE resources without rewriting collection storage.

## Interaction and visual direction

- Target portrait mobile screens first, with touch targets at least 44 CSS pixels where practical.
- Use earthy, material colors and restrained effects: stone, sand, soil, wood, leather, bone, old paper, and dull metal.
- Avoid neon/SF styling, gratuitous glow, excessive gradients, and decorative clutter.
- Mining feedback should feel weighty and short-lived: impact motion, brief hit-stop, chips, dust, restrained shake, and sound/haptics where supported.
- Dropped finds must visibly eject, fall, bounce briefly, and settle. They remain tappable; they must never move forever.
- Keep HOME, UPGRADES, and COLLECTION as distinct views behind a persistent bottom navigation.
- Accessibility and legibility beat ornament. Respect reduced-motion preferences and safe-area insets.

## Quality bar

- Before completing a change, run formatting/linting, type checking, tests, and a production build.
- For perceptible UI changes, verify a phone-sized viewport and capture a screenshot when tooling allows.
- Add or update tests for game-rule and persistence changes.
- Do not commit generated build output, dependencies, credentials, or local save data.
- Keep GitHub Pages deployment functional and ensure Vite's base path matches the repository deployment model.

