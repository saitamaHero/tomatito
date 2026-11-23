# Contributing to Tomatito

Thanks for your interest. Bug reports, ideas, translations, documentation and code are all welcome, in English or Spanish.

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md). Security problems go through [SECURITY.md](SECURITY.md), not through public issues.

## Before you start

- **Found a bug?** [Open an issue](https://github.com/saitamaHero/tomatito/issues/new/choose) with the steps to reproduce it. Reports from Windows, macOS, Wayland, Firefox and Safari are especially useful, because Tomatito has hardly been used there.
- **Small fix?** Send the pull request directly.
- **New feature or large change?** Open an issue first, so we can agree on it before you spend time on it.

Tomatito is meant to stay small. These are out of scope for now: mobile (Android, iOS, touch layouts), accounts, sync, and anything that sends the user's data out of their device.

## Setup

You need:

- [Node.js](https://nodejs.org) 22.12 or later 22.x, or 24.
- [pnpm](https://pnpm.io/installation) 11.
- For the desktop app, stable [Rust](https://rustup.rs) 1.90 or later and the system packages below. Changes that only touch the web app don't need them.

System packages on Debian and Ubuntu:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

For other Linux distributions, Windows and macOS, follow [Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/).

Fork the repository, clone your fork and install the dependencies:

```bash
git clone https://github.com/<your-username>/tomatito.git
cd tomatito
pnpm install
```

Then run the app:

```bash
pnpm dev            # web, at http://localhost:1420
pnpm tauri dev      # desktop
```

`VITE_SPEED=60 pnpm dev` runs the clock 60 times faster, so a whole cycle takes minutes. It also works with `pnpm tauri dev`.

## Checks

There is no CI yet, so please run these before you open a pull request:

```bash
pnpm test           # frontend tests
pnpm build          # type-check and build
```

And if you changed anything in `src-tauri/`:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

## How the code is organised

| Folder | What it holds |
| --- | --- |
| `src/core/` | Every product rule, in plain TypeScript: no Vue, no DOM. Tests live next to the code. |
| `src/data/` | Storage (IndexedDB). |
| `src/stores/` | Pinia stores that connect the rules and the data to the screens. |
| `src/platform/` | What differs between desktop and web. |
| `src/components/`, `src/views/` | The interface. |
| `src/float/` | The floating window (desktop only). |
| `src-tauri/` | The desktop shell, in Rust: tray, shortcut, windows. |

[CLAUDE.md](CLAUDE.md) is the full reference: how each part works, and the details that are easy to break. It is written for AI coding assistants, but it's just as useful to people.

A pull request should keep to these rules:

- Product rules go in `src/core/`, with tests.
- Components and views never import `@tauri-apps/*`. They use `platform()`.
- Take the time from `now()` in `src/core/clock.ts`, not from `Date.now()`.
- Colours, spacing and radii come from `src/styles/tokens.css`, and have to work in light and dark.
- Rust holds no timer state and no translated text: the frontend sends it what to show.
- The layout works down to 480 px wide.

## Text and translations

Every text the user sees is in `src/core/i18n/en.ts` and `src/core/i18n/es.ts`. If one language lacks a text, `pnpm build` fails, and a test fails if text is written directly in a template.

If you don't speak one of the languages, write your best attempt and say so in the pull request. We'll review it there.

To add a language:

1. Create its file in `src/core/i18n/`, starting from `en.ts`.
2. Add it to `MESSAGES` and `LOCALE_NAMES` in `src/core/i18n/index.ts`.
3. Add its code to `Language` in `src/core/types.ts` and to `LANGUAGES` in `src/core/settings.ts`.

## Pull requests

- Keep each one to a single change. Small ones get reviewed sooner.
- Explain what changes and why, and how you tested it, including the system you used.
- Add screenshots, in light and dark, if the interface changes.
- Write code comments in English. Many of the existing ones are in Spanish; there's no need to translate them unless you're changing that code.
- Write commit messages like the existing ones: `feat: add icons`, `feat(i18n): add multilingual support`, `fix: …`, `docs: …`.

By contributing, you agree that your contribution is published under the project's [MIT license](LICENSE).
