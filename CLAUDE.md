# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`tomatito` is a Pomodoro timer for **desktop and web** from one codebase: a Vue 3 + TypeScript frontend (`src/`) built with Vite, and a Tauri 2 Rust backend (`src-tauri/`, edition 2024). Mobile is out of scope: no Android/iOS targets or touch layouts. Minimum supported width is 480 px.

The UI text and code comments are in Spanish. Data is local only (IndexedDB on both platforms), with no accounts or sync.

## Commands

Use pnpm; `tauri.conf.json` calls `pnpm dev` and `pnpm build` in its `beforeDevCommand`/`beforeBuildCommand`.

```bash
pnpm install
pnpm tauri dev      # run the desktop app (starts Vite itself)
pnpm dev            # run the web app at http://localhost:1420
pnpm test           # vitest, once; `pnpm exec vitest run src/core/timer.test.ts -t "name"` for one test
pnpm build          # frontend only: vue-tsc type-check, then vite build to dist/
pnpm tauri build    # production bundle for the current OS
pnpm exec vue-tsc --noEmit                            # frontend type-check only
cargo clippy --manifest-path src-tauri/Cargo.toml     # backend check and lint
cargo fmt --manifest-path src-tauri/Cargo.toml
```

`VITE_SPEED=60` before `pnpm dev` or `pnpm tauri dev` speeds the clock up 60×, so a whole cycle takes minutes. It is ignored in production builds, and the fast clock restarts from the real time on every reload.

There is no frontend linter or formatter, and no Rust tests. TypeScript strictness (`strict`, `noUnusedLocals`, `noUnusedParameters`) is enforced by `pnpm build`, so unused symbols break it.

## Architecture

**Layers.** `core/` is pure TypeScript with no Vue or DOM and holds every product rule, as transitions `(state, settings, now) → state`; tests live next to it. `data/` is the `Repository` interface and its IndexedDB implementation. `stores/` (Pinia) connects both to the UI. `platform/` hides what differs between desktop and web. `components/` and `views/` never import `@tauri-apps/*`: they go through `platform()`.

**Clock.** A running timer is defined by its absolute `endsAt`, never by counting ticks. A Web Worker (`platform/ticker.worker.ts`) only sets the pace, because browsers throttle timers in hidden pages. Always take the time from `now()` in `core/clock.ts`, not `Date.now()`.

**State.** `FocusState` is the timer plus the active session. Every transition in `stores/focus.ts` goes through `commit`, which saves it, so closing the app loses nothing. Only one tab runs at a time: `main.ts` takes a Web Lock, because two would count the same pomodoro twice.

**Routes** use hash history so they work in Tauri and on static hosting. The break and the completed cycle are states of `TimerView`, not routes.

**Styles.** Colours, spacing and radii come from the variables in `styles/tokens.css` (light and dark, following the system). Fonts are bundled so the app looks right offline.

**Backend.** `src-tauri/src/lib.rs` builds the app; `desktop.rs` has the tray, the global shortcut and hide-on-close. Rust holds no timer state: the frontend pushes what to show with `update_tray`, and the tray and shortcut answer with the `desktop-action` event (`"toggle"` or `"skip"`). `Status` in `desktop.rs` must match `PlatformStatus` in `platform/types.ts`. The library crate is named `tomatito_lib`, not `tomatito`.

**Closing** the window hides it when the tray exists; quit from the tray's "Salir". The single-instance plugin must stay first in the builder; starting the app again shows the existing window, so a second copy exits at once with code 0.

**Frontend → backend calls.** Each command is a `#[tauri::command]` function that must also be listed in `generate_handler![...]` in `lib.rs`. Command names, event names and argument keys are matched by string at runtime, so the type-checkers on both sides miss mismatches. Rust `snake_case` parameters are passed as `camelCase` keys from JS.

**Permissions.** `src-tauri/capabilities/default.json` controls which core and plugin APIs the frontend may call. A plugin the frontend calls takes four coordinated changes: the crate in `Cargo.toml`, the npm package in `package.json`, `.plugin(...)` in `lib.rs`, and its permission in `capabilities/default.json`. Plugins used only from Rust (global-shortcut, single-instance, window-state) need just the crate and `.plugin(...)`. `src-tauri/gen/schemas/` is generated; don't edit it.

**Dev server.** The port is fixed at 1420 with `strictPort` (HMR on 1421 when `TAURI_DEV_HOST` is set). `vite.config.ts` and `devUrl` in `tauri.conf.json` must agree.

**Version.** The app version is duplicated in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
