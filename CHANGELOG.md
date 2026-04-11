# Changelog

All notable changes to Oscar will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
