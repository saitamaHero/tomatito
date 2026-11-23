# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`tomatito` is a Pomodoro timer for **desktop and web** from one codebase: a Vue 3 + TypeScript frontend (`src/`) built with Vite, and a Tauri 2 Rust backend (`src-tauri/`, edition 2024). Mobile is out of scope: no Android/iOS targets or touch layouts. Minimum supported width is 480 px.

The app is in English and Spanish; code comments are in Spanish. Data is local only (IndexedDB on both platforms), with no accounts or sync.

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
cargo test --manifest-path src-tauri/Cargo.toml       # floating window geometry
cargo fmt --manifest-path src-tauri/Cargo.toml
```

`VITE_SPEED=60` before `pnpm dev` or `pnpm tauri dev` speeds the clock up 60×, so a whole cycle takes minutes. It is ignored in production builds, and the fast clock restarts from the real time on every reload.

There is no frontend linter or formatter. TypeScript strictness (`strict`, `noUnusedLocals`, `noUnusedParameters`) is enforced by `pnpm build`, so unused symbols break it.

## Architecture

**Layers.** `core/` is pure TypeScript with no Vue or DOM and holds every product rule, as transitions `(state, settings, now) → state`; tests live next to it. `data/` is the `Repository` interface and its IndexedDB implementation. `stores/` (Pinia) connects both to the UI. `platform/` hides what differs between desktop and web. `components/` and `views/` never import `@tauri-apps/*`: they go through `platform()`.

**Text.** Every string the user can see lives in `core/i18n/es.ts` and `en.ts`; strings with values are functions, so each language owns its word order and plurals. `Messages` is the type of `es`, so a missing key or a wrong parameter fails `pnpm build`. Components and stores read `m` from `src/i18n.ts` (`{{ m.history.title }}`, `m.value` in scripts); `core/` functions take the messages or the locale as a parameter. A test in `core/i18n/i18n.test.ts` fails on text written directly in a template.
- To add a language: its file, one line in `MESSAGES` and one in `LOCALE_NAMES` (`core/i18n/index.ts`), and its code in `Language` (`core/types.ts`) and `LANGUAGES` (`core/settings.ts`).
- Stored data never holds translated text.
- Rust has no translations: the frontend sends them (`set_labels`, `update_tray`), and Rust returns codes instead of messages (`ShortcutProblem`, `float_problem`). Its English strings are only fallbacks until the first call.
- The floating window takes its language from `FloatView.lang`, since it doesn't read the settings.

**Clock.** A running timer is defined by its absolute `endsAt`, never by counting ticks. A Web Worker (`platform/ticker.worker.ts`) only sets the pace, because browsers throttle timers in hidden pages. Always take the time from `now()` in `core/clock.ts`, not `Date.now()`.

**State.** `FocusState` is the timer plus the active session. Every transition in `stores/focus.ts` goes through `commit`, which saves it, so closing the app loses nothing. Only one tab runs at a time: `main.ts` takes a Web Lock, because two would count the same pomodoro twice.

**Routes** use hash history so they work in Tauri and on static hosting. The break and the completed cycle are states of `TimerView`, not routes.

**Styles.** Colours, spacing and radii come from the variables in `styles/tokens.css` (light and dark, following the system). Fonts are bundled so the app looks right offline.

**Backend.** `src-tauri/src/lib.rs` builds the app; `desktop.rs` has the tray, the global shortcut and hide-on-close; `float.rs` and `geometry.rs`, the floating window. Rust holds no timer state: the frontend pushes what to show with `update_tray`, and the tray and shortcut answer with the `desktop-action` event (`"toggle"`, `"skip"`, or `"float"` to switch the floating window on or off). `Status` in `desktop.rs` must match `PlatformStatus` in `platform/types.ts`. The library crate is named `tomatito_lib`, not `tomatito`.

**Floating window** (desktop only). A second webview, with its own entry `flotante.html` → `src/float/`, that only paints what it is sent. `core/float.ts` decides what it shows and when (`floatView`, or null to hide it); `stores/focus.ts` pushes that through `platform().setFloat()`. The page measures the pill and asks Rust for its size (`float_layout`); Rust places it, drags it and docks it to screen edges. `vite.config.ts` builds the page only when `TAURI_ENV_PLATFORM` is set. Things that are easy to break:
- It must never take focus, so it is created with `focusable(false)`.
- On Linux it stays `resizable(true)` with min = max size, because GTK ignores `set_size` otherwise, and tao emits `Resized` on every move.
- KWin pushes back windows that leave the desktop, so `GAP` can't be smaller than `PAD`. `PAD` in `float.rs` must match `--pad` in `FloatApp.vue`.
- The page can't rely on `ResizeObserver` or `requestAnimationFrame` before the window is first shown.
- Drag events are listened for on `window`, not on the pill, and Rust reads the cursor itself.
- On Wayland it is disabled (`float_problem`), as is the global shortcut.
- Its transparency needs `macOSPrivateApi`, which rules out the Mac App Store.

**Closing** the main window hides it when the tray exists; quit from the tray menu. The single-instance plugin must stay first in the builder; starting the app again shows the existing window, so a second copy exits at once with code 0.

**Frontend → backend calls.** Each command is a `#[tauri::command]` function that must also be listed in `generate_handler![...]` in `lib.rs`. Command names, event names and argument keys are matched by string at runtime, so the type-checkers on both sides miss mismatches. Rust `snake_case` parameters are passed as `camelCase` keys from JS.

**Permissions.** `src-tauri/capabilities/default.json` controls which core and plugin APIs the main window may call; `float.json` does it for the floating window, which only gets events. A plugin the frontend calls takes four coordinated changes: the crate in `Cargo.toml`, the npm package in `package.json`, `.plugin(...)` in `lib.rs`, and its permission in `capabilities/default.json`. Plugins used only from Rust (global-shortcut, single-instance, window-state) need just the crate and `.plugin(...)`. `src-tauri/gen/schemas/` is generated; don't edit it.

**Dev server.** The port is fixed at 1420 with `strictPort` (HMR on 1421 when `TAURI_DEV_HOST` is set). `vite.config.ts` and `devUrl` in `tauri.conf.json` must agree.

**Version.** The app version is duplicated in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
