# Contributing to Oscar

Thanks for considering a contribution. Oscar is small and opinionated; please read this guide before opening a pull request so we can get your change merged quickly.

## Ground rules

* **All contributions are licensed under MIT.** By submitting a pull request you agree that your code can be distributed under the project's [LICENSE](LICENSE).
* **Keep changes focused.** One feature or bugfix per pull request. If you want to refactor unrelated code, open a separate PR.
* **No build step.** Oscar is deliberately plain JavaScript with no bundler, no transpiler, no package dependencies in the shipped extension. Please don't add tooling that requires users to run `npm install` just to load the extension.
* **No telemetry.** Oscar is local-first. Do not add any code that phones home, logs to a third-party service, or identifies the user.

## Development setup

1. Fork and clone the repo
2. Open `chrome://extensions` in Chrome
3. Toggle **Developer mode** on
4. Click **Load unpacked** and pick your cloned folder
5. Make your changes
6. Reload the extension (the refresh icon on Oscar's card) after each edit

Changes to `options.html`, `popup.html`, or any CSS are picked up on next page open. Changes to `background.js` or `content.js` require a reload. Content-script changes also require reloading the page you are testing on.

## Code style

* **Vanilla JavaScript only** &mdash; no TypeScript, no JSX, no transpilation
* **ESM-style module pattern** via IIFE + `self.OscarXxx` globals (see `analytics.js`, `theme.js`) when sharing code between the service worker and the options page
* **Prefer `const` and `let`**, never `var`
* **No semicolons** &mdash; kidding, always semicolons
* **DOM creation** via the `el()` helper or explicit `document.createElement`; avoid `innerHTML` with user-facing content
* **Indent with 2 spaces**
* **Name things clearly** &mdash; descriptive identifiers beat clever short ones, and usually beat comments too

## Testing

Unit tests live under `test/` and run against pure-JS helpers (extraction, matching, analytics math). When you add a helper function, add a test for it. When you change a helper, update its test.

```bash
npm test
```

UI changes are validated manually in Chrome. Please include a short note in the PR describing what you tested.

## Version bumps

Patch the version in `manifest.json` with your change so reviewers and users can see the reload took effect:

```json
"version": "0.1.11" -> "0.1.12"
```

Add a one-liner to `CHANGELOG.md` under `[Unreleased]`.

## Commit messages

Subject line: imperative mood, under 72 characters. Example:

```
Add GoTo Meeting preset to the rule library
```

If the change needs context, add a body explaining *why* (not what &mdash; the diff shows what).

## Pull request checklist

* [ ] Version bumped in `manifest.json`
* [ ] `CHANGELOG.md` updated under `[Unreleased]`
* [ ] Tests added or updated for any logic changes
* [ ] Manually tested in Chrome
* [ ] PR description explains the motivation and what was tested

## Questions?

Open a [GitHub Discussion](https://github.com/jonathanlinford/oscar/discussions) or file an issue. Thanks for pitching in.
