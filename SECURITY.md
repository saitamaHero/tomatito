# Security policy

## Supported versions

There are no releases yet. Security fixes are made on the latest version of the `main` branch.

## Reporting a vulnerability

Please don't report security problems in public issues, discussions or pull requests.

Use GitHub's private form instead: [report a vulnerability](https://github.com/saitamaHero/tomatito/security/advisories/new). Only you and the maintainer can see the report. Write in English or Spanish, and include:

- what an attacker could do,
- the steps to reproduce it,
- whether it affects the desktop app, the web app or both, and on which system,
- the commit you tested.

Tomatito is maintained in spare time, so there is no guaranteed response time. Once the problem is confirmed, it will be fixed on `main` and described in a public advisory, with credit to you if you want it.

## What to expect from the app

Tomatito has no server and no accounts, and it stores its data only on the user's device. These are the most interesting areas to look at:

- what the desktop windows are allowed to call (`src-tauri/capabilities/`) and the Rust commands,
- text typed by the user, such as goals, running as code,
- the dependencies in `pnpm-lock.yaml` and `src-tauri/Cargo.lock`.

Someone who already controls the user's device or browser profile can read that data. That isn't considered a vulnerability.
