# Changelog

All notable changes to Oscar will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
* Options page colophon now has direct "report a bug" and "request a feature" links next to the existing "source on GitHub" link. Both deep-link into the GitHub issue creation flow with the corresponding template (`bug_report.md` / `feature_request.md`) preselected, so users land on the prefilled form rather than the issue-type chooser

### Changed
* Default rule library presets for Slack and Zoom updated to match current landing-page copy. Slack: domain pattern broadened from `*.slack.com/archives/*` to `*.slack.com/*` and substring switched to "You can also open this link in your browser" — the old "redirected you to the desktop app" string no longer appears on Slack's launcher page. Zoom: substring switched to "Don’t have the Zoom Workplace app installed" (curly apostrophe matches the rendered copy) so the launcher matches Zoom Workplace's current wording. The `*.slack.com/*` placeholder in the domain-pattern input was updated to match
* `manifest.json` description (which populates the Chrome Web Store "Summary" field) no longer enumerates specific desktop-app brand names. The CWS review team rejected 0.1.19 as "excessive / irrelevant keywords" ("Yellow Argon" violation ID) for listing ten brand names across Summary, Description, and Single-purpose fields — all three have been rewritten to describe the behavior generically

### Fixed
* CI build job no longer produces a double-zipped artifact. GitHub wraps every uploaded artifact in its own zip at download time; the old workflow pointed `upload-artifact` at `dist/oscar-*.zip` directly, so downloaded artifacts were zip-containing-a-zip and the Chrome Web Store rejected them with *"No manifest found in package"*. The build step now extracts `dist/oscar-*.zip` into `dist/unpacked/` and uploads the extracted directory — GitHub's download wrapper then IS the valid extension zip (one layer of zipping, not two), ready to upload to CWS directly

### Changed
* Docs: refreshed `CLAUDE.md` and `CONTRIBUTING.md` to reflect current reality — six JS modules (added `matching.js` and `action-presenter.js`), the master/detail rules UI with no rule names, www-stripping in match semantics, the new CI jobs, the `scripts/check-version-bump.sh` guard, required Node 21+ for `npm test`, and the enforcement of version bumps on both `manifest.json` and `package.json`. Added a "CI" section to `CLAUDE.md` covering the `test`/`build` jobs and branch protection

### Fixed
* CI: bumped `actions/checkout@v4 → v6`, `actions/setup-node@v4 → v6`, `actions/upload-artifact@v4 → v7`. All three new majors target Node 24 natively, so the Node 20 deprecation annotations are gone (the prior `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` opt-in is no longer needed and has been removed)
* README: added www-stripping note to the Domain pattern docs, refreshed the file-layout listing to include `matching.js`, `action-presenter.js`, `design/`, `scripts/check-version-bump.sh`, `test/`, `.github/workflows/`, and mentioned the CI-built zip artifact as a second packaging option alongside `npm run build`

### Changed
* Moved the pre-resize icon masters (`icon-source.png`, `icon-closing-source.png`, ~1.9 MB combined) from `icons/` to `design/`. They were never shipped — they're only used to regenerate the 16/32/48/128 raster variants — but they were picked up by Chrome's unpacked-load size because they lived inside the loaded folder. The shipped Web Store zip is unchanged (still 96 KB); the on-disk unpacked size drops by ~1.9 MB

### Added
* CI now builds the extension zip on every push to `main`. The `build` job runs after `test` passes, invokes `scripts/build.sh`, and uploads `dist/oscar-<version>.zip` as a workflow artifact (90-day retention) ready to upload to the Chrome Web Store developer dashboard
* CI now enforces a manifest version bump. A new `scripts/check-version-bump.sh` step in the `test` job compares `manifest.json` "version" between `HEAD` and the base commit (PR base branch, or previous push tip for direct pushes to `main`) and fails if they match. First push to a branch and missing base refs are tolerated
* Options page colophon now links to the GitHub repository at [github.com/jonathanlinford/oscar](https://github.com/jonathanlinford/oscar) and displays the installed extension version (read from `chrome.runtime.getManifest().version` at render time so it never drifts from `manifest.json`)

### Fixed
* CI: bumped `actions/setup-node` to Node 22. `node --test` glob expansion (`'test/**/*.test.js'`) landed in Node 21 — on the old Node 20 runner it was looking for a literal file named `**/*.test.js` and failing
* `package.json` version was stuck at 0.1.11 while `manifest.json` drifted. Synced both to 0.1.13

### Changed
* `www.` is now ignored in domain matching — it's stripped from the leading host part of both the rule pattern and the URL before comparing. `www.google.com/*` matches `google.com` and vice versa, so `argusleader.com/*` also matches `www.argusleader.com`. Only the literal leading `www.` is stripped — arbitrary subdomains are untouched (`google.com/*` still won't match `mail.google.com`). Documented in the "How matching works" dialog

### Removed
* Rules no longer have a `name` field. The domain pattern is the label — there's nothing to type twice. The rules list shows `favicon + domain` on the summary row and drops the Name input from the detail editor. Library presets keep their editorial title (only used as the library card label). The in-page countdown toast now shows the page's hostname. Existing stored rules with a `name` field are tolerated — the value is just ignored
* Default Slack and Zoom rules are no longer seeded on fresh install. Oscar now starts empty — users pick presets from the Rule library or write their own. The `chrome.runtime.onInstalled` handler is gone entirely
* The "How matching works" section is no longer a whole page section — it lives in a modal triggered by a `?` icon next to the Rules heading
* `test/mockups/` design-exploration fixtures removed now that the master/detail layout has shipped

### Fixed
* Mode select's native drop-arrow had weirdly wide right padding on the collapsed detail row. Switched to `appearance: none` with a tight inline-SVG chevron for a consistent, narrow arrow gutter across browsers
* Double-toast bug: when multiple `MutationObserver` ticks raced past the `queuedRuleId` guard during the `await getRules()` window, two overlays would spawn and clicking Cancel only dismissed the top one. `content.js` now uses a synchronous `checking` lock, and `startClosure` defensively clears any stray overlays before adding a new one
* `Mode` column in the Rules table was too narrow — the `Substring ∨` select was clipped. Added explicit column widths for On / Mode / Delay / delete

### Added
* Sections reordered so the primary workspace leads: Rules → Rule library → Stats → Appearance. Help is now a modal
* Help modal (native `<dialog>`) with scale + fade open/close animations via `@starting-style` and `transition-behavior: allow-discrete`
* Tasteful page-load animations: staggered fade+rise on sections, grow-from-zero on hourly/daily/leaderboard bar fills with per-index delays driven by a CSS `--i` custom property set at render time
* Button hover micro-interactions (subtle lift + shadow on primary buttons and library cards)
* Theme-switch color transitions on body background and foreground
* All animations respect `prefers-reduced-motion: reduce`
* The Rules table's delete button is now a small Oscar-the-Grouch icon instead of an `×` — hover wiggles it, clicking slides the row out before removal
* Unit test suite under `test/` built on Node's `node:test` runner — covers domain/text matching (`matching.js`) and the pure analytics helpers (`coerce`, `computeInsights`, `formatDuration`, `dateKey`, `hourLabel`) plus `recordClose`/`recordCancel`/`reset` via a stubbed `chrome.storage`
* GitHub Actions workflow (`.github/workflows/test.yml`) runs `npm test` on push to `main` and all pull requests
* GitHub issue templates (bug report + feature request) and pull request template under `.github/`
* `matching.js` shared module extracted from `content.js` so the matching helpers can be unit-tested without a browser
* `test/preview-options.html` and `test/preview-popup.html` dev wrappers that stub `chrome.storage` to render the real options/popup pages with demo data (not shipped in the zip)
* Editorial masthead with the Oscar-the-Grouch mascot alongside a large serif wordmark on both the options page and the popup
* Colophon footer on the options page: *"Oscar is local-only. No accounts, no telemetry, no servers."*

### Changed
* Full visual redesign &mdash; retired the generic blue/card/shadow look for a "trash-can editorial" aesthetic: warm cream paper background, deep charcoal ink, verdigris-green accent, rust-orange danger, thin horizontal rules instead of boxed cards. System serif for display type (Iowan Old Style / Palatino / Georgia), system-ui for body, `ui-monospace` for rule patterns. Dark mode uses the same hues inverted on a warm near-black
* In-page countdown toast now echoes the new palette: flat 1px outline instead of drop shadow, serif rule name, uppercase "Cancel" button, verdigris eyebrow label
* Rule library cards and stat cards lean on a subtle cream-raised surface instead of grey cards
* `content.js` imports matching helpers from `self.OscarMatching` (added to `manifest.json` `content_scripts.js` before `content.js`)
* `package.json` `test` script now runs `node --test 'test/**/*.test.js'` instead of the old `echo` stub

## [0.1.11] &mdash; 2026-04-10

### Added
* MIT license
* `README.md`, `CONTRIBUTING.md`, `PRIVACY.md`, and this changelog
* `.gitignore`, `package.json`, and `scripts/build.sh` for packaging
* `author`, `homepage_url`, and `short_name` fields in `manifest.json`

## [0.1.10] &mdash; 2026-04-10

### Added
* On-device usage analytics &mdash; lifetime closes, time saved, today/week counts, peak hour, peak day, top domains, top rules, cancel rate, current streak
* Stats section in the options page with hour-of-day and day-of-week charts plus leaderboards
* Reset stats button (with confirm)
* Popup teaser showing total closes, today's closes, and time saved
* Serialized analytics writes via a promise chain so back-to-back closes can't race

## [0.1.9] &mdash; 2026-04-10

### Added
* Favicon fallback: Chrome's local `_favicon` API first, Google's public favicon service second for unvisited domains. Default-globe detection via pixel fingerprinting of a probe request
* Garbage theme mixes Papyrus (headings, labels) with Comic Sans MS (body, buttons) for maximum ugly
* Toast title now honors the garbage theme's Papyrus font

## [0.1.8] &mdash; 2026-04-10

### Added
* `favicon` permission and switched favicon rendering to Chrome's local cache

### Removed
* External Google favicon requests by default

## [0.1.7] &mdash; 2026-04-10

### Added
* Favicons next to every rule in the Rules table and every preset in the Rule library
* Live favicon updates when editing a rule's domain pattern

## [0.1.6] &mdash; 2026-04-10

### Added
* Rule library section with 10 one-click presets (Slack, Zoom, Teams, Webex, Discord, Figma, Linear, Notion, Spotify, GoTo Meeting)
* Dedup: library cards show "Added" when the preset is already installed

## [0.1.5] &mdash; 2026-04-10

### Fixed
* In-page toast now follows the selected theme (Light/Dark/Garbage) instead of always using dark
* Toast padding rebalanced for even visual spacing

## [0.1.4] &mdash; 2026-04-10

### Added
* Theme picker in options: System (default), Light, Dark, Garbage
* Shared `theme.js` + `theme.css` consumed by both the options page and the popup
* Garbage theme with swamp-olive palette, Comic Sans font, asymmetric border radius, and harsh drop shadows

## [0.1.3] &mdash; 2026-04-10

### Changed
* Delay field in the options UI displays seconds instead of milliseconds (stored as ms)

### Fixed
* Rules table input focus is no longer lost on auto-save when typing multi-digit numbers

## [0.1.2] &mdash; 2026-04-10

### Added
* Countdown badge on the toolbar icon during the pre-close window
* In-page toast showing rule name, live countdown, and a Cancel button
* Shadow DOM isolation for the toast so page styles cannot touch it

## [0.1.1] &mdash; 2026-04-10

### Added
* Icon swap: toolbar icon turns red when a match is pending
* Red "BYE" badge while closing is pending

## [0.1.0] &mdash; 2026-04-10

### Added
* Initial release
* Domain + page-text rule matching via content script
* Configurable rules stored in `chrome.storage.sync`
* Options page and popup
* Default Slack and Zoom rules seeded on first install  
* Generated Oscar-the-Grouch icon set (16/32/48/128)
